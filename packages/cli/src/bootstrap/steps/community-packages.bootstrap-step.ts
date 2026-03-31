import { readFileSync } from 'fs';

import { Logger } from '@n8n/backend-common';
import { BootstrapConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { z } from 'zod';

import { CommunityPackagesService } from '@/modules/community-packages/community-packages.service';

const CommunityPackageEntrySchema = z.object({
	name: z.string().min(1),
	version: z.string().optional(),
});

const CommunityPackagesFileSchema = z.array(CommunityPackageEntrySchema).min(1);

@Service()
export class CommunityPackagesBootstrapStep {
	constructor(
		private readonly config: BootstrapConfig,
		private readonly communityPackagesService: CommunityPackagesService,
		private logger: Logger,
	) {
		this.logger = this.logger.scoped('bootstrap');
	}

	async run(): Promise<'created' | 'skipped'> {
		if (!this.config.communityPackagesFile) return 'skipped';

		let raw: string;
		try {
			raw = readFileSync(this.config.communityPackagesFile, 'utf8');
		} catch (error) {
			this.logger.warn('Bootstrap: failed to read community packages config file', { error });
			return 'skipped';
		}

		let parsed: unknown;
		try {
			parsed = JSON.parse(raw);
		} catch (error) {
			this.logger.warn('Bootstrap: community packages config file is not valid JSON', {
				error,
			});
			return 'skipped';
		}

		const result = CommunityPackagesFileSchema.safeParse(parsed);
		if (!result.success) {
			this.logger.warn('Bootstrap: community packages config file has invalid shape', {
				error: result.error,
			});
			return 'skipped';
		}

		// Ensure the npm download directory exists before installing.
		// Bootstrap runs before moduleRegistry.initModules(), so
		// CommunityPackagesService.init() has not been called yet.
		await this.communityPackagesService.ensurePackageJson();

		let anyInstalled = false;
		for (const pkg of result.data) {
			const alreadyInstalled = await this.communityPackagesService.isPackageInstalled(pkg.name);
			if (alreadyInstalled) {
				this.logger.debug(`Bootstrap: community package "${pkg.name}" already installed, skipping`);
				continue;
			}

			try {
				this.communityPackagesService.parseNpmPackageName(pkg.name);
				await this.communityPackagesService.installPackage(pkg.name, pkg.version);
				this.logger.info(`Bootstrap: installed community package "${pkg.name}"`, {
					version: pkg.version ?? 'latest',
				});
				anyInstalled = true;
			} catch (error) {
				this.logger.warn(`Bootstrap: failed to install community package "${pkg.name}"`, {
					error,
				});
			}
		}

		return anyInstalled ? 'created' : 'skipped';
	}
}
