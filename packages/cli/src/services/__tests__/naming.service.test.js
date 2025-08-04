'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const backend_test_utils_1 = require('@n8n/backend-test-utils');
const db_1 = require('@n8n/db');
const naming_service_1 = require('@/services/naming.service');
describe('NamingService', () => {
	const workflowRepository = (0, backend_test_utils_1.mockInstance)(db_1.WorkflowRepository);
	const credentialsRepository = (0, backend_test_utils_1.mockInstance)(db_1.CredentialsRepository);
	const namingService = new naming_service_1.NamingService(
		workflowRepository,
		credentialsRepository,
	);
	beforeEach(() => {
		jest.restoreAllMocks();
	});
	describe('getUniqueWorkflowName()', () => {
		test('should return requested name if already unique', async () => {
			workflowRepository.findStartingWith.mockResolvedValue([]);
			const name = await namingService.getUniqueWorkflowName('foo');
			expect(name).toEqual('foo');
		});
		test('should return requested name suffixed if already existing once', async () => {
			workflowRepository.findStartingWith.mockResolvedValue([{ name: 'foo' }]);
			const name = await namingService.getUniqueWorkflowName('foo');
			expect(name).toEqual('foo 2');
		});
		test('should return requested name with incremented suffix if already suffixed', async () => {
			const existingNames = [{ name: 'foo' }, { name: 'foo 2' }];
			workflowRepository.findStartingWith.mockResolvedValue(existingNames);
			const name = await namingService.getUniqueWorkflowName('foo');
			expect(name).toEqual('foo 3');
			existingNames.push({ name: 'foo 3' });
			const _name = await namingService.getUniqueWorkflowName('foo');
			expect(_name).toEqual('foo 4');
		});
	});
	describe('getUniqueCredentialName()', () => {
		test('should return requested name if already unique', async () => {
			credentialsRepository.findStartingWith.mockResolvedValue([]);
			const name = await namingService.getUniqueCredentialName('foo');
			expect(name).toEqual('foo');
		});
		test('should return requested name suffixed if already existing once', async () => {
			credentialsRepository.findStartingWith.mockResolvedValue([{ name: 'foo' }]);
			const name = await namingService.getUniqueCredentialName('foo');
			expect(name).toEqual('foo 2');
		});
		test('should return requested name with incremented suffix if already suffixed', async () => {
			const existingNames = [{ name: 'foo' }, { name: 'foo 2' }];
			credentialsRepository.findStartingWith.mockResolvedValue(existingNames);
			const name = await namingService.getUniqueCredentialName('foo');
			expect(name).toEqual('foo 3');
			existingNames.push({ name: 'foo 3' });
			const _name = await namingService.getUniqueCredentialName('foo');
			expect(_name).toEqual('foo 4');
		});
	});
});
//# sourceMappingURL=naming.service.test.js.map
