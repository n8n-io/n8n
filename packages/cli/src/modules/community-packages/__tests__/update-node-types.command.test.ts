import { writeFileSync } from 'fs';
import { join } from 'path';

import { getCommunityNodeTypes } from '../community-node-types-utils';
import { UpdateNodeTypes } from '../update-node-types.command';

jest.mock('fs', () => ({
	...jest.requireActual('fs'),
	writeFileSync: jest.fn(),
}));

jest.mock('../community-node-types-utils', () => ({
	getCommunityNodeTypes: jest.fn(),
}));

const mockWriteFileSync = writeFileSync as jest.MockedFunction<typeof writeFileSync>;
const mockGetCommunityNodeTypes = getCommunityNodeTypes as jest.MockedFunction<
	typeof getCommunityNodeTypes
>;

describe('UpdateNodeTypes Command', () => {
	let command: UpdateNodeTypes;
	let loggerMock: any;

	beforeEach(() => {
		jest.clearAllMocks();

		loggerMock = {
			info: jest.fn(),
			error: jest.fn(),
		};

		command = new UpdateNodeTypes();
		(command as any).logger = loggerMock;
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('run()', () => {
		it('should fetch and write staging node types', async () => {
			const mockStagingData = [
				{ name: 'staging-node', packageName: 'n8n-nodes-staging', npmVersion: '1.0.0' },
			];
			const mockProductionData = [
				{ name: 'prod-node', packageName: 'n8n-nodes-prod', npmVersion: '2.0.0' },
			];

			mockGetCommunityNodeTypes
				.mockResolvedValueOnce(mockStagingData as any)
				.mockResolvedValueOnce(mockProductionData as any);

			await command.run();

			expect(mockGetCommunityNodeTypes).toHaveBeenCalledTimes(2);
			expect(mockGetCommunityNodeTypes).toHaveBeenNthCalledWith(
				1,
				'staging',
				{},
				{ throwOnError: true },
			);
			expect(mockGetCommunityNodeTypes).toHaveBeenNthCalledWith(
				2,
				'production',
				{},
				{ throwOnError: true },
			);

			expect(mockWriteFileSync).toHaveBeenCalledTimes(2);
			expect(loggerMock.info).toHaveBeenCalledWith('Starting to update community node types...');
			expect(loggerMock.info).toHaveBeenCalledWith(
				'Successfully updated all community node types files',
			);
		});

		it('should write to correct file paths in src directory', async () => {
			const mockData = [{ name: 'test-node', packageName: 'n8n-nodes-test', npmVersion: '1.0.0' }];

			mockGetCommunityNodeTypes.mockResolvedValue(mockData as any);

			await command.run();

			const stagingCall = mockWriteFileSync.mock.calls[0];
			const productionCall = mockWriteFileSync.mock.calls[1];

			expect(stagingCall[0]).toContain('src');
			expect(stagingCall[0]).toContain('staging-node-types.json');
			expect(stagingCall[0]).not.toContain('dist');

			expect(productionCall[0]).toContain('src');
			expect(productionCall[0]).toContain('production-node-types.json');
			expect(productionCall[0]).not.toContain('dist');
		});

		it('should write pretty-printed JSON with 2-space indentation', async () => {
			const mockData = [{ name: 'test-node', packageName: 'n8n-nodes-test', npmVersion: '1.0.0' }];

			mockGetCommunityNodeTypes.mockResolvedValue(mockData as any);

			await command.run();

			const writtenContent = mockWriteFileSync.mock.calls[0][1] as string;

			expect(writtenContent).toContain('\n  '); // Has indentation
			expect(writtenContent).toContain('[\n  {\n'); // Pretty-printed
		});

		it('should log progress for each environment', async () => {
			const mockStagingData = [{ name: 'staging-node' }];
			const mockProductionData = [{ name: 'prod-node' }, { name: 'prod-node-2' }];

			mockGetCommunityNodeTypes
				.mockResolvedValueOnce(mockStagingData as any)
				.mockResolvedValueOnce(mockProductionData as any);

			await command.run();

			expect(loggerMock.info).toHaveBeenCalledWith('Fetching all node types from staging...');
			expect(loggerMock.info).toHaveBeenCalledWith('Fetched 1 node types from staging');
			expect(loggerMock.info).toHaveBeenCalledWith('Fetching all node types from production...');
			expect(loggerMock.info).toHaveBeenCalledWith('Fetched 2 node types from production');
		});

		it('should handle errors and log them', async () => {
			const error = new Error('API request failed');
			mockGetCommunityNodeTypes.mockRejectedValueOnce(error);

			await expect(command.run()).rejects.toThrow('API request failed');

			expect(loggerMock.error).toHaveBeenCalledWith(
				'Failed to update staging node types: API request failed',
			);
		});

		it('should stop after first environment fails', async () => {
			const error = new Error('Staging failed');
			mockGetCommunityNodeTypes.mockRejectedValueOnce(error);

			await expect(command.run()).rejects.toThrow();

			// Should only call once (staging), not twice
			expect(mockGetCommunityNodeTypes).toHaveBeenCalledTimes(1);
			expect(mockGetCommunityNodeTypes).toHaveBeenCalledWith('staging', {}, { throwOnError: true });
		});

		it('should use process.cwd() for file path resolution', async () => {
			const mockData = [{ name: 'test-node' }];
			mockGetCommunityNodeTypes.mockResolvedValue(mockData as any);

			await command.run();

			const filePath = mockWriteFileSync.mock.calls[0][0] as string;

			// Should use absolute path from process.cwd()
			expect(filePath).toContain(join('packages', 'cli', 'src'));
		});
	});

	describe('catch()', () => {
		it('should log error message', async () => {
			const error = new Error('Test error');

			await command.catch(error);

			expect(loggerMock.error).toHaveBeenCalledWith('Error updating node types:');
			expect(loggerMock.error).toHaveBeenCalledWith('Test error');
		});
	});
});
