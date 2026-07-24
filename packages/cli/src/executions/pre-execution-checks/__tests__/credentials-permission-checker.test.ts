import {
	type Project,
	type User,
	type SharedCredentialsRepository,
	type CredentialsRepository,
	type CredentialsEntity,
	type UserRepository,
	GLOBAL_OWNER_ROLE,
	GLOBAL_MEMBER_ROLE,
} from '@n8n/db';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { CredentialsFinderService } from '@/credentials/credentials-finder.service';
import type { NodeTypes } from '@/node-types';
import type { OwnershipService } from '@/services/ownership.service';
import type { ProjectService } from '@/services/project.service.ee';

import { CredentialsPermissionChecker } from '../credentials-permission-checker';

describe('CredentialsPermissionChecker', () => {
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const credentialsRepository = mock<CredentialsRepository>();
	const ownershipService = mock<OwnershipService>();
	const projectService = mock<ProjectService>();
	const nodeTypes = mock<NodeTypes>();
	const userRepository = mock<UserRepository>();
	const credentialsFinderService = mock<CredentialsFinderService>();
	const permissionChecker = new CredentialsPermissionChecker(
		sharedCredentialsRepository,
		credentialsRepository,
		ownershipService,
		projectService,
		nodeTypes,
		userRepository,
		credentialsFinderService,
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
		vi.resetAllMocks();

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

	it('should not throw for __aiGatewayManaged credentials with null id (member user)', async () => {
		// Members don't get the owner short-circuit, so they reach mapCredIdsToNodes.
		// AI Gateway managed credentials intentionally have id: null and must be skipped.
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(null);
		sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValueOnce([]);
		credentialsRepository.find.mockResolvedValueOnce([]);

		const managedNode = mock<INode>({
			name: 'AI Node',
			disabled: false,
			credentials: { openAiApi: { id: null, name: '', __aiGatewayManaged: true } },
		});

		await expect(permissionChecker.check(workflowId, [managedNode])).resolves.not.toThrow();
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
		vi.resetAllMocks();
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

	describe('credential type filtering', () => {
		const teamProject = mock<Project>({
			id: 'team-project',
			name: 'Team Project',
			type: 'team',
		});

		const activeCredentialId = 'active-cred';
		const staleCredentialId = 'stale-cred';

		const httpRequestNode: INode = {
			id: 'node-1',
			name: 'HTTP Request',
			type: 'n8n-nodes-base.httpRequest',
			typeVersion: 4.3,
			position: [0, 0],
			parameters: {
				authentication: 'predefinedCredentialType',
				nodeCredentialType: 'googleOAuth2Api',
			},
			credentials: {
				httpBearerAuth: {
					id: staleCredentialId,
					name: 'Stale Bearer Auth',
				},
				googleOAuth2Api: {
					id: activeCredentialId,
					name: 'Google OAuth2',
				},
			},
		};

		beforeEach(() => {
			vi.resetAllMocks();
			ownershipService.getWorkflowProjectCached.mockResolvedValue(teamProject);
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValue(null);
			projectService.findProjectsWorkflowIsIn.mockResolvedValue([teamProject.id]);
		});

		it('should only check the active credential type for nodes with nodeCredentialType', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: {
					credentials: [
						{
							name: 'httpSslAuth',
							required: true,
							displayOptions: { show: { provideSslCertificates: [true] } },
						},
					],
				},
			} as never);

			// The active credential is accessible, the stale one would not be
			sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValue([
				activeCredentialId,
			]);
			credentialsRepository.find.mockResolvedValue([]);

			await expect(permissionChecker.check(workflowId, [httpRequestNode])).resolves.not.toThrow();

			// Should only check the active credential, not the stale one
			expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).toHaveBeenCalledWith(
				[teamProject.id],
				[activeCredentialId],
			);
		});

		it('should check generic credential types specified by genericAuthType', async () => {
			const genericCredentialId = 'generic-cred';
			const httpRequestNodeWithGenericAuth: INode = {
				id: 'node-2',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [0, 0],
				parameters: {
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
				},
				credentials: {
					httpHeaderAuth: {
						id: genericCredentialId,
						name: 'Header Auth',
					},
				},
			};

			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: {
					credentials: [
						{
							name: 'httpSslAuth',
							required: true,
							displayOptions: { show: { provideSslCertificates: [true] } },
						},
					],
				},
			} as never);

			sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValue([]);
			credentialsRepository.find.mockResolvedValue([]);

			await expect(
				permissionChecker.check(workflowId, [httpRequestNodeWithGenericAuth]),
			).rejects.toThrow('Node "HTTP Request" does not have access to the credential');

			// Should check the generic credential type, not skip it
			expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).toHaveBeenCalledWith(
				[teamProject.id],
				[genericCredentialId],
			);
		});

		it('should check the credential when genericAuthType is an expression', async () => {
			const victimCredentialId = 'victim-cred';
			const httpRequestNodeWithExpressionAuth: INode = {
				id: 'node-3',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.2,
				position: [0, 0],
				parameters: {
					authentication: 'genericCredentialType',
					// Resolves to "httpHeaderAuth" only at execution time
					genericAuthType: '={{ "httpHeaderAuth" }}',
				},
				credentials: {
					httpHeaderAuth: {
						id: victimCredentialId,
						name: 'Victim Header Auth',
					},
				},
			};

			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: { credentials: [] },
			} as never);

			sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValue([]);
			credentialsRepository.find.mockResolvedValue([]);

			await expect(
				permissionChecker.check(workflowId, [httpRequestNodeWithExpressionAuth]),
			).rejects.toThrow('Node "HTTP Request" does not have access to the credential');

			// The unresolved expression must not let the credential bypass the check
			expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).toHaveBeenCalledWith(
				[teamProject.id],
				[victimCredentialId],
			);
		});

		it('should check the credential when nodeCredentialType is an expression', async () => {
			const victimCredentialId = 'victim-cred';
			const httpRequestNodeWithExpressionAuth: INode = {
				id: 'node-4',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.3,
				position: [0, 0],
				parameters: {
					authentication: 'predefinedCredentialType',
					nodeCredentialType: '={{ "googleOAuth2Api" }}',
				},
				credentials: {
					googleOAuth2Api: {
						id: victimCredentialId,
						name: 'Victim OAuth2',
					},
				},
			};

			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: { credentials: [] },
			} as never);

			sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValue([]);
			credentialsRepository.find.mockResolvedValue([]);

			await expect(
				permissionChecker.check(workflowId, [httpRequestNodeWithExpressionAuth]),
			).rejects.toThrow('Node "HTTP Request" does not have access to the credential');

			expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).toHaveBeenCalledWith(
				[teamProject.id],
				[victimCredentialId],
			);
		});

		it('should fall back to checking all credentials if node type cannot be resolved', async () => {
			nodeTypes.getByNameAndVersion.mockImplementation(() => {
				throw new Error('Unknown node type');
			});

			sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValue([
				activeCredentialId,
				staleCredentialId,
			]);
			credentialsRepository.find.mockResolvedValue([]);

			await expect(permissionChecker.check(workflowId, [httpRequestNode])).resolves.not.toThrow();

			// Should check both credentials since node type couldn't be resolved
			expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).toHaveBeenCalledWith(
				[teamProject.id],
				expect.arrayContaining([activeCredentialId, staleCredentialId]),
			);
		});
	});

	describe('checkForUser', () => {
		const userId = 'user-123';

		it('should not throw when the workflow has no credentials', async () => {
			await expect(permissionChecker.checkForUser(userId, [])).resolves.not.toThrow();

			expect(userRepository.findOne).not.toHaveBeenCalled();
			expect(credentialsFinderService.findCredentialsForUser).not.toHaveBeenCalled();
		});

		it('should throw when the triggering user cannot be resolved', async () => {
			userRepository.findOne.mockResolvedValueOnce(null);

			await expect(permissionChecker.checkForUser(userId, [node])).rejects.toThrow(
				'Node "Test Node" uses a credential you do not have access to',
			);
		});

		it('should throw when the user does not have access to the credential', async () => {
			userRepository.findOne.mockResolvedValueOnce(
				mock<User>({ id: userId, role: GLOBAL_MEMBER_ROLE }),
			);
			credentialsFinderService.findCredentialsForUser.mockResolvedValueOnce([]);

			await expect(permissionChecker.checkForUser(userId, [node])).rejects.toThrow(
				'Node "Test Node" uses a credential you do not have access to',
			);
			expect(credentialsFinderService.findCredentialsForUser).toHaveBeenCalledWith(
				expect.objectContaining({ id: userId }),
				['credential:read'],
			);
		});

		it('should not throw when the user has access to the credential', async () => {
			userRepository.findOne.mockResolvedValueOnce(
				mock<User>({ id: userId, role: GLOBAL_MEMBER_ROLE }),
			);
			credentialsFinderService.findCredentialsForUser.mockResolvedValueOnce([
				mock<CredentialsEntity>({ id: credentialId }),
			]);

			await expect(permissionChecker.checkForUser(userId, [node])).resolves.not.toThrow();
		});

		it('should skip the check for a user with instance-wide credential listing', async () => {
			userRepository.findOne.mockResolvedValueOnce(mock<User>({ role: GLOBAL_OWNER_ROLE }));

			await expect(permissionChecker.checkForUser(userId, [node])).resolves.not.toThrow();
			expect(credentialsFinderService.findCredentialsForUser).not.toHaveBeenCalled();
		});
	});
});
