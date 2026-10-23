import { Service } from '@n8n/di';
import { DataSource, Repository } from '@n8n/typeorm';
import { isRecord } from '@n8n/utils/is-record';
import { jsonParse } from 'n8n-workflow';

import { AgentResourceEntity } from '../entities/agent-resource.entity';

/** The active session of an integration conversation. */
export interface ChatSessionGeneration {
	/** Rotation counter for a base thread id; 0 means the original, unsuffixed thread. */
	generation: number;
	lastActivityAt: number;
}

const CHAT_SESSION_GENERATION_KEY = 'chatSessionGeneration';

@Service()
export class AgentResourceRepository extends Repository<AgentResourceEntity> {
	constructor(dataSource: DataSource) {
		super(AgentResourceEntity, dataSource.manager);
	}

	async ensureExists(resourceId: string): Promise<void> {
		// Concurrent callers can create the same resource. Keep the first row.
		await this.createQueryBuilder()
			.insert()
			.into(AgentResourceEntity)
			.values({ id: resourceId, metadata: null })
			.orIgnore()
			.execute();
	}

	/**
	 * The session pointer is stored on the resource row of the base thread id,
	 * because session deletion removes thread rows but never resource rows.
	 */
	async findChatSessionGeneration(baseThreadId: string): Promise<ChatSessionGeneration | null> {
		const resource = await this.findOneBy({ id: baseThreadId });
		const value = parseMetadata(resource?.metadata)[CHAT_SESSION_GENERATION_KEY];
		return isChatSessionGeneration(value) ? value : null;
	}

	/** Keeps the other metadata keys of the row. */
	async saveChatSessionGeneration(
		baseThreadId: string,
		session: ChatSessionGeneration,
	): Promise<void> {
		const resource = await this.findOneBy({ id: baseThreadId });
		const metadata = {
			...parseMetadata(resource?.metadata),
			[CHAT_SESSION_GENERATION_KEY]: session,
		};
		await this.upsert({ id: baseThreadId, metadata: JSON.stringify(metadata) }, ['id']);
	}
}

function parseMetadata(value: string | null | undefined): Record<string, unknown> {
	if (!value) return {};
	const parsed = jsonParse<unknown>(value, { fallbackValue: {} });
	return isRecord(parsed) ? parsed : {};
}

function isChatSessionGeneration(value: unknown): value is ChatSessionGeneration {
	return (
		isRecord(value) &&
		typeof value.generation === 'number' &&
		typeof value.lastActivityAt === 'number'
	);
}
