import {
	ASSISTANT_TRACE_EVENT,
	assistantTracePayloadSchema,
	type AssistantAgentFeedbackRequestDto,
} from '@n8n/api-types';
import { Logger } from '@n8n/backend-common';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { submitLangsmithUserFeedback } from '@n8n/instance-ai';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';
import { v5 as uuidv5 } from 'uuid';

import { SystemAgentTurnEventsService } from '@/modules/agents/system-agents/system-agent-turn-events.service';

import { INSTANCE_AI_FEEDBACK_NAMESPACE } from '../tracing/instance-ai-tracing.service';
import { AssistantTurnEnvironmentFactory } from '../turn-setup/assistant-turn-environment.factory';
import { ASSISTANT_AGENT_ID } from './assistant-turn-options';

const FEEDBACK_KEY = 'user_score';

/**
 * Sends the rating of an Assistant agent answer to the LangSmith trace of its
 * turn, like the feedback of the current Assistant runtime. The turn records
 * the ids of its trace as a host event in its execution. Feedback is best
 * effort: a turn without a trace, or a failed send, is logged and skipped.
 */
@Service()
export class AssistantAgentFeedbackService {
	private readonly logger: Logger;

	constructor(
		logger: Logger,
		private readonly turnEvents: SystemAgentTurnEventsService,
		private readonly turnEnvironment: AssistantTurnEnvironmentFactory,
	) {
		this.logger = logger.scoped('instance-ai');
	}

	/** Throws `NotFoundError` when the user cannot use the thread. */
	async submit(
		user: User,
		threadId: string,
		{ executionId, rating }: AssistantAgentFeedbackRequestDto,
	): Promise<void> {
		const payload = await this.turnEvents.readHostEvent(
			ASSISTANT_AGENT_ID,
			user,
			threadId,
			executionId,
			ASSISTANT_TRACE_EVENT,
			'turn',
		);
		const trace = assistantTracePayloadSchema.safeParse(payload);
		if (!trace.success) {
			this.logger.debug('No LangSmith trace for Assistant agent feedback; skipping', {
				threadId,
				executionId,
			});
			return;
		}
		// A resume has a root of its own. The feedback goes to the root of its turn.
		const langsmithRunId = trace.data.turnLangsmithRunId ?? trace.data.langsmithRunId;
		const langsmithTraceId = trace.data.turnLangsmithTraceId ?? trace.data.langsmithTraceId;

		try {
			const { tracingProxyConfig } = await this.turnEnvironment.createProxyRunConfig(user);
			await submitLangsmithUserFeedback({
				langsmithRunId,
				langsmithTraceId,
				key: FEEDBACK_KEY,
				score: rating === 'up' ? 1 : 0,
				value: rating,
				// The same id for each rating of a turn, so a new rating replaces the old one.
				feedbackId: uuidv5(`${FEEDBACK_KEY}:${executionId}`, INSTANCE_AI_FEEDBACK_NAMESPACE),
				sourceInfo: {
					thread_id: threadId,
					execution_id: executionId,
					user_id: user.id,
					rating,
					assistant_runtime: 'agents',
				},
				proxyConfig: tracingProxyConfig,
			});
		} catch (error) {
			this.logger.warn('Failed to submit Assistant agent feedback to LangSmith', {
				threadId,
				executionId,
				error: getErrorMessage(error),
			});
		}
	}
}
