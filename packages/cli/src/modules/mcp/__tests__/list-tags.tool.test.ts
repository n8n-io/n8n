import { mockInstance } from '@n8n/backend-test-utils';
import type { ITagWithCountDb } from '@n8n/db';
import { User } from '@n8n/db';

import { TagService } from '@/services/tag.service';
import { Telemetry } from '@/telemetry';

import { createListTagsTool, listTags } from '../tools/list-tags.tool';

const buildTag = (overrides: Partial<ITagWithCountDb> = {}): ITagWithCountDb =>
	({
		id: 'tag-1',
		name: 'production',
		usageCount: 3,
		createdAt: new Date('2024-01-01T00:00:00.000Z'),
		updatedAt: new Date('2024-01-02T00:00:00.000Z'),
		...overrides,
	}) as ITagWithCountDb;

const userWithScopes = (scopeSlugs: string[]) =>
	Object.assign(new User(), {
		id: 'user-1',
		role: { slug: 'global:test', scopes: scopeSlugs.map((slug) => ({ slug })) },
	});

describe('list-tags MCP tool', () => {
	const user = userWithScopes(['tag:list']);

	const createMocks = (
		tagsOrError: ITagWithCountDb[] | Error = [],
		opts: { totalCount?: number } = {},
	) => {
		const listWithUsageCount =
			tagsOrError instanceof Error
				? jest.fn().mockRejectedValue(tagsOrError)
				: jest.fn().mockResolvedValue({
						data: tagsOrError,
						totalCount: opts.totalCount ?? tagsOrError.length,
					});
		const tagService = mockInstance(TagService, { listWithUsageCount });
		const telemetry = mockInstance(Telemetry, { track: jest.fn() });
		return { tagService, telemetry };
	};

	describe('smoke tests', () => {
		test('creates the tool correctly', () => {
			const { tagService, telemetry } = createMocks();

			const tool = createListTagsTool(user, tagService, telemetry);

			expect(tool.name).toBe('list_tags');
			expect(tool.config.description).toEqual(expect.any(String));
			expect(tool.config.inputSchema).toBeDefined();
			expect(tool.config.outputSchema).toBeDefined();
			expect(tool.config.annotations).toMatchObject({
				readOnlyHint: true,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: false,
			});
			expect(typeof tool.handler).toBe('function');
		});
	});

	describe('handler', () => {
		test('requests usage counts and returns the formatted payload', async () => {
			const tags = [buildTag(), buildTag({ id: 'tag-2', name: 'staging', usageCount: 0 })];
			const { tagService } = createMocks(tags);

			const result = await listTags(tagService);

			expect(tagService.listWithUsageCount).toHaveBeenCalledWith({ limit: 500 });
			expect(result.count).toBe(2);
			expect(result.totalCount).toBe(2);
			expect(result.data).toEqual([
				{
					id: 'tag-1',
					name: 'production',
					usageCount: 3,
					createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
					updatedAt: new Date('2024-01-02T00:00:00.000Z').toISOString(),
				},
				{
					id: 'tag-2',
					name: 'staging',
					usageCount: 0,
					createdAt: new Date('2024-01-01T00:00:00.000Z').toISOString(),
					updatedAt: new Date('2024-01-02T00:00:00.000Z').toISOString(),
				},
			]);
		});

		test('defaults usageCount to 0 when missing', async () => {
			const tags = [buildTag({ usageCount: undefined as unknown as number })];
			const { tagService } = createMocks(tags);

			const result = await listTags(tagService);

			expect(result.data[0].usageCount).toBe(0);
		});

		test('pushes the requested limit into the query and reports totalCount', async () => {
			const tags = [buildTag({ id: 'tag-1' }), buildTag({ id: 'tag-2' })];
			const { tagService } = createMocks(tags, { totalCount: 3 });

			const result = await listTags(tagService, { limit: 2 });

			expect(tagService.listWithUsageCount).toHaveBeenCalledWith({ limit: 2 });
			expect(result.data.map((t) => t.id)).toEqual(['tag-1', 'tag-2']);
			expect(result.count).toBe(2);
			expect(result.totalCount).toBe(3);
		});

		test('emits telemetry on success', async () => {
			const { tagService, telemetry } = createMocks([buildTag()]);
			const tool = createListTagsTool(user, tagService, telemetry);

			await tool.handler({ limit: undefined as unknown as number }, {} as never);

			expect(telemetry.track).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					tool_name: 'list_tags',
					user_id: 'user-1',
					results: { success: true, data: { count: 1 } },
				}),
			);
		});

		test('emits telemetry and rethrows on failure', async () => {
			const { tagService, telemetry } = createMocks(new Error('boom'));
			const tool = createListTagsTool(user, tagService, telemetry);

			await expect(
				tool.handler({ limit: undefined as unknown as number }, {} as never),
			).rejects.toThrow('boom');

			expect(telemetry.track).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					tool_name: 'list_tags',
					results: { success: false, error: 'boom' },
				}),
			);
		});

		test('rejects when the user does not have tag:list scope', async () => {
			const noScopeUser = userWithScopes([]);
			const { tagService, telemetry } = createMocks([buildTag()]);
			const tool = createListTagsTool(noScopeUser, tagService, telemetry);

			await expect(
				tool.handler({ limit: undefined as unknown as number }, {} as never),
			).rejects.toThrow('permission to list tags');

			expect(tagService.listWithUsageCount).not.toHaveBeenCalled();
		});
	});
});
