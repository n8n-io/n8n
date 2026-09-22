import type {
	InstanceAiPreferenceCardEditRequestDto,
	InstanceAiPreferenceCardEditResponse,
	InstanceAiPreferenceCardEvent,
	InstanceAiPreferenceCardUndoRequestDto,
} from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { orchestratorAgentId } from '@n8n/instance-ai';

import { AiPreferenceService } from '@/services/ai-preference.service';

import { InProcessEventBus } from './event-bus/in-process-event-bus';

/**
 * Edit and Undo for the preference card in the chat. Both go through the same
 * service the settings page uses, so permissions and the duplicate check hold,
 * and both append a durable fact to the run that saved the preference, so the
 * card renders the right state after a reload.
 *
 * The fact is appended only after the row write succeeded. A failed write
 * appends nothing, so the card never claims a state the database does not have.
 *
 * Both methods also hand the fact back to the caller. The card then renders the
 * new state at once instead of waiting for the stream to deliver the same fact,
 * and the stream's copy sets the same fields again.
 */
@Service()
export class InstanceAiPreferenceCardService {
	constructor(
		private readonly aiPreferenceService: AiPreferenceService,
		private readonly eventBus: InProcessEventBus,
	) {}

	async undo(
		user: User,
		threadId: string,
		preferenceId: string,
		{ runId, toolCallId }: InstanceAiPreferenceCardUndoRequestDto,
	): Promise<InstanceAiPreferenceCardEvent> {
		await this.aiPreferenceService.delete(user, preferenceId);
		return this.publish(threadId, {
			type: 'preference-card',
			runId,
			agentId: orchestratorAgentId(runId),
			payload: { toolCallId, preferenceId, state: 'undone' },
		});
	}

	async edit(
		user: User,
		threadId: string,
		preferenceId: string,
		{ runId, toolCallId, content }: InstanceAiPreferenceCardEditRequestDto,
	): Promise<InstanceAiPreferenceCardEditResponse> {
		// The card only ever writes a user-scoped preference, which is the scope the
		// `save_user_preference` tool wrote.
		const preference = await this.aiPreferenceService.update(user, preferenceId, {
			content,
			scope: 'user',
		});
		const event = this.publish(threadId, {
			type: 'preference-card',
			runId,
			agentId: orchestratorAgentId(runId),
			payload: { toolCallId, preferenceId, state: 'edited', content: preference.content },
		});
		return { preference, event };
	}

	private publish(
		threadId: string,
		event: InstanceAiPreferenceCardEvent,
	): InstanceAiPreferenceCardEvent {
		this.eventBus.publish(threadId, event);
		return event;
	}
}
