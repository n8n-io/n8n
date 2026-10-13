import type {
	CreateTeamsManagerCredentialResponse,
	TeamsManagedSetupState,
	TeamsManagerCredentialSummary,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import type { ICredentialDataDecryptedObject } from 'n8n-workflow';

import { CredentialsFinderService } from '@n8n/backend-services';
import { CredentialsService } from '@/credentials/credentials.service';
import { CredentialsOverwrites } from '@/credentials-overwrites';
import { OauthService, OauthVersion } from '@/oauth/oauth.service';
import { BadRequestError } from '@n8n/errors';

import { stringProperty } from '../../integration-helpers';

export const TEAMS_MANAGER_CREDENTIAL_TYPE = 'microsoftTeamsManagerOAuth2Api';

/**
 * `organizations` rather than `common`, because a personal account cannot grant
 * organisation consent and `common` would offer it one.
 */
const ADMIN_CONSENT_URL = 'https://login.microsoftonline.com/organizations/v2.0/adminconsent';
const DEFAULT_MANAGER_CREDENTIAL_NAME = 'Microsoft organization';

/**
 * Scopes this flow cannot work without. A credential connected before the list
 * changed still holds a valid token, so it is reported as needing a reconnect
 * rather than being hidden -- the user keeps the credential and re-consents.
 *
 * Every entry must be one the credential actually asks for. A scope listed
 * here and not requested at sign-in can never be granted, so the reconnect it
 * demands would never clear and the setup would stay locked for everyone.
 * `teams-manager-token.service.test.ts` holds the three lists to each other.
 */
export const REQUIRED_MANAGER_SCOPES = [
	'https://graph.microsoft.com/Application.ReadWrite.All',
	'https://graph.microsoft.com/AppCatalog.ReadWrite.All',
	'https://graph.microsoft.com/AppCatalog.Submit',
] as const;

export interface TeamsManagedSetupScope {
	projectId: string;
	agentId: string;
	user: User;
}

function childRecord(
	record: Record<string, unknown>,
	key: string,
): Record<string, unknown> | undefined {
	const child = record[key];
	return isRecord(child) ? child : undefined;
}

/** Entra returns granted scopes space-separated, and drops the resource prefix for some. */
function grantedScopes(scope: string | undefined): Set<string> {
	if (!scope) return new Set();
	const granted = new Set<string>();
	for (const entry of scope.split(' ')) {
		if (!entry) continue;
		granted.add(entry);
		const short = entry.split('/').pop();
		if (short) granted.add(short);
	}
	return granted;
}

function isMissingScope(granted: Set<string>, required: string): boolean {
	const short = required.split('/').pop();
	return !granted.has(required) && !(short !== undefined && granted.has(short));
}

/**
 * The recommended ("managed") Teams setup: an n8n-owned multi-tenant Entra app,
 * consented once by the customer's tenant admin, acting in their tenant.
 *
 * This service owns only the sign-in half — whether the flow is available at
 * all, and which sign-ins the project already has. Provisioning rides on top of
 * the credentials it hands back.
 */
@Service()
export class TeamsManagedSetupService {
	constructor(
		private readonly credentialsService: CredentialsService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly credentialsOverwrites: CredentialsOverwrites,
		private readonly oauthService: OauthService,
	) {}

	/**
	 * Cloud supplies the manager app through credential overwrites. A
	 * self-hosted operator who supplies their own client ID and secret the same
	 * way gets the flow too; everyone else sees only the manual stepper.
	 */
	isSetupAvailable(): boolean {
		const overwrite = this.credentialsOverwrites.getOverwrites(TEAMS_MANAGER_CREDENTIAL_TYPE);
		return (
			typeof overwrite?.clientId === 'string' &&
			overwrite.clientId.trim().length > 0 &&
			typeof overwrite.clientSecret === 'string' &&
			overwrite.clientSecret.trim().length > 0
		);
	}

	assertSetupAvailable(): void {
		if (!this.isSetupAvailable()) {
			throw new BadRequestError('The recommended Microsoft Teams setup is not available here.');
		}
	}

	/**
	 * One prompt that approves everything n8n needs, across both Microsoft Graph
	 * and Azure management.
	 *
	 * `/.default` asks for every permission on the app registration rather than a
	 * list, which is what makes it span both APIs — a sign-in cannot, because a
	 * code is redeemed for one resource at a time. An administrator does this once
	 * per organisation and nobody sees a consent screen afterwards.
	 */
	adminConsentUrl(): string | null {
		const overwrite = this.credentialsOverwrites.getOverwrites(TEAMS_MANAGER_CREDENTIAL_TYPE);
		const clientId = typeof overwrite?.clientId === 'string' ? overwrite.clientId.trim() : '';
		if (!clientId) return null;

		// No `state`. The grant lands on the tenant, not on anything n8n holds:
		// the callback reads nothing from the query and only renders a page, so
		// there is no n8n-side effect for a forged return to reach. Every step
		// after this still runs on the user's own signed-in credential.
		const query = new URLSearchParams({
			client_id: clientId,
			scope: 'https://graph.microsoft.com/.default',
			redirect_uri: `${this.oauthService.getBaseUrl(OauthVersion.V2)}/callback`,
		});
		return `${ADMIN_CONSENT_URL}?${query.toString()}`;
	}

	async getSetupState(options: TeamsManagedSetupScope): Promise<TeamsManagedSetupState> {
		if (!this.isSetupAvailable()) {
			return { managedSetupAvailable: false, managerCredentials: [], adminConsentUrl: null };
		}

		const usable = await this.credentialsService.getCredentialsAUserCanUseInAWorkflow(
			options.user,
			{
				projectId: options.projectId,
			},
		);

		const managerCredentials: TeamsManagerCredentialSummary[] = [];
		for (const candidate of usable) {
			if (candidate.type !== TEAMS_MANAGER_CREDENTIAL_TYPE) continue;
			const credential = await this.credentialsFinderService.findCredentialForUser(
				candidate.id,
				options.user,
				['credential:read'],
			);
			if (!credential) continue;

			const rawData = await this.credentialsService.decrypt(credential, true);
			managerCredentials.push({
				id: credential.id,
				name: credential.name,
				...this.summarizeGrant(rawData),
			});
		}

		return {
			managedSetupAvailable: true,
			managerCredentials,
			adminConsentUrl: this.adminConsentUrl(),
		};
	}

	/**
	 * Creates the empty credential the OAuth round trip fills in. The frontend
	 * then drives the sign-in, exactly as the Slack manager credential does.
	 */
	async createManagerCredential(
		options: TeamsManagedSetupScope,
	): Promise<CreateTeamsManagerCredentialResponse> {
		this.assertSetupAvailable();
		const credential = await this.credentialsService.createUnmanagedCredential(
			{
				name: DEFAULT_MANAGER_CREDENTIAL_NAME,
				type: TEAMS_MANAGER_CREDENTIAL_TYPE,
				data: {},
				projectId: options.projectId,
			},
			options.user,
		);
		return {
			id: credential.id,
			name: credential.name,
			type: TEAMS_MANAGER_CREDENTIAL_TYPE,
			isResolvable: false,
		};
	}

	private summarizeGrant(
		rawData: ICredentialDataDecryptedObject,
	): Pick<
		TeamsManagerCredentialSummary,
		'connected' | 'reconnectRequired' | 'organizationName' | 'tenantId'
	> {
		const data = rawData as Record<string, unknown>;
		const tokenData = childRecord(data, 'oauthTokenData');
		const connected = typeof stringProperty(tokenData, 'access_token') === 'string';
		const granted = grantedScopes(stringProperty(tokenData, 'scope'));
		// Every step redeems the refresh token rather than the access token it was
		// issued beside. Without one the sign-in looks usable and fails on the
		// first call, so it is a sign-in to redo.
		const canRefresh = typeof stringProperty(tokenData, 'refresh_token') === 'string';

		return {
			connected,
			reconnectRequired:
				connected &&
				(!canRefresh || REQUIRED_MANAGER_SCOPES.some((scope) => isMissingScope(granted, scope))),
			// Written by the provisioning step once it has read the tenant; absent
			// until then, which is why both are nullable rather than empty strings.
			organizationName: stringProperty(data, 'organizationName') ?? null,
			tenantId: stringProperty(data, 'tenantId') ?? null,
		};
	}
}
