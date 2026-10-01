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
	// A test that fakes the clock must not leave it faked for the next one, even when it throws.
	afterEach(() => vi.useRealTimers());

	it('undo deletes the row, then appends an undone fact to the run', async () => {
		aiPreferenceService.getById.mockResolvedValue(userDto());

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

	it('undo reports the removal as a late refusal of the assistant write', async () => {
		// A fixed clock: the age is read inside `undo`, so a slow run would round to 13 seconds.
		vi.useFakeTimers();
		vi.setSystemTime(new Date('2026-09-24T12:00:12.000Z'));
		aiPreferenceService.getById.mockResolvedValue(
			userDto({ createdAt: '2026-09-24T12:00:00.000Z' }),
		);

		await service.undo(user, 'thread-1', 'pref-1', { runId: 'run-1', toolCallId: 'tc-1' });

		expect(telemetry.track).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_DELETED_PREFERENCES, {
			count: 1,
			source: 'rejected',
			scope_types: ['user'],
			surface: 'aia',
			seconds_since_saved: 12,
		});
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.PREFERENCE_CONFIRMATION_RESOLVED,
			{
				surface: 'aia',
				outcome: 'rejected',
				scope_type: 'user',
				text_length: 'Keep replies brief.'.length,
			},
		);
	});

	it('undo appends nothing when the delete throws', async () => {
		aiPreferenceService.delete.mockRejectedValue(new Error('gone'));

		await expect(
			service.undo(user, 'thread-1', 'pref-1', { runId: 'run-1', toolCallId: 'tc-1' }),
		).rejects.toThrow('gone');
		expect(eventBus.publish).not.toHaveBeenCalled();
	});

	const userDto = (overrides: Partial<AiPreferenceDto> = {}) =>
		mock<AiPreferenceDto>({
			id: 'pref-1',
			content: 'Keep replies brief.',
			userId: 'user-1',
			projectId: null,
			...overrides,
		});

	const editBody = {
		runId: 'run-1',
		toolCallId: 'tc-1',
		content: 'Keep replies brief.',
		scope: 'user' as const,
		userId: 'user-1',
		projectId: null,
	};

	it('edit passes scope, project and owner to the service, appends an edited fact, returns the dto', async () => {
		aiPreferenceService.getById.mockResolvedValue(userDto({ content: 'Keep replies short.' }));
		aiPreferenceService.update.mockResolvedValue(userDto());

		const { preference, event } = await service.edit(user, 'thread-1', 'pref-1', editBody);

		expect(aiPreferenceService.update).toHaveBeenCalledWith(user, 'pref-1', {
			content: 'Keep replies brief.',
			scope: 'user',
			userId: 'user-1',
			projectId: null,
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
				scope: 'user',
				projectId: null,
			},
		});
		expect(preference).toMatchObject({ id: 'pref-1' });
		expect(event).toEqual(eventBus.publish.mock.calls[0][1]);
	});

	// A text-only edit. The card knows only the scope of its own last write, and a move made on
	// the settings page or over MCP leaves that stale, so it names no scope at all.
	const textOnlyBody = {
		runId: 'run-1',
		toolCallId: 'tc-1',
		content: 'Keep replies brief.',
	};

	// The target is left to the write, which reads it off the row it loads. Naming it here
	// from an earlier read would undo a move that landed between that read and the write.
	it('edit without a scope names no target, and leaves it to the write', async () => {
		aiPreferenceService.getById.mockResolvedValue(
			userDto({ content: 'Keep replies short.', userId: null, projectId: 'p-1' }),
		);
		aiPreferenceService.update.mockResolvedValue(userDto({ userId: null, projectId: 'p-1' }));

		await service.edit(user, 'thread-1', 'pref-1', textOnlyBody);

		expect(aiPreferenceService.update).toHaveBeenCalledWith(user, 'pref-1', {
			content: 'Keep replies brief.',
			scope: undefined,
			projectId: undefined,
			userId: undefined,
		});
	});

	it('edit without a scope is no move, so it fires no scope event', async () => {
		aiPreferenceService.getById.mockResolvedValue(
			userDto({ content: 'Keep replies short.', userId: null, projectId: 'p-1' }),
		);
		aiPreferenceService.update.mockResolvedValue(userDto({ userId: null, projectId: 'p-1' }));

		await service.edit(user, 'thread-1', 'pref-1', textOnlyBody);

		expect(telemetry.track).not.toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.PREFERENCE_SCOPE_ACCEPTED,
			expect.anything(),
		);
		expect(telemetry.track).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_UPDATED_PREFERENCE, {
			scope_type: 'project',
			text_length: 19,
			scope_changed: false,
			project_id: 'p-1',
			surface: 'aia',
		});
	});

	// Another writer can move the row between the read and the write. The edit named no
	// scope, so it moved nothing, and crediting it with that move would put a write nobody
	// made into the number this event exists to produce.
	it('edit without a scope reports no move when another writer moved the row', async () => {
		aiPreferenceService.getById.mockResolvedValue(
			userDto({ content: 'Keep replies short.', userId: null, projectId: 'p-1' }),
		);
		aiPreferenceService.update.mockResolvedValue(userDto({ userId: null, projectId: 'p-2' }));

		await service.edit(user, 'thread-1', 'pref-1', textOnlyBody);

		expect(telemetry.track).not.toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.PREFERENCE_SCOPE_ACCEPTED,
			expect.anything(),
		);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.USER_UPDATED_PREFERENCE,
			expect.objectContaining({ scope_changed: false }),
		);
	});

	it('edit names the scope the row landed in on the fact, from the saved dto', async () => {
		aiPreferenceService.getById.mockResolvedValue(userDto());
		// The request and the saved row disagree on purpose: the fact must follow the row.
		aiPreferenceService.update.mockResolvedValue(userDto({ userId: null, projectId: 'p-1' }));

		const { event } = await service.edit(user, 'thread-1', 'pref-1', {
			...editBody,
			scope: 'instance',
			userId: null,
		});

		expect(event.payload).toMatchObject({ state: 'edited', scope: 'project', projectId: 'p-1' });
	});

	it('edit reports the same update event the settings page reports, named by surface', async () => {
		aiPreferenceService.getById.mockResolvedValue(userDto({ content: 'Keep replies short.' }));
		aiPreferenceService.update.mockResolvedValue(userDto({ userId: null, projectId: 'p-1' }));

		await service.edit(user, 'thread-1', 'pref-1', { ...editBody, scope: 'project' });

		expect(telemetry.track).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_UPDATED_PREFERENCE, {
			scope_type: 'project',
			text_length: 19,
			scope_changed: true,
			project_id: 'p-1',
			surface: 'aia',
		});
	});

	it('edit fires resolved(accepted_after_edit) with the new scope, and no scope event without a move', async () => {
		aiPreferenceService.getById.mockResolvedValue(userDto({ content: 'Keep replies short.' }));
		aiPreferenceService.update.mockResolvedValue(userDto());

		await service.edit(user, 'thread-1', 'pref-1', editBody);

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.PREFERENCE_CONFIRMATION_RESOLVED,
			{ surface: 'aia', outcome: 'accepted_after_edit', scope_type: 'user', text_length: 19 },
		);
		expect(telemetry.track).not.toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.PREFERENCE_SCOPE_ACCEPTED,
			expect.anything(),
		);
	});

	it('edit fires scope accepted with the scope it left and the one it reached, on a move', async () => {
		aiPreferenceService.getById.mockResolvedValue(userDto());
		aiPreferenceService.update.mockResolvedValue(userDto({ userId: null, projectId: null }));

		await service.edit(user, 'thread-1', 'pref-1', {
			...editBody,
			scope: 'instance',
			userId: null,
		});

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.PREFERENCE_SCOPE_ACCEPTED,
			{
				surface: 'aia',
				offered_scope: 'user',
				accepted_scope: 'instance',
				scope_changed: true,
			},
		);
	});

	it('edit counts a change of project as a move', async () => {
		aiPreferenceService.getById.mockResolvedValue(userDto({ userId: null, projectId: 'p-1' }));
		aiPreferenceService.update.mockResolvedValue(userDto({ userId: null, projectId: 'p-2' }));

		await service.edit(user, 'thread-1', 'pref-1', {
			...editBody,
			scope: 'project',
			projectId: 'p-2',
			userId: null,
		});

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.PREFERENCE_SCOPE_ACCEPTED,
			{
				surface: 'aia',
				offered_scope: 'project',
				accepted_scope: 'project',
				scope_changed: true,
			},
		);
		// Both events describe the same click, so the update event agrees that it moved.
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.USER_UPDATED_PREFERENCE,
			expect.objectContaining({ scope_changed: true, project_id: 'p-2' }),
		);
	});

	it('edit appends nothing when the update throws', async () => {
		aiPreferenceService.getById.mockResolvedValue(userDto());
		aiPreferenceService.update.mockRejectedValue(new Error('too long'));

		await expect(service.edit(user, 'thread-1', 'pref-1', editBody)).rejects.toThrow('too long');
		expect(eventBus.publish).not.toHaveBeenCalled();
		expect(telemetry.track).not.toHaveBeenCalled();
	});

	it('edit reads nothing else when the row is hidden', async () => {
		aiPreferenceService.getById.mockRejectedValue(new Error('not found'));

		await expect(service.edit(user, 'thread-1', 'pref-1', editBody)).rejects.toThrow('not found');
		expect(aiPreferenceService.update).not.toHaveBeenCalled();
		expect(eventBus.publish).not.toHaveBeenCalled();
	});
});
