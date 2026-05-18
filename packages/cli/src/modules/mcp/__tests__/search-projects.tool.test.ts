import { mockInstance } from '@n8n/backend-test-utils';
import { ProjectRepository, User } from '@n8n/db';

import { createSearchProjectsTool } from '../tools/search-projects.tool';

import { Telemetry } from '@/telemetry';

describe('search-projects MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });

	const createMocks = (overrides?: {
		projects?: Array<{ id: string; name: string; type: string }>;
		count?: number;
	}) => {
		const projects = overrides?.projects ?? [];
		const count = overrides?.count ?? projects.length;

		const projectRepository = mockInstance(ProjectRepository, {
			getAccessibleProjectsAndCount: jest.fn().mockResolvedValue([projects, count]),
		});

		const telemetry = mockInstance(Telemetry, {
			track: jest.fn(),
		});

		return { projectRepository, telemetry };
	};

	const callHandler = async (
		tool: ReturnType<typeof createSearchProjectsTool>,
		args: { query?: string; type?: 'personal' | 'team'; limit?: number },
	) =>
		await tool.handler(
			{
				query: args.query as string,
				type: args.type as 'personal' | 'team',
				limit: args.limit as number,
			},
			{} as never,
		);

	test('creates tool correctly', () => {
		const { projectRepository, telemetry } = createMocks();

		const tool = createSearchProjectsTool(
			user,
			projectRepository as unknown as ProjectRepository,
			telemetry,
		);

		expect(tool.name).toBe('search_projects');
		expect(tool.config).toBeDefined();
		expect(typeof tool.config.description).toBe('string');
		expect(tool.config.inputSchema).toBeDefined();
		expect(typeof tool.handler).toBe('function');
	});

	test('returns accessible projects', async () => {
		const projects = [
			{ id: 'proj-1', name: 'My Project', type: 'team' },
			{ id: 'proj-2', name: 'Personal', type: 'personal' },
		];
		const { projectRepository, telemetry } = createMocks({ projects });

		const tool = createSearchProjectsTool(
			user,
			projectRepository as unknown as ProjectRepository,
			telemetry,
		);

		const result = await callHandler(tool, {});

		expect(result.structuredContent).toEqual({
			data: [
				{ id: 'proj-1', name: 'My Project', type: 'team' },
				{ id: 'proj-2', name: 'Personal', type: 'personal' },
			],
			count: 2,
		});
	});

	test('filters by query', async () => {
		const { projectRepository, telemetry } = createMocks();

		const tool = createSearchProjectsTool(
			user,
			projectRepository as unknown as ProjectRepository,
			telemetry,
		);

		await callHandler(tool, { query: 'test' });

		expect(projectRepository.getAccessibleProjectsAndCount).toHaveBeenCalledWith(user.id, {
			search: 'test',
			type: undefined,
			take: 100,
		});
	});

	test('filters by type', async () => {
		const { projectRepository, telemetry } = createMocks();

		const tool = createSearchProjectsTool(
			user,
			projectRepository as unknown as ProjectRepository,
			telemetry,
		);

		await callHandler(tool, { type: 'team' });

		expect(projectRepository.getAccessibleProjectsAndCount).toHaveBeenCalledWith(user.id, {
			search: undefined,
			type: 'team',
			take: 100,
		});
	});

	test('ranks exact case-insensitive name match ahead of partial matches', async () => {
		const projects = [
			{ id: 'proj-old', name: 'Finance-Old', type: 'team' },
			{ id: 'proj-exact', name: 'Finance', type: 'team' },
			{ id: 'proj-archive', name: 'Old Finance Archive', type: 'team' },
		];
		const { projectRepository, telemetry } = createMocks({ projects });

		const tool = createSearchProjectsTool(
			user,
			projectRepository as unknown as ProjectRepository,
			telemetry,
		);

		const result = await callHandler(tool, { query: 'finance' });

		const data = (result.structuredContent as { data: Array<{ id: string; matchType: string }> })
			.data;
		expect(data[0]).toEqual(expect.objectContaining({ id: 'proj-exact', matchType: 'exact' }));
		expect(data.slice(1).map((p) => p.matchType)).toEqual(['partial', 'partial']);
	});

	test('includes a disambiguation hint when no exact match is found among multiple partials', async () => {
		const projects = [
			{ id: 'proj-old', name: 'Finance-Old', type: 'team' },
			{ id: 'proj-archive', name: 'Old Finance Archive', type: 'team' },
		];
		const { projectRepository, telemetry } = createMocks({ projects });

		const tool = createSearchProjectsTool(
			user,
			projectRepository as unknown as ProjectRepository,
			telemetry,
		);

		const result = await callHandler(tool, { query: 'finance' });

		const output = result.structuredContent as { hint?: string };
		expect(output.hint).toContain('No exact match for "finance"');
		expect(output.hint).toContain('clarify');
	});

	test('omits hint when an exact match resolves the ambiguity', async () => {
		const projects = [
			{ id: 'proj-exact', name: 'Finance', type: 'team' },
			{ id: 'proj-old', name: 'Finance-Old', type: 'team' },
		];
		const { projectRepository, telemetry } = createMocks({ projects });

		const tool = createSearchProjectsTool(
			user,
			projectRepository as unknown as ProjectRepository,
			telemetry,
		);

		const result = await callHandler(tool, { query: 'finance' });

		const output = result.structuredContent as { hint?: string };
		expect(output.hint).toBeUndefined();
	});

	test('does not attach matchType when no query is provided', async () => {
		const projects = [{ id: 'proj-1', name: 'My Project', type: 'team' }];
		const { projectRepository, telemetry } = createMocks({ projects });

		const tool = createSearchProjectsTool(
			user,
			projectRepository as unknown as ProjectRepository,
			telemetry,
		);

		const result = await callHandler(tool, {});

		const data = (result.structuredContent as { data: Array<Record<string, unknown>> }).data;
		expect(data[0]).not.toHaveProperty('matchType');
	});

	test('handles errors', async () => {
		const projectRepository = mockInstance(ProjectRepository, {
			getAccessibleProjectsAndCount: jest.fn().mockRejectedValue(new Error('DB error')),
		});
		const telemetry = mockInstance(Telemetry, { track: jest.fn() });

		const tool = createSearchProjectsTool(
			user,
			projectRepository as unknown as ProjectRepository,
			telemetry,
		);

		const result = await callHandler(tool, {});

		expect(result.isError).toBe(true);
		expect(result.structuredContent).toMatchObject({
			data: [],
			count: 0,
			error: 'DB error',
		});
	});
});
