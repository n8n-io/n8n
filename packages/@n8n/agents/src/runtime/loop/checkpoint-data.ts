import { isCancellation } from '../../sdk/cancellation';
import type { BuiltTool, PendingToolCall, SerializableAgentState } from '../../types';
import type {
	AgentPersistenceOptions,
	ExecutionOptions,
	PersistedExecutionOptions,
	ResumeOptions,
} from '../../types/sdk/agent';
import { parseWithSchema } from '../../utils/parse';
import type { AgentMessageList } from '../model/message-list';

export async function parseResumeData(
	data: unknown,
	resumeSchema: BuiltTool['resumeSchema'],
): Promise<unknown> {
	if (isCancellation(data) || !resumeSchema) return data;
	const result = await parseWithSchema(resumeSchema, data, { stripUnknown: true });
	if (!result.success) throw new Error(`Invalid resume payload: ${result.error}`);
	return result.data;
}

export function mergeResumeExecutionOptions(
	state: SerializableAgentState,
	callerExecOptions: ExecutionOptions,
): ExecutionOptions & { iterationCount?: number } {
	const persisted = state.executionOptions ?? {};
	const persistedMaxIterations = persisted.maxIterations;
	const callerMaxIterations = callerExecOptions.maxIterations;
	if (
		callerMaxIterations !== undefined &&
		persistedMaxIterations !== undefined &&
		callerMaxIterations < persistedMaxIterations
	) {
		throw new Error(
			`Cannot decrease maxIterations when resuming a run. Expected >= ${persistedMaxIterations}, received ${callerMaxIterations}.`,
		);
	}

	const mergedMaxIterations = callerMaxIterations ?? persistedMaxIterations;
	// A resumed run can retry the title. Hosts pass `titleText` only when the run starts.
	const titleText = callerExecOptions.titleText ?? persisted.titleText;
	return {
		...callerExecOptions,
		...(mergedMaxIterations !== undefined ? { maxIterations: mergedMaxIterations } : {}),
		...(titleText !== undefined ? { titleText } : {}),
		...(state.iterationCount !== undefined ? { iterationCount: state.iterationCount } : {}),
	};
}

export function mergeResumePersistence(
	persistence: AgentPersistenceOptions | undefined,
	hostMetadata: ResumeOptions['hostMetadata'],
): AgentPersistenceOptions | undefined {
	if (!persistence) return undefined;
	const merged = { ...persistence };
	if (persistence.hostMetadata || hostMetadata) {
		merged.hostMetadata = { ...persistence.hostMetadata, ...hostMetadata };
	}
	return merged;
}

export function markSuspendedToolCalls(
	list: AgentMessageList,
	pendingToolCalls: Record<string, PendingToolCall>,
): void {
	// Record what confirmation each suspended call showed the user, so an
	// abandoned suspension can be settled with that context on a later
	// history load instead of vanishing from the transcript.
	for (const pending of Object.values(pendingToolCalls)) {
		if (!pending.suspended) continue;
		const payload =
			typeof pending.suspendPayload === 'object' && pending.suspendPayload !== null
				? (pending.suspendPayload as { message?: unknown; requestId?: unknown })
				: undefined;
		list.markToolCallSuspended(pending.toolCallId, {
			...(typeof payload?.message === 'string' ? { message: payload.message } : {}),
			...(typeof payload?.requestId === 'string' ? { requestId: payload.requestId } : {}),
		});
	}
}

export function buildCheckpointOptions(
	options: (ExecutionOptions & { iterationCount?: number }) | undefined,
	maxIterations?: number,
	iterationCount?: number,
): Pick<SerializableAgentState, 'executionOptions' | 'iterationCount'> {
	// Persist loop controls and the title text only. providerOptions are intentionally
	// excluded because they may contain sensitive data (API keys, auth headers).
	const resolvedMaxIterations = maxIterations ?? options?.maxIterations;
	const resolvedIterationCount = iterationCount ?? options?.iterationCount;
	const persisted: PersistedExecutionOptions = {
		...(resolvedMaxIterations !== undefined ? { maxIterations: resolvedMaxIterations } : {}),
		...(options?.titleText !== undefined ? { titleText: options.titleText } : {}),
	};
	return {
		executionOptions: Object.keys(persisted).length > 0 ? persisted : undefined,
		...(resolvedIterationCount !== undefined ? { iterationCount: resolvedIterationCount } : {}),
	};
}
