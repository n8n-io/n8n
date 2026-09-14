import type { RichCardComponentType } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import type { Logger as ChatLogger } from 'chat';
import { UserError } from 'n8n-workflow';

import { AgentRepository } from '../../repositories/agent.repository';
import {
	AgentChatIntegration,
	type AgentChannelPreconditionContext,
	type AgentChatIntegrationContext,
	type ActionDecisionMessageParams,
} from '../agent-chat-integration';
import type { SuspendComponent } from '../component-mapper';
import { assertCredentialNotClaimed } from '../credential-claim';
import { loadTeamsAdapter } from '../esm-loader';
import { resolveIntegrationActionDefinitions } from '../integration-tool-definitions';

/**
 * Microsoft Teams platform integration.
 *
 * Teams sits with Discord rather than Telegram on registration: the messaging
 * endpoint is configured once in Azure Bot Service, so there is no API call to
 * register or release it and no `onAfterConnect`/`onBeforeDisconnect` hook.
 *
 * Three capability notes:
 * - {@link disableStreaming} — Teams streams natively in 1:1 chats but only
 *   buffers in group chats. The base class models one boolean per platform, so
 *   this ships fully buffered and gives up DM streaming rather than streaming
 *   inconsistently by conversation type.
 * - {@link needsShortCallbackData} — Adaptive Card `Action.Submit` payloads carry
 *   no documented size cap, unlike Telegram's 64-byte `callback_data`.
 * - {@link internal} — hidden from the integrations catalog until the setup
 *   stepper exists, because the fallback view cannot show the user the messaging
 *   endpoint URL that Azure Bot Service needs.
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

	readonly displayIcon = 'microsoft-teams';

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

	/** Adaptive Cards render all five natively; only selects need converting. */
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

	readonly needsShortCallbackData = false;

	/**
	 * Teams acknowledges an Adaptive Card action by editing the card in place, so
	 * the answered card is settled rather than deleted.
	 */
	readonly deleteActionMessageBeforeResume = false;

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
			// The credential always carries a tenant ID, which is what single-tenant
			// means here. A multi-tenant bot omits it and is not supported yet.
			appType: 'SingleTenant',
			logger: this.createAdapterLogger(),
		});
	}

	/**
	 * Nothing here calls Teams: the credential claim reads only our own rows, and
	 * there is no messaging endpoint to register, so the whole precondition set is
	 * deterministic and safe to run as a publish preflight.
	 */
	async assertStartupPreconditions(ctx: AgentChannelPreconditionContext): Promise<void> {
		await assertCredentialNotClaimed(this.agentRepository, this.displayLabel, this.type, ctx);
	}

	async onBeforeConnect(ctx: AgentChatIntegrationContext): Promise<void> {
		await this.assertStartupPreconditions(ctx);

		// Surface a bad credential at connect rather than at the first message.
		this.extractBotCredentials(ctx.credential);
	}

	/** Teams has no select menus, so options become individual buttons. */
	normalizeComponents(components: SuspendComponent[]): SuspendComponent[] {
		const normalized: SuspendComponent[] = [];
		for (const c of components) {
			switch (c.type) {
				case 'select':
				case 'radio_select':
					for (const opt of c.options ?? []) {
						normalized.push({ type: 'button', label: opt.label, value: opt.value });
					}
					break;
				default:
					normalized.push(c);
			}
		}
		return normalized;
	}

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
	 * Map the Entra service-principal credential onto the adapter's bot identity.
	 *
	 * The certificate check is ours to make, not the adapter's: certificate mode
	 * stores `privateKey`/`certificate` instead of `clientSecret`, so passing it
	 * through would build an adapter with no secret and fail later with an opaque
	 * authentication error. The adapter only rejects its own `certificate` option,
	 * which we never set.
	 */
	private extractBotCredentials(credential: Record<string, unknown>): {
		appId: string;
		appPassword: string;
		appTenantId: string;
	} {
		if (this.readField(credential, 'authentication') === 'certificate') {
			throw new UserError(
				'Microsoft Teams channels cannot use certificate authentication. ' +
					'Switch the credential to Client Secret, or create a credential that uses one.',
			);
		}

		return {
			appId: this.requireField(
				credential,
				'clientId',
				'an Application (client) ID. Copy it from the app registration overview in the Microsoft Entra admin center.',
			),
			appPassword: this.requireField(
				credential,
				'clientSecret',
				'a Client Secret. Create one under Certificates & secrets on the app registration.',
			),
			appTenantId: this.requireField(
				credential,
				'tenantId',
				'a Directory (tenant) ID. Copy it from the app registration overview in the Microsoft Entra admin center.',
			),
		};
	}

	private readField(credential: Record<string, unknown>, field: string): string {
		const value = credential[field];
		return typeof value === 'string' ? value.trim() : '';
	}

	private requireField(
		credential: Record<string, unknown>,
		field: string,
		requirement: string,
	): string {
		const value = this.readField(credential, field);
		if (!value) {
			throw new UserError(`The Microsoft Teams credential is missing ${requirement}`);
		}
		return value;
	}

	private createAdapterLogger(): ChatLogger {
		const forward =
			(level: 'debug' | 'info' | 'warn' | 'error') =>
			(message: string, ..._args: unknown[]) => {
				this.logger[level](`[TeamsAdapter] ${message}`);
			};
		const logger: ChatLogger = {
			child: () => logger,
			debug: forward('debug'),
			info: forward('info'),
			warn: forward('warn'),
			error: forward('error'),
		};
		return logger;
	}
}
