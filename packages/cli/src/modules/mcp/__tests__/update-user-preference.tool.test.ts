import type { AiPreferenceDto } from '@n8n/api-types';
import { AI_PREFERENCE_CONTENT_MAX_LENGTH } from '@n8n/api-types';
import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
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
	'Changes a saved preference: its text, who it applies to, or both. Use it when the user changes or refines a preference that is already saved, instead of saving a second one next to it.',
	'Take the id from get_user_preferences or from the result of the save. Leave `scope` out to keep the preference where it is; only the user decides to move one, so pass `scope` when they ask for it and never on your own.',
	'A move to `project` needs `projectId` from `search_projects`. A move the user may not make is refused with `not_permitted`.',
	'Tell the user what the preference says now and who it applies to, in the same turn.',
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
		// The tool reads the row first: a move reports the scope it left, and a scope-only change
		// keeps the text the row already has.
		getById: vi.fn().mockResolvedValue(dto({ content: 'Old text.' })),
		updateContent: vi.fn().mockResolvedValue(dto()),
		update: vi.fn().mockResolvedValue(dto()),
	});
	const telemetry = mockInstance(Telemetry, { track: vi.fn() });
	const urlService = mockInstance(UrlService, {
		getInstanceBaseUrl: vi.fn().mockReturnValue('https://n8n.example.com'),
	});
	const logger = mockLogger();
	const tool = createUpdateUserPreferenceTool(
		user,
		aiPreferenceService,
		telemetry,
		urlService,
		logger,
	);
	return { aiPreferenceService, telemetry, tool, logger };
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

		expect(Object.keys(tool.config.inputSchema!)).toEqual(['id', 'content', 'scope', 'projectId']);
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
		// The text is what the client's model relays, so it has to carry the new text and the link.
		const [item] = result.content;
		const spoken = item.type === 'text' ? item.text : '';
		expect(spoken).toContain('"New text."');
		expect(spoken).toContain(URL);
	});

	test('reports the edit as an assistant save that replaced an existing row, with the row scope', async () => {
		const { aiPreferenceService, telemetry, tool } = createMocks();
		aiPreferenceService.updateContent.mockResolvedValue(dto({ content: 'Rule text.' }));

		const result = await tool.handler({ id: 'pref-1', content: 'Rule text.' });

		expect(result.structuredContent).toMatchObject({ preference: { scope: 'user' } });
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.ASSISTANT_SAVED_PREFERENCE,
			{ surface: 'mcp', scope_type: 'user', text_length: 10, replaced_existing: true },
		);
		expect(telemetry.track).toHaveBeenCalledWith(USER_CALLED_MCP_TOOL_EVENT, {
			user_id: 'user-1',
			tool_name: 'update_user_preference',
			parameters: { text_length: 10 },
			results: { success: true, data: { scope: 'user', moved: false } },
		});
	});

	test('reports the edit in the confirmation funnel, so an MCP edit is not invisible', async () => {
		const { aiPreferenceService, telemetry, tool } = createMocks();
		aiPreferenceService.updateContent.mockResolvedValue(dto({ content: 'New text.' }));

		await tool.handler({ id: 'pref-1', content: 'New text.' });

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.PREFERENCE_CONFIRMATION_RESOLVED,
			{ surface: 'mcp', outcome: 'accepted_after_edit', scope_type: 'user', text_length: 9 },
		);
	});

	test('names the scope of the refused row when it can still read it', async () => {
		const { aiPreferenceService, telemetry, tool } = createMocks();
		aiPreferenceService.updateContent.mockRejectedValue(new ConflictError('dup'));
		aiPreferenceService.getById.mockResolvedValue(dto({ userId: null, projectId: 'p-1' }));

		await tool.handler({ id: 'pref-1', content: 'New text.' });

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.PREFERENCE_WRITE_REJECTED,
			{ surface: 'mcp', reason: 'duplicate', scope_type: 'project', text_length: 9 },
		);
	});

	test('leaves the scope out when the refused row cannot be read', async () => {
		const { aiPreferenceService, telemetry, tool } = createMocks();
		aiPreferenceService.updateContent.mockRejectedValue(new NotFoundError('gone'));
		aiPreferenceService.getById.mockRejectedValue(new NotFoundError('gone'));

		await tool.handler({ id: 'pref-1', content: 'New text.' });

		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.PREFERENCE_WRITE_REJECTED,
			{ surface: 'mcp', reason: 'not_permitted', text_length: 9 },
		);
	});

	test('moves the row through the same update the settings page uses, and reports the move', async () => {
		const { aiPreferenceService, telemetry, tool } = createMocks();
		aiPreferenceService.update.mockResolvedValue(dto({ userId: null, projectId: 'p-1' }));

		const result = await tool.handler({ id: 'pref-1', scope: 'project', projectId: 'p-1' });

		// The text is the one the row already had: a move alone does not rewrite it.
		expect(aiPreferenceService.update).toHaveBeenCalledWith(user, 'pref-1', {
			content: 'Old text.',
			scope: 'project',
			userId: null,
			projectId: 'p-1',
		});
		expect(aiPreferenceService.updateContent).not.toHaveBeenCalled();
		expect(result.structuredContent).toMatchObject({ preference: { scope: 'project' } });
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.PREFERENCE_SCOPE_ACCEPTED,
			{
				surface: 'mcp',
				offered_scope: 'user',
				accepted_scope: 'project',
				scope_changed: true,
			},
		);
		expect(telemetry.track).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_UPDATED_PREFERENCE, {
			scope_type: 'project',
			text_length: 'New text.'.length,
			scope_changed: true,
			project_id: 'p-1',
			surface: 'mcp',
		});
	});

	// A user-scope row keeps the owner it has, so a move of the text alone cannot re-own it.
	test('keeps the owner of a row that stays in the user scope', async () => {
		const { aiPreferenceService, tool } = createMocks();
		aiPreferenceService.getById.mockResolvedValue(dto({ content: 'Old text.', userId: 'user-2' }));
		aiPreferenceService.update.mockResolvedValue(dto({ userId: 'user-2' }));

		await tool.handler({ id: 'pref-1', content: 'New text.', scope: 'user' });

		expect(aiPreferenceService.update).toHaveBeenCalledWith(user, 'pref-1', {
			content: 'New text.',
			scope: 'user',
			userId: 'user-2',
			projectId: null,
		});
	});

	test('refuses a call that changes neither the text nor the scope', async () => {
		const { aiPreferenceService, tool } = createMocks();

		const result = await tool.handler({ id: 'pref-1' });

		expect(result.isError).toBe(true);
		expect(aiPreferenceService.getById).not.toHaveBeenCalled();
		expect(result.structuredContent).toMatchObject({ saved: false, reason: 'failed' });
	});

	test('refuses a move to a project that names no project', async () => {
		const { aiPreferenceService, tool } = createMocks();

		const result = await tool.handler({ id: 'pref-1', scope: 'project' });

		expect(result.isError).toBe(true);
		expect(aiPreferenceService.update).not.toHaveBeenCalled();
		expect(result.structuredContent).toMatchObject({ saved: false, reason: 'failed' });
	});

	test.each([
		[new NotFoundError('gone'), 'not_found', 'not_permitted', 'gone'],
		[new ConflictError('dup'), 'duplicate', 'duplicate', 'dup'],
		[new Error('boom'), 'failed', 'failed', 'The preference could not be saved.'],
	])('relays the refusal %s with reason %s', async (error, reason, rejectedReason, message) => {
		const { aiPreferenceService, telemetry, tool, logger } = createMocks();
		aiPreferenceService.updateContent.mockRejectedValue(error);

		const result = await tool.handler({ id: 'pref-1', content: 'New text.' });

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({ saved: false, error: message, reason });
		// Only a fault is logged: the mapped refusals are expected answers with their own text.
		expect(logger.error).toHaveBeenCalledTimes(reason === 'failed' ? 1 : 0);
		expect(telemetry.track).toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.PREFERENCE_WRITE_REJECTED,
			{ surface: 'mcp', reason: rejectedReason, scope_type: 'user', text_length: 9 },
		);
	});
});
