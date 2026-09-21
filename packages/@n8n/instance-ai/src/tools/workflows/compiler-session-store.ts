import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { z } from 'zod';

import { getThread, patchThread } from '../../storage/thread-patch';
import type { InstanceAiContext } from '../../types';
import {
	fromPersisted,
	InMemorySessionStore,
	persistedSessionSchema,
	toPersisted,
	type GenerationSession,
	type SessionStore,
} from '../../workflow-compiler/session/session';

const METADATA_KEY = 'workflowCompilerSessions';
const MAX_PERSISTED_SESSIONS = 5;
const persistedMapSchema = z.record(z.string(), persistedSessionSchema);

/** Process-wide cache so a session survives across tool calls in the same run. */
const processStore = new InMemorySessionStore(500);

function parseSessions(raw: unknown): z.infer<typeof persistedMapSchema> {
	const parsed = persistedMapSchema.safeParse(raw);
	return parsed.success ? parsed.data : {};
}

/**
 * Session store that keeps full sessions in memory and mirrors a compact
 * form into thread metadata, so a clarification loop survives a new run or
 * another main picking up the thread.
 */
export class ThreadSessionStore implements SessionStore {
	constructor(
		private readonly context: Pick<InstanceAiContext, 'threadMemory' | 'threadId' | 'logger'>,
	) {}

	async get(id: string): Promise<GenerationSession | undefined> {
		const cached = await processStore.get(id);
		if (cached) return cached;
		const entry = (await this.readPersisted())[id];
		if (!entry) return undefined;
		const session = fromPersisted(entry);
		await processStore.save(session);
		return session;
	}

	async save(session: GenerationSession): Promise<void> {
		await processStore.save(session);
		const { threadMemory, threadId } = this.context;
		if (!threadMemory || !threadId) return;
		try {
			await patchThread(threadMemory, {
				threadId,
				update: ({ metadata = {} }) => {
					const sessions = parseSessions(metadata[METADATA_KEY]);
					sessions[session.id] = toPersisted(session);
					const trimmed = Object.fromEntries(
						Object.entries(sessions)
							.sort(([, a], [, b]) => a.updatedAt.localeCompare(b.updatedAt))
							.slice(-MAX_PERSISTED_SESSIONS),
					);
					return { metadata: { ...metadata, [METADATA_KEY]: trimmed } };
				},
			});
		} catch (error) {
			this.context.logger?.debug('Failed to persist workflow compiler session', {
				sessionId: session.id,
				error: getErrorMessage(error),
			});
		}
	}

	private async readPersisted(): Promise<z.infer<typeof persistedMapSchema>> {
		const { threadMemory, threadId } = this.context;
		if (!threadMemory || !threadId) return {};
		try {
			const thread = await getThread(threadMemory, threadId);
			return parseSessions(thread?.metadata?.[METADATA_KEY]);
		} catch {
			return {};
		}
	}
}
