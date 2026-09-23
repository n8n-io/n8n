import type {
	InstanceAiPreferenceCardEditRequestDto,
	InstanceAiPreferenceCardEditResponse,
	InstanceAiPreferenceCardEvent,
	InstanceAiPreferenceCardUndoRequestDto,
} from '@n8n/api-types';
import { aiPreferenceTargetOf } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { orchestratorAgentId } from '@n8n/instance-ai';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { AiPreferenceService } from '@/services/ai-preference.service';
import { Telemetry } from '@/telemetry';

import { InProcessEventBus } from './event-bus/in-process-event-bus';

/**
 * Edit and Undo for the preference card in the chat. Both go through the same
 * service the settings page uses, so permissions, the duplicate check and the
 * move rules hold, and both append a durable fact to the run that saved the
 * preference, so the card renders the right state after a reload.
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
		private readonly telemetry: Telemetry,
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
		{
			runId,
			toolCallId,
			content,
			scope,
			projectId,
			userId,
		}: InstanceAiPreferenceCardEditRequestDto,
	): Promise<InstanceAiPreferenceCardEditResponse> {
		// The scope the row leaves, read before the write so a move can be reported against it.
		const before = aiPreferenceTargetOf(await this.aiPreferenceService.getById(user, preferenceId));
		// The same update the settings page runs: a move needs the delete right on the old
		// target and the create right on the new one, and an edit must name its owner.
		const preference = await this.aiPreferenceService.update(user, preferenceId, {
			content,
			scope,
			projectId,
			userId,
		});
		const after = aiPreferenceTargetOf(preference);
		const event = this.publish(threadId, {
			type: 'preference-card',
			runId,
			agentId: orchestratorAgentId(runId),
			payload: {
				toolCallId,
				preferenceId,
				state: 'edited',
				content: preference.content,
				scope: after.scope,
				projectId: preference.projectId,
			},
		});
		this.telemetry.track(TELEMETRY_EVENT.CONTEXT.PREFERENCE_CONFIRMATION_RESOLVED, {
			surface: 'aia',
			outcome: 'accepted_after_edit',
			scope_type: after.scope,
			text_length: preference.content.length,
		});
		// The tool offered `user`; a later edit may have moved the row already, so the
		// offered scope is the one this edit found, not always `user`.
		const moved = before.scope !== after.scope || preference.projectId !== projectIdOf(before);
		if (moved) {
			this.telemetry.track(TELEMETRY_EVENT.CONTEXT.PREFERENCE_SCOPE_ACCEPTED, {
				surface: 'aia',
				offered_scope: before.scope,
				accepted_scope: after.scope,
				scope_changed: true,
			});
		}
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

function projectIdOf(target: ReturnType<typeof aiPreferenceTargetOf>): string | null {
	return target.scope === 'project' ? target.projectId : null;
}
