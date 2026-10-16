import type { McpHttpHandler, ServerEventBus } from '@modelcontextprotocol/server';
import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import { OnPubSubEvent, OnShutdown } from '@n8n/decorators';
import { Service } from '@n8n/di';
import { lazyImport } from '@n8n/utils/lazy-import';
import { LRUCache } from 'lru-cache';
import { OperationalError } from 'n8n-workflow';
import { createHash } from 'node:crypto';

import type { PubSubEventMap } from '@/scaling/pubsub/pubsub.event-map';
import { Publisher } from '@/scaling/pubsub/publisher.service';

import type { McpAuthContext, McpClientInfo } from './mcp.types';

const MAX_SUBSCRIPTIONS = 1024;

@Service()
export class McpToolChangeService {
	private readonly revisions = new LRUCache<string, string>({ max: 1024 });
	private readonly localRevisions = new LRUCache<string, string>({ max: 1024 });
	private readonly channels = new Map<string, { bus: ServerEventBus; subscribers: number }>();
	private readonly handlers = new Set<McpHttpHandler>();
	private subscriptions = 0;

	constructor(
		private readonly globalConfig: GlobalConfig,
		private readonly publisher: Publisher,
		private readonly logger: Logger,
	) {}

	getChannel(userId: string, auth: McpAuthContext, client?: McpClientInfo): string {
		return createHash('sha256')
			.update(
				JSON.stringify([
					userId,
					auth.caller?.authType,
					auth.caller?.clientId,
					auth.grantedScopes ? [...new Set(auth.grantedScopes)].sort() : null,
					client?.name,
					client?.version,
				]),
			)
			.digest('hex');
	}

	async getBus(channel: string): Promise<ServerEventBus> {
		const { InMemoryServerEventBus } = await lazyImport<
			typeof import('@modelcontextprotocol/server')
		>(async () => await import('@modelcontextprotocol/server'));
		return {
			publish: (event) => this.channels.get(channel)?.bus.publish(event),
			subscribe: (listener) => {
				if (this.subscriptions >= MAX_SUBSCRIPTIONS) {
					throw new OperationalError('MCP subscription limit reached');
				}
				let entry = this.channels.get(channel);
				if (!entry) {
					entry = {
						bus: new InMemoryServerEventBus((error) => this.logger.error(error.message)),
						subscribers: 0,
					};
					this.channels.set(channel, entry);
				}
				const unsubscribe = entry.bus.subscribe(listener);
				entry.subscribers++;
				this.subscriptions++;
				let active = true;
				// Refresh after every connection. A deployment can interrupt the change notification.
				queueMicrotask(() => {
					if (!active) return;
					try {
						listener({ kind: 'tools_list_changed' });
					} catch (error) {
						this.logger.error('Failed to refresh MCP tools', { error });
					}
				});
				return () => {
					if (!active) return;
					active = false;
					unsubscribe();
					entry.subscribers--;
					this.subscriptions--;
					if (entry.subscribers === 0) this.channels.delete(channel);
				};
			},
		};
	}

	observe(channel: string, revision: string): void {
		// Peer revisions must not make an unchanged local server publish again.
		if (this.localRevisions.get(channel) === revision) return;
		this.localRevisions.set(channel, revision);
		this.applyRevision(channel, revision);
		if (!this.globalConfig.multiMainSetup.enabled) return;
		void this.publisher
			.publishCommand({ command: 'mcp-tools-changed', payload: { channel, revision } })
			.catch((error: unknown) => {
				if (this.localRevisions.get(channel) === revision) this.localRevisions.delete(channel);
				this.logger.warn('Failed to notify other main processes of MCP tool changes', { error });
			});
	}

	@OnPubSubEvent('mcp-tools-changed', { instanceType: 'main' })
	onToolsChanged(payload: PubSubEventMap['mcp-tools-changed']): void {
		this.applyRevision(payload.channel, payload.revision);
	}

	private applyRevision(channel: string, revision: string): void {
		if (this.revisions.get(channel) === revision) return;
		this.revisions.set(channel, revision);
		this.channels.get(channel)?.bus.publish({ kind: 'tools_list_changed' });
	}

	track(handler: McpHttpHandler): () => void {
		this.handlers.add(handler);
		return () => {
			this.handlers.delete(handler);
		};
	}

	@OnShutdown()
	async shutdown(): Promise<void> {
		await Promise.allSettled([...this.handlers].map(async (handler) => await handler.close()));
		this.handlers.clear();
		this.channels.clear();
		this.revisions.clear();
		this.localRevisions.clear();
	}
}
