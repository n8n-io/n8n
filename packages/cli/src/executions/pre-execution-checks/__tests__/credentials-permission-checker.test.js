'use strict';
Object.defineProperty(exports, '__esModule', { value: true });
const jest_mock_extended_1 = require('jest-mock-extended');
const credentials_permission_checker_1 = require('../credentials-permission-checker');
describe('CredentialsPermissionChecker', () => {
	const sharedCredentialsRepository = (0, jest_mock_extended_1.mock)();
	const ownershipService = (0, jest_mock_extended_1.mock)();
	const projectService = (0, jest_mock_extended_1.mock)();
	const permissionChecker = new credentials_permission_checker_1.CredentialsPermissionChecker(
		sharedCredentialsRepository,
		ownershipService,
		projectService,
	);
	const workflowId = 'workflow123';
	const credentialId = 'cred123';
	const personalProject = (0, jest_mock_extended_1.mock)({
		id: 'personal-project',
		name: 'Personal Project',
		type: 'personal',
	});
	const node = (0, jest_mock_extended_1.mock)({
		name: 'Test Node',
		credentials: {
			someCredential: {
				id: credentialId,
				name: 'Test Credential',
			},
		},
		disabled: false,
	});
	beforeEach(() => {
		jest.resetAllMocks();
		node.credentials.someCredential.id = credentialId;
		ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(personalProject);
		projectService.findProjectsWorkflowIsIn.mockResolvedValueOnce([personalProject.id]);
	});
	it('should throw if a node has a credential without an id', async () => {
		node.credentials.someCredential.id = null;
		await expect(permissionChecker.check(workflowId, [node])).rejects.toThrow(
			'Node "Test Node" uses invalid credential',
		);
		expect(projectService.findProjectsWorkflowIsIn).toHaveBeenCalledWith(workflowId);
		expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).not.toHaveBeenCalled();
	});
	it('should throw if a credential is not accessible', async () => {
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(null);
		sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValueOnce([]);
		await expect(permissionChecker.check(workflowId, [node])).rejects.toThrow(
			'Node "Test Node" does not have access to the credential',
		);
		expect(projectService.findProjectsWorkflowIsIn).toHaveBeenCalledWith(workflowId);
		expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).toHaveBeenCalledWith(
			[personalProject.id],
			[credentialId],
		);
	});
	it('should not throw an error if the workflow has no credentials', async () => {
		await expect(permissionChecker.check(workflowId, [])).resolves.not.toThrow();
		expect(projectService.findProjectsWorkflowIsIn).toHaveBeenCalledWith(workflowId);
		expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).not.toHaveBeenCalled();
	});
	it('should not throw an error if all credentials are accessible', async () => {
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(null);
		sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValueOnce([
			credentialId,
		]);
		await expect(permissionChecker.check(workflowId, [node])).resolves.not.toThrow();
		expect(projectService.findProjectsWorkflowIsIn).toHaveBeenCalledWith(workflowId);
		expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).toHaveBeenCalledWith(
			[personalProject.id],
			[credentialId],
		);
	});
	it('should skip credential checks if the home project owner has global scope', async () => {
		const projectOwner = (0, jest_mock_extended_1.mock)({ role: 'global:owner' });
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(projectOwner);
		await expect(permissionChecker.check(workflowId, [node])).resolves.not.toThrow();
		expect(projectService.findProjectsWorkflowIsIn).not.toHaveBeenCalled();
		expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).not.toHaveBeenCalled();
	});
});
//# sourceMappingURL=credentials-permission-checker.test.js.map
