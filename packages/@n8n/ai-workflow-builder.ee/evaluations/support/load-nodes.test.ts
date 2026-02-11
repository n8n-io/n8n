import { readFileSync, existsSync } from 'fs';
import type { INodeTypeDescription } from 'n8n-workflow';

// We need to mock the fs module before importing the module under test
jest.mock('fs', () => ({
	readFileSync: jest.fn(),
	existsSync: jest.fn(),
}));

const mockedReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;
const mockedExistsSync = existsSync as jest.MockedFunction<typeof existsSync>;

// Import after mocking
import { loadNodesFromFile } from './load-nodes';

describe('loadNodesFromFile', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		// Default: legacy path exists
		mockedExistsSync.mockImplementation((path) => {
			return String(path).endsWith('nodes.json');
		});
	});

	describe('version handling', () => {
		it('should keep all version entries for a node type so older versions can be validated', () => {
			// This is the real-world scenario: removeDuplicates has two entries
			// - Entry 1: version [1, 1.1], defaultVersion 2
			// - Entry 2: version [2], defaultVersion 2
			// A workflow using typeVersion 1.1 should still be able to validate
			const nodesData: Array<Partial<INodeTypeDescription>> = [
				{
					name: 'n8n-nodes-base.removeDuplicates',
					displayName: 'Remove Duplicates',
					version: [1, 1.1],
					defaultVersion: 2,
					inputs: ['main'],
					outputs: ['main'],
				},
				{
					name: 'n8n-nodes-base.removeDuplicates',
					displayName: 'Remove Duplicates',
					version: [2],
					defaultVersion: 2,
					inputs: ['main'],
					outputs: ['main'],
				},
			];

			mockedReadFileSync.mockReturnValue(JSON.stringify(nodesData));

			const result = loadNodesFromFile();

			// The result should contain entries that cover ALL versions (1, 1.1, and 2)
			// so that workflows using any of these versions can be validated
			const removeDuplicatesEntries = result.filter(
				(n) => n.name === 'n8n-nodes-base.removeDuplicates',
			);

			// We need at least the versions to be available for lookup
			// Either keep both entries, or merge the versions
			const allVersions = removeDuplicatesEntries.flatMap((entry) =>
				Array.isArray(entry.version) ? entry.version : [entry.version],
			);

			expect(allVersions).toContain(1);
			expect(allVersions).toContain(1.1);
			expect(allVersions).toContain(2);
		});

		it('should handle single-version nodes correctly', () => {
			const nodesData: Array<Partial<INodeTypeDescription>> = [
				{
					name: 'n8n-nodes-base.code',
					displayName: 'Code',
					version: 1,
					inputs: ['main'],
					outputs: ['main'],
				},
			];

			mockedReadFileSync.mockReturnValue(JSON.stringify(nodesData));

			const result = loadNodesFromFile();
			const codeNode = result.find((n) => n.name === 'n8n-nodes-base.code');

			expect(codeNode).toBeDefined();
			expect(codeNode?.version).toBe(1);
		});

		it('should handle nodes with version array but no defaultVersion', () => {
			const nodesData: Array<Partial<INodeTypeDescription>> = [
				{
					name: 'n8n-nodes-base.httpRequest',
					displayName: 'HTTP Request',
					version: [1, 2, 3],
					inputs: ['main'],
					outputs: ['main'],
				},
			];

			mockedReadFileSync.mockReturnValue(JSON.stringify(nodesData));

			const result = loadNodesFromFile();
			const httpNode = result.find((n) => n.name === 'n8n-nodes-base.httpRequest');

			expect(httpNode).toBeDefined();
			// All versions should be available
			const versions = Array.isArray(httpNode?.version) ? httpNode.version : [httpNode?.version];
			expect(versions).toContain(1);
			expect(versions).toContain(2);
			expect(versions).toContain(3);
		});
	});

	describe('filtering', () => {
		it('should filter out ignored node types', () => {
			const nodesData: Array<Partial<INodeTypeDescription>> = [
				{
					name: '@n8n/n8n-nodes-langchain.toolVectorStore',
					displayName: 'Vector Store Tool',
					version: 1,
					inputs: [],
					outputs: ['ai_tool'],
				},
				{
					name: 'n8n-nodes-base.code',
					displayName: 'Code',
					version: 1,
					inputs: ['main'],
					outputs: ['main'],
				},
			];

			mockedReadFileSync.mockReturnValue(JSON.stringify(nodesData));

			const result = loadNodesFromFile();

			expect(
				result.find((n) => n.name === '@n8n/n8n-nodes-langchain.toolVectorStore'),
			).toBeUndefined();
			expect(result.find((n) => n.name === 'n8n-nodes-base.code')).toBeDefined();
		});

		it('should filter out hidden nodes except dataTable', () => {
			const nodesData: Array<Partial<INodeTypeDescription>> = [
				{
					name: 'n8n-nodes-base.hiddenNode',
					displayName: 'Hidden Node',
					version: 1,
					hidden: true,
					inputs: ['main'],
					outputs: ['main'],
				},
				{
					name: 'n8n-nodes-base.dataTable',
					displayName: 'Data Table',
					version: 1,
					hidden: true,
					inputs: ['main'],
					outputs: ['main'],
				},
			];

			mockedReadFileSync.mockReturnValue(JSON.stringify(nodesData));

			const result = loadNodesFromFile();

			expect(result.find((n) => n.name === 'n8n-nodes-base.hiddenNode')).toBeUndefined();
			expect(result.find((n) => n.name === 'n8n-nodes-base.dataTable')).toBeDefined();
		});
	});
});
