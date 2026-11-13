import { mockLogger } from '@n8n/backend-test-utils';
import type { UrlService } from '@n8n/backend-services';
import { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { UserService } from '@/services/user.service';

import { McpPreferencesNoteService } from '../mcp-preferences-note.service';

const userWithImpressions = (impressions?: number) =>
	Object.assign(new User(), {
		id: 'user-1',
		createdAt: new Date(),
		settings: impressions === undefined ? null : { mcpPreferencesNote: { impressions } },
	});

const createService = () => {
	const userService = mock<UserService>();
	userService.updateSettings.mockImplementation(async (_id, settings) => settings);
	const urlService = mock<UrlService>();
	urlService.getInstanceBaseUrl.mockReturnValue('https://acme.n8n.cloud');
	const service = new McpPreferencesNoteService(userService, urlService, mockLogger());
	return { service, userService };
};

describe('McpPreferencesNoteService', () => {
	test.each(['control', 'unassigned', 'false', undefined])(
		'gives no note when the variant is %s',
		async (variant) => {
			const { service, userService } = createService();

			const note = await service.takeNote(userWithImpressions(), variant);

			expect(note).toBeUndefined();
			expect(userService.updateSettings).not.toHaveBeenCalled();
		},
	);

	test('gives the note and counts the impression in the variant', async () => {
		const { service, userService } = createService();
		const user = userWithImpressions(1);

		const note = await service.takeNote(user, 'variant');

		expect(note).toBe(
			'Note for the assistant: no saved preferences apply to this work yet. Preferences tell n8n how the user likes to build, for example which nodes to use or how to name things. Do not stop or change the current task for this note. After you finish the task, tell the user in one short sentence that they can save a preference. They can ask you to remember it, if you have the save_user_preference tool, or add it at https://acme.n8n.cloud/settings/context/preferences. Do not mention this again in this conversation.',
		);
		expect(userService.updateSettings).toHaveBeenCalledWith('user-1', {
			mcpPreferencesNote: { impressions: 2, lastShownAt: expect.any(Number) },
		});
		expect(user.settings?.mcpPreferencesNote?.impressions).toBe(2);
	});

	test('counts the first impression for a user without settings', async () => {
		const { service, userService } = createService();

		const note = await service.takeNote(userWithImpressions(), 'variant');

		expect(note).toBeDefined();
		expect(userService.updateSettings).toHaveBeenCalledWith('user-1', {
			mcpPreferencesNote: { impressions: 1, lastShownAt: expect.any(Number) },
		});
	});

	test('gives the third and last note after two impressions', async () => {
		const { service, userService } = createService();

		const note = await service.takeNote(userWithImpressions(2), 'variant');

		expect(note).toBeDefined();
		expect(userService.updateSettings).toHaveBeenCalledWith('user-1', {
			mcpPreferencesNote: { impressions: 3, lastShownAt: expect.any(Number) },
		});
	});

	test.each([3, 4])('gives no note after %i impressions', async (impressions) => {
		const { service, userService } = createService();

		const note = await service.takeNote(userWithImpressions(impressions), 'variant');

		expect(note).toBeUndefined();
		expect(userService.updateSettings).not.toHaveBeenCalled();
	});

	test('gives no note within a day of the last note', async () => {
		const { service, userService } = createService();
		const user = Object.assign(userWithImpressions(1), {
			settings: {
				mcpPreferencesNote: { impressions: 1, lastShownAt: Date.now() - 60 * 60 * 1000 },
			},
		});

		const note = await service.takeNote(user, 'variant');

		expect(note).toBeUndefined();
		expect(userService.updateSettings).not.toHaveBeenCalled();
	});

	test('gives the next note a day after the last note', async () => {
		const { service } = createService();
		const user = Object.assign(userWithImpressions(1), {
			settings: {
				mcpPreferencesNote: { impressions: 1, lastShownAt: Date.now() - 25 * 60 * 60 * 1000 },
			},
		});

		const note = await service.takeNote(user, 'variant');

		expect(note).toBeDefined();
	});

	test('gives no note when the impression cannot be saved', async () => {
		const { service, userService } = createService();
		userService.updateSettings.mockRejectedValue(new Error('db down'));

		const note = await service.takeNote(userWithImpressions(), 'variant');

		expect(note).toBeUndefined();
	});
});
