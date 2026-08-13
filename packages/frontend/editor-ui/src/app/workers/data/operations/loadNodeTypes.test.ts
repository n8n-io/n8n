import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { MockInstance } from 'vitest';
import type { INodeTypeDescription } from 'n8n-workflow';
import type { DataWorkerState, QueryResult } from '../types';
import { loadNodeTypes, getNodeType, getAllNodeTypes } from './loadNodeTypes';

vi.mock('@n8n/rest-api-client/api/nodeTypes', () => ({
	getNodeTypes: vi.fn(),
	getNodeTypeVersions: vi.fn(),
	getNodeTypesByIdentifier: vi.fn(),
}));

const {
	execWithParamsMock,
	queryMock,
	queryWithParamsMock,
	getStoredVersionMock,
	storeVersionMock,
} = vi.hoisted(() => ({
	execWithParamsMock: vi.fn(),
	queryMock: vi.fn(),
	queryWithParamsMock: vi.fn(),
	getStoredVersionMock: vi.fn(),
	storeVersionMock: vi.fn(),
}));

vi.mock('./query', () => ({
	exec: vi.fn(),
	execWithParams: execWithParamsMock,
	query: queryMock,
	queryWithParams: queryWithParamsMock,
	withTrx: async <T>(_state: unknown, fn: () => Promise<T>): Promise<T> => {
		await execWithParamsMock(_state, 'BEGIN TRANSACTION', []);
		try {
			const result = await fn();
			await execWithParamsMock(_state, 'COMMIT', []);
			return result;
		} catch (error) {
			await execWithParamsMock(_state, 'ROLLBACK', []);
			throw error;
		}
	},
}));

vi.mock('./storeVersion', () => ({
	getStoredVersion: getStoredVersionMock,
	storeVersion: storeVersionMock,
}));

import {
	getNodeTypes,
	getNodeTypeVersions,
	getNodeTypesByIdentifier,
} from '@n8n/rest-api-client/api/nodeTypes';
import { execWithParams, query, queryWithParams } from './query';
import { getStoredVersion, storeVersion } from './storeVersion';

describe('Data Worker loadNodeTypes Operations', () => {
	let consoleSpy: {
		log: MockInstance;
		error: MockInstance;
	};

	beforeEach(() => {
		consoleSpy = {
			log: vi.spyOn(console, 'log').mockImplementation(() => {}),
			error: vi.spyOn(console, 'error').mockImplementation(() => {}),
		};

		// Default mock behavior: version matches, no clearing needed
		vi.mocked(getStoredVersion).mockResolvedValue('1.0.0');
		vi.mocked(storeVersion).mockResolvedValue(undefined);
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	function createMockState(overrides: Partial<DataWorkerState> = {}): DataWorkerState {
		return {
			initialized: true,
			sqlite3: {} as DataWorkerState['sqlite3'],
			db: 1,
			vfs: null,
			initPromise: null,
			version: '1.0.0',
			...overrides,
		};
	}

	function createMockNodeType(overrides: Partial<INodeTypeDescription> = {}): INodeTypeDescription {
		return {
			displayName: 'Test Node',
			name: 'n8n-nodes-base.testNode',
			group: ['transform'],
			version: 1,
			description: 'A test node',
			defaults: { name: 'Test Node' },
			inputs: ['main'],
			outputs: ['main'],
			properties: [],
			...overrides,
		} as INodeTypeDescription;
	}

	function createQueryResult(rows: unknown[][] = [], columns: string[] = []): QueryResult {
		return { columns, rows };
	}

	describe('loadNodeTypes', () => {
		it('should throw error when database is not initialized', async () => {
			const state = createMockState({ initialized: false });

			await expect(loadNodeTypes(state, 'http://localhost:5678')).rejects.toThrow(
				'[DataWorker] Database not initialized',
			);
		});

		describe('initial load (empty database)', () => {
			it('should fetch all node types when database is empty', async () => {
				const state = createMockState();
				const mockNodeTypes = [
					createMockNodeType({ name: 'n8n-nodes-base.node1', version: 1 }),
					createMockNodeType({ name: 'n8n-nodes-base.node2', version: 1 }),
				];

				vi.mocked(query).mockResolvedValueOnce(createQueryResult([[0]]));
				vi.mocked(getNodeTypes).mockResolvedValueOnce(mockNodeTypes);
				vi.mocked(execWithParams).mockResolvedValue(undefined);

				await loadNodeTypes(state, 'http://localhost:5678');

				expect(getNodeTypes).toHaveBeenCalledWith('http://localhost:5678');
			});

			it('should wrap inserts in a transaction', async () => {
				const state = createMockState();
				const mockNodeTypes = [createMockNodeType({ name: 'n8n-nodes-base.node1', version: 1 })];

				vi.mocked(query).mockResolvedValueOnce(createQueryResult([[0]]));
				vi.mocked(getNodeTypes).mockResolvedValueOnce(mockNodeTypes);
				vi.mocked(execWithParams).mockResolvedValue(undefined);

				await loadNodeTypes(state, 'http://localhost:5678');

				expect(execWithParams).toHaveBeenCalledWith(state, 'BEGIN TRANSACTION', []);
				expect(execWithParams).toHaveBeenCalledWith(state, 'COMMIT', []);
			});

			it('should rollback transaction on error during initial load', async () => {
				const state = createMockState();
				const mockNodeTypes = [createMockNodeType({ name: 'n8n-nodes-base.node1', version: 1 })];

				vi.mocked(query).mockResolvedValueOnce(createQueryResult([[0]]));
				vi.mocked(getNodeTypes).mockResolvedValueOnce(mockNodeTypes);
				vi.mocked(execWithParams)
					.mockResolvedValueOnce(undefined) // BEGIN TRANSACTION
					.mockRejectedValueOnce(new Error('Insert failed')); // INSERT

				await expect(loadNodeTypes(state, 'http://localhost:5678')).rejects.toThrow(
					'Insert failed',
				);

				expect(execWithParams).toHaveBeenCalledWith(state, 'ROLLBACK', []);
			});

			it('should handle node types with array versions', async () => {
				const state = createMockState();
				const mockNodeTypes = [
					createMockNodeType({ name: 'n8n-nodes-base.multiVersion', version: [1, 2, 3] }),
				];

				vi.mocked(query).mockResolvedValueOnce(createQueryResult([[0]]));
				vi.mocked(getNodeTypes).mockResolvedValueOnce(mockNodeTypes);
				vi.mocked(execWithParams).mockResolvedValue(undefined);

				await loadNodeTypes(state, 'http://localhost:5678');

				// Should insert for each version with parameterized queries
				expect(execWithParams).toHaveBeenCalledWith(
					state,
					"INSERT OR REPLACE INTO nodeTypes (id, data, updated_at) VALUES (?, ?, datetime('now'))",
					['n8n-nodes-base.multiVersion@1', expect.any(String)],
				);
				expect(execWithParams).toHaveBeenCalledWith(
					state,
					"INSERT OR REPLACE INTO nodeTypes (id, data, updated_at) VALUES (?, ?, datetime('now'))",
					['n8n-nodes-base.multiVersion@2', expect.any(String)],
				);
				expect(execWithParams).toHaveBeenCalledWith(
					state,
					"INSERT OR REPLACE INTO nodeTypes (id, data, updated_at) VALUES (?, ?, datetime('now'))",
					['n8n-nodes-base.multiVersion@3', expect.any(String)],
				);
			});

			it('should handle single quotes in node type data via parameterized queries', async () => {
				const state = createMockState();
				const mockNodeTypes = [
					createMockNodeType({
						name: 'n8n-nodes-base.test',
						description: "It's a test node",
						version: 1,
					}),
				];

				vi.mocked(query).mockResolvedValueOnce(createQueryResult([[0]]));
				vi.mocked(getNodeTypes).mockResolvedValueOnce(mockNodeTypes);
				vi.mocked(execWithParams).mockResolvedValue(undefined);

				await loadNodeTypes(state, 'http://localhost:5678');

				// With parameterized queries, single quotes are handled by the database driver
				expect(execWithParams).toHaveBeenCalledWith(
					state,
					"INSERT OR REPLACE INTO nodeTypes (id, data, updated_at) VALUES (?, ?, datetime('now'))",
					['n8n-nodes-base.test@1', expect.stringContaining("It's a test node")],
				);
			});
		});

		describe('incremental sync (non-empty database)', () => {
			it('should check server versions for incremental sync', async () => {
				const state = createMockState();

				vi.mocked(query)
					.mockResolvedValueOnce(createQueryResult([[5]])) // COUNT returns 5
					.mockResolvedValueOnce(createQueryResult([['node1@1'], ['node2@1']])); // existing IDs
				vi.mocked(getNodeTypeVersions).mockResolvedValueOnce(['node1@1', 'node2@1']);
				vi.mocked(execWithParams).mockResolvedValue(undefined);

				await loadNodeTypes(state, 'http://localhost:5678');

				expect(getNodeTypeVersions).toHaveBeenCalledWith('http://localhost:5678');
			});

			it('should delete removed node types', async () => {
				const state = createMockState();

				vi.mocked(query)
					.mockResolvedValueOnce(createQueryResult([[2]])) // COUNT returns 2
					.mockResolvedValueOnce(createQueryResult([['node1@1'], ['node2@1']])); // existing IDs
				vi.mocked(getNodeTypeVersions).mockResolvedValueOnce(['node1@1']); // node2@1 removed
				vi.mocked(execWithParams).mockResolvedValue(undefined);

				await loadNodeTypes(state, 'http://localhost:5678');

				expect(execWithParams).toHaveBeenCalledWith(state, 'DELETE FROM nodeTypes WHERE id = ?', [
					'node2@1',
				]);
			});

			it('should fetch and insert added node types', async () => {
				const state = createMockState();
				const newNodeType = createMockNodeType({ name: 'n8n-nodes-base.newNode', version: 1 });

				vi.mocked(query)
					.mockResolvedValueOnce(createQueryResult([[1]])) // COUNT returns 1
					.mockResolvedValueOnce(createQueryResult([['existingNode@1']])); // existing IDs
				vi.mocked(getNodeTypeVersions).mockResolvedValueOnce([
					'existingNode@1',
					'n8n-nodes-base.newNode@1',
				]);
				vi.mocked(getNodeTypesByIdentifier).mockResolvedValueOnce([newNodeType]);
				vi.mocked(execWithParams).mockResolvedValue(undefined);

				await loadNodeTypes(state, 'http://localhost:5678');

				expect(getNodeTypesByIdentifier).toHaveBeenCalledWith(
					expect.objectContaining({ baseUrl: 'http://localhost:5678' }),
					['n8n-nodes-base.newNode@1'],
				);
			});

			it('should not make changes when no differences detected', async () => {
				const state = createMockState();

				vi.mocked(query)
					.mockResolvedValueOnce(createQueryResult([[2]])) // COUNT returns 2
					.mockResolvedValueOnce(createQueryResult([['node1@1'], ['node2@1']])); // existing IDs
				vi.mocked(getNodeTypeVersions).mockResolvedValueOnce(['node1@1', 'node2@1']); // same as DB

				await loadNodeTypes(state, 'http://localhost:5678');

				// Should not start a transaction if no changes
				expect(execWithParams).not.toHaveBeenCalledWith(state, 'BEGIN TRANSACTION', []);
			});

			it('should rollback transaction on error during incremental sync', async () => {
				const state = createMockState();

				vi.mocked(query)
					.mockResolvedValueOnce(createQueryResult([[1]])) // COUNT
					.mockResolvedValueOnce(createQueryResult([['node1@1']])); // existing IDs
				vi.mocked(getNodeTypeVersions).mockResolvedValueOnce(['node1@1', 'newNode@1']);
				vi.mocked(getNodeTypesByIdentifier).mockRejectedValueOnce(new Error('Fetch failed'));
				vi.mocked(execWithParams).mockResolvedValue(undefined);

				await expect(loadNodeTypes(state, 'http://localhost:5678')).rejects.toThrow('Fetch failed');

				expect(execWithParams).toHaveBeenCalledWith(state, 'ROLLBACK', []);
			});

			it('should strip trailing slash from baseUrl when creating REST API context', async () => {
				const state = createMockState();
				const newNodeType = createMockNodeType({ name: 'n8n-nodes-base.newNode', version: 1 });

				vi.mocked(query)
					.mockResolvedValueOnce(createQueryResult([[1]]))
					.mockResolvedValueOnce(createQueryResult([['existingNode@1']]));
				vi.mocked(getNodeTypeVersions).mockResolvedValueOnce([
					'existingNode@1',
					'n8n-nodes-base.newNode@1',
				]);
				vi.mocked(getNodeTypesByIdentifier).mockResolvedValueOnce([newNodeType]);
				vi.mocked(execWithParams).mockResolvedValue(undefined);

				await loadNodeTypes(state, 'http://localhost:5678/');

				expect(getNodeTypesByIdentifier).toHaveBeenCalledWith(
					expect.objectContaining({ baseUrl: 'http://localhost:5678' }),
					expect.any(Array),
				);
			});
		});

		it('should log sync progress', async () => {
			const state = createMockState();

			vi.mocked(query).mockResolvedValueOnce(createQueryResult([[0]]));
			vi.mocked(getNodeTypes).mockResolvedValueOnce([]);
			vi.mocked(execWithParams).mockResolvedValue(undefined);

			await loadNodeTypes(state, 'http://localhost:5678');

			expect(consoleSpy.log).toHaveBeenCalledWith('[DataWorker] Starting node types sync...');
		});
	});

	describe('getNodeType', () => {
		it('should return null when node type is not found', async () => {
			const state = createMockState();
			vi.mocked(queryWithParams).mockResolvedValueOnce(createQueryResult([]));

			const result = await getNodeType(state, 'nonexistent', 1);

			expect(result).toBeNull();
		});

		it('should return parsed node type when found', async () => {
			const state = createMockState();
			const mockNodeType = createMockNodeType({ name: 'n8n-nodes-base.test', version: 1 });

			vi.mocked(queryWithParams).mockResolvedValueOnce(
				createQueryResult([[JSON.stringify(mockNodeType)]]),
			);

			const result = await getNodeType(state, 'n8n-nodes-base.test', 1);

			expect(result).toEqual(mockNodeType);
		});

		it('should query with correct node type ID format', async () => {
			const state = createMockState();
			vi.mocked(queryWithParams).mockResolvedValueOnce(createQueryResult([]));

			await getNodeType(state, 'n8n-nodes-base.myNode', 2);

			expect(queryWithParams).toHaveBeenCalledWith(
				state,
				'SELECT data FROM nodeTypes WHERE id = ?',
				['n8n-nodes-base.myNode@2'],
			);
		});
	});

	describe('getAllNodeTypes', () => {
		it('should return empty array when no node types exist', async () => {
			const state = createMockState();
			vi.mocked(query).mockResolvedValueOnce(createQueryResult([]));

			const result = await getAllNodeTypes(state);

			expect(result).toEqual([]);
		});

		it('should return all parsed node types', async () => {
			const state = createMockState();
			const mockNodeType1 = createMockNodeType({ name: 'n8n-nodes-base.node1', version: 1 });
			const mockNodeType2 = createMockNodeType({ name: 'n8n-nodes-base.node2', version: 1 });

			vi.mocked(query).mockResolvedValueOnce(
				createQueryResult([[JSON.stringify(mockNodeType1)], [JSON.stringify(mockNodeType2)]]),
			);

			const result = await getAllNodeTypes(state);

			expect(result).toHaveLength(2);
			expect(result[0]).toEqual(mockNodeType1);
			expect(result[1]).toEqual(mockNodeType2);
		});

		it('should query the nodeTypes table', async () => {
			const state = createMockState();
			vi.mocked(query).mockResolvedValueOnce(createQueryResult([]));

			await getAllNodeTypes(state);

			expect(query).toHaveBeenCalledWith(state, 'SELECT data FROM nodeTypes');
		});
	});
});
