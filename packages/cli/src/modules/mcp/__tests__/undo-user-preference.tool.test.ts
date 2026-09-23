import type { AiPreferenceDto } from '@n8n/api-types';
import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';

import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { NotFoundError } from '@/errors/response-errors/not-found.error';
import { AiPreferenceService } from '@/services/ai-preference.service';
import { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { createUndoUserPreferenceTool } from '../tools/undo-user-preference.tool';

const DESCRIPTION = [
	'Removes a preference that save_user_preference saved for this user. Call it when the user takes back a preference that was just saved, or asks to forget one that a connected AI tool saved earlier.',
	'It only removes preferences saved through a connected AI tool for this user. A preference the user wrote in n8n settings, or one saved for a project or the whole instance, is refused; the user removes those in settings.',
	'Tell the user in the same turn that the preference is gone.',
].join('\n\n');

const user = Object.assign(new User(), {
	id: 'user-1',
	role: { slug: 'global:member', scopes: [] },
});

const removedRow: AiPreferenceDto = {
	id: 'pref-1',
	content: 'Keep replies short.',
	userId: 'user-1',
	user: null,
	projectId: null,
	project: null,
	source: 'mcp',
	scopes: ['aiPreference:read', 'aiPreference:update', 'aiPreference:delete'],
	createdAt: new Date(Date.now() - 120_000).toISOString(),
	updatedAt: new Date().toISOString(),
};

const createMocks = () => {
	const aiPreferenceService = mockInstance(AiPreferenceService, {
		undoWrite: vi.fn().mockResolvedValue(removedRow),
	});
	const telemetry = mockInstance(Telemetry, { track: vi.fn() });
	const tool = createUndoUserPreferenceTool(user, aiPreferenceService, telemetry);
	return { aiPreferenceService, telemetry, tool };
};

describe('undo_user_preference MCP tool', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	test('is named undo_user_preference, carries the agreed description and is marked destructive', () => {
		const { tool } = createMocks();

		expect(tool.name).toBe('undo_user_preference');
		expect(tool.config.description).toBe(DESCRIPTION);
		expect(tool.config.annotations).toMatchObject({ destructiveHint: true, readOnlyHint: false });
	});

	test('removes through the narrow undo, never through the general delete', async () => {
		const { aiPreferenceService, tool } = createMocks();

		const result = await tool.handler({ id: 'pref-1' });

		expect(aiPreferenceService.undoWrite).toHaveBeenCalledWith(user, 'pref-1', 'mcp');
		expect(aiPreferenceService.delete).not.toHaveBeenCalled();
		expect(result.structuredContent).toEqual({ removed: true, id: 'pref-1' });
	});

	// The same event the chat card fires on Undo, so one number covers every surface.
	test('reports the undo as a rejected delete with the time since the write', async () => {
		const { telemetry, tool } = createMocks();

		await tool.handler({ id: 'pref-1' });

		expect(telemetry.track).toHaveBeenCalledWith(TELEMETRY_EVENT.CONTEXT.USER_DELETED_PREFERENCES, {
			count: 1,
			source: 'rejected',
			scope_types: ['user'],
			surface: 'mcp',
			seconds_since_saved: 120,
		});
		expect(telemetry.track).toHaveBeenCalledWith(USER_CALLED_MCP_TOOL_EVENT, {
			user_id: 'user-1',
			tool_name: 'undo_user_preference',
			parameters: {},
			results: { success: true, data: { removed: true } },
		});
	});

	test.each([
		[new NotFoundError('not saved by mcp for you'), 'not_found'],
		[new ForbiddenError('no'), 'not_permitted'],
		[new Error('db down'), 'failed'],
	])('relays what the service refuses (%s) as %s and removes nothing', async (error, reason) => {
		const { aiPreferenceService, telemetry, tool } = createMocks();
		aiPreferenceService.undoWrite.mockRejectedValue(error);

		const result = await tool.handler({ id: 'pref-1' });

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toEqual({
			removed: false,
			id: 'pref-1',
			error: error.message,
			reason,
		});
		expect(telemetry.track).not.toHaveBeenCalledWith(
			TELEMETRY_EVENT.CONTEXT.USER_DELETED_PREFERENCES,
			expect.anything(),
		);
	});
});
