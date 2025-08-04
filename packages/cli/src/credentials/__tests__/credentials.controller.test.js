'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const project_test_data_1 = require('@/__tests__/project.test-data');
const credentials_test_data_1 = require('./credentials.test-data');
const credentials_controller_1 = require('../credentials.controller');
describe('CredentialsController', () => {
	const eventService = (0, jest_mock_extended_1.mock)();
	const credentialsService = (0, jest_mock_extended_1.mock)();
	const sharedCredentialsRepository = (0, jest_mock_extended_1.mock)();
	const credentialsController = new credentials_controller_1.CredentialsController(
		(0, jest_mock_extended_1.mock)(),
		credentialsService,
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		(0, jest_mock_extended_1.mock)(),
		sharedCredentialsRepository,
		(0, jest_mock_extended_1.mock)(),
		eventService,
		(0, jest_mock_extended_1.mock)(),
	);
	let req;
	const res = (0, jest_mock_extended_1.mock)();
	beforeAll(() => {
		req = { user: { id: '123' } };
	});
	describe('createCredentials', () => {
		it('should create new credentials and emit "credentials-created"', async () => {
			const newCredentialsPayload = (0, credentials_test_data_1.createNewCredentialsPayload)();
			req.body = newCredentialsPayload;
			const { data, ...payloadWithoutData } = newCredentialsPayload;
			const createdCredentials = (0, credentials_test_data_1.createdCredentialsWithScopes)(
				payloadWithoutData,
			);
			const projectOwningCredentialData = (0, project_test_data_1.createRawProjectData)({
				id: newCredentialsPayload.projectId,
			});
			credentialsService.createUnmanagedCredential.mockResolvedValue(createdCredentials);
			sharedCredentialsRepository.findCredentialOwningProject.mockResolvedValue(
				projectOwningCredentialData,
			);
			const newApiKey = await credentialsController.createCredentials(
				req,
				res,
				newCredentialsPayload,
			);
			expect(credentialsService.createUnmanagedCredential).toHaveBeenCalledWith(
				newCredentialsPayload,
				req.user,
			);
			expect(sharedCredentialsRepository.findCredentialOwningProject).toHaveBeenCalledWith(
				createdCredentials.id,
			);
			expect(eventService.emit).toHaveBeenCalledWith('credentials-created', {
				user: expect.objectContaining({ id: req.user.id }),
				credentialId: createdCredentials.id,
				credentialType: createdCredentials.type,
				projectId: projectOwningCredentialData.id,
				projectType: projectOwningCredentialData.type,
				publicApi: false,
			});
			expect(newApiKey).toEqual(createdCredentials);
		});
	});
});
//# sourceMappingURL=credentials.controller.test.js.map
