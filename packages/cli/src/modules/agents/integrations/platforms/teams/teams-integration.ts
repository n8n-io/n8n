import type { AgentIntegrationConfig, RichCardComponentType } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { isRecord } from '@n8n/utils/is-record';
import { UserError } from 'n8n-workflow';

import { AgentRepository } from '../../../repositories/agent.repository';
import { createAdapterLogger } from '../../adapter-logger';
import { credentialField, requireCredentialField } from '../../credential-fields';
import {
	AgentChatIntegration,
	type AgentChannelPreconditionContext,
	type AgentChatIntegrationContext,
	type BridgeExecutionContext,
	type BridgeMessageContextParams,
	type BridgeResumeExecutionContext,
} from '../../agent-chat-integration';
import { expandSelectsToButtons, type SuspendComponent } from '../../component-mapper';
import { assertCredentialNotClaimed } from '../../credential-claim';
import { loadTeamsAdapter } from '../../esm-loader';
import { resolveIntegrationActionDefinitions } from '../../integration-tool-definitions';
import type { ReplyExpectation } from '../../integration-tool-types';
import { startTypingIndicator } from '../typing-indicator';

/** Pinned so a stray TEAMS_API_URL env var cannot redirect proactive sends. */
const TEAMS_API_URL = 'https://smba.trafficmanager.net/teams';

const GLOBAL_GRAPH_API_BASE_URL = 'https://graph.microsoft.com';

/**
 * The model input carries no sign of whether the bot was addressed, so a
 * message read only through read-all looks like a direct question.
 */
const OPTIONAL_REPLY_NOTE = [
	'<reply_guidance>',
	'This message does not mention you. You read it because you can read every message in this conversation.',
	'Reply only if the message is meant for you or you can add something useful within your role.',
	'If not, call do_not_respond once. That ends your turn.',
	'</reply_guidance>',
].join('\n');

/** Interval picked to match Discord's; Teams does not document the expiry. */
const TEAMS_TYPING_REFRESH_MS = 8000;

/**
 * A tenant ID is a GUID or a verified domain. The value reaches the Teams SDK,
 * which interpolates it into a token URL path, so the shape is checked before
 * it gets there.
 *
 * The domain form is matched per label rather than by alphabet: a value of `.`
 * or `..` passes an alphabet check, and URL normalization then drops the tenant
 * segment entirely. Two labels minimum, each starting and ending alphanumeric.
 */
type TeamsConversationType = 'personal' | 'groupChat' | 'channel';

function conversationTypeOf(activity: unknown): TeamsConversationType | undefined {
	if (!isRecord(activity) || !isRecord(activity.conversation)) return undefined;
	const type = activity.conversation.conversationType;
	return type === 'personal' || type === 'groupChat' || type === 'channel' ? type : undefined;
}

/**
 * The adapter reports every inbound author as a person, so the activity is
 * read instead. Bot Framework gives bot accounts a `28:` id.
 */
function isFromBot(activity: unknown): boolean {
	if (!isRecord(activity) || !isRecord(activity.from)) return false;
	const { id, role } = activity.from;
	return role === 'bot' || (typeof id === 'string' && id.startsWith('28:'));
}

const TENANT_ID_GUID = /^[0-9a-fA-F]{8}-([0-9a-fA-F]{4}-){3}[0-9a-fA-F]{12}$/;
const TENANT_ID_DOMAIN =
	/^[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?(\.[A-Za-z0-9]([A-Za-z0-9-]*[A-Za-z0-9])?)+$/;

/**
 * Teams sits with Discord rather than Telegram on registration: the messaging
 * endpoint is configured once in Azure Bot Service, so there is no API call to
 * register or release it and no `onAfterConnect`/`onBeforeDisconnect` hook.
 *
 * Direct messages, team channels and group chats are all supported. Outside a
 * DM the bot must be @-mentioned, and the mention subscribes the conversation.
 * In a channel that subscription covers the one thread, because the thread id
 * carries the root message id. In a group chat it covers the whole chat.
 *
 * Reading messages without a mention is a setup choice for each surface. The
 * manifest carries `ChannelMessage.Read.Group` and `ChatMessage.Read.Chat` only
 * when `readAllChannelMessages` and `readAllGroupMessages` are on. Teams grants
 * them when the app is added to a team or a chat, and they make Teams deliver
 * every message instead of mentions alone. Each such message runs the agent
 * with an optional reply, so the agent decides whether to speak.
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
			'Receive Microsoft Teams direct messages, team channel messages and group chat messages as agent triggers.',
			'Respond in the same Microsoft Teams conversation, and in the same channel thread.',
			'Stay in the conversation after an @-mention, so later messages need no mention.',
			'When the setup turns on reading all messages, run on every team channel or group chat message and decide whether to reply, or stay silent.',
			'Add emoji reactions to messages.',
			'Render Adaptive Cards with buttons.',
		],
		useIntegrationWhen: [
			'The agent should be chatted with from Microsoft Teams or act as a Teams bot.',
			'The agent needs to reply to Teams users in the same conversation context.',
			'The agent should take part in a Microsoft Teams channel or group chat.',
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

	readonly actionToolDefinitions = resolveIntegrationActionDefinitions([
		'respond',
		'edit_message',
		'add_reaction',
		'do_not_respond',
	]);

	readonly actionToolGuidance = [
		'For edit_message, pass the messageId returned by a previous Teams action or get_current_message_context. The current Teams conversation is selected automatically.',
		'For add_reaction, use one of thumbs_up, eyes, check, x, rocket, thinking or pin, or a Teams reaction type such as like, heart or laugh.',
		'A channel or group chat message that does not mention you needs no reply. Use do_not_respond unless you have something useful to add.',
		'To acknowledge a message with only a reaction, call add_reaction and then do_not_respond. Any text you write after add_reaction is posted as a reply.',
	];

	/**
	 * A channel or group chat card goes out as a Teams targeted message, so the
	 * rest of the channel never sees the approval. Delivery-scoped only: nothing
	 * verifies who clicks.
	 *
	 * Deleting the answered card relies on
	 * `patches/@chat-adapter__teams@4.37.0.patch`, because the adapter mutates a
	 * targeted activity without `?isTargetedActivity=true` and Teams answers
	 * 400. Drop the patch once upstream sends the flag (vercel/chat#950).
	 */
	readonly targetSuspensionCardAtActingUser = true;

	/**
	 * A direct message renders progressively; every other conversation posts one
	 * message. The choice is made for each conversation in
	 * `createBridgeExecutionContext` rather than here.
	 */
	readonly disableStreaming = false;

	/**
	 * Text that follows a card is posted on its own rather than folded back into
	 * the message being edited above it.
	 */
	readonly singleStreamedRunPerTurn = true;

	/**
	 * A message without a mention runs only on a surface whose read-all setting
	 * is on, and never when another bot wrote it. Two listening bots in one
	 * channel would otherwise answer each other.
	 */
	shouldHandleUnmentionedMessage({
		message,
		integration,
	}: {
		message: { raw: unknown };
		integration: AgentIntegrationConfig;
	}): boolean {
		if (isFromBot(message.raw)) return false;
		const settings = integration.type === 'teams' ? integration.settings : undefined;
		switch (conversationTypeOf(message.raw)) {
			case 'channel':
				return settings?.teamChannels === true && settings.readAllChannelMessages === true;
			case 'groupChat':
				return settings?.groupChats === true && settings.readAllGroupMessages === true;
			default:
				return false;
		}
	}

	/** Only a direct message or a mention obliges the agent to answer. */
	getReplyExpectation({
		message,
		isNewMention,
	}: {
		message: { isMention?: boolean; raw: unknown };
		isNewMention: boolean;
	}): ReplyExpectation {
		if (isNewMention || message.isMention === true) return 'required';
		return conversationTypeOf(message.raw) === 'personal' ? 'required' : 'optional';
	}

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
	 * Only a direct message renders progressively. Post-and-edit would work in a
	 * channel too, but a message that visibly rewrites itself is far more
	 * disruptive there, so that stays a separate decision.
	 */
	async createBridgeExecutionContext(
		params: BridgeMessageContextParams,
	): Promise<BridgeExecutionContext> {
		const streamable = params.thread.isDM;
		return {
			platformAgentContext: {},
			...(params.replyExpectation === 'optional' ? { historyContext: OPTIONAL_REPLY_NOTE } : {}),
			forceBuffered: !streamable,
			// A queued message is only captured here; the turn that would clear the
			// indicator runs later, so starting one now leaves it refreshing alone.
			statusHandle:
				params.startStatus === false
					? undefined
					: this.startTyping(params.thread, params.logger, params.agentId),
		};
	}

	/** A card action arrives as an invoke activity, which carries no streamer. */
	async createResumeExecutionContext(params: {
		thread: BridgeMessageContextParams['thread'];
		logger: BridgeMessageContextParams['logger'];
		agentId: string;
	}): Promise<BridgeResumeExecutionContext> {
		return {
			forceBuffered: true,
			statusHandle: this.startTyping(params.thread, params.logger, params.agentId),
		};
	}

	private startTyping(
		thread: BridgeMessageContextParams['thread'],
		logger: BridgeMessageContextParams['logger'],
		agentId: string,
	) {
		return startTypingIndicator(thread, {
			logger,
			agentId,
			platform: 'Microsoft Teams',
			refreshMs: TEAMS_TYPING_REFRESH_MS,
		});
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
