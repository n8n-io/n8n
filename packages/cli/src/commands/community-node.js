'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.CommunityNode = void 0;
const db_1 = require('@n8n/db');
const decorators_1 = require('@n8n/decorators');
const di_1 = require('@n8n/di');
const zod_1 = require('zod');
const credentials_service_1 = require('@/credentials/credentials.service');
const community_packages_service_1 = require('@/community-packages/community-packages.service');
const base_command_1 = require('./base-command');
const flagsSchema = zod_1.z.object({
	uninstall: zod_1.z.boolean().describe('Uninstalls the node').optional(),
	package: zod_1.z.string().describe('Package name of the community node.').optional(),
	credential: zod_1.z
		.string()
		.describe(
			"Type of the credential.\nGet this value by visiting the node's .credential.ts file and getting the value of `name`",
		)
		.optional(),
	userId: zod_1.z
		.string()
		.describe(
			'The ID of the user who owns the credential.\nOn self-hosted, query the database.\nOn cloud, query the API with your API key',
		)
		.optional(),
});
let CommunityNode = class CommunityNode extends base_command_1.BaseCommand {
	async run() {
		const { flags } = this;
		const packageName = flags.package;
		const credentialType = flags.credential;
		const userId = flags.userId;
		if (!flags) {
			this.logger.info('Please set flags. See help for more information.');
			return;
		}
		if (!flags.uninstall) {
			this.logger.info('"--uninstall" has to be set!');
			return;
		}
		if (!packageName && !credentialType) {
			this.logger.info('"--package" or "--credential" has to be set!');
			return;
		}
		if (packageName) {
			await this.uninstallPackage(packageName);
			return;
		}
		if (credentialType && userId) {
			await this.uninstallCredential(credentialType, userId);
		} else {
			this.logger.info('"--userId" has to be set!');
		}
	}
	async catch(error) {
		this.logger.error('Error in node command:');
		this.logger.error(error.message);
	}
	async uninstallCredential(credentialType, userId) {
		const user = await this.findUserById(userId);
		if (user === null) {
			this.logger.info(`User ${userId} not found`);
			return;
		}
		const credentials = await this.findCredentialsByType(credentialType);
		if (credentials === null) {
			this.logger.info(`Credentials with type ${credentialType} not found`);
			return;
		}
		credentials.forEach(async (credential) => {
			await this.deleteCredential(user, credential.id);
		});
		this.logger.info(`All credentials with type ${credentialType} successfully uninstalled`);
	}
	async findUserById(userId) {
		return await di_1.Container.get(db_1.UserRepository).findOneBy({ id: userId });
	}
	async findCredentialsByType(credentialType) {
		return await di_1.Container.get(db_1.CredentialsRepository).findBy({ type: credentialType });
	}
	async deleteCredential(user, credentialId) {
		return await di_1.Container.get(credentials_service_1.CredentialsService).delete(
			user,
			credentialId,
		);
	}
	async uninstallPackage(packageName) {
		const communityPackage = await this.findCommunityPackage(packageName);
		if (communityPackage === null) {
			this.logger.info(`Package ${packageName} not found`);
			return;
		}
		await this.removeCommunityPackage(packageName, communityPackage);
		const installedNodes = communityPackage?.installedNodes;
		if (!installedNodes) {
			this.logger.info(`Nodes in ${packageName} not found`);
			return;
		}
		for (const node of installedNodes) {
			await this.deleteCommunityNode(node);
		}
		await this.pruneDependencies();
	}
	async pruneDependencies() {
		await di_1.Container.get(
			community_packages_service_1.CommunityPackagesService,
		).executeNpmCommand('npm prune');
	}
	async deleteCommunityNode(node) {
		return await di_1.Container.get(db_1.InstalledNodesRepository).delete({
			type: node.type,
		});
	}
	async removeCommunityPackage(packageName, communityPackage) {
		return await di_1.Container.get(
			community_packages_service_1.CommunityPackagesService,
		).removePackage(packageName, communityPackage);
	}
	async findCommunityPackage(packageName) {
		return await di_1.Container.get(
			community_packages_service_1.CommunityPackagesService,
		).findInstalledPackage(packageName);
	}
};
exports.CommunityNode = CommunityNode;
exports.CommunityNode = CommunityNode = __decorate(
	[
		(0, decorators_1.Command)({
			name: 'community-node',
			description: 'Uninstall a community node and its credentials',
			examples: [
				'--uninstall --package n8n-nodes-evolution-api',
				'--uninstall --credential evolutionApi --userId 1234',
			],
			flagsSchema,
		}),
	],
	CommunityNode,
);
//# sourceMappingURL=community-node.js.map
