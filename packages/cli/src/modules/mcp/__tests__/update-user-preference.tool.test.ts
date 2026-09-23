import type { AiPreferenceDto } from '@n8n/api-types';
import { AI_PREFERENCE_CONTENT_MAX_LENGTH } from '@n8n/api-types';
import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { ConflictError } from '@/errors/response-errors/conflict.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { AiPreferenceService } from '@/services/ai-preference.service';
import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { createUpdateUserPreferenceTool } from '../tools/update-user-preference.tool';

const DESCRIPTION = [
	'Replaces the text of a saved preference. Use it when the user changes or refines a preference that is already saved, instead of saving a second one next to it.',
	'Take the id from get_user_preferences or from the result of the save. The scope stays where it is; only the text changes.',
	'Tell the user the new text in the same turn, so they see what changed.',
].join('\n\n');

const URL = 'https://n8n.example.com/settings/context/preferences';
const user = Object.assign(new User(), {
	id: 'user-1',
	role: { slug: 'global:member', scopes: [] },
});

const dto = (overrides: Partial<AiPreferenceDto> = {}): AiPreferenceDto => ({
	id: 'pref-1',
	content: 'New text.',
	userId: 'user-1',
	user: null,
	projectId: null,
	project: null,
	source: 'ui',
	scopes: ['aiPreference:read', 'aiPreference:update', 'aiPreference:delete'],
	createdAt: '2026-09-21T10:00:00.000Z',
	updatedAt: '2026-09-21T10:00:00.000Z',
	...overrides,
});

const createMocks = () => {
	const aiPreferenceService = mockInstance(AiPreferenceService, {
		updateContent: vi.fn().mockResolvedValue(dto()),
	});
	const telemetry = mockInstance(Telemetry, { track: vi.fn() });
	const urlService = mockInstance(UrlService, {
		getInstanceBaseUrl: vi.fn().mockReturnValue('https://n8n.example.com'),
	});
	const tool = createUpdateUserPreferenceTool(user, aiPreferenceService, telemetry, urlService);
	return { aiPreferenceService, telemetry, tool };
};

describe('update_user_preference MCP tool', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('is named update_user_preference and carries the agreed description verbatim', () => {
		const { tool } = createMocks();

		expect(tool.name).toBe('update_user_preference');
		expect(tool.config.description).toBe(DESCRIPTION);
	});

	test('takes an id and the shared content schema, so the caps travel with it', () => {
		const { tool } = createMocks();

		expect(Object.keys(tool.config.inputSchema!)).toEqual(['id', 'content']);
		expect(tool.config.inputSchema!.id.safeParse('').success).toBe(false);
		expect(
			tool.config.inputSchema!.content.safeParse('x'.repeat(AI_PREFERENCE_CONTENT_MAX_LENGTH + 1))
				.success,
		).toBe(false);
	});

	test('replaces the text in place and reports the result with the settings link', async () => {
		const { aiPreferenceService, tool } = createMocks();

		const result = await tool.handler({ id: 'pref-1', content: 'New text.' });

		expect(aiPreferenceService.updateContent).toHaveBeenCalledWith(user, 'pref-1', 'New text.');
		expect(aiPreferenceService.update).not.toHaveBeenCalled();
		expect(result.structuredContent).toEqual({
			saved: true,
			preference: { id: 'pref-1', scope: 'user', text: 'New text.', url: URL },
		});
	});

	test('reports the edit as an assistant save that replaced an existing row, with the row scope', async () => {
		const { aiPreferenceService, telemetry, tool } = createMocks();
		aiPreferenceService.updateContent.mockResolvedValue(
			dto({ userId: null, projectId: 'p-1', content: 'Team rule.' }),
		);

		const result = await tool.handler({ id: 'pref-1', content: 'Team rule.' });

		expect(result.structuredContent).toMatchObject({ preference: { scope: 'project' } });
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.ASSISTANT_SAVED_PREFERENCE,
			{ surface: 'mcp', scope_type: 'project', text_length: 10, replaced_existing: true },
		);
		expect(telemetry.track).toHaveBeenCalledWith(USER_CALLED_MCP_TOOL_EVENT, {
			user_id: 'user-1',
			tool_name: 'update_user_preference',
			parameters: { text_length: 10 },
			results: { success: true, data: { scope: 'project' } },
		});
	});

	test.each([
		[new NotFoundError('gone'), 'not_found', 'not_permitted', 'gone'],
		[new ConflictError('dup'), 'duplicate', 'duplicate', 'dup'],
		[new Error('boom'), 'failed', 'failed', 'The preference could not be saved.'],
	])('relays the refusal %s with reason %s', async (error, reason, rejectedReason, message) => {
		const { aiPreferenceService, telemetry, tool } = createMocks();
		aiPreferenceService.updateContent.mockRejectedValue(error);

		const result = await tool.handler({ id: 'pref-1', content: 'New text.' });

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({ saved: false, error: message, reason });
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.PREFERENCE_WRITE_REJECTED,
			{ surface: 'mcp', reason: rejectedReason, text_length: 9 },
		);
	});
});
