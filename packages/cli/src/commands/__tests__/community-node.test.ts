import type { CredentialsEntity, User } from '@n8n/db';
import { mock } from 'vitest-mock-extended';

import { CommunityNode } from '@/modules/community-packages/community-node.command';
import type { InstalledNodes } from '@/modules/community-packages/installed-nodes.entity';

describe('uninstallCredential', () => {
	const userId = '1234';

	const communityNode = new CommunityNode();

	beforeEach(() => {
		communityNode.deleteCredential = vi.fn();
		communityNode.findCredentialsByType = vi.fn();
		communityNode.findUserById = vi.fn();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('should delete a credential', async () => {
		const credentialType = 'evolutionApi';

		const credential = mock<CredentialsEntity>();
		credential.id = '666';

		const user = mock<User>();
		const credentials = [credential];

		// @ts-expect-error Protected property
		communityNode.flags = { credential: credentialType, uninstall: true, userId };
		communityNode.findCredentialsByType = vi.fn().mockReturnValue(credentials);
		communityNode.findUserById = vi.fn().mockReturnValue(user);

		const deleteCredential = vi.spyOn(communityNode, 'deleteCredential');
		const findCredentialsByType = vi.spyOn(communityNode, 'findCredentialsByType');
		const findUserById = vi.spyOn(communityNode, 'findUserById');

		await communityNode.run();

		expect(findCredentialsByType).toHaveBeenCalledTimes(1);
		expect(findCredentialsByType).toHaveBeenCalledWith(credentialType);

		expect(findUserById).toHaveBeenCalledTimes(1);
		expect(findUserById).toHaveBeenCalledWith(userId);

		expect(deleteCredential).toHaveBeenCalledTimes(1);
		expect(deleteCredential).toHaveBeenCalledWith(user, credential.id);
	});

	it('should return if the user is not found', async () => {
		const credentialType = 'evolutionApi';

		const credential = mock<CredentialsEntity>();
		credential.id = '666';

		// @ts-expect-error Protected property
		communityNode.flags = { credential: credentialType, uninstall: true, userId };
		communityNode.findUserById = vi.fn().mockReturnValue(null);

		const deleteCredential = vi.spyOn(communityNode, 'deleteCredential');
		const findCredentialsByType = vi.spyOn(communityNode, 'findCredentialsByType');
		const findUserById = vi.spyOn(communityNode, 'findUserById');

		await communityNode.run();

		expect(findUserById).toHaveBeenCalledTimes(1);
		expect(findUserById).toHaveBeenCalledWith(userId);

		expect(findCredentialsByType).toHaveBeenCalledTimes(0);
		expect(deleteCredential).toHaveBeenCalledTimes(0);
	});

	it('should return if the credential is not found', async () => {
		const credentialType = 'evolutionApi';

		const credential = mock<CredentialsEntity>();
		credential.id = '666';

		// @ts-expect-error Protected property
		communityNode.flags = { credential: credentialType, uninstall: true, userId };
		communityNode.findUserById = vi.fn().mockReturnValue(mock<User>());
		communityNode.findCredentialsByType = vi.fn().mockReturnValue(null);

		const deleteCredential = vi.spyOn(communityNode, 'deleteCredential');
		const findCredentialsByType = vi.spyOn(communityNode, 'findCredentialsByType');
		const findUserById = vi.spyOn(communityNode, 'findUserById');

		await communityNode.run();

		expect(findUserById).toHaveBeenCalledTimes(1);
		expect(findUserById).toHaveBeenCalledWith(userId);

		expect(findCredentialsByType).toHaveBeenCalledTimes(1);
		expect(findCredentialsByType).toHaveBeenCalledWith(credentialType);

		expect(deleteCredential).toHaveBeenCalledTimes(0);
	});

	it('should delete multiple credentials', async () => {
		const credentialType = 'evolutionApi';

		const credential1 = mock<CredentialsEntity>();
		credential1.id = '666';

		const credential2 = mock<CredentialsEntity>();
		credential2.id = '777';

		const user = mock<User>();
		const credentials = [credential1, credential2];

		// @ts-expect-error Protected property
		communityNode.flags = { credential: credentialType, uninstall: true, userId };
		communityNode.findCredentialsByType = vi.fn().mockReturnValue(credentials);
		communityNode.findUserById = vi.fn().mockReturnValue(user);

		const deleteCredential = vi.spyOn(communityNode, 'deleteCredential');
		const findCredentialsByType = vi.spyOn(communityNode, 'findCredentialsByType');
		const findUserById = vi.spyOn(communityNode, 'findUserById');

		await communityNode.run();

		expect(findCredentialsByType).toHaveBeenCalledTimes(1);
		expect(findCredentialsByType).toHaveBeenCalledWith(credentialType);

		expect(findUserById).toHaveBeenCalledTimes(1);
		expect(findUserById).toHaveBeenCalledWith(userId);

		expect(deleteCredential).toHaveBeenCalledTimes(2);
		expect(deleteCredential).toHaveBeenCalledWith(user, credential1.id);
		expect(deleteCredential).toHaveBeenCalledWith(user, credential2.id);
	});
});

describe('uninstallPackage', () => {
	const communityNode = new CommunityNode();

	beforeEach(() => {
		communityNode.removeCommunityPackage = vi.fn();
		communityNode.deleteCommunityNode = vi.fn();
		communityNode.pruneDependencies = vi.fn();
		communityNode.findCommunityPackage = vi.fn();
	});

	afterEach(() => {
		vi.resetAllMocks();
	});

	it('should uninstall the package', async () => {
		const installedNode = mock<InstalledNodes>();
		const communityPackage = {
			installedNodes: [installedNode],
		};

		// @ts-expect-error Protected property
		communityNode.flags = { package: 'n8n-nodes-evolution-api', uninstall: true };
		communityNode.findCommunityPackage = vi.fn().mockReturnValue(communityPackage);

		const deleteCommunityNode = vi.spyOn(communityNode, 'deleteCommunityNode');
		const removeCommunityPackageSpy = vi.spyOn(communityNode, 'removeCommunityPackage');
		const findCommunityPackage = vi.spyOn(communityNode, 'findCommunityPackage');

		await communityNode.run();

		expect(findCommunityPackage).toHaveBeenCalledTimes(1);
		expect(findCommunityPackage).toHaveBeenCalledWith('n8n-nodes-evolution-api');

		expect(deleteCommunityNode).toHaveBeenCalledTimes(1);
		expect(deleteCommunityNode).toHaveBeenCalledWith(installedNode);

		expect(removeCommunityPackageSpy).toHaveBeenCalledTimes(1);
		expect(removeCommunityPackageSpy).toHaveBeenCalledWith(
			'n8n-nodes-evolution-api',
			communityPackage,
		);
	});

	it('should uninstall all nodes from a package', async () => {
		const installedNode0 = mock<InstalledNodes>();
		const installedNode1 = mock<InstalledNodes>();

		const communityPackage = {
			installedNodes: [installedNode0, installedNode1],
		};

		// @ts-expect-error Protected property
		communityNode.flags = { package: 'n8n-nodes-evolution-api', uninstall: true };
		communityNode.findCommunityPackage = vi.fn().mockReturnValue(communityPackage);

		const deleteCommunityNode = vi.spyOn(communityNode, 'deleteCommunityNode');
		const removeCommunityPackageSpy = vi.spyOn(communityNode, 'removeCommunityPackage');
		const findCommunityPackage = vi.spyOn(communityNode, 'findCommunityPackage');

		await communityNode.run();

		expect(findCommunityPackage).toHaveBeenCalledTimes(1);
		expect(findCommunityPackage).toHaveBeenCalledWith('n8n-nodes-evolution-api');

		expect(deleteCommunityNode).toHaveBeenCalledTimes(2);
		expect(deleteCommunityNode).toHaveBeenCalledWith(installedNode0);
		expect(deleteCommunityNode).toHaveBeenCalledWith(installedNode1);

		expect(removeCommunityPackageSpy).toHaveBeenCalledTimes(1);
		expect(removeCommunityPackageSpy).toHaveBeenCalledWith(
			'n8n-nodes-evolution-api',
			communityPackage,
		);
	});

	it('should return if a package is not found', async () => {
		// @ts-expect-error Protected property
		communityNode.flags = { package: 'n8n-nodes-evolution-api', uninstall: true };
		communityNode.findCommunityPackage = vi.fn().mockReturnValue(null);

		const deleteCommunityNode = vi.spyOn(communityNode, 'deleteCommunityNode');
		const removeCommunityPackageSpy = vi.spyOn(communityNode, 'removeCommunityPackage');
		const findCommunityPackage = vi.spyOn(communityNode, 'findCommunityPackage');

		await communityNode.run();

		expect(findCommunityPackage).toHaveBeenCalledTimes(1);
		expect(findCommunityPackage).toHaveBeenCalledWith('n8n-nodes-evolution-api');

		expect(deleteCommunityNode).toHaveBeenCalledTimes(0);

		expect(removeCommunityPackageSpy).toHaveBeenCalledTimes(0);
	});

	it('should return if nodes are not found', async () => {
		const communityPackage = {
			installedNodes: [],
		};

		// @ts-expect-error Protected property
		communityNode.flags = { package: 'n8n-nodes-evolution-api', uninstall: true };
		communityNode.findCommunityPackage = vi.fn().mockReturnValue(communityPackage);

		const deleteCommunityNode = vi.spyOn(communityNode, 'deleteCommunityNode');
		const removeCommunityPackageSpy = vi.spyOn(communityNode, 'removeCommunityPackage');
		const findCommunityPackage = vi.spyOn(communityNode, 'findCommunityPackage');

		await communityNode.run();

		expect(findCommunityPackage).toHaveBeenCalledTimes(1);
		expect(findCommunityPackage).toHaveBeenCalledWith('n8n-nodes-evolution-api');

		expect(deleteCommunityNode).toHaveBeenCalledTimes(0);

		expect(removeCommunityPackageSpy).toHaveBeenCalledTimes(1);
		expect(removeCommunityPackageSpy).toHaveBeenCalledWith(
			'n8n-nodes-evolution-api',
			communityPackage,
		);
	});
});
