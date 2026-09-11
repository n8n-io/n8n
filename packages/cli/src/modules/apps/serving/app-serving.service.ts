import { Service } from '@n8n/di';
import { stat } from 'node:fs/promises';
import path from 'node:path';

import { AppVersionRepository } from '../app-version.repository';
import { AppVersionService } from '../app-version.service';
import { AppRepository } from '../app.repository';
import { resolveDistPath } from './resolve-dist-path';

const isFile = async (filePath: string) =>
	await stat(filePath).then(
		(stats) => stats.isFile(),
		() => false,
	);

@Service()
export class AppServingService {
	constructor(
		private readonly appRepository: AppRepository,
		private readonly appVersionRepository: AppVersionRepository,
		private readonly appVersionService: AppVersionService,
	) {}

	/**
	 * A published App is a static site: a file of its active version's dist,
	 * or `index.html` for any other path so client-side routing works.
	 * Undefined when no App owns the namespace or the App has no active version.
	 */
	async resolve(namespace: string, segments: string[]): Promise<string | undefined> {
		const app = await this.appRepository.findByNamespace(namespace);
		if (!app?.activeVersionId) return undefined;

		const version = await this.appVersionRepository.findById(app.activeVersionId);
		if (!version) return undefined;

		const distDir = await this.appVersionService.distDir(version);
		const target = resolveDistPath(distDir, segments);
		return target && (await isFile(target)) ? target : path.join(distDir, 'index.html');
	}
}
