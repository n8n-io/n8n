import { type INodeTypes, Workflow } from 'n8n-workflow';
import { mock } from 'jest-mock-extended';
import type { User } from '@db/entities/User';
import type { UserRepository } from '@db/repositories/user.repository';
import type { SharedCredentialsRepository } from '@db/repositories/sharedCredentials.repository';
import type { SharedWorkflowRepository } from '@db/repositories/sharedWorkflow.repository';
import type { License } from '@/License';
import { PermissionChecker } from '@/UserManagement/PermissionChecker';

describe('PermissionChecker', () => {
	const user = mock<User>();
	const userRepo = mock<UserRepository>();
	const sharedCredentialsRepo = mock<SharedCredentialsRepository>();
	const sharedWorkflowRepo = mock<SharedWorkflowRepository>();
	const license = mock<License>();
	const permissionChecker = new PermissionChecker(
		userRepo,
		sharedCredentialsRepo,
		sharedWorkflowRepo,
		mock(),
		license,
	);

	const workflow = new Workflow({
		id: '1',
		name: 'test',
		active: false,
		connections: {},
		nodeTypes: mock<INodeTypes>(),
		nodes: [
			{
				id: 'node-id',
				name: 'HTTP Request',
				type: 'n8n-nodes-base.httpRequest',
				parameters: {},
				typeVersion: 1,
				position: [0, 0],
				credentials: {
					oAuth2Api: {
						id: 'cred-id',
						name: 'Custom oAuth2',
					},
				},
			},
		],
	});

	beforeEach(() => jest.clearAllMocks());

	describe('check', () => {
		it('should throw if no user is found', async () => {
			userRepo.findOneOrFail.mockRejectedValue(new Error('Fail'));
			await expect(permissionChecker.check(workflow, '123')).rejects.toThrow();
			expect(license.isSharingEnabled).not.toHaveBeenCalled();
			expect(sharedWorkflowRepo.getSharedUserIds).not.toBeCalled();
			expect(sharedCredentialsRepo.getOwnedCredentialIds).not.toHaveBeenCalled();
			expect(sharedCredentialsRepo.getAccessibleCredentialIds).not.toHaveBeenCalled();
		});

		it('should allow a user if they have a global `workflow:execute` scope', async () => {
			userRepo.findOneOrFail.mockResolvedValue(user);
			user.hasGlobalScope.calledWith('workflow:execute').mockReturnValue(true);
			await expect(permissionChecker.check(workflow, user.id)).resolves.not.toThrow();
			expect(license.isSharingEnabled).not.toHaveBeenCalled();
			expect(sharedWorkflowRepo.getSharedUserIds).not.toBeCalled();
			expect(sharedCredentialsRepo.getOwnedCredentialIds).not.toHaveBeenCalled();
			expect(sharedCredentialsRepo.getAccessibleCredentialIds).not.toHaveBeenCalled();
		});

		describe('When sharing is disabled', () => {
			beforeEach(() => {
				userRepo.findOneOrFail.mockResolvedValue(user);
				user.hasGlobalScope.calledWith('workflow:execute').mockReturnValue(false);
				license.isSharingEnabled.mockReturnValue(false);
			});

			it('should validate credential access using only owned credentials', async () => {
				sharedCredentialsRepo.getOwnedCredentialIds.mockResolvedValue(['cred-id']);

				await expect(permissionChecker.check(workflow, user.id)).resolves.not.toThrow();

				expect(sharedWorkflowRepo.getSharedUserIds).not.toBeCalled();
				expect(sharedCredentialsRepo.getOwnedCredentialIds).toBeCalledWith([user.id]);
				expect(sharedCredentialsRepo.getAccessibleCredentialIds).not.toHaveBeenCalled();
			});

			it('should throw when the user does not have access to the credential', async () => {
				sharedCredentialsRepo.getOwnedCredentialIds.mockResolvedValue(['cred-id2']);

				await expect(permissionChecker.check(workflow, user.id)).rejects.toThrow(
					'Node has no access to credential',
				);

				expect(sharedWorkflowRepo.getSharedUserIds).not.toBeCalled();
				expect(sharedCredentialsRepo.getOwnedCredentialIds).toBeCalledWith([user.id]);
				expect(sharedCredentialsRepo.getAccessibleCredentialIds).not.toHaveBeenCalled();
			});
		});

		describe('When sharing is enabled', () => {
			beforeEach(() => {
				userRepo.findOneOrFail.mockResolvedValue(user);
				user.hasGlobalScope.calledWith('workflow:execute').mockReturnValue(false);
				license.isSharingEnabled.mockReturnValue(true);
				sharedWorkflowRepo.getSharedUserIds.mockResolvedValue([user.id, 'another-user']);
			});

			it('should validate credential access using only owned credentials', async () => {
				sharedCredentialsRepo.getAccessibleCredentialIds.mockResolvedValue(['cred-id']);

				await expect(permissionChecker.check(workflow, user.id)).resolves.not.toThrow();

				expect(sharedWorkflowRepo.getSharedUserIds).toBeCalledWith(workflow.id);
				expect(sharedCredentialsRepo.getAccessibleCredentialIds).toBeCalledWith([
					user.id,
					'another-user',
				]);
				expect(sharedCredentialsRepo.getOwnedCredentialIds).not.toHaveBeenCalled();
			});

			it('should throw when the user does not have access to the credential', async () => {
				sharedCredentialsRepo.getAccessibleCredentialIds.mockResolvedValue(['cred-id2']);

				await expect(permissionChecker.check(workflow, user.id)).rejects.toThrow(
					'Node has no access to credential',
				);

				expect(sharedWorkflowRepo.find).not.toBeCalled();
				expect(sharedCredentialsRepo.getAccessibleCredentialIds).toBeCalledWith([
					user.id,
					'another-user',
				]);
				expect(sharedCredentialsRepo.getOwnedCredentialIds).not.toHaveBeenCalled();
			});
		});
	});
});
