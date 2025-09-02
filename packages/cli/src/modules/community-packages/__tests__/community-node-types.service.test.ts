import { inProduction } from '@n8n/backend-common';

import { getCommunityNodeTypes } from '../community-node-types-utils';
import { CommunityNodeTypesService } from '../community-node-types.service';

jest.mock('@n8n/backend-common', () => ({
	...jest.requireActual('@n8n/backend-common'),
	inProduction: jest.fn().mockReturnValue(false),
}));

jest.mock('../community-node-types-utils', () => ({
	getCommunityNodeTypes: jest.fn().mockResolvedValue([]),
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

		loggerMock = { error: jest.fn() };
		configMock = {
			enabled: true,
			verifiedEnabled: true,
		};
		communityPackagesServiceMock = {};

		if (mockDateNow.mockRestore) mockDateNow.mockRestore();
		if (mockMathRandom.mockRestore) mockMathRandom.mockRestore();

		service = new CommunityNodeTypesService(loggerMock, configMock, communityPackagesServiceMock);
	});

	afterEach(() => {
		jest.restoreAllMocks();
	});

	describe('fetchNodeTypes', () => {
		it('should use staging environment when ENVIRONMENT=staging', async () => {
			process.env.ENVIRONMENT = 'staging';
			await (service as any).fetchNodeTypes();
			expect(getCommunityNodeTypes).toHaveBeenCalledWith('staging');
		});

		it('should use production environment when inProduction=true', async () => {
			(inProduction as unknown as jest.Mock).mockReturnValue(true);
			await (service as any).fetchNodeTypes();
			expect(getCommunityNodeTypes).toHaveBeenCalledWith('production');
		});

		it('should use production environment when ENVIRONMENT=production', async () => {
			process.env.ENVIRONMENT = 'production';
			await (service as any).fetchNodeTypes();
			expect(getCommunityNodeTypes).toHaveBeenCalledWith('production');
		});

		it('should prioritize ENVIRONMENT=staging over inProduction=true', async () => {
			process.env.ENVIRONMENT = 'staging';
			(inProduction as unknown as jest.Mock).mockReturnValue(true);
			await (service as any).fetchNodeTypes();
			expect(getCommunityNodeTypes).toHaveBeenCalledWith('staging');
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
			const resetCommunityNodeTypesSpy = jest.spyOn(service as any, 'resetCommunityNodeTypes');
			const initialNodeTypes = (service as any).communityNodeTypes;

			(service as any).updateCommunityNodeTypes([]);

			expect(resetCommunityNodeTypesSpy).not.toHaveBeenCalled();
			expect((service as any).communityNodeTypes).toBe(initialNodeTypes);

			expect((service as any).lastUpdateTimestamp).not.toBe(1000000);
		});

		it('should process nodeTypes normally when array has content', () => {
			const mockNodeTypes = [
				{ name: 'test-node-1', version: '1.0.0' },
				{ name: 'test-node-2', version: '1.1.0' },
			];
			const resetCommunityNodeTypesSpy = jest.spyOn(service as any, 'resetCommunityNodeTypes');

			(service as any).updateCommunityNodeTypes(mockNodeTypes);

			expect(resetCommunityNodeTypesSpy).toHaveBeenCalledTimes(1);
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
});
