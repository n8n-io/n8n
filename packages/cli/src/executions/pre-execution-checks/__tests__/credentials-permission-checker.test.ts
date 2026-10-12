import {
	type Project,
	type Role,
	type User,
	type CredentialsEntity,
	type SharedCredentialsRepository,
	type CredentialsRepository,
	type UserRepository,
	GLOBAL_OWNER_ROLE,
	GLOBAL_MEMBER_ROLE,
} from '@n8n/db';
import type { INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import type { Logger } from '@n8n/backend-common';

import type { CredentialsFinderService } from '@n8n/backend-services';
import type { NodeTypes } from '@/node-types';
import type { OwnershipService } from '@/services/ownership.service';
import type { ProjectService } from '@/services/project.service.ee';

import { CredentialsPermissionChecker } from '../credentials-permission-checker';

const flags = { credSharingEnabled: false };
vi.mock('@/constants/credential-sharing', () => ({
	isCredSharingEnabled: () => flags.credSharingEnabled,
}));

describe('CredentialsPermissionChecker', () => {
	const sharedCredentialsRepository = mock<SharedCredentialsRepository>();
	const credentialsRepository = mock<CredentialsRepository>();
	const ownershipService = mock<OwnershipService>();
	const projectService = mock<ProjectService>();
	const nodeTypes = mock<NodeTypes>();
	const userRepository = mock<UserRepository>();
	const credentialsFinderService = mock<CredentialsFinderService>();
	const logger = mock<Logger>();
	const permissionChecker = new CredentialsPermissionChecker(
		sharedCredentialsRepository,
		credentialsRepository,
		ownershipService,
		projectService,
		nodeTypes,
		userRepository,
		credentialsFinderService,
		logger,
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
		flags.credSharingEnabled = false;

		node.credentials!.someCredential.id = credentialId;
		ownershipService.getWorkflowProjectCached.mockResolvedValueOnce(personalProject);
		projectService.findProjectsWorkflowIsIn.mockResolvedValueOnce([personalProject.id]);
		credentialsRepository.findGlobalProjectCredentialIds.mockResolvedValue([]);
		credentialsRepository.findNonProjectCredentialsByIds.mockResolvedValue([]);
		// Default: every id passed in still exists. Override per test to simulate a deleted one.
		credentialsRepository.findExistingIds.mockImplementation(async (ids) => ids);
		ownershipService.getPersonalProjectOwnersCached.mockResolvedValue(new Map());
	});

	it('should throw if a node has a credential without an id', async () => {
		node.credentials!.someCredential.id = null;

		await expect(permissionChecker.check(workflowId, [node])).rejects.toThrow(
			'Node "Test Node" uses invalid credential',
		);

		expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).not.toHaveBeenCalled();
	});

	it('should not throw for __aiGatewayManaged credentials with null id (member user)', async () => {
		// Members don't get the owner short-circuit, so they reach mapCredIdsToNodes.
		// AI Gateway managed credentials intentionally have id: null and must be skipped.
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(null);
		sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValueOnce([]);
		credentialsRepository.findGlobalProjectCredentialIds.mockResolvedValueOnce([]);

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
		credentialsRepository.findGlobalProjectCredentialIds.mockResolvedValueOnce([]);

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

		expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).not.toHaveBeenCalled();
	});

	it('should not throw an error if all credentials are accessible', async () => {
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(null);
		sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValueOnce([
			credentialId,
		]);
		credentialsRepository.findGlobalProjectCredentialIds.mockResolvedValueOnce([]);

		await expect(permissionChecker.check(workflowId, [node])).resolves.not.toThrow();

		expect(projectService.findProjectsWorkflowIsIn).toHaveBeenCalledWith(workflowId);
		expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).toHaveBeenCalledWith(
			[personalProject.id],
			[credentialId],
		);
	});

	describe('findInaccessible', () => {
		it('returns every inaccessible id in the order given', async () => {
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(null);
			sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValueOnce(['b']);
			credentialsRepository.findGlobalProjectCredentialIds.mockResolvedValueOnce(['d']);

			const result = await permissionChecker.findInaccessible(workflowId, ['a', 'b', 'c', 'd']);

			expect(result).toEqual({
				homeProject: personalProject,
				inaccessibleIds: ['a', 'c'],
				unusableForActingUser: [],
			});
			expect(credentialsRepository.findGlobalProjectCredentialIds).toHaveBeenCalledWith([
				'a',
				'b',
				'c',
				'd',
			]);
		});

		it('returns only the non-project credentials when there are any', async () => {
			credentialsRepository.findNonProjectCredentialsByIds.mockResolvedValue([
				mock<CredentialsEntity>({ id: 'b' }),
			]);

			const result = await permissionChecker.findInaccessible(workflowId, ['a', 'b']);

			expect(result.inaccessibleIds).toEqual(['b']);
			// Decided before any sharing is read.
			expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).not.toHaveBeenCalled();
		});

		describe('acting-user route (isCredSharingEnabled)', () => {
			const actingUser = mock<User>({ id: 'acting-user' });

			beforeEach(() => {
				ownershipService.getPersonalProjectOwnerCached.mockResolvedValue(null);
				sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValue([]);
				credentialsRepository.findGlobalProjectCredentialIds.mockResolvedValue([]);
				userRepository.findOne.mockResolvedValue(actingUser);
			});

			it('does not count an instance-wide grant in a team project', async () => {
				flags.credSharingEnabled = true;
				const teamProject = mock<Project>({ id: 'marketing', name: 'Marketing', type: 'team' });
				ownershipService.getWorkflowProjectCached.mockReset();
				ownershipService.getWorkflowProjectCached.mockResolvedValue(teamProject);
				credentialsFinderService.findUnusableCredentialsForUser.mockResolvedValue([
					{ id: credentialId, name: 'Alice Gmail', exists: true, ownerProject: null },
				]);

				const result = await permissionChecker.findInaccessible(
					workflowId,
					[credentialId],
					actingUser.id,
				);

				expect(result.inaccessibleIds).toEqual([credentialId]);
				expect(credentialsFinderService.findUnusableCredentialsForUser).toHaveBeenCalledWith(
					actingUser,
					[credentialId],
					{ ignoreGlobalUseScope: true },
				);
			});

			it('is never consulted for a credential the project already carries', async () => {
				flags.credSharingEnabled = true;
				sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValue([
					credentialId,
				]);

				const result = await permissionChecker.findInaccessible(
					workflowId,
					[credentialId],
					actingUser.id,
				);

				expect(result.inaccessibleIds).toEqual([]);
				// This is what keeps every workflow that runs today running.
				expect(credentialsFinderService.findUnusableCredentialsForUser).not.toHaveBeenCalled();
			});

			it('lets the run through for a credential the acting user may use', async () => {
				flags.credSharingEnabled = true;
				credentialsFinderService.findUnusableCredentialsForUser.mockResolvedValue([]);

				const result = await permissionChecker.findInaccessible(
					workflowId,
					[credentialId],
					actingUser.id,
				);

				expect(result.inaccessibleIds).toEqual([]);
				expect(credentialsFinderService.findUnusableCredentialsForUser).toHaveBeenCalledWith(
					actingUser,
					[credentialId],
					{ ignoreGlobalUseScope: false },
				);
			});

			it('refuses when the acting user cannot use it either', async () => {
				flags.credSharingEnabled = true;
				credentialsFinderService.findUnusableCredentialsForUser.mockResolvedValue([
					{ id: credentialId, name: "Alice's Gmail", exists: true, ownerProject: null },
				]);

				const result = await permissionChecker.findInaccessible(
					workflowId,
					[credentialId],
					actingUser.id,
				);

				expect(result.inaccessibleIds).toEqual([credentialId]);
				expect(result.unusableForActingUser).toEqual([
					{ id: credentialId, name: "Alice's Gmail", exists: true, ownerProject: null },
				]);
			});

			it('keeps the sharing answer when the run has no acting user', async () => {
				flags.credSharingEnabled = true;

				const result = await permissionChecker.findInaccessible(workflowId, [credentialId]);

				// Without an identity we cannot tell a colleague's personal credential
				// from one simply never shared here, so fail closed with today's answer.
				expect(result.inaccessibleIds).toEqual([credentialId]);
				expect(result.unusableForActingUser).toEqual([]);
				expect(credentialsFinderService.findUnusableCredentialsForUser).not.toHaveBeenCalled();
			});

			it('keeps the sharing answer when the acting user cannot be resolved', async () => {
				flags.credSharingEnabled = true;
				userRepository.findOne.mockResolvedValue(null);

				const result = await permissionChecker.findInaccessible(
					workflowId,
					[credentialId],
					actingUser.id,
				);

				expect(result.inaccessibleIds).toEqual([credentialId]);
				expect(credentialsFinderService.findUnusableCredentialsForUser).not.toHaveBeenCalled();
			});

			it('asks nothing of the acting user while the flag is off', async () => {
				const result = await permissionChecker.findInaccessible(
					workflowId,
					[credentialId],
					actingUser.id,
				);

				expect(result.inaccessibleIds).toEqual([credentialId]);
				expect(credentialsFinderService.findUnusableCredentialsForUser).not.toHaveBeenCalled();
				expect(userRepository.findOne).not.toHaveBeenCalled();
			});

			it('never lets an instance-scoped credential reach the acting user', async () => {
				flags.credSharingEnabled = true;
				credentialsRepository.findNonProjectCredentialsByIds.mockResolvedValue([
					mock<CredentialsEntity>({ id: credentialId }),
				]);

				const result = await permissionChecker.findInaccessible(
					workflowId,
					[credentialId],
					actingUser.id,
				);

				expect(result.inaccessibleIds).toEqual([credentialId]);
				expect(credentialsFinderService.findUnusableCredentialsForUser).not.toHaveBeenCalled();
			});
		});
	});

	// The project route rejects the credential in every case here, so each one
	// reaches the acting user.
	describe('check through the acting-user route', () => {
		const actingUser = mock<User>({ id: 'acting-user' });

		beforeEach(() => {
			flags.credSharingEnabled = true;
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValue(null);
			sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValue([]);
			credentialsRepository.findGlobalProjectCredentialIds.mockResolvedValue([]);
			userRepository.findOne.mockResolvedValue(actingUser);
		});

		// The grant this ticket exists for: the project does not carry the credential,
		// and the run goes ahead anyway because the person it acts as may use it.
		it('throws nothing when the acting user may use the credential', async () => {
			credentialsFinderService.findUnusableCredentialsForUser.mockResolvedValue([]);

			await expect(
				permissionChecker.check(workflowId, [node], actingUser.id),
			).resolves.not.toThrow();

			expect(credentialsFinderService.findUnusableCredentialsForUser).toHaveBeenCalledWith(
				actingUser,
				[credentialId],
				{ ignoreGlobalUseScope: false },
			);
		});

		it('names the credential, the node, and the project to ask', async () => {
			credentialsFinderService.findUnusableCredentialsForUser.mockResolvedValue([
				{
					id: credentialId,
					name: 'Team Gmail',
					exists: true,
					ownerProject: mock<Project>({ name: 'Sales Ops', type: 'team' }),
				},
			]);

			await expect(
				permissionChecker.check(workflowId, [node], actingUser.id),
			).rejects.toMatchObject({
				message: 'Node "Test Node" uses the credential "Team Gmail", which you cannot use',
				description: 'Ask an admin of the project "Sales Ops" to share this credential with you.',
			});
		});

		it('points at the owner when the credential belongs to a personal space', async () => {
			credentialsFinderService.findUnusableCredentialsForUser.mockResolvedValue([
				{
					id: credentialId,
					name: "Alice's Gmail",
					exists: true,
					ownerProject: mock<Project>({ name: 'Alice', type: 'personal' }),
				},
			]);

			await expect(
				permissionChecker.check(workflowId, [node], actingUser.id),
			).rejects.toMatchObject({
				message: 'Node "Test Node" uses the credential "Alice\'s Gmail", which you cannot use',
				description: 'Ask its owner to share this credential with you.',
			});
		});

		// A workflow published before publisher attribution existed, or one whose
		// publisher was deleted, is refused for want of an identity. The user-facing
		// message stays the sharing one, so the log is the only place that says why.
		it('warns that the run had no identity, naming the remedy', async () => {
			await expect(permissionChecker.check(workflowId, [node])).rejects.toThrow();

			expect(logger.warn).toHaveBeenCalledWith(
				'Refusing a run with no identity to attribute it to; republish the workflow to restore attribution',
				{ workflowId, credentialIds: [credentialId] },
			);
		});

		// Without an identity we cannot tell a colleague's personal credential from
		// one simply never shared here, and sharing is the accurate hint for the
		// common case — a workflow published before any of this existed.
		it('keeps the sharing message when the run has no acting user', async () => {
			await expect(permissionChecker.check(workflowId, [node])).rejects.toThrow(
				'Node "Test Node" does not have access to the credential',
			);
		});
	});

	it('should skip credential checks if the home project owner may use any credential', async () => {
		const projectOwner = mock<User>({ role: GLOBAL_OWNER_ROLE });
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(projectOwner);

		await expect(permissionChecker.check(workflowId, [node])).resolves.not.toThrow();

		expect(projectService.findProjectsWorkflowIsIn).not.toHaveBeenCalled();
		expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).not.toHaveBeenCalled();
	});

	it('should reject instance credentials even when the home project owner has global scope', async () => {
		const projectOwner = mock<User>({ role: GLOBAL_OWNER_ROLE });
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValue(projectOwner);
		const instanceCredential = mock<CredentialsEntity>({
			id: credentialId,
			usageScope: 'instance',
		});
		credentialsRepository.findNonProjectCredentialsByIds.mockResolvedValueOnce([
			instanceCredential,
		]);

		await expect(permissionChecker.check(workflowId, [node])).rejects.toThrow(
			'Node "Test Node" does not have access to the credential',
		);

		expect(credentialsRepository.findNonProjectCredentialsByIds).toHaveBeenCalledWith([
			credentialId,
		]);
		expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).not.toHaveBeenCalled();
	});

	it('should reject instance credentials for member workflows', async () => {
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(null);
		const instanceCredential = mock<CredentialsEntity>({
			id: credentialId,
			usageScope: 'instance',
		});
		credentialsRepository.findNonProjectCredentialsByIds.mockResolvedValueOnce([
			instanceCredential,
		]);

		await expect(permissionChecker.check(workflowId, [node])).rejects.toThrow(
			'Node "Test Node" does not have access to the credential',
		);
	});

	it('should allow global credentials for any project', async () => {
		ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(null);
		sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValueOnce([]);
		credentialsRepository.findGlobalProjectCredentialIds.mockResolvedValueOnce([credentialId]);

		await expect(permissionChecker.check(workflowId, [node])).resolves.not.toThrow();

		expect(projectService.findProjectsWorkflowIsIn).toHaveBeenCalledWith(workflowId);
		expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).toHaveBeenCalledWith(
			[personalProject.id],
			[credentialId],
		);
		expect(credentialsRepository.findGlobalProjectCredentialIds).toHaveBeenCalledWith([
			credentialId,
		]);
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
		credentialsRepository.findNonProjectCredentialsByIds.mockResolvedValue([]);
		credentialsRepository.findGlobalProjectCredentialIds.mockResolvedValueOnce([credentialId]);

		await expect(permissionChecker.check(workflowId, [node])).resolves.not.toThrow();

		expect(projectService.findProjectsWorkflowIsIn).toHaveBeenCalledWith(workflowId);
		expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).toHaveBeenCalledWith(
			[teamProject.id],
			[credentialId],
		);
		expect(credentialsRepository.findGlobalProjectCredentialIds).toHaveBeenCalledWith([
			credentialId,
		]);
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
			credentialsRepository.findNonProjectCredentialsByIds.mockResolvedValue([]);
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
			credentialsRepository.findGlobalProjectCredentialIds.mockResolvedValue([]);

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
			credentialsRepository.findGlobalProjectCredentialIds.mockResolvedValue([]);

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
			credentialsRepository.findGlobalProjectCredentialIds.mockResolvedValue([]);

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
			credentialsRepository.findGlobalProjectCredentialIds.mockResolvedValue([]);

			await expect(
				permissionChecker.check(workflowId, [httpRequestNodeWithExpressionAuth]),
			).rejects.toThrow('Node "HTTP Request" does not have access to the credential');

			expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).toHaveBeenCalledWith(
				[teamProject.id],
				[victimCredentialId],
			);
		});

		describe('with the credential-type parameters declared in the node type', () => {
			// The other cases in this block mock descriptions without `properties`, which
			// takes the "parameter not declared, trust its value" path. A real HTTP Request
			// description declares both selectors and gates them on `authentication`, so
			// their values only count while the matching auth mode is selected. The runtime
			// agrees because HttpRequestV3 reads `authentication` first and only fetches the
			// credential for that branch (its default is `none`).
			const description = {
				credentials: [
					{
						name: 'httpSslAuth',
						required: true,
						displayOptions: { show: { provideSslCertificates: [true] } },
					},
				],
				properties: [
					{
						name: 'nodeCredentialType',
						type: 'credentialsSelect',
						displayOptions: { show: { authentication: ['predefinedCredentialType'] } },
					},
					{
						name: 'genericAuthType',
						type: 'credentialsSelect',
						displayOptions: { show: { authentication: ['genericCredentialType'] } },
					},
				],
			};

			const makeNode = (parameters: INode['parameters']): INode => ({
				id: 'node-5',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				typeVersion: 4.3,
				position: [0, 0],
				parameters,
				credentials: {
					googleOAuth2Api: { id: staleCredentialId, name: 'Google OAuth2' },
					httpHeaderAuth: { id: activeCredentialId, name: 'Header Auth' },
				},
			});

			beforeEach(() => {
				nodeTypes.getByNameAndVersion.mockReturnValue({ description } as never);
				credentialsRepository.findGlobalProjectCredentialIds.mockResolvedValue([]);
			});

			it('should not check a credential whose selector parameter is hidden', async () => {
				sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValue([
					activeCredentialId,
				]);

				const node = makeNode({
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					// Left over from a previous setup; hidden while generic auth is selected
					nodeCredentialType: 'googleOAuth2Api',
				});

				await expect(permissionChecker.check(workflowId, [node])).resolves.not.toThrow();

				expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).toHaveBeenCalledWith(
					[teamProject.id],
					[activeCredentialId],
				);
			});

			it('should check a credential whose selector parameter is displayed', async () => {
				sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValue([]);

				const node = makeNode({
					authentication: 'predefinedCredentialType',
					nodeCredentialType: 'googleOAuth2Api',
				});

				await expect(permissionChecker.check(workflowId, [node])).rejects.toThrow(
					'Node "HTTP Request" does not have access to the credential',
				);

				expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).toHaveBeenCalledWith(
					[teamProject.id],
					[staleCredentialId],
				);
			});

			it('should ignore an expression in a hidden selector parameter', async () => {
				sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValue([
					activeCredentialId,
				]);

				const node = makeNode({
					authentication: 'genericCredentialType',
					genericAuthType: 'httpHeaderAuth',
					nodeCredentialType: '={{ $json.credType }}',
				});

				await expect(permissionChecker.check(workflowId, [node])).resolves.not.toThrow();

				// A hidden parameter resolves to nothing, so the expression must not force
				// the fallback that checks every credential reference.
				expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).toHaveBeenCalledWith(
					[teamProject.id],
					[activeCredentialId],
				);
			});

			it('should check every credential for an expression in a displayed selector parameter', async () => {
				sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValue([]);

				const node = makeNode({
					authentication: 'predefinedCredentialType',
					nodeCredentialType: '={{ $json.credType }}',
				});

				await expect(permissionChecker.check(workflowId, [node])).rejects.toThrow(
					'Node "HTTP Request" does not have access to the credential',
				);

				expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).toHaveBeenCalledWith(
					[teamProject.id],
					expect.arrayContaining([staleCredentialId, activeCredentialId]),
				);
			});
		});

		it('should fall back to checking all credentials if node type cannot be resolved', async () => {
			nodeTypes.getByNameAndVersion.mockImplementation(() => {
				throw new Error('Unknown node type');
			});

			sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValue([
				activeCredentialId,
				staleCredentialId,
			]);
			credentialsRepository.findGlobalProjectCredentialIds.mockResolvedValue([]);

			await expect(permissionChecker.check(workflowId, [httpRequestNode])).resolves.not.toThrow();

			// Should check both credentials since node type couldn't be resolved
			expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).toHaveBeenCalledWith(
				[teamProject.id],
				expect.arrayContaining([activeCredentialId, staleCredentialId]),
			);
		});

		describe('getCredentialIdsForNodes', () => {
			it('only returns the credential type actively used by the current configuration', () => {
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

				expect(permissionChecker.getCredentialIdsForNodes([httpRequestNode])).toEqual([
					activeCredentialId,
				]);
			});

			it('returns every referenced credential when the node type cannot be resolved', () => {
				nodeTypes.getByNameAndVersion.mockImplementation(() => {
					throw new Error('Unknown node type');
				});

				expect(permissionChecker.getCredentialIdsForNodes([httpRequestNode])).toEqual(
					expect.arrayContaining([activeCredentialId, staleCredentialId]),
				);
			});
		});
	});

	describe('getCredentialIdsForNodes', () => {
		it('returns the ids of credentials referenced by the given nodes, deduplicated', () => {
			const nodeB: INode = { ...node, name: 'Node B' };

			expect(permissionChecker.getCredentialIdsForNodes([node, nodeB])).toEqual([credentialId]);
		});

		it('skips disabled nodes', () => {
			const disabledNode: INode = { ...node, disabled: true };

			expect(permissionChecker.getCredentialIdsForNodes([disabledNode])).toEqual([]);
		});

		it('skips a credential reference with no id instead of throwing', () => {
			const nodeWithNoId: INode = {
				...node,
				credentials: { someCredential: { id: null as unknown as string, name: 'No id' } },
			};

			expect(permissionChecker.getCredentialIdsForNodes([nodeWithNoId])).toEqual([]);
		});
	});

	describe('checkForUser', () => {
		const userId = 'user-123';

		it('should not throw when the workflow has no credentials', async () => {
			await expect(permissionChecker.checkForUser(userId, [])).resolves.not.toThrow();

			expect(userRepository.findOne).not.toHaveBeenCalled();
			expect(credentialsFinderService.findUnusableCredentialsForUser).not.toHaveBeenCalled();
		});

		it('should throw when the triggering user cannot be resolved', async () => {
			userRepository.findOne.mockResolvedValueOnce(null);
			// A null user reaches the shared check, which reports every id.
			credentialsFinderService.findUnusableCredentialsForUser.mockResolvedValueOnce([
				{ id: credentialId, name: 'Test Credential', exists: true, ownerProject: null },
			]);

			await expect(permissionChecker.checkForUser(userId, [node])).rejects.toThrow(
				'Node "Test Node" uses a credential you do not have access to',
			);
			expect(credentialsFinderService.findUnusableCredentialsForUser).toHaveBeenCalledWith(
				null,
				[credentialId],
				{},
			);
		});

		it('names the credential and the node when the user cannot use it', async () => {
			flags.credSharingEnabled = true;
			const actingUser = mock<User>({ id: userId, role: GLOBAL_MEMBER_ROLE });
			userRepository.findOne.mockResolvedValueOnce(actingUser);
			credentialsFinderService.findUnusableCredentialsForUser.mockResolvedValueOnce([
				{ id: credentialId, name: "Alice's Gmail", exists: true, ownerProject: null },
			]);

			await expect(permissionChecker.checkForUser(userId, [node])).rejects.toThrow(
				'Node "Test Node" uses the credential "Alice\'s Gmail", which you cannot use',
			);
			expect(credentialsFinderService.findUnusableCredentialsForUser).toHaveBeenCalledWith(
				actingUser,
				[credentialId],
				{},
			);
		});

		it('should not throw when the user has access to the credential', async () => {
			userRepository.findOne.mockResolvedValueOnce(
				mock<User>({ id: userId, role: GLOBAL_MEMBER_ROLE }),
			);
			credentialsFinderService.findUnusableCredentialsForUser.mockResolvedValueOnce([]);

			await expect(permissionChecker.checkForUser(userId, [node])).resolves.not.toThrow();
		});

		// Inline sub-workflows were already checked against the user before this
		// feature, so their message must not change until the flag is on.
		it('keeps the old message while the flag is off', async () => {
			userRepository.findOne.mockResolvedValueOnce(
				mock<User>({ id: userId, role: GLOBAL_MEMBER_ROLE }),
			);
			credentialsFinderService.findUnusableCredentialsForUser.mockResolvedValueOnce([
				{ id: credentialId, name: "Alice's Gmail", exists: true, ownerProject: null },
			]);

			await expect(permissionChecker.checkForUser(userId, [node])).rejects.toThrow(
				'Node "Test Node" uses a credential you do not have access to',
			);
		});

		// A provider connection cannot be made usable by sharing it, so the "ask its
		// owner" advice would point the user nowhere — even with the flag on, and even
		// though the credential now has a real name to quote.
		it('keeps the plain message for an instance-scoped credential with the flag on', async () => {
			flags.credSharingEnabled = true;
			userRepository.findOne.mockResolvedValueOnce(
				mock<User>({ id: userId, role: GLOBAL_MEMBER_ROLE }),
			);
			credentialsRepository.findNonProjectCredentialsByIds.mockResolvedValueOnce([
				mock<CredentialsEntity>({ id: credentialId, usageScope: 'instance' }),
			]);
			credentialsFinderService.describeCredentials.mockResolvedValueOnce([
				{ id: credentialId, name: 'Provider connection', exists: true, ownerProject: null },
			]);

			await expect(permissionChecker.checkForUser(userId, [node])).rejects.toMatchObject({
				message: 'Node "Test Node" uses a credential you do not have access to',
				description:
					'This node uses a credential you do not have access to. Ask its owner to share it with you.',
			});
		});

		it('rejects an instance-scoped credential before anyone is asked', async () => {
			userRepository.findOne.mockResolvedValueOnce(mock<User>({ role: GLOBAL_OWNER_ROLE }));
			credentialsRepository.findNonProjectCredentialsByIds.mockResolvedValueOnce([
				mock<CredentialsEntity>({ id: credentialId, usageScope: 'instance' }),
			]);
			// Named from the database, not from the node's stale copy.
			credentialsFinderService.describeCredentials.mockResolvedValueOnce([
				{ id: credentialId, name: 'Provider connection', exists: true, ownerProject: null },
			]);

			await expect(permissionChecker.checkForUser(userId, [node])).rejects.toThrow(
				'Node "Test Node" uses a credential you do not have access to',
			);
			expect(credentialsFinderService.findUnusableCredentialsForUser).not.toHaveBeenCalled();
		});
	});

	describe('findInaccessibleForUser', () => {
		const userId = 'user-123';

		beforeEach(() => {
			flags.credSharingEnabled = true;
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValue(null);
			sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValue([]);
		});

		it('returns an empty array without checking anything when credential sharing is not enabled', async () => {
			flags.credSharingEnabled = false;

			await expect(
				permissionChecker.findInaccessibleForUser(userId, [node], workflowId),
			).resolves.toEqual([]);
			expect(userRepository.findOne).not.toHaveBeenCalled();
		});

		it('returns an empty array when the workflow has no credentials', async () => {
			await expect(
				permissionChecker.findInaccessibleForUser(userId, [], workflowId),
			).resolves.toEqual([]);

			expect(userRepository.findOne).not.toHaveBeenCalled();
		});

		it('returns an empty array when the user can use every credential', async () => {
			userRepository.findOne.mockResolvedValueOnce(mock<User>({ role: GLOBAL_OWNER_ROLE }));
			credentialsFinderService.findUnusableCredentialsForUser.mockResolvedValueOnce([]);

			await expect(
				permissionChecker.findInaccessibleForUser(userId, [node], workflowId),
			).resolves.toEqual([]);
		});

		it('names the credentials the user cannot use', async () => {
			const actingUser = mock<User>({ id: userId, role: GLOBAL_MEMBER_ROLE });
			userRepository.findOne.mockResolvedValueOnce(actingUser);
			credentialsFinderService.findUnusableCredentialsForUser.mockResolvedValueOnce([
				{ id: credentialId, name: 'Test Credential', exists: true, ownerProject: null },
			]);

			await expect(
				permissionChecker.findInaccessibleForUser(userId, [node], workflowId),
			).resolves.toEqual([{ id: credentialId, name: 'Test Credential', exists: true }]);
			expect(credentialsFinderService.findUnusableCredentialsForUser).toHaveBeenCalledWith(
				actingUser,
				[credentialId],
				{ ignoreGlobalUseScope: false },
			);
		});

		it('names a deleted credential from the node, since the database has no row', async () => {
			userRepository.findOne.mockResolvedValueOnce(
				mock<User>({ id: userId, role: GLOBAL_MEMBER_ROLE }),
			);
			credentialsFinderService.findUnusableCredentialsForUser.mockResolvedValueOnce([
				{ id: credentialId, name: credentialId, exists: false, ownerProject: null },
			]);

			await expect(
				permissionChecker.findInaccessibleForUser(userId, [node], workflowId),
			).resolves.toEqual([{ id: credentialId, name: 'Test Credential', exists: false }]);
		});

		it('reports every inaccessible credential, not just the unavailable ones', async () => {
			const otherCredentialId = 'other-cred';
			const otherNode = mock<INode>({
				name: 'Other Node',
				credentials: { otherCredential: { id: otherCredentialId, name: 'Other Credential' } },
				disabled: false,
			});

			userRepository.findOne.mockResolvedValueOnce(
				mock<User>({ id: userId, role: GLOBAL_MEMBER_ROLE }),
			);
			credentialsRepository.findNonProjectCredentialsByIds.mockResolvedValueOnce([
				mock<CredentialsEntity>({ id: credentialId }),
			]);
			// The stored name wins for the instance-scoped one; renaming a provider
			// connection leaves the node's copy stale.
			credentialsFinderService.describeCredentials.mockResolvedValueOnce([
				{ id: credentialId, name: 'Renamed connection', exists: true, ownerProject: null },
			]);
			credentialsFinderService.findUnusableCredentialsForUser.mockResolvedValueOnce([
				{ id: otherCredentialId, name: 'Other Credential', exists: true, ownerProject: null },
			]);

			await expect(
				permissionChecker.findInaccessibleForUser(userId, [node, otherNode], workflowId),
			).resolves.toEqual([
				{ id: credentialId, name: 'Renamed connection', exists: true },
				{ id: otherCredentialId, name: 'Other Credential', exists: true },
			]);

			// The instance-scoped credential must not short-circuit the question for
			// the remaining one, and must not be asked about either.
			expect(credentialsFinderService.findUnusableCredentialsForUser).toHaveBeenCalledWith(
				expect.anything(),
				[otherCredentialId],
				{ ignoreGlobalUseScope: false },
			);
		});

		// The publish gate reads `exists` to decide between "ask its owner to share
		// it" and "no longer exists, update the node". A failed user lookup must not
		// send a publisher editing a node whose credential is fine.
		it('fails closed when the user cannot be resolved, without calling the credential deleted', async () => {
			userRepository.findOne.mockResolvedValueOnce(null);
			credentialsFinderService.findUnusableCredentialsForUser.mockResolvedValueOnce([
				{ id: credentialId, name: 'Test Credential', exists: true, ownerProject: null },
			]);

			await expect(
				permissionChecker.findInaccessibleForUser(userId, [node], workflowId),
			).resolves.toEqual([{ id: credentialId, name: 'Test Credential', exists: true }]);
		});

		describe('in a team project', () => {
			const teamProject = mock<Project>({ id: 'marketing', name: 'Marketing', type: 'team' });

			beforeEach(() => {
				ownershipService.getWorkflowProjectCached.mockReset();
				ownershipService.getWorkflowProjectCached.mockResolvedValue(teamProject);
				projectService.findTeamProjectsWorkflowIsIn.mockResolvedValue([teamProject.id]);
			});

			it('does not ask about a credential another team project of the workflow carries', async () => {
				// The workflow is also shared with Sales, which holds the credential: a run
				// accepts it through the project route, so the editor must too.
				projectService.findTeamProjectsWorkflowIsIn.mockResolvedValue([teamProject.id, 'sales']);
				sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValue([
					credentialId,
				]);

				await expect(
					permissionChecker.findInaccessibleForUser(userId, [node], workflowId),
				).resolves.toEqual([]);
				expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).toHaveBeenCalledWith(
					[teamProject.id, 'sales'],
					[credentialId],
				);
				expect(credentialsFinderService.findUnusableCredentialsForUser).not.toHaveBeenCalled();
			});

			it('does not ask about a credential the project carries', async () => {
				sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValue([
					credentialId,
				]);

				await expect(
					permissionChecker.findInaccessibleForUser(userId, [node], workflowId),
				).resolves.toEqual([]);
				expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).toHaveBeenCalledWith(
					[teamProject.id],
					[credentialId],
				);
				expect(credentialsFinderService.findUnusableCredentialsForUser).not.toHaveBeenCalled();
			});

			it('asks about the rest without an instance-wide grant', async () => {
				const owner = mock<User>({ id: userId, role: GLOBAL_OWNER_ROLE });
				userRepository.findOne.mockResolvedValueOnce(owner);
				credentialsFinderService.findUnusableCredentialsForUser.mockResolvedValueOnce([
					{ id: credentialId, name: 'Alice Gmail', exists: true, ownerProject: null },
				]);

				await expect(
					permissionChecker.findInaccessibleForUser(userId, [node], workflowId),
				).resolves.toEqual([{ id: credentialId, name: 'Alice Gmail', exists: true }]);
				expect(credentialsFinderService.findUnusableCredentialsForUser).toHaveBeenCalledWith(
					owner,
					[credentialId],
					{ ignoreGlobalUseScope: true },
				);
			});
		});

		it("does not treat a personal project as carrying its owner's credentials", async () => {
			userRepository.findOne.mockResolvedValueOnce(
				mock<User>({ id: userId, role: GLOBAL_MEMBER_ROLE }),
			);
			credentialsFinderService.findUnusableCredentialsForUser.mockResolvedValueOnce([
				{ id: credentialId, name: 'Test Credential', exists: true, ownerProject: null },
			]);

			await expect(
				permissionChecker.findInaccessibleForUser(userId, [node], workflowId),
			).resolves.toEqual([{ id: credentialId, name: 'Test Credential', exists: true }]);
			expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).not.toHaveBeenCalled();
		});

		it('does not look up team projects for a workflow in a personal project', async () => {
			userRepository.findOne.mockResolvedValueOnce(
				mock<User>({ id: userId, role: GLOBAL_MEMBER_ROLE }),
			);
			credentialsFinderService.findUnusableCredentialsForUser.mockResolvedValueOnce([]);

			await permissionChecker.findInaccessibleForUser(userId, [node], workflowId);

			expect(projectService.findTeamProjectsWorkflowIsIn).not.toHaveBeenCalled();
		});

		it('does not ask about a global credential', async () => {
			credentialsRepository.findGlobalProjectCredentialIds.mockResolvedValue([credentialId]);

			await expect(
				permissionChecker.findInaccessibleForUser(userId, [node], workflowId),
			).resolves.toEqual([]);
			expect(credentialsFinderService.findUnusableCredentialsForUser).not.toHaveBeenCalled();
		});
	});

	describe('a global role needs `credential:use`, not just list/read', () => {
		// The skip is what lets an Owner run anything. A see-only instance role holds
		// list and read but not use, so it must not short-circuit the project route.
		// The acting-user side of this now lives in `CredentialsFinderService`.
		const viewOnlyRole = {
			slug: 'global:cred-viewer',
			displayName: 'Credential viewer',
			description: null,
			systemRole: false,
			roleType: 'global',
			scopes: ['credential:list', 'credential:read'].map((scope) => ({
				slug: scope,
				displayName: scope,
				description: null,
			})),
		} as Role;

		it('findInaccessible does not skip for a view-only home project owner', async () => {
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValueOnce(
				mock<User>({ role: viewOnlyRole }),
			);
			sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValueOnce([]);
			credentialsRepository.findGlobalProjectCredentialIds.mockResolvedValueOnce([]);

			const result = await permissionChecker.findInaccessible(workflowId, [credentialId]);

			expect(result.inaccessibleIds).toEqual([credentialId]);
			expect(sharedCredentialsRepository.getFilteredAccessibleCredentials).toHaveBeenCalledWith(
				[personalProject.id],
				[credentialId],
			);
		});

		it('check throws for a view-only home project owner whose credential is not shared', async () => {
			ownershipService.getPersonalProjectOwnerCached.mockResolvedValue(
				mock<User>({ role: viewOnlyRole }),
			);
			sharedCredentialsRepository.getFilteredAccessibleCredentials.mockResolvedValueOnce([]);
			credentialsRepository.findGlobalProjectCredentialIds.mockResolvedValueOnce([]);

			await expect(permissionChecker.check(workflowId, [node])).rejects.toThrow(
				'Node "Test Node" does not have access to the credential',
			);
		});
	});

	// The per-credential rule itself lives in `CredentialsFinderService` and is
	// tested there. These two only own the layering: instance-scoped ids that
	// nobody may use, and a user id that cannot be resolved.
	describe('resolveInaccessibleCredentialIdsForUser', () => {
		const user = mock<User>({ role: GLOBAL_OWNER_ROLE });

		it('returns what the shared check reports, and forwards the options', async () => {
			credentialsFinderService.findUnusableCredentialsForUser.mockResolvedValueOnce([
				{ id: credentialId, name: 'Team Gmail', exists: true, ownerProject: null },
			]);

			await expect(
				permissionChecker.resolveInaccessibleCredentialIdsForUser(user, [credentialId], {
					ignoreGlobalUseScope: true,
				}),
			).resolves.toEqual([credentialId]);
			expect(credentialsFinderService.findUnusableCredentialsForUser).toHaveBeenCalledWith(
				user,
				[credentialId],
				{ ignoreGlobalUseScope: true },
			);
		});

		it('reports an instance-scoped credential without asking about it', async () => {
			credentialsRepository.findNonProjectCredentialsByIds.mockResolvedValueOnce([
				mock<CredentialsEntity>({ id: credentialId }),
			]);
			credentialsFinderService.describeCredentials.mockResolvedValueOnce([
				{ id: credentialId, name: 'Provider connection', exists: true, ownerProject: null },
			]);

			await expect(
				permissionChecker.resolveInaccessibleCredentialIdsForUser(user, [credentialId]),
			).resolves.toEqual([credentialId]);
			expect(credentialsFinderService.findUnusableCredentialsForUser).not.toHaveBeenCalled();
		});
	});

	describe('resolveInaccessibleCredentialIdsForUserId', () => {
		const userId = 'user-123';

		it('fails closed when the user cannot be found', async () => {
			userRepository.findOne.mockResolvedValueOnce(null);
			credentialsFinderService.findUnusableCredentialsForUser.mockResolvedValueOnce([
				{ id: credentialId, name: 'Test Credential', exists: true, ownerProject: null },
			]);

			await expect(
				permissionChecker.resolveInaccessibleCredentialIdsForUserId(userId, [credentialId]),
			).resolves.toEqual([credentialId]);
		});

		it('loads the user with the role relation and delegates to the core check', async () => {
			const actingUser = mock<User>({ id: userId, role: GLOBAL_OWNER_ROLE });
			userRepository.findOne.mockResolvedValueOnce(actingUser);
			credentialsFinderService.findUnusableCredentialsForUser.mockResolvedValueOnce([]);

			await expect(
				permissionChecker.resolveInaccessibleCredentialIdsForUserId(userId, [credentialId]),
			).resolves.toEqual([]);
			expect(userRepository.findOne).toHaveBeenCalledWith({
				where: { id: userId },
				relations: ['role'],
			});
			expect(credentialsFinderService.findUnusableCredentialsForUser).toHaveBeenCalledWith(
				actingUser,
				[credentialId],
				{},
			);
		});
	});
});
