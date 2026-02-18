import { inProduction } from '@n8n/backend-common';

import { getCommunityNodeTypes } from '../community-node-types-utils';
import { CommunityNodeTypesService } from '../community-node-types.service';

jest.mock('@n8n/backend-common', () => ({
	...jest.requireActual('@n8n/backend-common'),
	inProduction: jest.fn().mockReturnValue(false),
}));

jest.mock('../community-node-types-utils', () => ({
	getCommunityNodeTypes: jest.fn().mockResolvedValue([]),
	getCommunityNodesMetadata: jest.fn().mockResolvedValue([]),
}));

const mockDateNow = jest.spyOn(Date, 'now');
const mockMathRandom = jest.spyOn(Math, 'random');

describe('CommunityNodeTypesService', () => {
	let service: CommunityNodeTypesService;
	let configMock: any;
	let communityPackagesServiceMock: any;
	let loggerMock: any;

	beforeEach(() => {
		jest.clearAllMocks();

		delete process.env.ENVIRONMENT;

		loggerMock = { error: jest.fn(), debug: jest.fn() };
		configMock = {
			enabled: true,
			verifiedEnabled: true,
			aiNodeSdkVersion: 1,
		};
		communityPackagesServiceMock = {};

		if (mockDateNow.mockRestore) mockDateNow.mockRestore();
		if (mockMathRandom.mockRestore) mockMathRandom.mockRestore();

		service = new CommunityNodeTypesService(loggerMock, configMock, communityPackagesServiceMock);
	});

	afterEach(() => {
		jest.restoreAllMocks();
		jest.clearAllMocks();
	});

	describe('fetchNodeTypes', () => {
		const { getCommunityNodeTypes } = require('../community-node-types-utils');

		it('should use staging environment when ENVIRONMENT=staging', async () => {
			process.env.ENVIRONMENT = 'staging';
			await (service as any).fetchNodeTypes();
			expect(getCommunityNodeTypes).toHaveBeenCalledWith('staging', {}, 1);
		});

		it('should use production environment when inProduction=true', async () => {
			(inProduction as unknown as jest.Mock).mockReturnValue(true);
			await (service as any).fetchNodeTypes();
			expect(getCommunityNodeTypes).toHaveBeenCalledWith('production', {}, 1);
		});

		it('should use production environment when ENVIRONMENT=production', async () => {
			process.env.ENVIRONMENT = 'production';
			await (service as any).fetchNodeTypes();
			expect(getCommunityNodeTypes).toHaveBeenCalledWith('production', {}, 1);
		});

		it('should prioritize ENVIRONMENT=staging over inProduction=true', async () => {
			process.env.ENVIRONMENT = 'staging';
			(inProduction as unknown as jest.Mock).mockReturnValue(true);
			await (service as any).fetchNodeTypes();
			expect(getCommunityNodeTypes).toHaveBeenCalledWith('staging', {}, 1);
		});

		it('should call setTimestampForRetry when detectUpdates returns scheduleRetry', async () => {
			// Set up initial state so detectUpdates is called
			(service as any).communityNodeTypes.set('node-1', {
				name: 'node-1',
				packageName: 'package-1',
				npmVersion: '1.0.0',
			});

			const detectUpdatesSpy = jest
				.spyOn(service as any, 'detectUpdates')
				.mockResolvedValue({ scheduleRetry: true });
			const setTimestampForRetrySpy = jest.spyOn(service as any, 'setTimestampForRetry');

			await (service as any).fetchNodeTypes();

			expect(detectUpdatesSpy).toHaveBeenCalled();
			expect(setTimestampForRetrySpy).toHaveBeenCalled();
		});

		it('should not call setTimestampForRetry when detectUpdates returns typesToUpdate', async () => {
			// Set up initial state so detectUpdates is called
			(service as any).communityNodeTypes.set('node-1', {
				name: 'node-1',
				packageName: 'package-1',
				npmVersion: '1.0.0',
			});

			getCommunityNodeTypes.mockResolvedValue([
				{ name: 'node-1', packageName: 'package-1', npmVersion: '1.1.0' },
			]);

			const detectUpdatesSpy = jest
				.spyOn(service as any, 'detectUpdates')
				.mockResolvedValue({ typesToUpdate: [1] });
			const setTimestampForRetrySpy = jest.spyOn(service as any, 'setTimestampForRetry');

			await (service as any).fetchNodeTypes();

			expect(detectUpdatesSpy).toHaveBeenCalled();
			expect(setTimestampForRetrySpy).not.toHaveBeenCalled();
		});
	});

	describe('updateCommunityNodeTypes', () => {
		beforeEach(() => {
			jest.spyOn(Date, 'now').mockImplementation(() => 1000000);

			jest.spyOn(Math, 'random').mockImplementation(() => 0.5);
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		it('should call setTimestampForRetry when nodeTypes is empty array', () => {
			const setTimestampForRetrySpy = jest.spyOn(service as any, 'setTimestampForRetry');

			(service as any).updateCommunityNodeTypes([]);

			expect(setTimestampForRetrySpy).toHaveBeenCalledTimes(1);
		});

		it('should call setTimestampForRetry when nodeTypes is null', () => {
			const setTimestampForRetrySpy = jest.spyOn(service as any, 'setTimestampForRetry');

			(service as any).updateCommunityNodeTypes(null);

			expect(setTimestampForRetrySpy).toHaveBeenCalledTimes(1);
		});

		it('should call setTimestampForRetry when nodeTypes is undefined', () => {
			const setTimestampForRetrySpy = jest.spyOn(service as any, 'setTimestampForRetry');

			(service as any).updateCommunityNodeTypes(undefined);

			expect(setTimestampForRetrySpy).toHaveBeenCalledTimes(1);
		});

		it('should return early when nodeTypes is empty without updating communityNodeTypes', () => {
			const setCommunityNodeTypesSpy = jest.spyOn(service as any, 'setCommunityNodeTypes');
			const initialNodeTypes = (service as any).communityNodeTypes;

			(service as any).updateCommunityNodeTypes([]);

			expect(setCommunityNodeTypesSpy).not.toHaveBeenCalled();
			expect((service as any).communityNodeTypes).toBe(initialNodeTypes);

			expect((service as any).lastUpdateTimestamp).not.toBe(1000000);
		});

		it('should process nodeTypes normally when array has content', () => {
			const mockNodeTypes = [
				{
					name: 'test-node-1',
					version: '1.0.0',
					nodeDescription: { name: 'test-node-1', usableAsTool: false },
				},
				{
					name: 'test-node-2',
					version: '1.1.0',
					nodeDescription: { name: 'test-node-2', usableAsTool: false },
				},
			];
			const setCommunityNodeTypesSpy = jest.spyOn(service as any, 'setCommunityNodeTypes');

			(service as any).updateCommunityNodeTypes(mockNodeTypes);

			expect(setCommunityNodeTypesSpy).toHaveBeenCalledTimes(1);
			expect((service as any).communityNodeTypes.size).toBe(2);
			expect((service as any).communityNodeTypes.get('test-node-1')).toEqual(mockNodeTypes[0]);
			expect((service as any).communityNodeTypes.get('test-node-2')).toEqual(mockNodeTypes[1]);
			expect((service as any).lastUpdateTimestamp).toBe(1000000);
		});
	});

	describe('setTimestampForRetry', () => {
		const UPDATE_INTERVAL = 8 * 60 * 60 * 1000;
		const RETRY_INTERVAL = 5 * 60 * 1000;

		beforeEach(() => {
			jest.spyOn(Date, 'now').mockImplementation(() => 1000000);
		});

		afterEach(() => {
			jest.restoreAllMocks();
		});

		it('should set timestamp with jitter for retry', () => {
			jest.spyOn(Math, 'random').mockImplementation(() => 0.5);

			(service as any).setTimestampForRetry();

			const expectedTimestamp = 1000000 - (UPDATE_INTERVAL - RETRY_INTERVAL + 0);
			expect((service as any).lastUpdateTimestamp).toBe(expectedTimestamp);
		});

		it('should set timestamp with negative jitter', () => {
			jest.spyOn(Math, 'random').mockImplementation(() => 0);

			(service as any).setTimestampForRetry();

			const expectedJitter = -120000;
			const expectedTimestamp = 1000000 - (UPDATE_INTERVAL - RETRY_INTERVAL + expectedJitter);
			expect((service as any).lastUpdateTimestamp).toBe(expectedTimestamp);
		});

		it('should set timestamp with positive jitter', () => {
			jest.spyOn(Math, 'random').mockImplementation(() => 1);

			(service as any).setTimestampForRetry();

			const expectedJitter = 120000;
			const expectedTimestamp = 1000000 - (UPDATE_INTERVAL - RETRY_INTERVAL + expectedJitter);
			expect((service as any).lastUpdateTimestamp).toBe(expectedTimestamp);
		});

		it('should calculate jitter within expected range', () => {
			const testCases = [0, 0.25, 0.5, 0.75, 1];

			testCases.forEach((randomValue, index) => {
				const testTimestamp = 2000000 + index * 1000;
				jest.spyOn(Math, 'random').mockImplementation(() => randomValue);
				jest.spyOn(Date, 'now').mockImplementation(() => testTimestamp);

				(service as any).setTimestampForRetry();

				const expectedJitter = Math.floor(randomValue * 4 * 60 * 1000) - 2 * 60 * 1000;
				const expectedTimestamp =
					testTimestamp - (UPDATE_INTERVAL - RETRY_INTERVAL + expectedJitter);

				expect((service as any).lastUpdateTimestamp).toBe(expectedTimestamp);
				expect(expectedJitter).toBeGreaterThanOrEqual(-120000);
				expect(expectedJitter).toBeLessThanOrEqual(120000);
			});
		});
	});

	describe('findVetted', () => {
		beforeEach(() => {
			const mockNodeTypes = [
				{
					name: 'n8n-nodes-air.air',
					packageName: 'n8n-nodes-air',
					checksum: 'checksum-air',
					npmVersion: '1.0.0',
					nodeDescription: { name: 'n8n-nodes-air.air', usableAsTool: false },
				},
				{
					name: 'n8n-nodes-airparser.airparser',
					packageName: 'n8n-nodes-airparser',
					checksum: 'checksum-airparser',
					npmVersion: '2.0.0',
					nodeDescription: { name: 'n8n-nodes-airparser.airparser', usableAsTool: false },
				},
				{
					name: 'n8n-nodes-example.example',
					packageName: 'n8n-nodes-example',
					checksum: 'checksum-example',
					npmVersion: '3.0.0',
					nodeDescription: { name: 'n8n-nodes-example.example', usableAsTool: false },
				},
			];

			(service as any).updateCommunityNodeTypes(mockNodeTypes);
		});

		it('should return the correct package when exact packageName match is found', () => {
			const result = service.findVetted('n8n-nodes-air');

			expect(result).toBeDefined();
			expect(result?.packageName).toBe('n8n-nodes-air');
			expect(result?.checksum).toBe('checksum-air');
			expect(result?.npmVersion).toBe('1.0.0');
		});

		it('should return undefined when package is not found', () => {
			const result = service.findVetted('n8n-nodes-nonexistent');

			expect(result).toBeUndefined();
		});

		it('should not match similar package names with substring matching', () => {
			const result = service.findVetted('n8n-nodes-air');

			expect(result).toBeDefined();
			expect(result?.packageName).toBe('n8n-nodes-air');
			// Should NOT match 'n8n-nodes-airparser' even though it contains 'n8n-nodes-air'
			expect(result?.packageName).not.toBe('n8n-nodes-airparser');
		});

		it('should return the correct package from multiple similar names', () => {
			const airResult = service.findVetted('n8n-nodes-air');
			const airparserResult = service.findVetted('n8n-nodes-airparser');

			expect(airResult?.packageName).toBe('n8n-nodes-air');
			expect(airResult?.checksum).toBe('checksum-air');

			expect(airparserResult?.packageName).toBe('n8n-nodes-airparser');
			expect(airparserResult?.checksum).toBe('checksum-airparser');
		});

		it('should return undefined when communityNodeTypes is empty', () => {
			(service as any).communityNodeTypes.clear();

			const result = service.findVetted('n8n-nodes-air');

			expect(result).toBeUndefined();
		});

		it('should handle packages with similar prefixes correctly', () => {
			const mockNodeTypes = [
				{
					name: 'n8n-nodes-test.test',
					packageName: 'n8n-nodes-test',
					checksum: 'checksum-test',
					nodeDescription: { name: 'n8n-nodes-test.test', usableAsTool: false },
				},
				{
					name: 'n8n-nodes-testing.testing',
					packageName: 'n8n-nodes-testing',
					checksum: 'checksum-testing',
					nodeDescription: { name: 'n8n-nodes-testing.testing', usableAsTool: false },
				},
				{
					name: 'n8n-nodes-tester.tester',
					packageName: 'n8n-nodes-tester',
					checksum: 'checksum-tester',
					nodeDescription: { name: 'n8n-nodes-tester.tester', usableAsTool: false },
				},
			];

			(service as any).updateCommunityNodeTypes(mockNodeTypes);

			const testResult = service.findVetted('n8n-nodes-test');
			const testingResult = service.findVetted('n8n-nodes-testing');
			const testerResult = service.findVetted('n8n-nodes-tester');

			expect(testResult?.packageName).toBe('n8n-nodes-test');
			expect(testingResult?.packageName).toBe('n8n-nodes-testing');
			expect(testerResult?.packageName).toBe('n8n-nodes-tester');
		});
	});

	describe('getCommunityNodeTypes', () => {
		beforeEach(() => {
			communityPackagesServiceMock.getAllInstalledPackages = jest.fn().mockResolvedValue([]);
		});

		it('should create AI tool versions for nodes with usableAsTool flag', async () => {
			const mockNodeTypes = [
				{
					name: 'n8n-nodes-test.test',
					packageName: 'n8n-nodes-test',
					nodeDescription: {
						name: 'test-node-preview',
						displayName: 'Test Node',
						inputs: ['main'],
						outputs: ['main'],
						usableAsTool: true,
						codex: {
							subcategories: {
								Tools: ['Custom Tools'],
							},
							resources: { primaryDocumentation: [{ url: 'https://example.com' }] },
						},
					},
				},
			];

			(getCommunityNodeTypes as jest.Mock).mockResolvedValueOnce(mockNodeTypes);

			const result = await service.getCommunityNodeTypes();

			expect(result.length).toBe(2); // original + tool version

			const originalNode = result.find((n) => n.name === 'n8n-nodes-test.test');
			const toolNode = result.find((n) => n.name === 'n8n-nodes-test.testTool');

			expect(originalNode).toBeDefined();
			expect(toolNode).toBeDefined();
			expect(toolNode?.name).toBe('n8n-nodes-test.testTool');
			expect(toolNode?.nodeDescription.name).toBe('test-node-previewTool');
			expect(toolNode?.nodeDescription.displayName).toBe('Test Node Tool');
			expect(toolNode?.nodeDescription.inputs).toEqual([]);
			expect(toolNode?.nodeDescription.outputs).toEqual(['ai_tool']);
			expect(toolNode?.nodeDescription.codex?.categories).toEqual(['AI']);
			expect(toolNode?.nodeDescription.codex?.subcategories).toEqual({
				AI: ['Tools'],
				Tools: ['Custom Tools'],
			});
		});

		it('should not create AI tool versions for nodes without usableAsTool flag', async () => {
			const mockNodeTypes = [
				{
					name: 'n8n-nodes-test.test',
					packageName: 'n8n-nodes-test',
					nodeDescription: {
						name: 'test-node-preview',
						displayName: 'Test Node',
						inputs: ['main'],
						outputs: ['main'],
						usableAsTool: false,
					},
				},
			];

			(getCommunityNodeTypes as jest.Mock).mockResolvedValueOnce(mockNodeTypes);

			const result = await service.getCommunityNodeTypes();

			expect(result.length).toBe(1); // only original

			const toolNode = result.find((n) => n.name === 'n8n-nodes-test.testTool');
			expect(toolNode).toBeUndefined();
		});

		it('should not create AI tool version for node with tool in type', async () => {
			const mockNodeTypes = [
				{
					name: 'n8n-nodes-test.testTool',
					packageName: 'n8n-nodes-test',
					nodeDescription: {
						name: 'test-node-previewTool',
						displayName: 'Test Node',
						inputs: ['main'],
						outputs: ['main'],
						usableAsTool: true,
					},
				},
			];

			(getCommunityNodeTypes as jest.Mock).mockResolvedValueOnce(mockNodeTypes);

			const result = await service.getCommunityNodeTypes();

			expect(result.length).toBe(1); // only original

			const toolNode = result.find((n) => n.name === 'n8n-nodes-test.testToolTool');
			expect(toolNode).toBeUndefined();
		});

		it('should use default "Other Tools" when codex subcategories are not defined', async () => {
			const mockNodeTypes = [
				{
					name: 'n8n-nodes-test.test',
					packageName: 'n8n-nodes-test',
					nodeDescription: {
						name: 'test-node-preview',
						displayName: 'Test Node',
						inputs: ['main'],
						outputs: ['main'],
						usableAsTool: true,
					},
				},
			];

			(getCommunityNodeTypes as jest.Mock).mockResolvedValueOnce(mockNodeTypes);

			const result = await service.getCommunityNodeTypes();
			const toolNode = result.find((n) => n.name === 'n8n-nodes-test.testTool');

			expect(toolNode).toBeDefined();
			expect(toolNode?.nodeDescription.codex?.subcategories?.Tools).toEqual(['Other Tools']);
		});

		it('should preserve original codex resources when creating tool version', async () => {
			const mockResources = {
				primaryDocumentation: [{ url: 'https://example.com/docs' }],
			};

			const mockNodeTypes = [
				{
					name: 'n8n-nodes-test.test',
					packageName: 'n8n-nodes-test',
					nodeDescription: {
						name: 'test-node-preview',
						displayName: 'Test Node',
						inputs: ['main'],
						outputs: ['main'],
						usableAsTool: true,
						codex: {
							resources: mockResources,
						},
					},
				},
			];

			(getCommunityNodeTypes as jest.Mock).mockResolvedValueOnce(mockNodeTypes);

			const result = await service.getCommunityNodeTypes();
			const toolNode = result.find((n) => n.name === 'n8n-nodes-test.testTool');

			expect(toolNode?.nodeDescription.codex?.resources).toEqual(mockResources);
		});

		it('should not include Recommended Tools subcategory in tool version', async () => {
			const mockNodeTypes = [
				{
					name: 'n8n-nodes-test.test',
					packageName: 'n8n-nodes-test',
					nodeDescription: {
						name: 'test-node-preview',
						displayName: 'Test Node',
						inputs: ['main'],
						outputs: ['main'],
						usableAsTool: true,
						codex: {
							resources: {
								primaryDocumentation: [{ url: 'https://example.com/docs' }],
							},
							subcategories: {
								AI: ['Tools'],
								Tools: ['Recommended Tools', 'Other Tools'],
							},
						},
					},
				},
			];

			(getCommunityNodeTypes as jest.Mock).mockResolvedValueOnce(mockNodeTypes);

			const result = await service.getCommunityNodeTypes();
			const toolNode = result.find((n) => n.name === 'n8n-nodes-test.testTool');

			expect(toolNode?.nodeDescription.codex?.subcategories?.Tools).not.toContain(
				'Recommended Tools',
			);
		});

		it('should handle multiple nodes with usableAsTool flag', async () => {
			const mockNodeTypes = [
				{
					name: 'n8n-nodes-test1.test1',
					packageName: 'n8n-nodes-test1',
					nodeDescription: {
						name: 'test-node-1-preview',
						displayName: 'Test Node 1',
						inputs: ['main'],
						outputs: ['main'],
						usableAsTool: true,
					},
				},
				{
					name: 'n8n-nodes-test2.test2',
					packageName: 'n8n-nodes-test2',
					nodeDescription: {
						name: 'test-node-2-preview',
						displayName: 'Test Node 2',
						inputs: ['main'],
						outputs: ['main'],
						usableAsTool: true,
					},
				},
				{
					name: 'n8n-nodes-test3.test3',
					packageName: 'n8n-nodes-test3',
					nodeDescription: {
						name: 'test-node-3-preview',
						displayName: 'Test Node 3',
						inputs: ['main'],
						outputs: ['main'],
						usableAsTool: false,
					},
				},
			];

			(getCommunityNodeTypes as jest.Mock).mockResolvedValueOnce(mockNodeTypes);

			const result = await service.getCommunityNodeTypes();

			expect(result.length).toBe(5); // 3 original + 2 tool versions

			expect(result.find((n) => n.name === 'n8n-nodes-test1.test1Tool')).toBeDefined();
			expect(result.find((n) => n.name === 'n8n-nodes-test2.test2Tool')).toBeDefined();
			expect(result.find((n) => n.name === 'n8n-nodes-test3.test3Tool')).toBeUndefined();
		});

		it('should not mutate original node type when creating tool version', async () => {
			const mockNodeTypes = [
				{
					name: 'n8n-nodes-test.test',
					packageName: 'n8n-nodes-test',
					nodeDescription: {
						name: 'test-node-preview',
						displayName: 'Test Node',
						inputs: ['main'],
						outputs: ['main'],
						usableAsTool: true,
					},
				},
			];

			(getCommunityNodeTypes as jest.Mock).mockResolvedValueOnce(mockNodeTypes);

			const result = await service.getCommunityNodeTypes();

			const originalNode = result.find((n) => n.name === 'n8n-nodes-test.test');
			const toolNode = result.find((n) => n.name === 'n8n-nodes-test.testTool');

			// Ensure original node is not modified
			expect(originalNode?.name).toBe('n8n-nodes-test.test');
			expect(originalNode?.nodeDescription.name).toBe('test-node-preview');
			expect(originalNode?.nodeDescription.displayName).toBe('Test Node');
			expect(originalNode?.nodeDescription.inputs).toEqual(['main']);
			expect(originalNode?.nodeDescription.outputs).toEqual(['main']);

			// Ensure tool node has correct modifications
			expect(toolNode?.name).toBe('n8n-nodes-test.testTool');
			expect(toolNode?.nodeDescription.name).toBe('test-node-previewTool');
			expect(toolNode?.nodeDescription.displayName).toBe('Test Node Tool');
		});
	});

	describe('detectUpdates', () => {
		const { getCommunityNodesMetadata } = require('../community-node-types-utils');

		beforeEach(() => {
			const mockNodeTypes = [
				{
					name: 'node-1',
					packageName: 'package-1',
					npmVersion: '1.0.0',
					updatedAt: '2024-01-01',
				},
				{
					name: 'node-2',
					packageName: 'package-2',
					npmVersion: '2.0.0',
					updatedAt: '2024-01-02',
				},
			];
			(service as any).setCommunityNodeTypes(mockNodeTypes);
		});

		it('should detect new nodes', async () => {
			getCommunityNodesMetadata.mockResolvedValue([
				{ id: 1, name: 'node-1', npmVersion: '1.0.0', updatedAt: '2024-01-01' },
				{ id: 3, name: 'node-3', npmVersion: '3.0.0', updatedAt: '2024-01-03' },
			]);

			const result = await (service as any).detectUpdates('production');

			expect(result).toEqual({ typesToUpdate: [3] });
			expect(loggerMock.debug).toHaveBeenCalledWith(
				expect.stringContaining('Detected update for community node type: name - node-3'),
			);
		});

		it('should detect npm version changes', async () => {
			getCommunityNodesMetadata.mockResolvedValue([
				{ id: 1, name: 'node-1', npmVersion: '1.1.0', updatedAt: '2024-01-01' },
			]);

			const result = await (service as any).detectUpdates('production');

			expect(result).toEqual({ typesToUpdate: [1] });
			expect(loggerMock.debug).toHaveBeenCalledWith(expect.stringContaining('npmVersion - 1.1.0'));
		});

		it('should detect timestamp changes', async () => {
			getCommunityNodesMetadata.mockResolvedValue([
				{ id: 2, name: 'node-2', npmVersion: '2.0.0', updatedAt: '2024-01-05' },
			]);

			const result = await (service as any).detectUpdates('production');

			expect(result).toEqual({ typesToUpdate: [2] });
			expect(loggerMock.debug).toHaveBeenCalledWith(
				expect.stringContaining('updatedAt - 2024-01-05'),
			);
		});

		it('should return empty typesToUpdate when all nodes are current', async () => {
			getCommunityNodesMetadata.mockResolvedValue([
				{ id: 1, name: 'node-1', npmVersion: '1.0.0', updatedAt: '2024-01-01' },
				{ id: 2, name: 'node-2', npmVersion: '2.0.0', updatedAt: '2024-01-02' },
			]);

			const result = await (service as any).detectUpdates('production');

			expect(result).toEqual({ typesToUpdate: [] });
			expect(loggerMock.debug).not.toHaveBeenCalled();
		});

		it('should detect and remove deleted node types from cache', async () => {
			getCommunityNodesMetadata.mockResolvedValue([
				{ id: 1, name: 'node-1', npmVersion: '1.0.0', updatedAt: '2024-01-01' },
				// node-2 is missing from metadata, should be removed
			]);

			const result = await (service as any).detectUpdates('production');

			expect(result).toEqual({ typesToUpdate: [] });
			expect((service as any).communityNodeTypes.has('node-2')).toBe(false);
			expect((service as any).communityNodeTypes.has('node-1')).toBe(true);
			expect(loggerMock.debug).toHaveBeenCalledWith(
				expect.stringContaining('Detected removal of community node type: name - node-2'),
			);
		});

		it('should return scheduleRetry when getCommunityNodesMetadata throws error', async () => {
			getCommunityNodesMetadata.mockRejectedValue(new Error('API error'));

			const result = await (service as any).detectUpdates('production');

			expect(result).toEqual({ scheduleRetry: true });
			expect(loggerMock.error).toHaveBeenCalledWith(
				expect.stringContaining('Failed to fetch community nodes metadata'),
				expect.objectContaining({ error: expect.any(Error) }),
			);
		});

		it('should handle both updates and deletions in same call', async () => {
			getCommunityNodesMetadata.mockResolvedValue([
				{ id: 1, name: 'node-1', npmVersion: '1.1.0', updatedAt: '2024-01-01' }, // updated
				// node-2 is missing, should be removed
			]);

			const result = await (service as any).detectUpdates('production');

			expect(result).toEqual({ typesToUpdate: [1] });
			expect((service as any).communityNodeTypes.has('node-2')).toBe(false);
			expect((service as any).communityNodeTypes.has('node-1')).toBe(true);
			expect(loggerMock.debug).toHaveBeenCalledWith(
				expect.stringContaining('Detected update for community node type'),
			);
			expect(loggerMock.debug).toHaveBeenCalledWith(
				expect.stringContaining('Detected removal of community node type: name - node-2'),
			);
		});
	});

	describe('updateRequired', () => {
		const UPDATE_INTERVAL = 8 * 60 * 60 * 1000;

		beforeEach(() => {
			jest.restoreAllMocks();
			(service as any).lastUpdateTimestamp = 0;
		});

		it('should return true when never updated', () => {
			const result = (service as any).updateRequired();

			expect(result).toBe(true);
		});

		it('should return true when update interval has passed', () => {
			const now = 100000000;
			const mockNow = jest.spyOn(Date, 'now').mockReturnValue(now);
			(service as any).lastUpdateTimestamp = now - UPDATE_INTERVAL - 1000;

			const result = (service as any).updateRequired();

			expect(result).toBe(true);
			mockNow.mockRestore();
		});

		it('should return false when update interval has not passed', () => {
			const now = 10000000;
			const mockNow = jest.spyOn(Date, 'now').mockReturnValue(now);
			(service as any).lastUpdateTimestamp = now - UPDATE_INTERVAL + 1000;

			const result = (service as any).updateRequired();

			expect(result).toBe(false);
			mockNow.mockRestore();
		});
	});

	describe('getCommunityNodeTypes', () => {
		beforeEach(() => {
			communityPackagesServiceMock.getAllInstalledPackages = jest
				.fn()
				.mockResolvedValue([{ packageName: 'package-1' }]);

			const mockNodeTypes = [
				{ name: 'package-1.node1', packageName: 'package-1', npmVersion: '1.0.0' },
				{ name: 'package-2.node2', packageName: 'package-2', npmVersion: '2.0.0' },
			];
			(service as any).setCommunityNodeTypes(mockNodeTypes);
		});

		it('should return node types with isInstalled flag', async () => {
			const result = await service.getCommunityNodeTypes();

			expect(result).toHaveLength(2);
			expect(result[0].isInstalled).toBe(true);
			expect(result[1].isInstalled).toBe(false);
		});

		it('should fetch updates when interval has passed', async () => {
			(service as any).lastUpdateTimestamp = 0;
			const fetchSpy = jest.spyOn(service as any, 'fetchNodeTypes').mockResolvedValue(undefined);

			await service.getCommunityNodeTypes();

			expect(fetchSpy).toHaveBeenCalled();
		});

		it('should skip fetch when interval has not passed', async () => {
			const now = Date.now();
			(service as any).lastUpdateTimestamp = now;
			const fetchSpy = jest.spyOn(service as any, 'fetchNodeTypes').mockResolvedValue(undefined);

			await service.getCommunityNodeTypes();

			expect(fetchSpy).not.toHaveBeenCalled();
		});
	});

	describe('getCommunityNodeType', () => {
		beforeEach(() => {
			communityPackagesServiceMock.getAllInstalledPackages = jest
				.fn()
				.mockResolvedValue([{ packageName: 'package-1' }]);

			const mockNodeTypes = [
				{ name: 'package-1.node1', packageName: 'package-1', npmVersion: '1.0.0' },
			];
			(service as any).setCommunityNodeTypes(mockNodeTypes);
		});

		it('should return node type with isInstalled flag when found', async () => {
			const result = await service.getCommunityNodeType('package-1.node1');

			expect(result).toBeDefined();
			expect(result?.name).toBe('package-1.node1');
			expect(result?.isInstalled).toBe(true);
		});

		it('should return null for unknown node', async () => {
			const result = await service.getCommunityNodeType('nonexistent');

			expect(result).toBeNull();
		});

		it('should determine installation status from package name', async () => {
			const mockNodeTypes = [
				{ name: 'package-1.node1', packageName: 'package-1', npmVersion: '1.0.0' },
				{ name: 'package-2.node2', packageName: 'package-2', npmVersion: '2.0.0' },
			];
			(service as any).setCommunityNodeTypes(mockNodeTypes);

			const installed = await service.getCommunityNodeType('package-1.node1');
			const notInstalled = await service.getCommunityNodeType('package-2.node2');

			expect(installed?.isInstalled).toBe(true);
			expect(notInstalled?.isInstalled).toBe(false);
		});
	});

	describe('createIsInstalled', () => {
		it('should create checker function for installed packages', async () => {
			communityPackagesServiceMock.getAllInstalledPackages = jest
				.fn()
				.mockResolvedValue([{ packageName: 'package-1' }, { packageName: 'package-2' }]);

			const isInstalled = await (service as any).createIsInstalled();

			expect(isInstalled('package-1.node')).toBe(true);
			expect(isInstalled('package-2.node')).toBe(true);
			expect(isInstalled('package-3.node')).toBe(false);
		});

		it('should handle empty package list', async () => {
			communityPackagesServiceMock.getAllInstalledPackages = jest.fn().mockResolvedValue([]);

			const isInstalled = await (service as any).createIsInstalled();

			expect(isInstalled('package-1.node')).toBe(false);
		});

		it('should handle null package list', async () => {
			communityPackagesServiceMock.getAllInstalledPackages = jest.fn().mockResolvedValue(null);

			const isInstalled = await (service as any).createIsInstalled();

			expect(isInstalled('package-1.node')).toBe(false);
		});
	});
});
