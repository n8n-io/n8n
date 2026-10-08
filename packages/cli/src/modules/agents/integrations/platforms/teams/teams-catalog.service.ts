import { Logger } from '@n8n/backend-common';
import type { CredentialsEntity, User } from '@n8n/db';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';

import { CredentialsFinderService } from '@n8n/backend-services';
import { BadRequestError } from '@n8n/errors';

import { TeamsGraphService } from './teams-graph.service';
import { TeamsManifestService } from './teams-manifest.service';
import { TEAMS_MANAGER_CREDENTIAL_TYPE } from './teams-managed-setup.service';
import { GRAPH_RESOURCE, TeamsManagerTokenService } from './teams-manager-token.service';
import { stringProperty } from '../../integration-helpers';

export interface TeamsCatalogScope {
	user: User;
	projectId: string;
	agentId: string;
	managerCredentialId: string;
}

/**
 * Reads what the signed-in user has in Teams.
 *
 * The upload happens in the Teams client, so nothing reaches n8n when it does.
 * Asking Microsoft is the only way to know the app arrived.
 */
@Service()
export class TeamsCatalogService {
	constructor(
		private readonly graph: TeamsGraphService,
		private readonly tokens: TeamsManagerTokenService,
		private readonly manifestService: TeamsManifestService,
		private readonly credentialsFinderService: CredentialsFinderService,
		private readonly logger: Logger,
	) {}

	/**
	 * Whether the signed-in user already has the app, however it got there.
	 *
	 * An app uploaded in the Teams client is a catalogue entry of its own, with
	 * its own id, so it is found by the id in our manifest — which every package
	 * n8n builds for this agent carries. That is what lets the step close on an
	 * upload n8n never performed.
	 */
	async findUserInstall(options: TeamsCatalogScope): Promise<boolean> {
		const token = await this.graphToken(options);
		const response = await this.graph.request(
			token,
			'GET',
			'/me/teamwork/installedApps?$expand=teamsApp',
		);
		// A miss and a refusal look the same to the caller, which polls. Logged so
		// a permission the grant is missing does not read as an upload that never
		// happened.
		if (!response.ok) {
			this.logger.debug('[TeamsCatalog] Could not read the installed apps', {
				agentId: options.agentId,
				statusCode: response.statusCode,
			});
			return false;
		}

		const externalId = this.manifestService.buildManifestId(options.agentId);
		const value = isRecord(response.body) ? response.body.value : undefined;
		return (
			Array.isArray(value) &&
			value.some((entry) => {
				const app = isRecord(entry) ? entry.teamsApp : undefined;
				return stringProperty(app, 'externalId') === externalId;
			})
		);
	}

	private async graphToken(options: TeamsCatalogScope): Promise<string> {
		const credential = await this.managerCredential(options);
		return await this.tokens.acquire(credential, GRAPH_RESOURCE);
	}

	private async managerCredential(options: TeamsCatalogScope): Promise<CredentialsEntity> {
		const credential = await this.credentialsFinderService.findCredentialForUser(
			options.managerCredentialId,
			options.user,
			['credential:read'],
		);
		if (!credential || credential.type !== TEAMS_MANAGER_CREDENTIAL_TYPE) {
			throw new BadRequestError('Sign in with Microsoft before adding the Teams app.');
		}
		return credential;
	}
}
