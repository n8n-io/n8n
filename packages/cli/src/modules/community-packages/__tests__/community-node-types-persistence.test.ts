import { writeFile, rename } from 'fs/promises';

import { CommunityNodeTypesService } from '../community-node-types.service';

jest.mock('@n8n/backend-common', () => ({
	...jest.requireActual('@n8n/backend-common'),
	inProduction: jest.fn().mockReturnValue(false),
	inTest: false, // Set to false to test persistence
}));

jest.mock('fs', () => ({
	...jest.requireActual('fs'),
	readFileSync: jest.fn().mockReturnValue('[]'),
}));

jest.mock('fs/promises', () => ({
	writeFile: jest.fn().mockResolvedValue(undefined),
	rename: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('../community-node-types-utils', () => ({
	getCommunityNodesMetadata: jest.fn().mockResolvedValue([]),
}));

const mockReadFileSync = jest.requireMock('fs').readFileSync;
const mockWriteFile = writeFile as jest.MockedFunction<typeof writeFile>;
const mockRename = rename as jest.MockedFunction<typeof rename>;

describe('CommunityNodeTypesService - Persistence', () => {
	let service: CommunityNodeTypesService;
	let loggerMock: any;
	let configMock: any;
	let communityPackagesServiceMock: any;

	beforeEach(() => {
		jest.clearAllMocks();
		mockReadFileSync.mockReturnValue('[]');

		loggerMock = { error: jest.fn(), debug: jest.fn(), info: jest.fn() };
		configMock = {
			enabled: true,
			verifiedEnabled: true,
		};
		communityPackagesServiceMock = {};

		service = new CommunityNodeTypesService(loggerMock, configMock, communityPackagesServiceMock);
	});

	afterEach(() => {
		jest.restoreAllMocks();
		jest.clearAllMocks();
	});

	describe('init()', () => {
		it('should hydrate node types from file on initialization', async () => {
			const mockData = JSON.stringify([
				{ name: 'test-node', packageName: 'n8n-nodes-test', npmVersion: '1.0.0' },
			]);
			mockReadFileSync.mockReturnValue(mockData);

			await service.init();

			expect(mockReadFileSync).toHaveBeenCalledWith(
				expect.stringContaining('-node-types.json'),
				'utf-8',
			);
			expect((service as any).communityNodeTypes.size).toBe(1);
		});

		it('should not hydrate again if already initialized', async () => {
			const mockData = JSON.stringify([
				{ name: 'test-node', packageName: 'n8n-nodes-test', npmVersion: '1.0.0' },
			]);
			mockReadFileSync.mockReturnValue(mockData);

			await service.init();
			mockReadFileSync.mockClear();

			await service.init();

			expect(mockReadFileSync).not.toHaveBeenCalled();
		});

		it('should handle file read errors gracefully', async () => {
			mockReadFileSync.mockImplementation(() => {
				throw new Error('File not found');
			});

			await service.init();

			expect(loggerMock.error).toHaveBeenCalledWith(
				expect.stringContaining('Failed to hydrate community node types'),
			);
		});
	});

	describe('persistNodeTypesToFile()', () => {
		it('should write to temp file then rename atomically', async () => {
			const mockNodeTypes = [
				{ name: 'test-node', packageName: 'n8n-nodes-test', npmVersion: '1.0.0' },
			];

			(service as any).setCommunityNodeTypes(mockNodeTypes);

			// Wait for async persistence
			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(mockWriteFile).toHaveBeenCalledWith(
				expect.stringContaining('.tmp'),
				expect.any(String),
				'utf-8',
			);
			expect(mockRename).toHaveBeenCalledWith(
				expect.stringContaining('.tmp'),
				expect.not.stringContaining('.tmp'),
			);
		});

		it('should write compact JSON without pretty-printing', async () => {
			const mockNodeTypes = [
				{ name: 'test-node', packageName: 'n8n-nodes-test', npmVersion: '1.0.0' },
			];

			(service as any).setCommunityNodeTypes(mockNodeTypes);

			await new Promise((resolve) => setTimeout(resolve, 10));

			const writtenContent = mockWriteFile.mock.calls[0][1] as string;
			expect(writtenContent).not.toContain('\n  '); // No indentation
			expect(writtenContent).toContain('"name":"test-node"'); // Compact format
		});

		it('should handle write errors gracefully', async () => {
			mockWriteFile.mockRejectedValueOnce(new Error('Disk full'));

			const mockNodeTypes = [
				{ name: 'test-node', packageName: 'n8n-nodes-test', npmVersion: '1.0.0' },
			];

			(service as any).setCommunityNodeTypes(mockNodeTypes);

			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(loggerMock.error).toHaveBeenCalledWith(
				'Failed to persist community node types to file',
				expect.any(Object),
			);
		});

		it('should not persist empty arrays', async () => {
			(service as any).setCommunityNodeTypes([]);

			await new Promise((resolve) => setTimeout(resolve, 10));

			expect(mockWriteFile).not.toHaveBeenCalled();
			expect(mockRename).not.toHaveBeenCalled();
		});

		it('should preserve original file if write to temp file fails', async () => {
			mockWriteFile.mockRejectedValueOnce(new Error('Write failed'));

			const mockNodeTypes = [
				{ name: 'test-node', packageName: 'n8n-nodes-test', npmVersion: '1.0.0' },
			];

			(service as any).setCommunityNodeTypes(mockNodeTypes);

			await new Promise((resolve) => setTimeout(resolve, 10));

			// Rename should not be called if write fails
			expect(mockWriteFile).toHaveBeenCalled();
			expect(mockRename).not.toHaveBeenCalled();
			expect(loggerMock.error).toHaveBeenCalledWith(
				'Failed to persist community node types to file',
				expect.any(Object),
			);
		});

		it('should preserve original file if rename fails', async () => {
			mockWriteFile.mockResolvedValueOnce(undefined);
			mockRename.mockRejectedValueOnce(new Error('Rename failed'));

			const mockNodeTypes = [
				{ name: 'test-node', packageName: 'n8n-nodes-test', npmVersion: '1.0.0' },
			];

			(service as any).setCommunityNodeTypes(mockNodeTypes);

			await new Promise((resolve) => setTimeout(resolve, 10));

			// Both should be called but rename fails
			expect(mockWriteFile).toHaveBeenCalled();
			expect(mockRename).toHaveBeenCalled();
			expect(loggerMock.error).toHaveBeenCalledWith(
				'Failed to persist community node types to file',
				expect.any(Object),
			);
		});

		it('should write to temp file in same directory as target file', async () => {
			const mockNodeTypes = [
				{ name: 'test-node', packageName: 'n8n-nodes-test', npmVersion: '1.0.0' },
			];

			(service as any).setCommunityNodeTypes(mockNodeTypes);

			await new Promise((resolve) => setTimeout(resolve, 10));

			const writeCall = mockWriteFile.mock.calls[0];
			const renameCall = mockRename.mock.calls[0];

			const tempFilePath = writeCall[0] as string;
			const targetFilePath = renameCall[1] as string;

			// Temp file should be in same directory
			expect(tempFilePath).toContain('.tmp');
			expect(tempFilePath.replace('.tmp', '')).toBe(targetFilePath);
		});
	});

	describe('fetchNodeTypes() with fallback hydration', () => {
		it('should hydrate from file if communityNodeTypes is empty', async () => {
			const mockData = JSON.stringify([
				{ name: 'test-node', packageName: 'n8n-nodes-test', npmVersion: '1.0.0' },
			]);
			mockReadFileSync.mockReturnValue(mockData);

			await (service as any).fetchNodeTypes();

			expect(mockReadFileSync).toHaveBeenCalled();
			expect((service as any).communityNodeTypes.size).toBe(1);
		});

		it('should not hydrate if communityNodeTypes already has data', async () => {
			const mockData = JSON.stringify([
				{ name: 'test-node', packageName: 'n8n-nodes-test', npmVersion: '1.0.0' },
			]);
			mockReadFileSync.mockReturnValue(mockData);

			// Pre-populate
			(service as any).communityNodeTypes.set('existing', { name: 'existing' });

			await (service as any).fetchNodeTypes();

			expect(mockReadFileSync).not.toHaveBeenCalled();
		});
	});
});
