import { mockInstance } from '@n8n/backend-test-utils';
import { User } from '@n8n/db';
import { TELEMETRY_EVENT } from '@n8n/telemetry';
import z from 'zod';

import type { ApplicableAiPreferences } from '@/services/ai-preference.service';
import { AiPreferenceService } from '@/services/ai-preference.service';
import { Telemetry } from '@/telemetry';

import { USER_CALLED_MCP_TOOL_EVENT } from '../mcp.constants';
import { createGetUserPreferencesTool } from '../tools/get-user-preferences.tool';

/** A saved preference now carries its id. Ids do not affect rendering, so the text doubles as one. */
const saved = (...texts: string[]) => texts.map((content) => ({ id: `id-${content}`, content }));

/**
 * The ticket fixes the description as a requirement, not an implementation choice: whether the
 * assistant calls the tool at all, and keeps applying the result, is decided by this text. It
 * is asserted verbatim so an edit has to be deliberate.
 */
const DESCRIPTION = [
	'Returns the preferences saved for this n8n instance, the caller, and their projects: node and credential choices, naming, how work is organised, and patterns to avoid.',
	'Call this before you create or modify anything in n8n — a workflow, an Agent, a data table, a folder — and apply what it returns to every change you make for the remainder of the task, not only the first one. If a preference conflicts with something the user asks for directly, follow the user and say which preference you set aside.',
	'When you work inside one project, pass its `projectId` to leave the other projects out.',
].join('\n\n');

const NOTHING_SAVED = 'No preferences are saved for this instance, for you, or for your projects.';
const NOTHING_SAVED_FOR_PROJECT =
	'No preferences are saved for this instance, for you, or for this project.';

const userWithScopes = (scopeSlugs: string[]) =>
	Object.assign(new User(), {
		id: 'user-1',
		role: { slug: 'global:test', scopes: scopeSlugs.map((slug) => ({ slug })) },
	});

const empty: ApplicableAiPreferences = { instance: [], user: [], projects: [] };

const createMocks = (result: ApplicableAiPreferences | Error = empty) => {
	const read = () =>
		result instanceof Error ? vi.fn().mockRejectedValue(result) : vi.fn().mockResolvedValue(result);
	const aiPreferenceService = mockInstance(AiPreferenceService, {
		getApplicableAcrossProjects: read(),
		getApplicableForProject: read(),
	});
	const telemetry = mockInstance(Telemetry, { track: vi.fn() });
	return { aiPreferenceService, telemetry };
};

describe('get-user-preferences MCP tool', () => {
	// A user's own preferences need no scope, so a role with none must be served.
	const user = userWithScopes([]);

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('tool definition', () => {
		test('is named get_user_preferences', () => {
			const { aiPreferenceService, telemetry } = createMocks();

			const tool = createGetUserPreferencesTool(user, aiPreferenceService, telemetry);

			expect(tool.name).toBe('get_user_preferences');
		});

		test('carries the agreed description verbatim', () => {
			const { aiPreferenceService, telemetry } = createMocks();

			const tool = createGetUserPreferencesTool(user, aiPreferenceService, telemetry);

			expect(tool.config.description).toBe(DESCRIPTION);
		});

		test('takes only the optional projectId, so a plain call still reads everything', () => {
			const { aiPreferenceService, telemetry } = createMocks();

			const tool = createGetUserPreferencesTool(user, aiPreferenceService, telemetry);

			expect(Object.keys(tool.config.inputSchema!)).toEqual(['projectId']);
			expect(tool.config.inputSchema!.projectId.safeParse(undefined).success).toBe(true);
			expect(tool.config.inputSchema!.projectId.safeParse('p-1').success).toBe(true);
			expect(tool.config.inputSchema!.projectId.safeParse('').success).toBe(false);
		});

		test('is annotated read-only', () => {
			const { aiPreferenceService, telemetry } = createMocks();

			const tool = createGetUserPreferencesTool(user, aiPreferenceService, telemetry);

			expect(tool.config.annotations).toMatchObject({
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			});
		});
	});

	describe('reading', () => {
		test('reads the preferences that apply to the calling user', async () => {
			const { aiPreferenceService, telemetry } = createMocks({
				instance: [],
				user: saved('Keep replies short.'),
				projects: [],
			});
			const tool = createGetUserPreferencesTool(user, aiPreferenceService, telemetry);

			await tool.handler({});

			expect(aiPreferenceService.getApplicableAcrossProjects).toHaveBeenCalledWith(user);
		});

		test('returns the rendered preferences', async () => {
			const { aiPreferenceService, telemetry } = createMocks({
				instance: saved('Use British English.'),
				user: saved('Keep replies short.'),
				projects: [{ id: 'p-1', name: 'Marketing', items: saved('Prefer HubSpot nodes.') }],
			});
			const tool = createGetUserPreferencesTool(user, aiPreferenceService, telemetry);

			const result = await tool.handler({});

			const text = result.content?.[0];
			expect(text).toMatchObject({ type: 'text' });
			expect(text && 'text' in text ? text.text : '').toContain('- Use British English.');
			expect(text && 'text' in text ? text.text : '').toContain('- Keep replies short.');
			expect(text && 'text' in text ? text.text : '').toContain('- Prefer HubSpot nodes.');
			// The id travels with each item: an edit has to address a row, and the block
			// the assistant is given carries text without ids.
			expect(result.structuredContent).toEqual({
				hasPreferences: true,
				preferences: [
					{ id: 'id-Use British English.', scope: 'instance', text: 'Use British English.' },
					{ id: 'id-Keep replies short.', scope: 'user', text: 'Keep replies short.' },
					{
						id: 'id-Prefer HubSpot nodes.',
						scope: 'project',
						project: 'Marketing',
						text: 'Prefer HubSpot nodes.',
					},
				],
			});
		});

		test('answers definitely when nothing is saved, so the assistant does not ask again', async () => {
			const { aiPreferenceService, telemetry } = createMocks(empty);
			const tool = createGetUserPreferencesTool(user, aiPreferenceService, telemetry);

			const result = await tool.handler({});

			expect(result.content).toEqual([{ type: 'text', text: NOTHING_SAVED }]);
			expect(result.structuredContent).toEqual({ hasPreferences: false, preferences: [] });
		});

		test('reads again on every call, so an edit lands without a reconnect', async () => {
			const { aiPreferenceService, telemetry } = createMocks(empty);
			const tool = createGetUserPreferencesTool(user, aiPreferenceService, telemetry);

			await tool.handler({});
			await tool.handler({});

			expect(aiPreferenceService.getApplicableAcrossProjects).toHaveBeenCalledTimes(2);
		});

		describe('narrowed to one project (CONTEXT-136)', () => {
			test('reads the one project instead of every project', async () => {
				const { aiPreferenceService, telemetry } = createMocks({
					instance: saved('Use British English.'),
					user: saved('Keep replies short.'),
					projects: [{ id: 'p-1', name: 'Marketing', items: saved('Prefer HubSpot nodes.') }],
				});
				const tool = createGetUserPreferencesTool(user, aiPreferenceService, telemetry);

				const result = await tool.handler({ projectId: 'p-1' });

				expect(aiPreferenceService.getApplicableForProject).toHaveBeenCalledWith(user, 'p-1');
				expect(aiPreferenceService.getApplicableAcrossProjects).not.toHaveBeenCalled();
				expect(
					(result.structuredContent as { preferences: Array<{ scope: string }> }).preferences.map(
						(item) => item.scope,
					),
				).toEqual(['instance', 'user', 'project']);
			});

			test('answers an empty project definitely, naming the project scope', async () => {
				const { aiPreferenceService, telemetry } = createMocks(empty);
				const tool = createGetUserPreferencesTool(user, aiPreferenceService, telemetry);

				const result = await tool.handler({ projectId: 'p-1' });

				expect(result.content).toEqual([{ type: 'text', text: NOTHING_SAVED_FOR_PROJECT }]);
				expect(result.structuredContent).toEqual({ hasPreferences: false, preferences: [] });
			});

			test('rejects a project the caller cannot read as an error result, not an empty success', async () => {
				const { aiPreferenceService, telemetry } = createMocks(
					new Error('Project with id p-9 not found'),
				);
				const tool = createGetUserPreferencesTool(user, aiPreferenceService, telemetry);

				const result = await tool.handler({ projectId: 'p-9' });

				expect(result.isError).toBe(true);
				expect(result.structuredContent).toEqual({
					hasPreferences: false,
					preferences: [],
					error: 'Project with id p-9 not found',
				});
				expect(result.content).not.toEqual([{ type: 'text', text: NOTHING_SAVED }]);
				expect(result.content).not.toEqual([{ type: 'text', text: NOTHING_SAVED_FOR_PROJECT }]);
			});
		});

		/**
		 * Same decision table `ai-preference.service.test.ts` uses for `renderAiPreferences` and
		 * `flattenAiPreferences`, applied here to the tool's own output: each group is either
		 * absent or present, independently. Also pins the invariant between the two structured
		 * fields: `hasPreferences` now reports on the same list it ships, so they must agree in
		 * every class.
		 */
		describe('structured output (decision table over the three groups)', () => {
			const MARKETING = { id: 'p-1', name: 'Marketing', items: saved('Prefer HubSpot nodes.') };

			it.each([
				{ instance: false, personal: false, projects: false, expected: [] },
				{ instance: true, personal: false, projects: false, expected: ['Use British English.'] },
				{ instance: false, personal: true, projects: false, expected: ['Keep replies short.'] },
				{
					instance: false,
					personal: false,
					projects: true,
					expected: ['Prefer HubSpot nodes.'],
				},
				{
					instance: true,
					personal: true,
					projects: false,
					expected: ['Use British English.', 'Keep replies short.'],
				},
				{
					instance: true,
					personal: false,
					projects: true,
					expected: ['Use British English.', 'Prefer HubSpot nodes.'],
				},
				{
					instance: false,
					personal: true,
					projects: true,
					expected: ['Keep replies short.', 'Prefer HubSpot nodes.'],
				},
				{
					instance: true,
					personal: true,
					projects: true,
					expected: ['Use British English.', 'Keep replies short.', 'Prefer HubSpot nodes.'],
				},
			])(
				'instance=$instance personal=$personal projects=$projects',
				async ({ instance, personal, projects, expected }) => {
					const { aiPreferenceService, telemetry } = createMocks({
						instance: instance ? saved('Use British English.') : [],
						user: personal ? saved('Keep replies short.') : [],
						projects: projects ? [MARKETING] : [],
					});
					const tool = createGetUserPreferencesTool(user, aiPreferenceService, telemetry);

					const result = await tool.handler({});

					expect(result.structuredContent).toMatchObject({
						hasPreferences: expected.length > 0,
					});
					expect(
						(result.structuredContent as { preferences: Array<{ text: string }> }).preferences.map(
							(item) => item.text,
						),
					).toEqual(expected);
				},
			);
		});
	});

	describe('failures', () => {
		test('answers with an error result, not with "no preferences", so no build proceeds blind', async () => {
			const { aiPreferenceService, telemetry } = createMocks(new Error('db down'));
			const tool = createGetUserPreferencesTool(user, aiPreferenceService, telemetry);

			const result = await tool.handler({});

			expect(result.isError).toBe(true);
			expect(result.structuredContent).toEqual({
				hasPreferences: false,
				preferences: [],
				error: 'db down',
			});
			expect(result.content).toEqual([
				{ type: 'text', text: 'Could not read the saved preferences: db down' },
			]);
			expect(result.content).not.toEqual([{ type: 'text', text: NOTHING_SAVED }]);
		});

		test('keeps the error result inside the output schema', async () => {
			const { aiPreferenceService, telemetry } = createMocks(new Error('db down'));
			const tool = createGetUserPreferencesTool(user, aiPreferenceService, telemetry);

			const result = await tool.handler({});

			expect(z.object(tool.config.outputSchema!).safeParse(result.structuredContent).success).toBe(
				true,
			);
		});
	});

	describe('telemetry', () => {
		test('reports a successful call', async () => {
			const { aiPreferenceService, telemetry } = createMocks({
				instance: saved('Use British English.'),
				user: [],
				projects: [],
			});
			const tool = createGetUserPreferencesTool(user, aiPreferenceService, telemetry);

			await tool.handler({});

			expect(telemetry.track).toHaveBeenCalledWith(USER_CALLED_MCP_TOOL_EVENT, {
				user_id: 'user-1',
				tool_name: 'get_user_preferences',
				parameters: {},
				results: {
					success: true,
					data: {
						hasPreferences: true,
						count: 1,
						scopes: ['instance'],
						rendered_length: expect.any(Number),
					},
				},
			});
		});

		test('reports the read as its own registered event, apart from the turn event', async () => {
			const { aiPreferenceService, telemetry } = createMocks({
				instance: saved('Use British English.'),
				user: [],
				projects: [],
			});
			const tool = createGetUserPreferencesTool(user, aiPreferenceService, telemetry);

			await tool.handler({});

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.PREFERENCES_READ_OVER_MCP,
				{
					count: 1,
					scope_types: ['instance'],
					rendered_length: expect.any(Number),
					project_scoped: false,
				},
			);
		});

		test('reports a read of one project as project scoped, and an empty read as a zero', async () => {
			const { aiPreferenceService, telemetry } = createMocks();
			const tool = createGetUserPreferencesTool(user, aiPreferenceService, telemetry);

			await tool.handler({ projectId: 'p-1' });

			expect(telemetry.track).toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.PREFERENCES_READ_OVER_MCP,
				{ count: 0, scope_types: [], rendered_length: 0, project_scoped: true },
			);
		});

		test('reports no read when the read failed', async () => {
			const { aiPreferenceService, telemetry } = createMocks();
			aiPreferenceService.getApplicableAcrossProjects.mockRejectedValue(new Error('db down'));
			const tool = createGetUserPreferencesTool(user, aiPreferenceService, telemetry);

			await tool.handler({});

			expect(telemetry.track).not.toHaveBeenCalledWith(
				TELEMETRY_EVENT.CONTEXT.PREFERENCES_READ_OVER_MCP,
				expect.anything(),
			);
		});

		test('reports nothing saved as a count of zero and no scopes', async () => {
			const { aiPreferenceService, telemetry } = createMocks();
			const tool = createGetUserPreferencesTool(user, aiPreferenceService, telemetry);

			await tool.handler({});

			expect(telemetry.track).toHaveBeenCalledWith(
				USER_CALLED_MCP_TOOL_EVENT,
				expect.objectContaining({
					results: {
						success: true,
						data: { hasPreferences: false, count: 0, scopes: [], rendered_length: 0 },
					},
				}),
			);
		});

		test('counts every item and keeps the scope list distinct and in render order', async () => {
			const { aiPreferenceService, telemetry } = createMocks({
				instance: saved('Use British English.'),
				user: saved('Keep replies short.'),
				projects: [
					{
						id: 'p-1',
						name: 'Marketing',
						type: 'team',
						items: saved('Prefer HubSpot nodes.', 'Name flows after the campaign.'),
					},
				],
			});
			const tool = createGetUserPreferencesTool(user, aiPreferenceService, telemetry);

			const result = await tool.handler({});
			const rendered = result.content?.[0];
			const renderedLength = rendered && 'text' in rendered ? rendered.text.length : 0;

			// Two rows in one project must not report `project` twice, and the length is the
			// text the caller was actually given: it reviews the caps.
			expect(telemetry.track).toHaveBeenCalledWith(
				USER_CALLED_MCP_TOOL_EVENT,
				expect.objectContaining({
					results: {
						success: true,
						data: {
							hasPreferences: true,
							count: 4,
							scopes: ['instance', 'user', 'project'],
							rendered_length: renderedLength,
						},
					},
				}),
			);
			expect(renderedLength).toBeGreaterThan(0);
		});

		test('reports a failed call', async () => {
			const { aiPreferenceService, telemetry } = createMocks(new Error('db down'));
			const tool = createGetUserPreferencesTool(user, aiPreferenceService, telemetry);

			await tool.handler({});

			expect(telemetry.track).toHaveBeenCalledWith(USER_CALLED_MCP_TOOL_EVENT, {
				user_id: 'user-1',
				tool_name: 'get_user_preferences',
				parameters: {},
				results: { success: false, error: 'db down' },
			});
		});

		test('reports the projectId a narrowed call passed', async () => {
			const { aiPreferenceService, telemetry } = createMocks(empty);
			const tool = createGetUserPreferencesTool(user, aiPreferenceService, telemetry);

			await tool.handler({ projectId: 'p-1' });

			expect(telemetry.track).toHaveBeenCalledWith(
				USER_CALLED_MCP_TOOL_EVENT,
				expect.objectContaining({ parameters: { projectId: 'p-1' } }),
			);
		});

		test('reports a rejected projectId as a failure that still names the projectId', async () => {
			const { aiPreferenceService, telemetry } = createMocks(
				new Error('Project with id p-9 not found'),
			);
			const tool = createGetUserPreferencesTool(user, aiPreferenceService, telemetry);

			await tool.handler({ projectId: 'p-9' });

			expect(telemetry.track).toHaveBeenCalledWith(USER_CALLED_MCP_TOOL_EVENT, {
				user_id: 'user-1',
				tool_name: 'get_user_preferences',
				parameters: { projectId: 'p-9' },
				results: { success: false, error: 'Project with id p-9 not found' },
			});
		});
	});
});
