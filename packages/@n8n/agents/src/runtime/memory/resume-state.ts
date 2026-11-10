import { createFilteredLogger } from '../logger';
import { compareKeyset } from './memory-store';
import { getCreatedAt } from '../../sdk/message';
import type { AgentDbMessage } from '../../types/sdk/message';
import type {
	BuiltObservationResumeStore,
	ObservationCursor,
	ObservationResumeState,
} from '../../types/sdk/observation';

const logger = createFilteredLogger();

export type ObservationPoint = Pick<ObservationCursor, 'lastObservedAt' | 'lastObservedMessageId'>;

export function isAfterPoint(message: AgentDbMessage, point: ObservationPoint): boolean {
	const createdAt = getCreatedAt(message);
	if (!createdAt) return true;
	return (
		compareKeyset(
			{ createdAt, id: message.id },
			{ createdAt: new Date(point.lastObservedAt), id: point.lastObservedMessageId },
		) > 0
	);
}

/**
 * What the model sees of a thread: the messages after the resume point, with
 * the notes saved at that point. A thread without a resume point is sent in full.
 */
export function resumeView(
	messages: AgentDbMessage[],
	state: ObservationResumeState | null | undefined,
): { messages: AgentDbMessage[]; notes: string | undefined } {
	const from = state?.resumeFrom;
	if (!from) return { messages, notes: undefined };
	return {
		messages: messages.filter((m) => isAfterPoint(m, from)),
		notes: state.resumeNotes ?? undefined,
	};
}

/**
 * The resume state of one thread, as last read or written by this runtime.
 * Writes are best-effort: a lost write only means the next turn starts from
 * the previous resume point and estimates its size again.
 */
export class ResumeStateStore {
	private state: ObservationResumeState | undefined;

	constructor(
		private readonly store: BuiltObservationResumeStore,
		private readonly threadId: string,
	) {}

	get current(): ObservationResumeState | undefined {
		return this.state;
	}

	async load(): Promise<ObservationResumeState | undefined> {
		this.state = (await this.store.getResumeState(this.threadId)) ?? undefined;
		return this.state;
	}

	/**
	 * Move the resume point and freeze the notes the model resumes from. Later
	 * turns send these notes until the next resume, so the prompt prefix stays
	 * stable while the Observer and Reflector keep writing.
	 */
	async moveTo(at: ObservationPoint, notes: string | undefined, modelId: string | null) {
		await this.save({
			resumeFrom: {
				lastObservedAt: at.lastObservedAt,
				lastObservedMessageId: at.lastObservedMessageId,
			},
			resumeNotes: notes ?? null,
			lastRequestTokens: null,
			lastModelId: modelId,
		});
	}

	/** Save the size of the last request, so the next turn starts from a real count. */
	async saveRequestSize(lastRequestTokens: number, modelId: string | null) {
		await this.save({
			resumeFrom: this.state?.resumeFrom ?? null,
			resumeNotes: this.state?.resumeNotes ?? null,
			lastRequestTokens,
			lastModelId: modelId,
		});
	}

	private async save(state: Omit<ObservationResumeState, 'observationScopeId'>): Promise<void> {
		this.state = { observationScopeId: this.threadId, ...state };
		try {
			await this.store.saveResumeState(this.state);
		} catch (error) {
			logger.warn('Failed to save observation resume state', { threadId: this.threadId, error });
		}
	}
}
