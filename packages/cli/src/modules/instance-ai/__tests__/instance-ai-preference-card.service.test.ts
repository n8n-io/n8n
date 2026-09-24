import type { AiPreferenceDto } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

import type { AiPreferenceService } from '@/services/ai-preference.service';
import type { Telemetry } from '@/telemetry';

import type { InProcessEventBus } from '../event-bus/in-process-event-bus';
import { InstanceAiPreferenceCardService } from '../instance-ai-preference-card.service';

describe('InstanceAiPreferenceCardService', () => {
	const aiPreferenceService = mock<AiPreferenceService>();
	const eventBus = mock<InProcessEventBus>();
	const telemetry = mock<Telemetry>();
	const service = new InstanceAiPreferenceCardService(aiPreferenceService, eventBus, telemetry);
	const user = mock<User>({ id: 'user-1' });

	beforeEach(() => vi.resetAllMocks());

	it('undo deletes the row, then appends an undone fact to the run', async () => {
		const event = await service.undo(user, 'thread-1', 'pref-1', {
			runId: 'run-1',
			toolCallId: 'tc-1',
		});

		expect(aiPreferenceService.delete).toHaveBeenCalledWith(user, 'pref-1');
		expect(eventBus.publish).toHaveBeenCalledWith('thread-1', {
			type: 'preference-card',
			runId: 'run-1',
			agentId: 'orchestrator-run-1',
			payload: { toolCallId: 'tc-1', preferenceId: 'pref-1', state: 'undone' },
		});
		// The caller renders from this without waiting for the stream.
		expect(event).toEqual(eventBus.publish.mock.calls[0][1]);
	});

	it('undo appends nothing when the delete throws', async () => {
		aiPreferenceService.delete.mockRejectedValue(new Error('gone'));

		await expect(
			service.undo(user, 'thread-1', 'pref-1', { runId: 'run-1', toolCallId: 'tc-1' }),
		).rejects.toThrow('gone');
		expect(eventBus.publish).not.toHaveBeenCalled();
	});

	it('edit updates the same row with user scope, appends an edited fact, returns the dto', async () => {
		aiPreferenceService.update.mockResolvedValue(
			mock<AiPreferenceDto>({ id: 'pref-1', content: 'Keep replies brief.' }),
		);

		const { preference, event } = await service.edit(user, 'thread-1', 'pref-1', {
			runId: 'run-1',
			toolCallId: 'tc-1',
			content: 'Keep replies brief.',
		});

		expect(aiPreferenceService.update).toHaveBeenCalledWith(user, 'pref-1', {
			content: 'Keep replies brief.',
			scope: 'user',
		});
		expect(eventBus.publish).toHaveBeenCalledWith('thread-1', {
			type: 'preference-card',
			runId: 'run-1',
			agentId: 'orchestrator-run-1',
			payload: {
				toolCallId: 'tc-1',
				preferenceId: 'pref-1',
				state: 'edited',
				content: 'Keep replies brief.',
			},
		});
		expect(preference).toMatchObject({ id: 'pref-1' });
		expect(event).toEqual(eventBus.publish.mock.calls[0][1]);
	});

	it('edit fires resolved(accepted_after_edit)', async () => {
		aiPreferenceService.update.mockResolvedValue(
			mock<AiPreferenceDto>({ id: 'pref-1', content: 'Keep replies brief.' }),
		);

		await service.edit(user, 'thread-1', 'pref-1', {
			runId: 'run-1',
			toolCallId: 'tc-1',
			content: 'Keep replies brief.',
		});

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.PREFERENCE_CONFIRMATION_RESOLVED,
			{ surface: 'aia', outcome: 'accepted_after_edit', scope_type: 'user', text_length: 19 },
		);
	});

	it('edit appends nothing when the update throws', async () => {
		aiPreferenceService.update.mockRejectedValue(new Error('too long'));

		await expect(
			service.edit(user, 'thread-1', 'pref-1', {
				runId: 'run-1',
				toolCallId: 'tc-1',
				content: 'Keep replies brief.',
			}),
		).rejects.toThrow('too long');
		expect(eventBus.publish).not.toHaveBeenCalled();
		expect(telemetry.track).not.toHaveBeenCalled();
	});
});
