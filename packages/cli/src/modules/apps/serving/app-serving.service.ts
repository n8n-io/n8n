import { Service } from '@n8n/di';
import { stat } from 'node:fs/promises';
import path from 'node:path';

import type { AppVersion } from '../app-version.entity';
import { AppVersionRepository } from '../app-version.repository';
import { AppVersionService } from '../app-version.service';
import type { App } from '../app.entity';
import { AppRepository } from '../app.repository';
import { resolveDistPath } from './resolve-dist-path';

const isFile = async (filePath: string) =>
	await stat(filePath).then(
		(stats) => stats.isFile(),
		() => false,
	);

/** A file of a version's dist. `version` is not the served one for a build a builder previews. */
export type ResolvedAppFile = { filePath: string; app: App; version: AppVersion };

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
	 * `versionId` picks another built version as the document instead, for the
	 * builder's preview of an unpublished build. Undefined when no App owns the
	 * namespace or nothing can serve the path.
	 */
	async resolve(
		namespace: string,
		segments: string[],
		versionId?: string,
	): Promise<ResolvedAppFile | undefined> {
		const app = await this.appRepository.findByNamespace(namespace);
		if (!app) return undefined;

		// A stale `?v` (pruned dist, another app's id) falls back to the served version.
		const entry =
			(versionId ? await this.builtVersion(app, versionId) : undefined) ??
			(await this.activeVersion(app));
		if (entry) {
			const found = await this.fileOf(entry, segments);
			if (found) return { filePath: found, app, version: entry };
		}

		// A document of one build links its assets without `?v`, so they arrive
		// here against the active version and must be found in the build they
		// belong to. Vite hashes asset names, so a name lives in one build;
		// an unhashed one (from `public/`) resolves to the active build first,
		// then the newest. Only paths that name a file are looked up this way:
		// a client-side route falls through to the entry document.
		if (segments.length > 0 && path.posix.extname(segments.at(-1) ?? '') !== '') {
			for (const version of await this.otherBuilds(app, entry)) {
				const found = await this.fileOf(version, segments);
				if (found) return { filePath: found, app, version };
			}
		}

		if (!entry) return undefined;
		const distDir = await this.appVersionService.distDir(entry);
		return { filePath: path.join(distDir, 'index.html'), app, version: entry };
	}

	private async fileOf(version: AppVersion, segments: string[]): Promise<string | undefined> {
		if (segments.length === 0) return undefined;
		const distDir = await this.appVersionService.distDir(version);
		const target = resolveDistPath(distDir, segments);
		return target && (await isFile(target)) ? target : undefined;
	}

	private async activeVersion(app: App): Promise<AppVersion | undefined> {
		if (!app.activeVersionId) return undefined;
		return (await this.appVersionRepository.findById(app.activeVersionId)) ?? undefined;
	}

	private async builtVersion(app: App, versionId: string): Promise<AppVersion | undefined> {
		const version = await this.appVersionRepository.findById(versionId);
		return version?.appId === app.id && version.distStorageKey ? version : undefined;
	}

	/** Built versions other than `entry`: the active one first, then newest first. */
	private async otherBuilds(app: App, entry: AppVersion | undefined): Promise<AppVersion[]> {
		const built = await this.appVersionRepository.listBuiltByAppId(app.id);
		return built
			.filter((version) => version.id !== entry?.id)
			.sort((a, b) => Number(b.id === app.activeVersionId) - Number(a.id === app.activeVersionId));
	}
}
