import { type InstalledNodes, type InstalledPackages, type User } from '@n8n/db';
import { CredentialsRepository, InstalledNodesRepository, UserRepository } from '@n8n/db';
import { Command } from '@n8n/decorators';
import { Container } from '@n8n/di';
import { z } from 'zod';

import { CredentialsService } from '@/credentials/credentials.service';
import { CommunityPackagesService } from '@/services/community-packages.service';

import { BaseCommand } from './base-command';

const flagsSchema = z.object({
	uninstall: z.boolean().describe('Uninstalls the node').optional(),
	package: z.string().describe('Package name of the community node.').optional(),
	credential: z
		.string()
		.describe(
			"Type of the credential.\nGet this value by visiting the node's .credential.ts file and getting the value of `name`",
		)
		.optional(),
	userId: z
		.string()
		.describe(
			'The ID of the user who owns the credential.\nOn self-hosted, query the database.\nOn cloud, query the API with your API key',
		)
		.optional(),
});

@Command({
	name: 'community-node',
	description: 'Uninstall a community node and its credentials',
	examples: [
		'--uninstall --package n8n-nodes-evolution-api',
		'--uninstall --credential evolutionApi --userId 1234',
	],
	flagsSchema,
})
export class CommunityNode extends BaseCommand<z.infer<typeof flagsSchema>> {
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

	async catch(error: Error) {
		this.logger.error('Error in node command:');
		this.logger.error(error.message);
	}

	async uninstallCredential(credentialType: string, userId: string) {
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

	async findUserById(userId: string) {
		return await Container.get(UserRepository).findOneBy({ id: userId });
	}

	async findCredentialsByType(credentialType: string) {
		return await Container.get(CredentialsRepository).findBy({ type: credentialType });
	}

	async deleteCredential(user: User, credentialId: string) {
		return await Container.get(CredentialsService).delete(user, credentialId);
	}

	async uninstallPackage(packageName: string) {
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
		await Container.get(CommunityPackagesService).executeNpmCommand('npm prune');
	}

	async deleteCommunityNode(node: InstalledNodes) {
		return await Container.get(InstalledNodesRepository).delete({
			type: node.type,
		});
	}

	async removeCommunityPackage(packageName: string, communityPackage: InstalledPackages) {
		return await Container.get(CommunityPackagesService).removePackage(
			packageName,
			communityPackage,
		);
	}

	async findCommunityPackage(packageName: string) {
		return await Container.get(CommunityPackagesService).findInstalledPackage(packageName);
	}
}
