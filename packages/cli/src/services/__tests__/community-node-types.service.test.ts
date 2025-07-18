import { inProduction } from '@n8n/backend-common';

import { getCommunityNodeTypes } from '../../utils/community-node-types-utils';
import { CommunityNodeTypesService } from '../community-node-types.service';

jest.mock('@n8n/backend-common', () => ({
	inProduction: jest.fn().mockReturnValue(false),
	logger: jest.fn().mockImplementation(() => ({
		error: jest.fn(),
	})),
}));

jest.mock('../../utils/community-node-types-utils', () => ({
	getCommunityNodeTypes: jest.fn().mockResolvedValue([]),
}));

describe('CommunityNodeTypesService', () => {
	let service: CommunityNodeTypesService;
	let globalConfigMock: any;
	let communityPackagesServiceMock: any;
	let loggerMock: any;

	beforeEach(() => {
		jest.clearAllMocks();

		delete process.env.ENVIRONMENT;

		loggerMock = { error: jest.fn() };
		globalConfigMock = {
			nodes: {
				communityPackages: {
					enabled: true,
					verifiedEnabled: true,
				},
			},
		};
		communityPackagesServiceMock = {};

		service = new CommunityNodeTypesService(
			loggerMock,
			globalConfigMock,
			communityPackagesServiceMock,
		);
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
