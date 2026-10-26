import { Service } from '@n8n/di';
import { LRUCache } from 'lru-cache';
import { createHash } from 'node:crypto';
import { contentType, lookup } from 'mime-types';

import { AppsConfig } from '../apps.config';
import { AppBuildResultStore } from '../storage/app-version-stores';

export type AppBundleFile = { body: Buffer; contentType: string; etag: string };
type Bundle = Map<string, AppBundleFile>;

@Service()
export class AppBundleCache {
	private readonly cache: LRUCache<string, Bundle>;
	private readonly loading = new Map<string, Promise<Bundle>>();

	constructor(
		private readonly store: AppBuildResultStore,
		config: AppsConfig,
	) {
		this.cache = new LRUCache({
			maxSize: config.bundleCacheMaxBytes,
			sizeCalculation: (bundle) =>
				Math.max(
					1,
					[...bundle.values()].reduce((sum, file) => sum + file.body.length, 0),
				),
		});
	}

	async get(versionId: string): Promise<Bundle> {
		const cached = this.cache.get(versionId);
		if (cached) return cached;
		const pending = this.loading.get(versionId);
		if (pending) return await pending;
		const load = this.load(versionId);
		this.loading.set(versionId, load);
		try {
			return await load;
		} finally {
			this.loading.delete(versionId);
		}
	}

	private async load(versionId: string): Promise<Bundle> {
		const files = await this.store.readBundle(versionId);
		const bundle: Bundle = new Map();
		for (const [name, body] of files) {
			const mimeType = lookup(name) || 'application/octet-stream';
			bundle.set(name, {
				body,
				contentType: contentType(mimeType) || mimeType,
				etag: `W/"${createHash('sha256').update(body).digest('hex')}"`,
			});
		}
		this.cache.set(versionId, bundle);
		return bundle;
	}
}
