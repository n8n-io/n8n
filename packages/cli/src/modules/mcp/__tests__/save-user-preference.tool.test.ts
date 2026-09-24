import type { AiPreferenceDto } from '@n8n/api-types';
import { AI_PREFERENCE_CONTENT_MAX_LENGTH, AI_PREFERENCE_MAX_PER_SCOPE } from '@n8n/api-types';
import { mockInstance, mockLogger } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import { CLIENT_CAPABILITIES_META_KEY } from '@modelcontextprotocol/server';
import type { InputRequiredResult } from '@modelcontextprotocol/server';

import { AiPreferenceScopeFullError } from '@/errors/response-errors/ai-preference-scope-full.error';
import { BadRequestError } from '@/errors/response-errors/bad-request.error';
import { ConflictError } from '@/errors/response-errors/conflict.error';
import { ForbiddenError } from '@/errors/response-errors/forbidden.error';
import { AiPreferenceService } from '@/services/ai-preference.service';
import { UrlService } from '@/services/url.service';
import { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import type { ToolHandlerResult } from '../mcp.types';
import { createSaveUserPreferenceTool } from '../tools/save-user-preference.tool';

/**
 * The ticket fixes the description as a requirement: there is no system prompt on the MCP side,
 * so this text alone decides when a client saves and whether it reports the write back. It is
 * asserted verbatim so an edit has to be deliberate.
 */
const DESCRIPTION = [
	'Saves a preference about how the user likes to work with n8n, so the n8n assistant and every connected AI tool apply it from now on: node and credential choices, naming, how work is organised, patterns to avoid.',
	'Call this only for a durable preference the user states about their way of working, such as "always add an error workflow" or "name nodes in English". Do not call it for an instruction that applies to the current task only, such as "make this one a POST request", and do not infer a preference the user did not state.',
	'Read get_user_preferences first. If a saved preference already covers the same ground, call update_user_preference with its id instead of saving a near-duplicate; saving the exact same text again is refused.',
	'The preference is saved at once, without a confirmation step. In the same turn, tell the user the exact text that was saved and give them the settings link from the result, so they can check it. If they want it changed, call update_user_preference; if they want it gone, call undo_user_preference.',
].join('\n\n');

const URL = 'https://n8n.example.com/settings/context/preferences';
const ID = '0f6c3b5a-4d2e-4c1b-9a8f-1e2d3c4b5a69';
const TEXT = 'Always add an error workflow.';

const user = Object.assign(new User(), {
	id: 'user-1',
	role: { slug: 'global:member', scopes: [] },
});

const dto = (overrides: Partial<AiPreferenceDto> = {}): AiPreferenceDto => ({
	id: ID,
	content: TEXT,
	userId: 'user-1',
	user: null,
	projectId: null,
	project: null,
	source: 'mcp',
	scopes: ['aiPreference:read', 'aiPreference:update', 'aiPreference:delete'],
	createdAt: new Date(Date.now() - 30_000).toISOString(),
	updatedAt: new Date().toISOString(),
	...overrides,
});

const createMocks = () => {
	const aiPreferenceService = mockInstance(AiPreferenceService, {
		create: vi.fn().mockResolvedValue(dto()),
		updateContent: vi.fn(),
		undoWrite: vi.fn(),
	});
	const telemetry = mockInstance(Telemetry, { track: vi.fn() });
	const urlService = mockInstance(UrlService, {
		getInstanceBaseUrl: vi.fn().mockReturnValue('https://n8n.example.com'),
	});
	const tool = createSaveUserPreferenceTool(
		user,
		aiPreferenceService,
		telemetry,
		urlService,
		mockLogger(),
	);
	return { aiPreferenceService, telemetry, tool };
};

/** The slice of the SDK handler context the tool reads. `requestState: null` means none echoed. */
const ctx = ({
	elicitation = false,
	review,
	requestState = ID,
}: {
	elicitation?: boolean | Record<string, unknown>;
	review?: { action: 'accept' | 'decline' | 'cancel'; content?: Record<string, unknown> };
	requestState?: string | null;
} = {}) => ({
	mcpReq: {
		envelope: elicitation
			? { [CLIENT_CAPABILITIES_META_KEY]: { elicitation: elicitation === true ? {} : elicitation } }
			: {},
		inputResponses: review ? { review } : undefined,
		requestState: () => requestState ?? undefined,
	},
});

const isInputRequired = (result: ToolHandlerResult): result is InputRequiredResult =>
	'resultType' in result && result.resultType === 'input_required';

const structured = (result: ToolHandlerResult) => {
	if (isInputRequired(result)) throw new Error('expected a tool result');
	return result.structuredContent as Record<string, unknown>;
};

const text = (result: ToolHandlerResult) => {
	if (isInputRequired(result)) throw new Error('expected a tool result');
	const item = result.content[0];
	return item.type === 'text' ? item.text : '';
};

describe('save_user_preference MCP tool', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('tool definition', () => {
		test('is named save_user_preference', () => {
			expect(createMocks().tool.name).toBe('save_user_preference');
		});

		test('carries the agreed description verbatim', () => {
			expect(createMocks().tool.config.description).toBe(DESCRIPTION);
		});

		test('carries both caps in its content field, so the model reads them before it writes', () => {
			const { tool } = createMocks();
			const content = tool.config.inputSchema!.content;

			expect(Object.keys(tool.config.inputSchema!)).toEqual(['content']);
			expect(content.safeParse('x'.repeat(AI_PREFERENCE_CONTENT_MAX_LENGTH)).success).toBe(true);
			expect(content.safeParse('x'.repeat(AI_PREFERENCE_CONTENT_MAX_LENGTH + 1)).success).toBe(
				false,
			);
			expect(content.safeParse('   ').success).toBe(false);
			expect(content.description).toContain(String(AI_PREFERENCE_CONTENT_MAX_LENGTH));
			expect(content.description).toContain(String(AI_PREFERENCE_MAX_PER_SCOPE));
		});

		test('is annotated as a non-destructive write', () => {
			expect(createMocks().tool.config.annotations).toMatchObject({
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: false,
				openWorldHint: false,
			});
		});
	});

	describe('the write', () => {
		test('saves a personal preference at once, with the source fixed to mcp', async () => {
			const { aiPreferenceService, tool } = createMocks();

			await tool.handler({ content: TEXT }, ctx());

			expect(aiPreferenceService.create).toHaveBeenCalledWith(
				user,
				{ content: TEXT, scope: 'user' },
				'mcp',
			);
		});

		test('names the saved text, the id, the scope and the settings link', async () => {
			const { tool } = createMocks();

			const result = await tool.handler({ content: TEXT }, ctx());

			expect(structured(result)).toEqual({
				saved: true,
				preference: { id: ID, scope: 'user', text: TEXT, url: URL },
			});
			expect(text(result)).toContain(`"${TEXT}"`);
			expect(text(result)).toContain(URL);
		});

		// The write goes through the shared assistant write, so the same four events fire here as
		// for the chat: shown and accepted fire with the write, because silence keeps the row.
		test('reports the write with the shared assistant events on the mcp surface', async () => {
			const { telemetry, tool } = createMocks();

			await tool.handler({ content: TEXT }, ctx());

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.ASSISTANT_SAVED_PREFERENCE,
				{ surface: 'mcp', scope_type: 'user', text_length: TEXT.length, replaced_existing: false },
			);
			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.PREFERENCE_CONFIRMATION_SHOWN,
				{ surface: 'mcp', scope_type: 'user', text_length: TEXT.length },
			);
			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.PREFERENCE_CONFIRMATION_RESOLVED,
				{ surface: 'mcp', outcome: 'accepted', scope_type: 'user', text_length: TEXT.length },
			);
		});

		test('records the length and the elicitation capability on the tool event, never the text', async () => {
			const { telemetry, tool } = createMocks();

			await tool.handler({ content: TEXT }, ctx());

			expect(telemetry.track).toHaveBeenCalledWith(USER_CALLED_MCP_TOOL_EVENT, {
				user_id: 'user-1',
				tool_name: 'save_user_preference',
				parameters: { text_length: TEXT.length, can_elicit: false },
				results: { success: true, data: { saved: true, removed: false, review: 'none' } },
			});
			expect(JSON.stringify(vi.mocked(telemetry.track).mock.calls)).not.toContain(TEXT);
		});

		test('returns the plain saved result to a client that declared no elicitation', async () => {
			const { tool } = createMocks();

			const result = await tool.handler({ content: TEXT }, ctx({ elicitation: false }));

			expect(isInputRequired(result)).toBe(false);
			expect(structured(result)).toMatchObject({ saved: true });
		});

		// On this revision a client names its modes. One that offers only `url` has no form to show.
		test('returns the plain saved result to a client that declared URL elicitation only', async () => {
			const { tool } = createMocks();

			const result = await tool.handler({ content: TEXT }, ctx({ elicitation: { url: {} } }));

			expect(isInputRequired(result)).toBe(false);
			expect(structured(result)).toMatchObject({ saved: true });
		});

		test('shows the form to a client that named the form mode', async () => {
			const { tool } = createMocks();

			const result = await tool.handler(
				{ content: TEXT },
				ctx({ elicitation: { form: {}, url: {} } }),
			);

			expect(isInputRequired(result)).toBe(true);
		});

		test('serves a call with no handler context like a client without elicitation', async () => {
			const { tool } = createMocks();

			const result = await tool.handler({ content: TEXT });

			expect(structured(result)).toMatchObject({ saved: true });
		});
	});

	describe('refusals', () => {
		test.each([
			[new ConflictError('dup'), 'duplicate', 'dup'],
			[
				new AiPreferenceScopeFullError('user', { limit: 50, actual: 50 }),
				'scope_full',
				'A user cannot hold more than 50 preferences',
			],
			// Any other 4xx passes its message through as a failure.
			[new BadRequestError('no project'), 'failed', 'no project'],
			[new ForbiddenError('no'), 'not_permitted', 'no'],
			[new Error('db down'), 'failed', 'The preference could not be saved.'],
		])(
			'relays the refusal %s as a readable result with reason %s',
			async (error, reason, message) => {
				const { aiPreferenceService, telemetry, tool } = createMocks();
				aiPreferenceService.create.mockRejectedValue(error);

				const result = await tool.handler({ content: TEXT }, ctx());

				expect(isInputRequired(result)).toBe(false);
				if (isInputRequired(result)) return;
				expect(result.isError).toBe(true);
				expect(structured(result)).toEqual({ saved: false, error: message, reason });
				expect(text(result)).toContain('Nothing was saved');
				expect(telemetry.track).toHaveBeenCalledWith(
					TELEMETRY_EVENT.CONTEXT.PREFERENCE_WRITE_REJECTED,
					{ surface: 'mcp', reason, scope_type: 'user', text_length: TEXT.length },
				);
			},
		);

		test('leaves the duplicate rule to the service: the tool never reads existing preferences', async () => {
			const { aiPreferenceService, tool } = createMocks();

			await tool.handler({ content: TEXT }, ctx());

			expect(aiPreferenceService.getApplicableAcrossProjects).not.toHaveBeenCalled();
		});
	});

	describe('the review form on a client with elicitation', () => {
		test('writes first, then asks for input with the saved text prefilled', async () => {
			const { aiPreferenceService, telemetry, tool } = createMocks();

			const result = await tool.handler({ content: TEXT }, ctx({ elicitation: true }));

			expect(aiPreferenceService.create).toHaveBeenCalledTimes(1);
			expect(isInputRequired(result)).toBe(true);
			if (!isInputRequired(result)) return;
			expect(result.requestState).toBe(ID);
			const request = result.inputRequests?.review;
			expect(request).toMatchObject({
				method: 'elicitation/create',
				params: {
					message: expect.stringContaining(`"${TEXT}"`),
					requestedSchema: {
						type: 'object',
						properties: {
							text: { type: 'string', default: TEXT, maxLength: AI_PREFERENCE_CONTENT_MAX_LENGTH },
						},
					},
				},
			});
			// The person learns where to manage the preference, and which consent stops more saves.
			const message = request?.method === 'elicitation/create' ? request.params.message : '';
			expect(message).toMatch(/^Saved to your n8n preferences\. Accept to keep it, or Decline/);
			expect(message).toContain('Settings > Context > Preferences');
			expect(message).toContain('"Save, update and undo AI preferences" permission');
			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.PREFERENCE_CONFIRMATION_SHOWN,
				{ surface: 'mcp', scope_type: 'user', text_length: TEXT.length },
			);
		});

		// `accepted` fired with the write, so an unchanged accept adds no event of its own.
		test('keeps the preference when the form is accepted unchanged, without a second event', async () => {
			const { aiPreferenceService, telemetry, tool } = createMocks();

			const result = await tool.handler(
				{ content: TEXT },
				ctx({ elicitation: true, review: { action: 'accept', content: { text: TEXT } } }),
			);

			expect(aiPreferenceService.create).not.toHaveBeenCalled();
			expect(aiPreferenceService.updateContent).not.toHaveBeenCalled();
			expect(aiPreferenceService.undoWrite).not.toHaveBeenCalled();
			expect(structured(result)).toEqual({
				saved: true,
				preference: { id: ID, scope: 'user', text: TEXT, url: URL },
			});
			expect(telemetry.track).toHaveBeenCalledTimes(1);
			expect(telemetry.track).toHaveBeenCalledWith(USER_CALLED_MCP_TOOL_EVENT, expect.anything());
		});

		test('applies an edit to the same row and reports it as accepted after edit', async () => {
			const { aiPreferenceService, telemetry, tool } = createMocks();
			const edited = 'Always add an error workflow that posts to Slack.';
			aiPreferenceService.updateContent.mockResolvedValue(dto({ content: edited }));

			const result = await tool.handler(
				{ content: TEXT },
				ctx({
					elicitation: true,
					review: { action: 'accept', content: { text: `  ${edited}  ` } },
				}),
			);

			expect(aiPreferenceService.updateContent).toHaveBeenCalledWith(user, ID, edited);
			expect(aiPreferenceService.create).not.toHaveBeenCalled();
			expect(structured(result)).toEqual({
				saved: true,
				preference: { id: ID, scope: 'user', text: edited, url: URL },
			});
			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.PREFERENCE_CONFIRMATION_RESOLVED,
				{
					surface: 'mcp',
					outcome: 'accepted_after_edit',
					scope_type: 'user',
					text_length: edited.length,
				},
			);
		});

		// Reported as the chat card reports its Undo: a deleted preference with source `rejected`.
		test('reports a declined form as a rejected delete with the time since the write', async () => {
			const { aiPreferenceService, telemetry, tool } = createMocks();
			aiPreferenceService.undoWrite.mockResolvedValue(dto());

			const result = await tool.handler(
				{ content: TEXT },
				ctx({ elicitation: true, review: { action: 'decline', content: { text: TEXT } } }),
			);

			expect(aiPreferenceService.undoWrite).toHaveBeenCalledWith(user, ID, 'mcp');
			expect(aiPreferenceService.updateContent).not.toHaveBeenCalled();
			expect(structured(result)).toEqual({ saved: false, removed: true });
			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.USER_DELETED_PREFERENCES,
				{
					count: 1,
					source: 'rejected',
					scope_types: ['user'],
					surface: 'mcp',
					seconds_since_saved: 30,
				},
			);
			expect(telemetry.track).not.toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.PREFERENCE_CONFIRMATION_RESOLVED,
				expect.anything(),
			);
		});

		// Every client offers Decline, and a press after the write means "not this one".
		test('removes the row when the form is declined without content', async () => {
			const { aiPreferenceService, tool } = createMocks();
			aiPreferenceService.undoWrite.mockResolvedValue(dto());

			const result = await tool.handler(
				{ content: TEXT },
				ctx({ elicitation: true, review: { action: 'decline' } }),
			);

			expect(aiPreferenceService.undoWrite).toHaveBeenCalledWith(user, ID, 'mcp');
			expect(aiPreferenceService.create).not.toHaveBeenCalled();
			expect(structured(result)).toEqual({ saved: false, removed: true });
		});

		// A closed form is silence, and silence must not delete data.
		test('keeps the row and resolves nothing when the form is cancelled', async () => {
			const { aiPreferenceService, telemetry, tool } = createMocks();

			const result = await tool.handler(
				{ content: TEXT },
				ctx({ elicitation: true, review: { action: 'cancel' } }),
			);

			expect(aiPreferenceService.undoWrite).not.toHaveBeenCalled();
			expect(aiPreferenceService.updateContent).not.toHaveBeenCalled();
			expect(aiPreferenceService.create).not.toHaveBeenCalled();
			expect(structured(result)).toEqual({
				saved: true,
				preference: { id: ID, scope: 'user', text: TEXT, url: URL },
			});
			expect(text(result)).toContain('stays as saved');
			expect(telemetry.track).toHaveBeenCalledTimes(1);
			expect(telemetry.track).toHaveBeenCalledWith(
				USER_CALLED_MCP_TOOL_EVENT,
				expect.objectContaining({
					results: { success: true, data: { saved: true, removed: false, review: 'cancel' } },
				}),
			);
		});

		test('refuses an edit over the length cap without touching the row', async () => {
			const { aiPreferenceService, telemetry, tool } = createMocks();
			const tooLong = 'x'.repeat(AI_PREFERENCE_CONTENT_MAX_LENGTH + 1);

			const result = await tool.handler(
				{ content: TEXT },
				ctx({ elicitation: true, review: { action: 'accept', content: { text: tooLong } } }),
			);

			expect(aiPreferenceService.updateContent).not.toHaveBeenCalled();
			expect(isInputRequired(result)).toBe(false);
			if (isInputRequired(result)) return;
			expect(result.isError).toBe(true);
			expect(structured(result)).toMatchObject({
				saved: true,
				preference: { id: ID, text: TEXT },
				reason: 'too_long',
			});
			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.PREFERENCE_WRITE_REJECTED,
				{ surface: 'mcp', reason: 'too_long', scope_type: 'user', text_length: tooLong.length },
			);
		});

		test('reports a refused edit and states that the original text stands', async () => {
			const { aiPreferenceService, tool } = createMocks();
			aiPreferenceService.updateContent.mockRejectedValue(new ConflictError('dup'));

			const result = await tool.handler(
				{ content: TEXT },
				ctx({ elicitation: true, review: { action: 'accept', content: { text: 'Other.' } } }),
			);

			expect(isInputRequired(result)).toBe(false);
			if (isInputRequired(result)) return;
			expect(result.isError).toBe(true);
			expect(structured(result)).toMatchObject({
				saved: true,
				preference: { id: ID, text: TEXT },
				reason: 'duplicate',
			});
			expect(text(result)).toContain(`"${TEXT}"`);
		});

		test('reports a failed removal after Decline and states that the preference is still saved', async () => {
			const { aiPreferenceService, tool } = createMocks();
			aiPreferenceService.undoWrite.mockRejectedValue(new Error('db down'));

			const result = await tool.handler(
				{ content: TEXT },
				ctx({ elicitation: true, review: { action: 'decline' } }),
			);

			expect(isInputRequired(result)).toBe(false);
			if (isInputRequired(result)) return;
			expect(result.isError).toBe(true);
			expect(structured(result)).toMatchObject({ saved: true, reason: 'failed' });
			expect(text(result)).toContain('still saved');
		});

		test.each([null, 'not-a-uuid'])(
			'writes nothing twice when the retry carries no usable request state (%s)',
			async (requestState) => {
				const { aiPreferenceService, tool } = createMocks();

				const result = await tool.handler(
					{ content: TEXT },
					ctx({ elicitation: true, review: { action: 'accept', content: {} }, requestState }),
				);

				expect(aiPreferenceService.create).not.toHaveBeenCalled();
				expect(aiPreferenceService.updateContent).not.toHaveBeenCalled();
				expect(aiPreferenceService.undoWrite).not.toHaveBeenCalled();
				expect(structured(result)).toMatchObject({ saved: true });
				expect(text(result)).toContain('get_user_preferences');
			},
		);
	});
});
