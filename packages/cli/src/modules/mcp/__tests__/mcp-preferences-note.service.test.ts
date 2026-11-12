import { mockLogger } from '@n8n/backend-test-utils';
import type { PostHogClient, UrlService } from '@n8n/backend-services';
import { User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import type { UserService } from '@/services/user.service';

import { MCP_EMPTY_PREFERENCES_NOTE_FLAG } from '../mcp.constants';
import { McpPreferencesNoteService } from '../mcp-preferences-note.service';

const userWithImpressions = (impressions?: number) =>
	Object.assign(new User(), {
		id: 'user-1',
		createdAt: new Date(),
		settings: impressions === undefined ? null : { mcpPreferencesNote: { impressions } },
	});

const createService = (flagValue: string | boolean | undefined) => {
	const postHogClient = mock<PostHogClient>();
	postHogClient.getFeatureFlags.mockResolvedValue(
		flagValue === undefined ? {} : { [MCP_EMPTY_PREFERENCES_NOTE_FLAG]: flagValue },
	);
	const userService = mock<UserService>();
	userService.updateSettings.mockImplementation(async (_id, settings) => settings);
	const urlService = mock<UrlService>();
	urlService.getInstanceBaseUrl.mockReturnValue('https://acme.n8n.cloud');
	const service = new McpPreferencesNoteService(
		postHogClient,
		userService,
		urlService,
		mockLogger(),
	);
	return { service, userService };
};

describe('McpPreferencesNoteService', () => {
	test.each([
		['control', 'control'],
		[undefined, 'unassigned'],
		[false, 'false'],
	])('gives no note when the flag is %s', async (flagValue, expectedVariant) => {
		const { service, userService } = createService(flagValue);

		const decision = await service.decideForEmptyResult(userWithImpressions());

		expect(decision).toEqual({ variant: expectedVariant });
		expect(userService.updateSettings).not.toHaveBeenCalled();
	});

	test('gives the note and counts the impression in the variant', async () => {
		const { service, userService } = createService('variant');
		const user = userWithImpressions(1);

		const decision = await service.decideForEmptyResult(user);

		expect(decision.variant).toBe('variant');
		expect(decision.note).toContain('https://acme.n8n.cloud/settings/context/preferences');
		expect(decision.note).toContain('After you finish the task');
		expect(userService.updateSettings).toHaveBeenCalledWith('user-1', {
			mcpPreferencesNote: { impressions: 2 },
		});
		expect(user.settings?.mcpPreferencesNote?.impressions).toBe(2);
	});

	test('counts the first impression for a user without settings', async () => {
		const { service, userService } = createService('variant');

		const decision = await service.decideForEmptyResult(userWithImpressions());

		expect(decision.note).toBeDefined();
		expect(userService.updateSettings).toHaveBeenCalledWith('user-1', {
			mcpPreferencesNote: { impressions: 1 },
		});
	});

	test('gives no note after three impressions', async () => {
		const { service, userService } = createService('variant');

		const decision = await service.decideForEmptyResult(userWithImpressions(3));

		expect(decision).toEqual({ variant: 'variant' });
		expect(userService.updateSettings).not.toHaveBeenCalled();
	});

	test('gives no note when the impression cannot be saved', async () => {
		const { service, userService } = createService('variant');
		userService.updateSettings.mockRejectedValue(new Error('db down'));

		const decision = await service.decideForEmptyResult(userWithImpressions());

		expect(decision).toEqual({ variant: 'variant' });
	});
});
