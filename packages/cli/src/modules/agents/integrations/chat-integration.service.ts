import { AgentIntegrationConfig, type AgentIntegrationSettings } from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { OnLeaderStepdown, OnLeaderTakeover, OnPubSubEvent } from '@n8n/decorators';
import { Container, Service } from '@n8n/di';
import { ensureError } from '@n8n/utils/errors/ensure-error';
import type { Channel, Chat as ChatSdk, StateAdapter, Thread, UserInfo } from 'chat';
import { InstanceSettings } from 'n8n-core';
import { OperationalError, UnexpectedError } from 'n8n-workflow';

import { CredentialsService } from '@/credentials/credentials.service';
import { Publisher } from '@/scaling/pubsub/publisher.service';
import type { PubSubCommandMap } from '@/scaling/pubsub/pubsub.event-map';
import { UrlService } from '@/services/url.service';

import { AgentChatBridge } from './agent-chat-bridge';
import {
	ChatIntegrationRegistry,
	type AgentChatIntegration,
	type AgentChatIntegrationContext,
} from './agent-chat-integration';
import { AgentChatSubscriptionStateService } from './agent-chat-subscription-state.service';
import type { CallbackMetadata } from './callback-store';
import { ComponentMapper, type ShortenCallback } from './component-mapper';
import { loadChatSdk, loadMemoryState } from './esm-loader';
import { buildIntegrationConnectionId } from './integration-tools';
import {
	LEADER_CHANNEL_REQUEST_TIMEOUT_MS,
	LeaderChannelRelayService,
} from './leader-channel-relay.service';
import { channelIntegrationRecorder } from './recording/channel-integration-recorder';
import { recordAdapterCalls } from './recording/recording-adapter';
import type { Agent } from '../entities/agent.entity';
import { AgentRepository } from '../repositories/agent.repository';

// ---------------------------------------------------------------------------
// Chat SDK local interfaces
//
// The `chat` package is ESM-only, so we cannot import types at module level.
// These interfaces mirror the subset of the Chat SDK API we consume.
// ---------------------------------------------------------------------------

type WebhookHandler = (
	request: Request,
	options?: { waitUntil?: (task: Promise<unknown>) => void },
) => Promise<Response>;

export interface ChatInstance {
	initialize(): Promise<void>;
	shutdown(): Promise<void>;
	webhooks: Record<string, WebhookHandler>;
	onNewMention: (handler: unknown) => void;
	onSubscribedMessage: (handler: unknown) => void;
	onAction: (handler: unknown) => void;
	getAdapter(name: string): unknown;
	openDM(user: string): Promise<Thread>;
	thread(threadId: string): Thread;
	channel(channelId: string): Channel;
	getUser(user: string): Promise<UserInfo | null>;
}

interface ChatAgentConnection {
	chat: ChatInstance;
	bridge?: AgentChatBridge;
	/**
	 * Context captured at connect time. Used by `disconnectOne` to invoke
	 * `onBeforeDisconnect` hooks with the same decrypted credential the connect
	 * ran with — re-decrypting at disconnect time would fail if the credential
	 * was rotated or deleted in between.
	 */
	context: AgentChatIntegrationContext;
}

interface ConnectOptions {
	ingressEnabled?: boolean;
	skipExternalHooks?: boolean;
	settings?: AgentIntegrationSettings;
}

interface DisconnectOptions {
	/**
	 * Skip integration-defined external teardown.
	 * Mirror of `ConnectOptions.skipExternalHooks` — set true on peer mains
	 * reacting to a PubSub broadcast, in graceful-shutdown paths, and during
	 * leader-stepdown so the cluster-wide remote release happens exactly once.
	 */
	skipExternalHooks?: boolean;
}

interface DisconnectChannelOptions {
	deleteSubscriptions?: boolean;
}

async function getAgentExecutionOrchestratorService() {
	// eslint-disable-next-line import-x/no-cycle
	const { AgentExecutionOrchestratorService } = await import(
		'../agent-execution-orchestrator.service.js'
	);
	return Container.get(AgentExecutionOrchestratorService);
}

/**
 * Manages per-agent Chat SDK instances and their lifecycle.
 *
 * Each integration (e.g. Slack workspace) gets its own `Chat` instance keyed
 * by `agentId:type:credentialId`. This supports multiple integrations per agent
 * (two Slack workspaces, or Slack + Discord in the future).
 */
@Service()
export class ChatIntegrationService {
	private readonly connections = new Map<string, ChatAgentConnection>();
	private readonly outboundConnections = new Map<string, ChatAgentConnection>();
	private readonly outboundConnectionInitializations = new Map<
		string,
		Promise<ChatInstance | undefined>
	>();

	/**
	 * Leader-only operations this main is running as leader, keyed by connection
	 * key. Doubles as a dedupe map — a repeated request joins the running
	 * operation instead of racing it — and as the set a stepdown has to drain.
	 * The action is kept because only a matching one may join; see
	 * {@link runLeaderOperation}.
	 */
	private readonly leaderOperations = new Map<
		string,
		{ action: 'connect' | 'disconnect'; done: Promise<void> }
	>();

	constructor(
		private readonly logger: Logger,
		private readonly agentRepository: AgentRepository,
		private readonly credentialsService: CredentialsService,
		private readonly urlService: UrlService,
		private readonly integrationRegistry: ChatIntegrationRegistry,
		private readonly instanceSettings: InstanceSettings,
		private readonly publisher: Publisher,
		private readonly globalConfig: GlobalConfig,
		private readonly chatSubscriptionStateService: AgentChatSubscriptionStateService,
		private readonly leaderChannelRelay: LeaderChannelRelayService,
	) {}

	/**
	 * In multi-main mode, broadcast a connect/disconnect change so every other
	 * main reconciles its in-memory `connections` map. Single-instance setups
	 * skip the round-trip.
	 *
	 * The originating main has already applied the change locally before
	 * calling this — only peer mains need to act on the published command.
	 */
	async broadcastIntegrationChange(
		agentId: string,
		integration: AgentIntegrationConfig,
		action: 'connect' | 'disconnect',
	): Promise<void> {
		if (!this.globalConfig.multiMainSetup.enabled) return;
		try {
			const payload = { agentId, integration, action };
			await this.publisher.publishCommand({
				command: 'agent-chat-integration-changed',
				payload,
			});
		} catch (error) {
			this.logger.warn(
				`[ChatIntegrationService] Failed to publish ${action} for ${integration.type} on agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	private connectionKey(agentId: string, type: string, credentialId: string): string {
		return `${agentId}:${type}:${credentialId}`;
	}

	private integrationFromConnectionKey(key: string): AgentChatIntegration | undefined {
		const type = key.split(':')[1];
		return type ? this.integrationRegistry.get(type) : undefined;
	}

	async validateBeforeConnect(
		agentId: string,
		integration: AgentIntegrationConfig,
		projectId: string,
	): Promise<void> {
		const implementation = this.integrationRegistry.require(integration.type);
		implementation.validateConfig?.(integration);
		if (!implementation.onBeforeConnect) return;

		const credential = await this.decryptCredentialForProject(integration.credentialId, projectId);
		await implementation.onBeforeConnect({
			agentId,
			projectId,
			integration,
			credentialId: integration.credentialId,
			credential,
			ingressEnabled: true,
			webhookUrlFor: (platform) => this.buildWebhookUrl(agentId, projectId, platform),
		});
	}

	/**
	 * Connect an agent to a chat platform via the Chat SDK.
	 *
	 * A leader-only integration is routed to the leader and awaited — see
	 * {@link LeaderChannelRelayService}. Everything else connects locally on the
	 * main that was asked.
	 *
	 * `options.skipExternalHooks` skips `onBeforeConnect` and `onAfterConnect`.
	 * These hooks can touch external services and must run exactly once per
	 * cluster — by the originator on a user-initiated connect, or by the leader
	 * on startup. Peer mains reacting to a PubSub broadcast pass `true` so they
	 * only build local runtime state.
	 */
	async connect(
		agentId: string,
		integration: AgentIntegrationConfig,
		projectId: string,
		options: ConnectOptions = {},
	): Promise<void> {
		const ingress = options.ingressEnabled ?? true;
		if (!this.shouldRouteToLeader(integration.type, ingress)) {
			return await this.connectLocal(agentId, integration, projectId, options);
		}

		// Runtime state for this key on this main is ours alone and the leader knows
		// nothing about it: an outbound preview connection a local connect would have
		// replaced, or ingress state left over from a term as leader. Either way a
		// follower must hold neither once the leader owns this channel.
		await this.disconnectLocal(agentId, integration, { skipExternalHooks: true });

		try {
			await this.leaderChannelRelay.request({ agentId, integration, action: 'connect' });
		} catch (error) {
			// A lost acknowledgement can still leave the leader polling, which would
			// keep a runtime claim for a channel this request is about to report as
			// failed. Unacknowledged: the original failure is what the caller needs to
			// see, and a leader that did not answer the connect will not answer this.
			void this.leaderChannelRelay
				.requestWithoutAck({ agentId, integration, action: 'disconnect' })
				.catch((releaseError: unknown) => {
					this.logger.warn(
						`[ChatIntegrationService] Could not release the leader's runtime after a failed connect for ${integration.type} on agent ${agentId}: ${releaseError instanceof Error ? releaseError.message : String(releaseError)}`,
					);
				});
			throw error;
		}
	}

	private async connectLocal(
		agentId: string,
		integration: AgentIntegrationConfig,
		projectId: string,
		options: ConnectOptions = {},
	): Promise<void> {
		const key = this.connectionKey(agentId, integration.type, integration.credentialId);
		const ingressEnabled = options.ingressEnabled ?? true;

		if (ingressEnabled) {
			await this.disconnectOutboundOne(key);
			// Tear down existing connection if reconnecting
			if (this.connections.has(key)) {
				await this.disconnectOne(key);
			}
		}

		const integrationImpl = this.integrationRegistry.require(integration.type);

		// Decrypt the integration credential to get platform tokens
		const decryptedData = await this.decryptCredentialForProject(
			integration.credentialId,
			projectId,
		);

		const ctx: AgentChatIntegrationContext = {
			agentId,
			projectId,
			integration,
			credentialId: integration.credentialId,
			credential: decryptedData,
			ingressEnabled,
			webhookUrlFor: (platform) => this.buildWebhookUrl(agentId, projectId, platform),
		};

		// Pre-connect hook — webhook-based platforms use this to detect
		// credential conflicts (e.g. a Telegram bot token already in use) and
		// abort the connect before we touch any external API.
		if (ingressEnabled && integrationImpl.onBeforeConnect && !options.skipExternalHooks) {
			await integrationImpl.onBeforeConnect(ctx);
		}

		let state: StateAdapter | undefined;
		let chat!: ChatSdk;
		let bridge: AgentChatBridge | undefined;
		let initializeStarted = false;

		// Initialize the Chat instance (connects adapters, state adapter, etc.) and
		// run post-initialize hooks (e.g. Telegram setWebhook) once it is live.
		// If setup throws after registering subscription state but before
		// initialization starts, disconnect the state directly. Once initialize()
		// starts, chat.shutdown() owns cleanup for adapters, timers, and state.
		try {
			// Delegate adapter construction to the platform implementation.
			const adapter = recordAdapterCalls(
				integration.type,
				await integrationImpl.createAdapter(ctx),
			);
			channelIntegrationRecorder.startFetchRecording();

			// Dynamic imports — chat packages are ESM-only, use loader to bypass CJS transform
			const { Chat } = await loadChatSdk();
			const { createMemoryState } = await loadMemoryState();

			const memoryState = createMemoryState();
			state = ingressEnabled
				? this.chatSubscriptionStateService.createStateAdapter({
						agentId,
						integration,
						delegate: memoryState,
					})
				: memoryState;

			chat = new Chat({
				userName: `n8n-agent-${agentId}`,
				// Use the platform type as the adapter key (e.g. 'slack') so that
				// bot.webhooks.slack maps correctly to the handler.
				adapters: { [integration.type]: adapter } as Record<string, never>,
				state,
			});

			if (ingressEnabled) {
				const componentMapper = new ComponentMapper();
				const agentExecutionOrchestratorService = await getAgentExecutionOrchestratorService();

				bridge = AgentChatBridge.create(
					chat,
					agentId,
					agentExecutionOrchestratorService,
					componentMapper,
					this.logger,
					projectId,
					integration,
				);
			}

			initializeStarted = true;
			await chat.initialize();

			if (ingressEnabled && integrationImpl.onAfterConnect && !options.skipExternalHooks) {
				await integrationImpl.onAfterConnect(ctx);
			}
		} catch (error) {
			if (initializeStarted) {
				await chat.shutdown().catch((shutdownError: unknown) => {
					this.logger.warn(
						`[ChatIntegrationService] Shutdown after failed connect threw: ${shutdownError instanceof Error ? shutdownError.message : String(shutdownError)}`,
					);
				});
			} else {
				await state?.disconnect().catch((disconnectError: unknown) => {
					this.logger.warn(
						`[ChatIntegrationService] State cleanup after failed setup threw: ${disconnectError instanceof Error ? disconnectError.message : String(disconnectError)}`,
					);
				});
			}
			// Mirror of the `onConnected` call below. A platform that stashed
			// per-connection state during `createAdapter` — Discord keeps the
			// decrypted bot token there — must get the chance to release it, or a
			// failed connect strands it for the life of the process.
			await this.runDisconnectedHook(integrationImpl, ctx, `${key} after failed connect`);

			throw error;
		}

		// The `chat` variable is returned by `new Chat(...)` from the ESM-only
		// package. Its runtime shape matches our local `ChatInstance` interface.
		// We validate the required methods exist before storing.
		const chatInstance = chat as ChatInstance;

		const targetConnections = ingressEnabled ? this.connections : this.outboundConnections;
		targetConnections.set(key, {
			chat: chatInstance,
			bridge,
			context: ctx,
		});

		// Runs on every main, never gated on `skipExternalHooks`: this builds
		// local runtime state each main owns for itself (e.g. Discord's
		// leader-gated Gateway socket), not cluster-wide external state.
		if (integrationImpl.onConnected) {
			try {
				await integrationImpl.onConnected(ctx);
			} catch (error) {
				this.logger.warn(
					`[ChatIntegrationService] onConnected failed for ${key}: ${error instanceof Error ? error.message : String(error)}`,
				);
			}
		}

		this.logger.info(
			`[ChatIntegrationService] ${ingressEnabled ? 'Connected' : 'Outbound connected'}: ${key}`,
		);
	}

	/**
	 * Disconnect one or all integrations for an agent.
	 * If `type` and `credentialId` are provided, disconnects only that integration.
	 * Otherwise disconnects all integrations for the agent.
	 *
	 * A leader-only integration lives on the leader, so its teardown is routed
	 * there and awaited — see {@link LeaderChannelRelayService}.
	 *
	 * `options.skipExternalHooks` skips `onBeforeDisconnect` — set this on peer
	 * mains reacting to a PubSub broadcast so the cluster-wide remote release
	 * happens exactly once.
	 */
	async disconnect(
		agentId: string,
		integration?: { credentialId: string; type: string },
		options: DisconnectOptions = {},
	): Promise<void> {
		if (!integration) {
			const keysToRemove = new Set(
				[
					...this.connections.keys(),
					...this.outboundConnections.keys(),
					...this.outboundConnectionInitializations.keys(),
				].filter((key) => key.startsWith(`${agentId}:`)),
			);
			for (const k of keysToRemove) {
				await this.disconnectOne(k, options);
				await this.disconnectOutboundOne(k);
			}
			return;
		}

		// A draft reference (`credentialId: ''`) is not a live connection on any main,
		// so there is nothing for the leader to release — only local state to clear.
		if (integration.credentialId !== '' && this.shouldRouteToLeader(integration.type, true)) {
			// Whatever this main still holds for the key is local state the leader does
			// not know about; external teardown is the leader's to run.
			await this.disconnectLocal(agentId, integration, { skipExternalHooks: true });
			await this.leaderChannelRelay.request({ agentId, integration, action: 'disconnect' });
			return;
		}

		await this.disconnectLocal(agentId, integration, options);
	}

	/**
	 * Remove a chat channel everywhere. Persisted thread subscriptions are deleted
	 * by default for real integration removals, but can be preserved for unpublish.
	 */
	async disconnectChannel(
		agentId: string,
		integration: AgentIntegrationConfig,
		options: DisconnectChannelOptions = {},
	): Promise<void> {
		const { deleteSubscriptions = true } = options;

		try {
			await this.disconnect(agentId, integration);
		} catch (error) {
			this.logger.warn(
				`[ChatIntegrationService] Disconnect failed for ${integration.type} on agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		// Outside the catch above: the broadcast is what clears peers holding runtime
		// for a channel that is going away, so a teardown that failed — a leader that
		// did not acknowledge in time — is the case that needs it most.
		await this.broadcastIntegrationChange(agentId, integration, 'disconnect');

		if (!deleteSubscriptions) return;

		try {
			await this.chatSubscriptionStateService.deleteSubscriptionsForIntegration(
				agentId,
				integration,
			);
		} catch (error) {
			this.logger.warn(
				`[ChatIntegrationService] Subscription cleanup failed for ${integration.type} on agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Disconnect every active integration regardless of type. Used by tests and
	 * for explicit shutdown paths; the leader-stepdown lifecycle uses
	 * {@link disconnectLeaderOnlyIntegrations} so webhook integrations keep
	 * answering on the demoted main (now a follower).
	 */
	async disconnectAll(): Promise<void> {
		const keys = new Set([
			...this.connections.keys(),
			...this.outboundConnections.keys(),
			...this.outboundConnectionInitializations.keys(),
		]);
		for (const key of keys) {
			// Graceful shutdown should only clear local runtime state. Cluster-wide
			// remote state must survive so another main can keep receiving events.
			await this.disconnectOne(key, { skipExternalHooks: true });
			await this.disconnectOutboundOne(key);
		}
	}

	/**
	 * On leader stepdown, release only the integrations that require leader
	 * exclusivity (e.g. Telegram polling). Webhook-driven integrations stay
	 * connected on the demoted main so it can keep handling inbound webhooks
	 * routed to it by the load balancer.
	 */
	@OnLeaderStepdown()
	async disconnectLeaderOnlyIntegrations(): Promise<void> {
		// A connect this main accepted as leader can still be starting up. Let it
		// finish so the sweep below sees its connection, instead of leaving a poller
		// running on a main that no longer leads. Stepdown handlers run concurrently,
		// so the drain has to be awaited here rather than ordered between handlers.
		await this.settleLeaderOperations();

		for (const key of [...this.connections.keys()]) {
			const integration = this.integrationFromConnectionKey(key);
			if (integration?.requiresLeader()) {
				await this.disconnectOne(key, { skipExternalHooks: true });
			}
		}
	}

	/**
	 * Diff the previous and next chat integrations of an agent and reconcile
	 * runtime connections accordingly. Used by `AgentConfigService.updateConfig`
	 * after the builder writes a new integrations array, and by
	 * `AgentPublishService.publishAgent` to wake up integrations that were persisted
	 * while the agent was still a draft.
	 *
	 * Disconnects of removed integrations always run (so unpublishing-then-
	 * editing works). Connects of newly-added integrations are gated on
	 * `agent.activeVersionId` — matching the controller's connect endpoint,
	 * which persists configuration but skips runtime connection for unpublished
	 * agents, and `reconnectAll`, which only restores published agents. The
	 * integration entry stays persisted on the entity so it can be picked up
	 * later by `publishAgent` calling this method again.
	 *
	 * Connection failures are logged at the call site — this method propagates
	 * errors from disconnect but swallows connect errors per integration so a
	 * single bad credential doesn't block the others.
	 */
	async syncToConfig(
		agent: Agent,
		previous: AgentIntegrationConfig[],
		next: AgentIntegrationConfig[],
	): Promise<void> {
		const previousKeys = new Set(previous.map(buildIntegrationConnectionId));
		const nextKeys = new Set(next.map(buildIntegrationConnectionId));

		for (const integration of previous) {
			if (!nextKeys.has(buildIntegrationConnectionId(integration))) {
				await this.disconnectChannel(agent.id, integration);
			}
		}

		const additions = next.filter((i) => !previousKeys.has(buildIntegrationConnectionId(i)));

		if (additions.length > 0 && !agent.activeVersionId) {
			this.logger.debug(
				'[ChatIntegrationService] Skipping connect for unpublished agent — entry persisted, will connect on publish',
				{ agentId: agent.id, pendingTypes: additions.map((i) => i.type) },
			);
			return;
		}

		for (const integration of additions) {
			const key = this.connectionKey(agent.id, integration.type, integration.credentialId);
			if (this.connections.has(key)) continue;

			try {
				await this.connect(agent.id, integration, agent.projectId);
				await this.broadcastIntegrationChange(agent.id, integration, 'connect');
			} catch (error) {
				this.logger.warn('[ChatIntegrationService] Could not connect integration during sync', {
					agentId: agent.id,
					type: integration.type,
					credentialId: integration.credentialId,
					error,
				});
			}
		}
	}

	/**
	 * Return the first live Chat instance for an agent, or undefined if not connected.
	 */
	getChatInstance(
		agentId: string,
		integration?: { type: string; credentialId: string },
	): ChatInstance | undefined {
		if (integration) {
			return this.connections.get(
				this.connectionKey(agentId, integration.type, integration.credentialId),
			)?.chat;
		}
		for (const [k, conn] of this.connections) {
			if (k.startsWith(`${agentId}:`)) return conn.chat;
		}
		return undefined;
	}

	/**
	 * Whether a runtime for this channel is live, as far as this main can tell.
	 *
	 * Read it as "do not create or tear down", not as proof of a running poller: a
	 * leader-only channel routed to the leader is deliberately absent from this
	 * main's `connections` map and cannot be inspected from here, so this reports
	 * `true` for one without checking. That is the useful answer for both callers —
	 * a follower must neither restart a channel the leader just started nor tear
	 * down one it cannot see — but a caller needing certainty has to ask the leader.
	 */
	isChannelLive(agentId: string, integration: { type: string; credentialId: string }): boolean {
		if (this.shouldRouteToLeader(integration.type, true)) return true;
		return this.getChatInstance(agentId, integration) !== undefined;
	}

	/**
	 * Return a Chat instance for integration tools, creating a no-ingress
	 * outbound connection on demand for a persisted draft integration.
	 */
	async getChatInstanceForTools(
		agentId: string,
		integration: { type: string; credentialId: string },
	): Promise<ChatInstance | undefined> {
		const live = this.getChatInstance(agentId, integration);
		if (live) return live;

		const key = this.connectionKey(agentId, integration.type, integration.credentialId);
		const handleInitializationError = (error: unknown) => {
			this.logger.warn(
				'[ChatIntegrationService] Could not initialize outbound integration for Preview',
				{
					agentId,
					type: integration.type,
					credentialId: integration.credentialId,
					error,
				},
			);
			return undefined;
		};
		const agent = await this.agentRepository
			.findOne({ where: { id: agentId } })
			.catch(handleInitializationError);
		const persistedIntegration = agent?.integrations?.find(
			(candidate) =>
				candidate.type === integration.type && candidate.credentialId === integration.credentialId,
		);
		if (!agent || agent.activeVersionId !== null || !persistedIntegration) {
			await this.disconnectOutboundOne(key);
			return undefined;
		}

		const currentLive = this.getChatInstance(agentId, integration);
		if (currentLive) return currentLive;

		const outbound = this.outboundConnections.get(key)?.chat;
		if (outbound) return outbound;

		const pending = this.outboundConnectionInitializations.get(key);
		if (pending) return await pending;

		const initialization = this.connect(agentId, persistedIntegration, agent.projectId, {
			ingressEnabled: false,
		})
			.then(() => this.outboundConnections.get(key)?.chat)
			.catch(handleInitializationError);
		this.outboundConnectionInitializations.set(key, initialization);

		try {
			return await initialization;
		} finally {
			if (this.outboundConnectionInitializations.get(key) === initialization) {
				this.outboundConnectionInitializations.delete(key);
			}
		}
	}

	getShortenCallback(
		agentId: string,
		integration: { type: string; credentialId: string },
		metadata?: CallbackMetadata,
	): ShortenCallback | undefined {
		return this.connections
			.get(this.connectionKey(agentId, integration.type, integration.credentialId))
			?.bridge?.getShortenCallback(metadata);
	}

	/**
	 * Return the webhook handler for a specific platform on an agent.
	 * This is the pre-built handler from `bot.webhooks[platform]` that
	 * accepts a Web API Request and returns a Web API Response.
	 *
	 * Looks up the connection by platform so that the correct Chat instance
	 * is used when an agent has multiple integrations (e.g. Slack + Discord).
	 *
	 * An optional platform-owned selector distinguishes multiple connections of
	 * the same type. It is only a routing hint; the selected adapter still
	 * authenticates the request.
	 */
	getWebhookHandler(
		agentId: string,
		platform: string,
		connectionSelector?: string,
	): WebhookHandler | undefined {
		const integration = this.integrationRegistry.get(platform);
		for (const [key, conn] of this.connections) {
			if (!key.startsWith(`${agentId}:${platform}:`)) continue;
			if (
				connectionSelector !== undefined &&
				!integration?.matchesWebhookConnection?.(conn.context.credential, connectionSelector)
			) {
				continue;
			}
			return conn.chat.webhooks[platform];
		}
		return undefined;
	}

	/**
	 * Reconnect all agents that have integrations configured. Called on startup
	 * (every main) and on `leader-takeover` in multi-main mode.
	 *
	 * Webhook-driven integrations connect on every main so that inbound webhooks
	 * load-balanced across mains always find a live handler. Integrations that
	 * declare `requiresLeader()` (e.g. Telegram polling) only connect on the
	 * leader so a single instance owns the long-poll loop.
	 *
	 * Already-connected keys are skipped so this is a safe idempotent operation
	 * — important for leader takeover, where a former follower already holds
	 * webhook integrations and only needs to add the leader-only ones.
	 */
	@OnLeaderTakeover()
	async reconnectAll(): Promise<void> {
		// Only reconnect integrations for published agents — an unpublished agent must not
		// receive events, so we don't even load it.
		const agents = await this.agentRepository.findPublished();
		for (const agent of agents) {
			if (!agent.integrations || agent.integrations.length === 0) continue;
			for (const integration of agent.integrations) {
				const definition = this.integrationRegistry.get(integration.type);
				if (definition?.requiresLeader() && !this.instanceSettings.isLeader) {
					this.logger.debug(
						`[ChatIntegrationService] Skipping ${integration.type} for agent ${agent.id} — leader-only and this main is a follower`,
					);
					continue;
				}

				const key = this.connectionKey(agent.id, integration.type, integration.credentialId);
				if (this.connections.has(key)) continue;

				// External setup runs once per cluster — the leader claims that role
				// on startup; followers only build local runtime state.
				const skipExternalHooks = !this.instanceSettings.isLeader;
				const options = this.connectOptionsFor(integration, skipExternalHooks);

				try {
					await this.connect(agent.id, integration, agent.projectId, options);
				} catch (error) {
					this.logger.error(
						`[ChatIntegrationService] Failed to reconnect ${integration.type} for agent ${agent.id} — credential not accessible to the project: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			}
		}
	}

	/**
	 * Reconcile a single integration when notified via PubSub by another main.
	 *
	 * The originating main (the one that handled the user's connect/disconnect
	 * request) updated its own state synchronously before publishing — this
	 * handler runs on every other main so all `connections` maps stay aligned.
	 *
	 * On `connect`, integrations that require the leader are skipped on
	 * followers. On `disconnect`, the integration is always torn down regardless
	 * of role.
	 */
	@OnPubSubEvent('agent-chat-integration-changed', { instanceType: 'main' })
	async handleIntegrationChanged(
		payload: PubSubCommandMap['agent-chat-integration-changed'],
	): Promise<void> {
		const { agentId, integration, action } = payload;
		const { type, credentialId } = integration;

		if (action === 'disconnect') {
			// The originating main already ran integration-defined external teardown.
			// Peers only clear local runtime state to avoid duplicate external side
			// effects — and this must stay local, or a follower would relay a teardown
			// the originator has already had the leader perform.
			await this.disconnectLocal(agentId, integration, { skipExternalHooks: true });
			return;
		}

		const definition = this.integrationRegistry.get(type);
		if (definition?.requiresLeader() && !this.instanceSettings.isLeader) {
			this.logger.debug(
				`[ChatIntegrationService] Ignoring connect for ${type} on agent ${agentId} — leader-only integration on follower`,
			);
			return;
		}

		const key = this.connectionKey(agentId, type, credentialId);
		if (this.connections.has(key)) return;

		const agent = await this.agentRepository.findOne({ where: { id: agentId } });
		if (!agent) {
			this.logger.warn(
				`[ChatIntegrationService] Cannot connect ${type} — agent ${agentId} not found`,
			);
			return;
		}

		try {
			// The originating main already ran integration-defined external setup.
			// Peers only build local runtime state to avoid duplicate external
			// side effects.
			const options: ConnectOptions = { skipExternalHooks: true };
			await this.connectLocal(agentId, integration, agent.projectId, options);
		} catch (error) {
			this.logger.error(
				`[ChatIntegrationService] Failed to connect ${type} for agent ${agentId} — credential not accessible to the project: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	/**
	 * Execute a leader-only channel operation another main asked us to run, and
	 * acknowledge the outcome so that main can report it to the user.
	 *
	 * The `instanceRole` filter is re-evaluated per event, so a follower that once
	 * led never picks this up. Operations for the same connection key are
	 * serialised and joined by the relay, which makes a repeated connect or
	 * disconnect request idempotent rather than a teardown-rebuild race.
	 */
	@OnPubSubEvent('agent-chat-leader-channel-request', {
		instanceType: 'main',
		instanceRole: 'leader',
	})
	async handleLeaderChannelRequest(
		payload: PubSubCommandMap['agent-chat-leader-channel-request'],
	): Promise<void> {
		const { agentId, integration, action } = payload;
		const key = this.connectionKey(agentId, integration.type, integration.credentialId);

		try {
			await this.runLeaderOperation(key, action, async () => {
				if (action === 'disconnect') {
					await this.disconnectLocal(agentId, integration);
					return;
				}

				// No "already connected, nothing to do" shortcut: the connection key
				// excludes settings, so a settings-only save arrives on a live key and
				// has to rebuild — same as a local connect does. Duplicate requests are
				// deduped by `runLeaderOperation`, not by inspecting the runtime.
				const agent = await this.agentRepository.findOne({ where: { id: agentId } });
				if (!agent) {
					throw new UnexpectedError(`Agent ${agentId} not found on the leader instance`);
				}

				await this.connectLocal(agentId, integration, agent.projectId);

				// Leadership can change during startup. A poller must not outlive our
				// term, and the requester has to hear that its channel is not running.
				if (!this.instanceSettings.isLeader) {
					await this.disconnectOne(key, { skipExternalHooks: true });
					throw new OperationalError(
						'This instance stopped being the leader while the channel was starting up',
					);
				}
			});
			await this.leaderChannelRelay.respond(payload);
		} catch (error) {
			const failure = ensureError(error);
			this.logger.warn(
				`[ChatIntegrationService] Leader-only ${action} failed for ${key}: ${failure.message}`,
			);
			await this.leaderChannelRelay.respond(payload, failure);
		}
	}

	// ---------------------------------------------------------------------------
	// Private helpers
	// ---------------------------------------------------------------------------

	/**
	 * Whether this main has to hand the operation to the leader instead of running
	 * it locally. Whether ingress makes a connection leader-bound is the
	 * integration's call, not ours.
	 */
	private shouldRouteToLeader(type: string, ingressEnabled: boolean): boolean {
		return (
			this.globalConfig.multiMainSetup.enabled &&
			!this.instanceSettings.isLeader &&
			this.integrationRegistry.get(type)?.requiresLeader({ ingressEnabled }) === true
		);
	}

	/**
	 * Run a leader-only operation for one channel, serialised against whatever else
	 * is running for the same channel.
	 *
	 * A request for the action already in flight joins it, so a retry or a lost
	 * acknowledgement costs nothing and reports the same outcome. A request for the
	 * *other* action queues behind it instead: joining would have a teardown report
	 * success while the connect it joined leaves the leader polling a channel the
	 * caller has already deleted.
	 */
	private async runLeaderOperation(
		key: string,
		action: 'connect' | 'disconnect',
		operation: () => Promise<void>,
	): Promise<void> {
		const running = this.leaderOperations.get(key);
		if (running?.action === action) return await running.done;

		// Its failure is its own requester's to report, so only the ordering matters
		// here.
		const previous = running?.done.catch(() => {});

		const entry = {
			action,
			done: (async () => {
				await previous;
				await operation();
			})(),
		};
		// Registered before the first await, so a request arriving mid-operation
		// chains onto this one rather than the one it replaced.
		this.leaderOperations.set(key, entry);

		try {
			await entry.done;
		} finally {
			if (this.leaderOperations.get(key) === entry) this.leaderOperations.delete(key);
		}
	}

	/**
	 * Wait for leader-only operations to finish so a stepdown sweep sees the
	 * connections they register.
	 *
	 * Bounded, because an operation is only as bounded as the platform call inside
	 * it and a stepdown cannot wait forever. A straggler that lands after the
	 * deadline releases itself: the connect path re-checks leadership and tears its
	 * own connection down.
	 */
	private async settleLeaderOperations(): Promise<void> {
		const running = [...this.leaderOperations.values()];
		if (running.length === 0) return;

		let expire: NodeJS.Timeout | undefined;
		try {
			await Promise.race([
				Promise.allSettled(running.map(async ({ done }) => await done)),
				new Promise<void>((resolve) => {
					expire = setTimeout(resolve, LEADER_CHANNEL_REQUEST_TIMEOUT_MS);
				}),
			]);
		} finally {
			clearTimeout(expire);
		}
	}

	private async disconnectLocal(
		agentId: string,
		integration: { credentialId: string; type: string },
		options: DisconnectOptions = {},
	): Promise<void> {
		const key = this.connectionKey(agentId, integration.type, integration.credentialId);
		await this.disconnectOne(key, options);
		await this.disconnectOutboundOne(key);
	}

	private async disconnectOutboundOne(key: string): Promise<void> {
		await this.outboundConnectionInitializations.get(key);
		await this.disposeOutboundConnection(key);
	}

	private async disposeOutboundConnection(key: string): Promise<void> {
		const conn = this.outboundConnections.get(key);
		if (!conn) return;

		try {
			await conn.chat.shutdown();
		} catch (error) {
			this.logger.warn(
				`[ChatIntegrationService] Error during outbound shutdown for ${key}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		this.outboundConnections.delete(key);

		// Outbound connections never pass through `disconnectOne`, so release
		// per-connection platform state (e.g. Discord pending/Gateway token)
		// here. Ingress teardown already does this in `disconnectOne`.
		await this.runDisconnectedHook(
			this.integrationFromConnectionKey(key),
			conn.context,
			`outbound ${key}`,
		);

		this.logger.info(`[ChatIntegrationService] Outbound disconnected: ${key}`);
	}

	private async disconnectOne(key: string, options: DisconnectOptions = {}): Promise<void> {
		const conn = this.connections.get(key);
		if (!conn) return;

		// External teardown runs while the chat is still live — symmetric with
		// `onAfterConnect`, which runs after `chat.initialize()`. Errors are
		// logged but never re-thrown: local teardown must always complete so a
		// transient remote failure can't leak in-process resources.
		if (!options.skipExternalHooks) {
			const integration = this.integrationFromConnectionKey(key);
			if (integration?.onBeforeDisconnect) {
				try {
					await integration.onBeforeDisconnect(conn.context);
				} catch (error) {
					this.logger.warn(
						`[ChatIntegrationService] onBeforeDisconnect failed for ${key}: ${error instanceof Error ? error.message : String(error)}`,
					);
				}
			}
		}

		try {
			await conn.chat.shutdown();
		} catch (error) {
			this.logger.warn(
				`[ChatIntegrationService] Error during shutdown for ${key}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		this.connections.delete(key);

		// Mirror of the `onConnected` call in `connect()`: always runs, so every
		// main releases the local runtime state it built for this connection.
		await this.runDisconnectedHook(this.integrationFromConnectionKey(key), conn.context, key);

		this.logger.info(`[ChatIntegrationService] Disconnected: ${key}`);
	}

	private async runDisconnectedHook(
		integration: AgentChatIntegration | undefined,
		context: AgentChatIntegrationContext,
		label: string,
	): Promise<void> {
		if (!integration?.onDisconnected) return;
		try {
			await integration.onDisconnected(context);
		} catch (error) {
			this.logger.warn(
				`[ChatIntegrationService] onDisconnected failed for ${label}: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}

	private async decryptCredentialForProject(
		credentialId: string,
		projectId: string,
	): Promise<Record<string, unknown>> {
		const projectCredentials =
			await this.credentialsService.findAllCredentialIdsForProject(projectId);
		const globalCredentials = await this.credentialsService.findAllGlobalCredentialIds(true);
		const credential =
			projectCredentials.find((c) => c.id === credentialId) ??
			globalCredentials.find((c) => c.id === credentialId);
		if (!credential) {
			throw new Error(
				`Credential ${credentialId} not found or not accessible to project ${projectId}`,
			);
		}
		const decrypted = await this.credentialsService.decrypt(credential, true);
		return decrypted as Record<string, unknown>;
	}

	private buildWebhookUrl(agentId: string, projectId: string, platform: string): string {
		// getWebhookBaseUrl returns the URL with a trailing slash, honours the
		// WEBHOOK_URL env var used by n8n's other webhook triggers.
		const base = this.urlService.getWebhookBaseUrl();
		return `${base}rest/projects/${projectId}/agents/v2/${agentId}/webhooks/${platform}`;
	}

	private connectOptionsFor(
		integration: AgentIntegrationConfig,
		skipExternalHooks: boolean,
	): ConnectOptions {
		return 'settings' in integration
			? { skipExternalHooks, settings: integration.settings }
			: { skipExternalHooks };
	}
}
