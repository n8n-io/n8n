import type { RichCardComponentType } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { UserError } from 'n8n-workflow';

import { AgentRepository } from '../../../repositories/agent.repository';
import { createAdapterLogger } from '../../adapter-logger';
import { credentialField, requireCredentialField } from '../../credential-fields';
import {
	AgentChatIntegration,
	type AgentChannelPreconditionContext,
	type AgentChatIntegrationContext,
	type ActionDecisionMessageParams,
} from '../../agent-chat-integration';
import { expandSelectsToButtons, type SuspendComponent } from '../../component-mapper';
import { assertCredentialNotClaimed } from '../../credential-claim';
import { loadTeamsAdapter } from '../../esm-loader';
import { resolveIntegrationActionDefinitions } from '../../integration-tool-definitions';

/** Pinned so a stray TEAMS_API_URL env var cannot redirect proactive sends. */
const TEAMS_API_URL = 'https://smba.trafficmanager.net/teams';

const GLOBAL_GRAPH_API_BASE_URL = 'https://graph.microsoft.com';

/**
 * A tenant ID is a GUID or a verified domain. The value reaches the Teams SDK,
 * which interpolates it into a token URL path, so the shape is checked before
 * it gets there.
 *
 * The domain form is matched per label rather than by alphabet: a value of `.`
 * or `..` passes an alphabet check, and URL normalization then drops the tenant
 * segment entirely. Two labels minimum, each starting and ending alphanumeric.
 */
const TENANT_ID_GUID = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;
const TENANT_ID_DOMAIN =
	/^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$/;

/**
 * Teams sits with Discord rather than Telegram on registration: the messaging
 * endpoint is configured once in Azure Bot Service, so there is no API call to
 * register or release it and no `onAfterConnect`/`onBeforeDisconnect` hook.
 *
 * This first slice targets 1:1 direct messages. Group chats and channels are not
 * blocked, but they are untested: without RSC permissions Teams only delivers an
 * @-mention there, so nothing arrives ambiently.
 */
@Service()
export class TeamsIntegration extends AgentChatIntegration {
	readonly type = 'teams';

	readonly credentialTypes = ['microsoftEntraServicePrincipalApi'];

	readonly displayLabel = 'Microsoft Teams';

	readonly displayIcon = 'teams';

	/** Hidden from the catalog and the add-trigger UI until the setup stepper ships. */
	readonly internal = true;

	readonly builderGuidance = {
		capabilities: [
			'Receive Microsoft Teams direct messages as agent triggers.',
			'Respond in the same Microsoft Teams conversation.',
			'Render Adaptive Cards with buttons.',
		],
		useIntegrationWhen: [
			'The agent should be chatted with from Microsoft Teams or act as a Teams bot.',
			'The agent needs to reply to Teams users in the same conversation context.',
		],
		useNodeToolWhen: [
			'Microsoft Teams is only a backend API step and the agent does not need to be connected as a Teams chat surface.',
			'The Teams operation is performed by a non-Agent workflow, or the exact operation is not listed in the Agent integration capabilities.',
		],
	};

	readonly supportedComponents: readonly RichCardComponentType[] = [
		'section',
		'button',
		'divider',
		'fields',
		'image',
	];

	readonly actionToolDefinitions = resolveIntegrationActionDefinitions(['respond', 'edit_message']);

	readonly actionToolGuidance = [
		'For edit_message, pass the messageId returned by a previous Teams action or get_current_message_context. The current Teams conversation is selected automatically.',
	];

	/**
	 * Teams acknowledges an Adaptive Card action by editing the card in place, so
	 * the answered card is settled rather than deleted.
	 */
	readonly deleteActionMessageBeforeResume = false;

	/**
	 * A channel or group chat card goes out as a Teams targeted message, so only
	 * the user who asked sees the approval. A 1:1 chat is already private, and
	 * the adapter posts there normally.
	 */
	readonly targetSuspensionCardAtActingUser = true;

	readonly disableStreaming = true;

	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
	) {
		super();
	}

	async createAdapter(ctx: AgentChatIntegrationContext): Promise<unknown> {
		const { appId, appPassword, appTenantId } = this.extractBotCredentials(ctx.credential);
		const { createTeamsAdapter } = await loadTeamsAdapter();

		return createTeamsAdapter({
			appId,
			appPassword,
			appTenantId,
			apiUrl: TEAMS_API_URL,
			// The Entra credential always carries a tenant ID, so a bot registered as
			// multi-tenant is still driven single-tenant here. Nothing detects that
			// mismatch: it surfaces as a token-mint failure on the first message.
			appType: 'SingleTenant',
			logger: createAdapterLogger(this.logger, '[TeamsAdapter]'),
		});
	}

	async assertStartupPreconditions(ctx: AgentChannelPreconditionContext): Promise<void> {
		await assertCredentialNotClaimed(this.agentRepository, this.displayLabel, this.type, ctx);
	}

	async onBeforeConnect(ctx: AgentChatIntegrationContext): Promise<void> {
		await this.assertStartupPreconditions(ctx);

		// Surface a bad credential at connect rather than at the first message.
		this.extractBotCredentials(ctx.credential);
	}

	/**
	 * Adaptive Cards do render a select as `Input.ChoiceSet`, but the adapter
	 * submits one through a `__auto_submit` sentinel that fans every input out as
	 * its own action event. A suspended tool call expects a single action to
	 * resume it, so options become individual buttons instead.
	 */
	normalizeComponents(components: SuspendComponent[]): SuspendComponent[] {
		return expandSelectsToButtons(components);
	}

	/**
	 * Two things a settled Teams card cannot say, both for want of a carrier
	 * rather than by choice:
	 * - `selectedLabel` for a non-approval button. The inbound `Action.Submit`
	 *   data is `{ actionId, value }`, with no button title, and Teams has no
	 *   CallbackStore to look one up in — hence the generic fallback.
	 * - The original question. The card-action activity carries the source
	 *   message id, not the card, so restoring it needs a Graph or Bot API fetch.
	 */
	formatActionDecisionMessage({
		approved,
		selectedLabel,
		user,
	}: ActionDecisionMessageParams): string {
		const responder = user.fullName || user.userName || user.userId;
		if (approved === undefined) {
			return `✅ ${selectedLabel || 'Action'} selected by ${responder}`;
		}
		return approved ? `✅ Approved by ${responder}` : `🚫 Declined by ${responder}`;
	}

	/**
	 * The certificate check is ours to make: that mode stores no `clientSecret`,
	 * so passing it through would build an adapter with no secret and fail later
	 * with an opaque authentication error.
	 */
	private extractBotCredentials(credential: Record<string, unknown>): {
		appId: string;
		appPassword: string;
		appTenantId: string;
	} {
		if (credentialField(credential, 'authentication') === 'certificate') {
			throw new UserError(
				'Microsoft Teams channels cannot use certificate authentication. ' +
					'Switch the credential to Client Secret, or create a credential that uses one.',
			);
		}

		const graphApiBaseUrl = credentialField(credential, 'graphApiBaseUrl');
		if (graphApiBaseUrl && graphApiBaseUrl.replace(/\/+$/, '') !== GLOBAL_GRAPH_API_BASE_URL) {
			throw new UserError(
				'Microsoft Teams channels only reach the global Microsoft cloud. ' +
					"Set the credential's Microsoft Graph API base URL back to https://graph.microsoft.com.",
			);
		}

		const appTenantId = requireCredentialField(
			credential,
			'tenantId',
			'The Microsoft Teams credential is missing a Directory (tenant) ID. Copy it from the app registration overview in the Microsoft Entra admin center.',
		);
		if (!TENANT_ID_GUID.test(appTenantId) && !TENANT_ID_DOMAIN.test(appTenantId)) {
			throw new UserError(
				'The Microsoft Teams credential has an invalid Directory (tenant) ID. ' +
					'Use the GUID from the app registration overview, or a verified domain such as contoso.onmicrosoft.com.',
			);
		}

		return {
			appId: requireCredentialField(
				credential,
				'clientId',
				'The Microsoft Teams credential is missing an Application (client) ID. Copy it from the app registration overview in the Microsoft Entra admin center.',
			),
			appPassword: requireCredentialField(
				credential,
				'clientSecret',
				'The Microsoft Teams credential is missing a Client Secret. Create one under Certificates & secrets on the app registration.',
			),
			appTenantId,
		};
	}
}
