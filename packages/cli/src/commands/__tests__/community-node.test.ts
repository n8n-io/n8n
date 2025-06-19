import { type InstalledNodes } from '@n8n/db';
import { type CredentialsEntity } from '@n8n/db';
import { type User } from '@n8n/db';
import { type Config } from '@oclif/core';
import { mock } from 'jest-mock-extended';

import { CommunityNode } from '../community-node';

describe('uninstallCredential', () => {
	const userId = '1234';

	const config: Config = mock<Config>();
	const communityNode = new CommunityNode(['--uninstall', '--credential', 'evolutionApi'], config);

	beforeEach(() => {
		communityNode.deleteCredential = jest.fn();
		communityNode.findCredentialsByType = jest.fn();
		communityNode.findUserById = jest.fn();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('should delete a credential', async () => {
		const credentialType = 'evolutionApi';

		const credential = mock<CredentialsEntity>();
		credential.id = '666';

		const user = mock<User>();
		const credentials = [credential];

		communityNode.parseFlags = jest.fn().mockReturnValue({
			flags: { credential: credentialType, uninstall: true, userId },
		});
		communityNode.findCredentialsByType = jest.fn().mockReturnValue(credentials);
		communityNode.findUserById = jest.fn().mockReturnValue(user);

		const deleteCredential = jest.spyOn(communityNode, 'deleteCredential');
		const findCredentialsByType = jest.spyOn(communityNode, 'findCredentialsByType');
		const findUserById = jest.spyOn(communityNode, 'findUserById');

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

		communityNode.parseFlags = jest.fn().mockReturnValue({
			flags: { credential: credentialType, uninstall: true, userId },
		});
		communityNode.findUserById = jest.fn().mockReturnValue(null);

		const deleteCredential = jest.spyOn(communityNode, 'deleteCredential');
		const findCredentialsByType = jest.spyOn(communityNode, 'findCredentialsByType');
		const findUserById = jest.spyOn(communityNode, 'findUserById');

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

		communityNode.parseFlags = jest.fn().mockReturnValue({
			flags: { credential: credentialType, uninstall: true, userId },
		});
		communityNode.findUserById = jest.fn().mockReturnValue(mock<User>());
		communityNode.findCredentialsByType = jest.fn().mockReturnValue(null);

		const deleteCredential = jest.spyOn(communityNode, 'deleteCredential');
		const findCredentialsByType = jest.spyOn(communityNode, 'findCredentialsByType');
		const findUserById = jest.spyOn(communityNode, 'findUserById');

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

		communityNode.parseFlags = jest.fn().mockReturnValue({
			flags: { credential: credentialType, uninstall: true, userId },
		});
		communityNode.findCredentialsByType = jest.fn().mockReturnValue(credentials);
		communityNode.findUserById = jest.fn().mockReturnValue(user);

		const deleteCredential = jest.spyOn(communityNode, 'deleteCredential');
		const findCredentialsByType = jest.spyOn(communityNode, 'findCredentialsByType');
		const findUserById = jest.spyOn(communityNode, 'findUserById');

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
	const config: Config = mock<Config>();
	const communityNode = new CommunityNode(
		['--uninstall', '--package', 'n8n-nodes-evolution-api.evolutionApi'],
		config,
	);

	beforeEach(() => {
		communityNode.removeCommunityPackage = jest.fn();
		communityNode.deleteCommunityNode = jest.fn();
		communityNode.pruneDependencies = jest.fn();
		communityNode.findCommunityPackage = jest.fn();
	});

	afterEach(() => {
		jest.resetAllMocks();
	});

	it('should uninstall the package', async () => {
		const installedNode = mock<InstalledNodes>();
		const communityPackage = {
			installedNodes: [installedNode],
		};

		communityNode.parseFlags = jest.fn().mockReturnValue({
			flags: { package: 'n8n-nodes-evolution-api', uninstall: true },
		});
		communityNode.findCommunityPackage = jest.fn().mockReturnValue(communityPackage);

		const deleteCommunityNode = jest.spyOn(communityNode, 'deleteCommunityNode');
		const removeCommunityPackageSpy = jest.spyOn(communityNode, 'removeCommunityPackage');
		const findCommunityPackage = jest.spyOn(communityNode, 'findCommunityPackage');

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

		communityNode.parseFlags = jest.fn().mockReturnValue({
			flags: { package: 'n8n-nodes-evolution-api', uninstall: true },
		});
		communityNode.findCommunityPackage = jest.fn().mockReturnValue(communityPackage);

		const deleteCommunityNode = jest.spyOn(communityNode, 'deleteCommunityNode');
		const removeCommunityPackageSpy = jest.spyOn(communityNode, 'removeCommunityPackage');
		const findCommunityPackage = jest.spyOn(communityNode, 'findCommunityPackage');

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
		communityNode.parseFlags = jest.fn().mockReturnValue({
			flags: { package: 'n8n-nodes-evolution-api', uninstall: true },
		});
		communityNode.findCommunityPackage = jest.fn().mockReturnValue(null);

		const deleteCommunityNode = jest.spyOn(communityNode, 'deleteCommunityNode');
		const removeCommunityPackageSpy = jest.spyOn(communityNode, 'removeCommunityPackage');
		const findCommunityPackage = jest.spyOn(communityNode, 'findCommunityPackage');

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

		communityNode.parseFlags = jest.fn().mockReturnValue({
			flags: { package: 'n8n-nodes-evolution-api', uninstall: true },
		});
		communityNode.findCommunityPackage = jest.fn().mockReturnValue(communityPackage);

		const deleteCommunityNode = jest.spyOn(communityNode, 'deleteCommunityNode');
		const removeCommunityPackageSpy = jest.spyOn(communityNode, 'removeCommunityPackage');
		const findCommunityPackage = jest.spyOn(communityNode, 'findCommunityPackage');

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
