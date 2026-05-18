import { Service } from '@n8n/di';
import { z } from 'zod';

import { ChatIntegrationService } from './chat-integration.service';
import type {
	IntegrationContextQuery,
	IntegrationContextQueryExecutor,
	IntegrationToolConnectionDescriptor,
} from './integration-tools';

const getUserInputSchema = z.object({
	userId: z.string().min(1),
});

const getChannelInfoInputSchema = z.object({
	channelId: z.string().min(1),
});

@Service()
export class ChatIntegrationContextQueryExecutor implements IntegrationContextQueryExecutor {
	constructor(private readonly chatIntegrationService: ChatIntegrationService) {}

	async execute(params: {
		descriptor: IntegrationToolConnectionDescriptor;
		query: IntegrationContextQuery;
		input: Record<string, unknown>;
		persistence?: { threadId: string; resourceId: string };
	}): Promise<unknown> {
		if (!params.descriptor.agentId) {
			return connectionUnavailable();
		}
		const chat = this.chatIntegrationService.getChatInstance(params.descriptor.agentId, {
			type: params.descriptor.integration.type,
			credentialId: params.descriptor.integration.credentialId,
		});
		if (!chat) {
			return connectionUnavailable();
		}

		try {
			if (params.query === 'get_user') {
				const input = getUserInputSchema.parse(params.input);
				const user = await chat.getUser(input.userId);
				return { ok: true, user };
			}

			if (params.query !== 'get_channel_info') {
				return {
					ok: false,
					error: {
						code: 'UNSUPPORTED_QUERY',
						message: `Unsupported context query: ${params.query}`,
					},
				};
			}

			const input = getChannelInfoInputSchema.parse(params.input);
			const channel = chat.channel(
				normalizePlatformId(params.descriptor.integration.type, input.channelId),
			);
			const channelInfo = await channel.fetchMetadata();
			return { ok: true, channel: channelInfo };
		} catch (error) {
			return {
				ok: false,
				error: {
					code: 'CONTEXT_QUERY_FAILED',
					message: error instanceof Error ? error.message : String(error),
				},
			};
		}
	}
}

function connectionUnavailable() {
	return {
		ok: false,
		error: {
			code: 'CONNECTION_NOT_AVAILABLE',
			message: 'The integration connection is not currently available.',
		},
	};
}

function normalizePlatformId(platform: string, id: string): string {
	return id.includes(':') ? id : `${platform}:${id}`;
}
