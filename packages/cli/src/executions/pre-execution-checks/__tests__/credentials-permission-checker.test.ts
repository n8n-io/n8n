import {
	type Project,
	type User,
	type SharedCredentialsRepository,
	type CredentialsRepository,
	type CredentialsEntity,
	GLOBAL_OWNER_ROLE,
} from '@n8n/db';
import { mock } from 'jest-mock-extended';
import type { INode } from 'n8n-workflow';

import type { OwnershipService } from '@/services/ownership.service';
import type { ProjectService } from '@/services/project.service.ee';

import { CredentialsPermissionChecker } from '../credentials-permission-checker';

describe('CredentialsPermissionChecker', () => {
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const credentialsRepository = mock<CredentialsRepository>();
	const ownershipService = mock<OwnershipService>();
	const projectService = mock<ProjectService>();
	const permissionChecker = new CredentialsPermissionChecker(
		sharedCredentialsRepository,
		credentialsRepository,
		ownershipService,
		projectService,
	);

	const workflowId = 'workflow123';
	const credentialId = 'cred123';
	const personalProject = mock<Project>({
		id: 'personal-project',
		name: 'Personal Project',
		type: 'personal',
	});

	const node = mock<INode>({
		name: 'Test Node',
		credentials: {
			someCredential: {
				id: credentialId,
				name: 'Test Credential',
			},
		},
		disabled: false,
	});

	beforeEach(async () => {
		jest.resetAllMocks();

		node.credentials!.someCredential.id = credentialId;
		ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(personalProject);
		projectService.findProjectsWorkflowIsIn.mockResolvedValueOnce([personalProject.id]);
	});

	it('should throw if a node has a credential without an id', async () => {
		node.credentials!.someCredential.id = null;

		await expect(permissionChecker.check(workflowId, [node])).rejects.toThrow(
			'Node "Test Node" uses invalid credential',
		);

		expect(projectService.findProjectsWorkflowIsIn).toHaveBeenCalledWith(workflowId);
		expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).not.toHaveBeenCalled();
	});

	it('should throw if a credential is not accessible', async () => {
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(null);
		sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValueOnce([]);
		credentialsRepository.find.mockResolvedValueOnce([]);

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
		credentialsRepository.find.mockResolvedValueOnce([]);

		await expect(permissionChecker.check(workflowId, [node])).resolves.not.toThrow();

		expect(projectService.findProjectsWorkflowIsIn).toHaveBeenCalledWith(workflowId);
		expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).toHaveBeenCalledWith(
			[personalProject.id],
			[credentialId],
		);
	});

	it('should skip credential checks if the home project owner has global scope', async () => {
		const projectOwner = mock<User>({ role: GLOBAL_OWNER_ROLE });
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(projectOwner);

		await expect(permissionChecker.check(workflowId, [node])).resolves.not.toThrow();

		expect(projectService.findProjectsWorkflowIsIn).not.toHaveBeenCalled();
		expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).not.toHaveBeenCalled();
	});

	it('should allow global credentials for any project', async () => {
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(null);
		sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValueOnce([]);
		const globalCredential = mock<CredentialsEntity>({
			id: credentialId,
			isGlobal: true,
		});
		credentialsRepository.find.mockResolvedValueOnce([globalCredential]);

		await expect(permissionChecker.check(workflowId, [node])).resolves.not.toThrow();

		expect(projectService.findProjectsWorkflowIsIn).toHaveBeenCalledWith(workflowId);
		expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).toHaveBeenCalledWith(
			[personalProject.id],
			[credentialId],
		);
		expect(credentialsRepository.find).toHaveBeenCalledWith({
			select: ['id'],
			where: {
				isGlobal: true,
			},
		});
	});

	it('should allow global credentials for team projects', async () => {
		const teamProject = mock<Project>({
			id: 'team-project',
			name: 'Team Project',
			type: 'team',
		});
		// Reset and set up new mocks for this test
		jest.resetAllMocks();
		ownershipService.getWorkflowProjectCached.mockResolvedValue(teamProject);
		projectService.findProjectsWorkflowIsIn.mockResolvedValue([teamProject.id]);
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValue(null);
		sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValue([]);
		const globalCredential = mock<CredentialsEntity>({
			id: credentialId,
			isGlobal: true,
		});
		credentialsRepository.find.mockResolvedValue([globalCredential]);

		await expect(permissionChecker.check(workflowId, [node])).resolves.not.toThrow();

		expect(projectService.findProjectsWorkflowIsIn).toHaveBeenCalledWith(workflowId);
		expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).toHaveBeenCalledWith(
			[teamProject.id],
			[credentialId],
		);
		expect(credentialsRepository.find).toHaveBeenCalledWith({
			select: ['id'],
			where: {
				isGlobal: true,
			},
		});
	});
});
