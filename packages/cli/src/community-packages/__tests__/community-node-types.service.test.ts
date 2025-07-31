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

		service = new CommunityNodeTypesService(loggerMock, configMock, communityPackagesServiceMock);
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
});
