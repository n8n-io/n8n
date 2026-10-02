import { CredentialsGetManyRequestQuery } from '../../credentials/credentials-get-many-request.dto';
import {
	McpWorkflowsListQueryDto,
	TestRunsListQueryDto,
	WorkflowListQueryDto,
} from '../../list-query.dto';

describe('list query DTOs', () => {
	it('parses workflow filters, selections, sort order, and pagination', () => {
		const query = WorkflowListQueryDto.parse({
			filter: JSON.stringify({
				projectId: 'project-1',
				tags: ['tag'],
				isArchived: false,
				ignored: true,
			}),
			select: JSON.stringify(['name', 'tags', 'ignored']),
			sortBy: 'name:asc',
			skip: '2',
			take: '200',
		});

		expect(query).toMatchObject({
			filter: { projectId: 'project-1', tags: ['tag'], isArchived: false },
			select: { name: true, tags: true },
			sortBy: 'name:asc',
			skip: 2,
			take: 100,
		});
	});

	it('rejects invalid workflow filters and sort order', () => {
		expect(WorkflowListQueryDto.safeParse({ filter: '{' }).success).toBe(false);
		expect(WorkflowListQueryDto.safeParse({ filter: '{"active":"true"}' }).success).toBe(false);
		expect(WorkflowListQueryDto.safeParse({ sortBy: 'id:asc' }).success).toBe(false);
	});

	it('ignores null optional workflow filters', () => {
		expect(
			WorkflowListQueryDto.parse({
				filter: JSON.stringify({ active: null, ids: null, projectId: 'project-1' }),
			}).filter,
		).toEqual({ projectId: 'project-1' });
		expect(WorkflowListQueryDto.parse({ filter: '{"active":null}' }).filter).toBeUndefined();
	});

	it('parses credential filters and selects without workflow fields', () => {
		const query = CredentialsGetManyRequestQuery.parse({
			filter: JSON.stringify({ name: 'test', projectId: 'project-1', ignored: 'value' }),
			select: JSON.stringify(['id', 'type', 'tags']),
			take: '5',
		});

		expect(query.filter).toEqual({ name: 'test', projectId: 'project-1' });
		expect(query.select).toEqual({ id: true, type: true });
		expect(query.take).toBe(5);
	});

	it('ignores null optional credential filters', () => {
		expect(
			CredentialsGetManyRequestQuery.parse({
				filter: JSON.stringify({ name: null, type: null, projectId: 'project-1' }),
			}).filter,
		).toEqual({ projectId: 'project-1' });
		expect(
			CredentialsGetManyRequestQuery.parse({ filter: '{"name":null}' }).filter,
		).toBeUndefined();
	});

	it('uses the workflow schema for MCP and caps test-run pages', () => {
		expect(McpWorkflowsListQueryDto.parse({ filter: '{"availableInMCP":true}' }).filter).toEqual({
			availableInMCP: true,
		});
		expect(TestRunsListQueryDto.parse({ skip: '1', take: '101' })).toEqual({
			skip: 1,
			take: 100,
		});
		expect(TestRunsListQueryDto.safeParse({ filter: '{"active":"true"}' }).success).toBe(false);
	});
});
