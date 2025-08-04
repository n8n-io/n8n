'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_common_1 = require('@n8n/backend-common');
const community_node_types_utils_1 = require('../community-node-types-utils');
const community_node_types_service_1 = require('../community-node-types.service');
jest.mock('@n8n/backend-common', () => ({
	...jest.requireActual('@n8n/backend-common'),
	inProduction: jest.fn().mockReturnValue(false),
}));
jest.mock('../community-node-types-utils', () => ({
	getCommunityNodeTypes: jest.fn().mockResolvedValue([]),
}));
describe('CommunityNodeTypesService', () => {
	let service;
	let configMock;
	let communityPackagesServiceMock;
	let loggerMock;
	beforeEach(() => {
		jest.clearAllMocks();
		delete process.env.ENVIRONMENT;
		loggerMock = { error: jest.fn() };
		configMock = {
			enabled: true,
			verifiedEnabled: true,
		};
		communityPackagesServiceMock = {};
		service = new community_node_types_service_1.CommunityNodeTypesService(
			loggerMock,
			configMock,
			communityPackagesServiceMock,
		);
	});
	describe('fetchNodeTypes', () => {
		it('should use staging environment when ENVIRONMENT=staging', async () => {
			process.env.ENVIRONMENT = 'staging';
			await service.fetchNodeTypes();
			expect(community_node_types_utils_1.getCommunityNodeTypes).toHaveBeenCalledWith('staging');
		});
		it('should use production environment when inProduction=true', async () => {
			backend_common_1.inProduction.mockReturnValue(true);
			await service.fetchNodeTypes();
			expect(community_node_types_utils_1.getCommunityNodeTypes).toHaveBeenCalledWith('production');
		});
		it('should use production environment when ENVIRONMENT=production', async () => {
			process.env.ENVIRONMENT = 'production';
			await service.fetchNodeTypes();
			expect(community_node_types_utils_1.getCommunityNodeTypes).toHaveBeenCalledWith('production');
		});
		it('should prioritize ENVIRONMENT=staging over inProduction=true', async () => {
			process.env.ENVIRONMENT = 'staging';
			backend_common_1.inProduction.mockReturnValue(true);
			await service.fetchNodeTypes();
			expect(community_node_types_utils_1.getCommunityNodeTypes).toHaveBeenCalledWith('staging');
		});
	});
});
//# sourceMappingURL=community-node-types.service.test.js.map
