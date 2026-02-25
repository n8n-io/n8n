import { Logger } from '@n8n/backend-common';
import { GlobalConfig } from '@n8n/config';
import type { InstanceAiConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import type { User } from '@n8n/db';
import { createInstanceAgent, McpClientManager } from '@n8n/instance-ai';
import type { McpServerConfig } from '@n8n/instance-ai';

import { InstanceAiAdapterService } from './instance-ai.adapter.service';

@Service()
export class InstanceAiService {
	private readonly mcpClientManager = new McpClientManager();

	private readonly instanceAiConfig: InstanceAiConfig;

	private readonly dbType: string;

	private readonly postgresConfig: {
		user: string;
		password: string;
		host: string;
		port: number;
		database: string;
	};

	constructor(
		private readonly logger: Logger,
		globalConfig: GlobalConfig,
		private readonly adapterService: InstanceAiAdapterService,
	) {
		this.instanceAiConfig = globalConfig.instanceAi;
		this.dbType = globalConfig.database.type;
		this.postgresConfig = globalConfig.database.postgresdb;
	}

	isEnabled(): boolean {
		return !!this.instanceAiConfig.model;
	}

	async sendMessage(
		user: User,
		threadId: string,
		message: string,
	): Promise<ReadableStream<string>> {
		const context = this.adapterService.createContext(user);

		const mcpServers = this.parseMcpServers(this.instanceAiConfig.mcpServers);

		const postgresUrl = this.buildPostgresUrl();

		const agent = await createInstanceAgent({
			modelId: this.instanceAiConfig.model,
			context,
			mcpServers,
			memoryConfig: {
				postgresUrl,
				embedderModel: this.instanceAiConfig.embedderModel || undefined,
				lastMessages: this.instanceAiConfig.lastMessages,
				semanticRecallTopK: this.instanceAiConfig.semanticRecallTopK,
			},
		});

		const result = await agent.stream(message, {
			memory: {
				resource: user.id,
				thread: threadId,
			},
		});

		return result.textStream as ReadableStream<string>;
	}

	async shutdown(): Promise<void> {
		await this.mcpClientManager.disconnect();
		this.logger.debug('Instance AI service shut down');
	}

	private parseMcpServers(raw: string): McpServerConfig[] {
		if (!raw.trim()) return [];

		return raw.split(',').map((entry) => {
			const [name, url] = entry.trim().split('=');
			return { name: name.trim(), url: url?.trim() };
		});
	}

	private buildPostgresUrl(): string {
		if (this.dbType === 'postgresdb') {
			const pg = this.postgresConfig;
			return `postgresql://${pg.user}:${pg.password}@${pg.host}:${pg.port}/${pg.database}`;
		}
		// Fallback for SQLite — use a local file-based store path
		return 'file:instance-ai-memory.db';
	}
}
