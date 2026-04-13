import { DEFAULT_INSTANCE_AI_PERMISSIONS } from '@n8n/api-types';

import type { InstanceAiContext } from '../../../types';
import { createInsertDataTableRowsTool } from '../insert-data-table-rows.tool';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createMockContext(overrides?: Partial<InstanceAiContext>): InstanceAiContext {
	return {
		userId: 'test-user',
		workflowService: {
			list: jest.fn(),
			get: jest.fn(),
			getAsWorkflowJSON: jest.fn(),
			createFromWorkflowJSON: jest.fn(),
			updateFromWorkflowJSON: jest.fn(),
			archive: jest.fn(),
			delete: jest.fn(),
			publish: jest.fn(),
			unpublish: jest.fn(),
		},
		executionService: {
			list: jest.fn(),
			run: jest.fn(),
			getStatus: jest.fn(),
			getResult: jest.fn(),
			stop: jest.fn(),
			getDebugInfo: jest.fn(),
			getNodeOutput: jest.fn(),
		},
		credentialService: {
			list: jest.fn(),
			get: jest.fn(),
			delete: jest.fn(),
			test: jest.fn(),
		},
		nodeService: {
			listAvailable: jest.fn(),
			getDescription: jest.fn(),
			listSearchable: jest.fn(),
		},
		dataTableService: {
			list: jest.fn(),
			create: jest.fn(),
			delete: jest.fn(),
			getSchema: jest.fn(),
			addColumn: jest.fn(),
			deleteColumn: jest.fn(),
			renameColumn: jest.fn(),
			queryRows: jest.fn(),
			insertRows: jest.fn(),
			updateRows: jest.fn(),
			deleteRows: jest.fn(),
		},
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('createInsertDataTableRowsTool', () => {
	let context: InstanceAiContext;

	beforeEach(() => {
		context = createMockContext({
			permissions: {
				...DEFAULT_INSTANCE_AI_PERMISSIONS,
				mutateDataTableRows: 'always_allow',
			},
		});
	});

	it('returns artifact metadata (dataTableId, tableName, projectId) in result', async () => {
		(context.dataTableService.insertRows as jest.Mock).mockResolvedValue({
			insertedCount: 3,
			dataTableId: 'dt-1',
			tableName: 'Orders',
			projectId: 'proj-1',
		});

		const tool = createInsertDataTableRowsTool(context);
		const result = (await tool.execute!(
			{ dataTableId: 'dt-1', rows: [{ name: 'a' }, { name: 'b' }, { name: 'c' }] },
			{ agent: { suspend: jest.fn(), resumeData: undefined } } as never,
		)) as Record<string, unknown>;

		expect(result).toEqual({
			insertedCount: 3,
			dataTableId: 'dt-1',
			tableName: 'Orders',
			projectId: 'proj-1',
		});
	});
});
