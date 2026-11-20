import { mockLogger } from '@n8n/backend-test-utils';
import type { TelemetryProxy, UrlService } from '@n8n/backend-services';
import { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { mock } from 'vitest-mock-extended';

import type { UserService } from '@/services/user.service';

import { InstanceAiPreferencesNoteService } from '../instance-ai-preferences-note.service';

const HOUR_MS = 60 * 60 * 1000;

const userWithNote = (note?: { impressions: number; lastShownAt: number }) =>
	Object.assign(new User(), {
		id: 'user-1',
		createdAt: new Date(),
		settings: note === undefined ? null : { assistantPreferencesNote: note },
	});

const createService = () => {
	const userService = mock<UserService>();
	userService.updateSettings.mockImplementation(async (_id, settings) => settings);
	const urlService = mock<UrlService>();
	urlService.getInstanceBaseUrl.mockReturnValue('https://acme.n8n.cloud');
	const telemetry = mock<TelemetryProxy>();
	const service = new InstanceAiPreferencesNoteService(
		userService,
		urlService,
		telemetry,
		mockLogger(),
	);
	return { service, userService, telemetry };
};

describe('InstanceAiPreferencesNoteService', () => {
	test.each(['unassigned', 'false', undefined])(
		'does nothing when the variant is %s',
		async (variant) => {
			const { service, userService, telemetry } = createService();

			const note = await service.takeNote(userWithNote(), variant, 'thread-1');

			expect(note).toBeUndefined();
			expect(userService.updateSettings).not.toHaveBeenCalled();
			expect(telemetry.track).not.toHaveBeenCalled();
		},
	);

	test('gives the note, counts the impression and reports the exposure in the variant', async () => {
		const { service, userService, telemetry } = createService();
		const user = userWithNote({ impressions: 1, lastShownAt: Date.now() - 25 * HOUR_MS });

		const note = await service.takeNote(user, 'variant', 'thread-1');

		expect(note).toBe(
			[
				'<preferences-note>',
				'No saved preferences apply to this work yet.',
				'Do not stop or change the current task for this note.',
				'After you finish the task, end your reply with this text, in the language of your reply. Keep the 💡 at its start, as the only exception to the rule against emojis:',
				"💡 **Tip:** You can ask me to remember how you like things done. I'll save it as a preference and follow it in our future conversations. You can also add preferences yourself in [Settings](https://acme.n8n.cloud/settings/context/preferences).",
				'Do not mention this again in this conversation.',
				'</preferences-note>',
			].join('\n'),
		);
		expect(userService.updateSettings).toHaveBeenCalledWith('user-1', {
			assistantPreferencesNote: { impressions: 2, lastShownAt: expect.any(Number) },
		});
		expect(user.settings?.assistantPreferencesNote?.impressions).toBe(2);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.ASSISTANT_PREFERENCES_NOTE_EXPOSED,
			{
				user_id: 'user-1',
				thread_id: 'thread-1',
				variant: 'variant',
				'$feature/147_assistant_empty_preferences_note': 'variant',
			},
		);
	});

	test('counts the impression and reports the exposure in the control, without a note', async () => {
		const { service, userService, telemetry } = createService();

		const note = await service.takeNote(userWithNote(), 'control', 'thread-1');

		expect(note).toBeUndefined();
		expect(userService.updateSettings).toHaveBeenCalledWith('user-1', {
			assistantPreferencesNote: { impressions: 1, lastShownAt: expect.any(Number) },
		});
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.ASSISTANT_PREFERENCES_NOTE_EXPOSED,
			expect.objectContaining({
				variant: 'control',
				'$feature/147_assistant_empty_preferences_note': 'control',
			}),
		);
	});

	test.each([3, 4])('does nothing after %i impressions', async (impressions) => {
		const { service, userService, telemetry } = createService();

		const note = await service.takeNote(
			userWithNote({ impressions, lastShownAt: Date.now() - 25 * HOUR_MS }),
			'variant',
			'thread-1',
		);

		expect(note).toBeUndefined();
		expect(userService.updateSettings).not.toHaveBeenCalled();
		expect(telemetry.track).not.toHaveBeenCalled();
	});

	test('does nothing within a day of the last impression', async () => {
		const { service, userService, telemetry } = createService();

		const note = await service.takeNote(
			userWithNote({ impressions: 1, lastShownAt: Date.now() - HOUR_MS }),
			'variant',
			'thread-1',
		);

		expect(note).toBeUndefined();
		expect(userService.updateSettings).not.toHaveBeenCalled();
		expect(telemetry.track).not.toHaveBeenCalled();
	});

	test('gives no note and reports no exposure when the impression cannot be saved', async () => {
		const { service, userService, telemetry } = createService();
		userService.updateSettings.mockRejectedValue(new Error('db down'));

		const note = await service.takeNote(userWithNote(), 'variant', 'thread-1');

		expect(note).toBeUndefined();
		expect(telemetry.track).not.toHaveBeenCalled();
	});
});
