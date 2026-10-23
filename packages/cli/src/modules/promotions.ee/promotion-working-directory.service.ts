import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { jsonParse, UnexpectedError } from 'n8n-workflow';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { PromotionCacheDescriptor } from './promotions.types';

/** Environment IDs are generated UUIDs, so anything else is not ours. */
const SAFE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const DESCRIPTOR_FILE = 'cache.json';

/**
 * Owns the local checkout of one environment: where it lives, whether it still matches
 * the stored configuration, and how to remove it.
 *
 * Checkouts are disposable caches. Nothing here protects against a second process
 * working in the same directory; that is [LIGO-1129](https://linear.app/n8n/issue/LIGO-1129).
 */
@Service()
export class PromotionWorkingDirectoryService {
	constructor(private readonly instanceSettings: InstanceSettings) {}

	paths(environmentId: string) {
		if (!SAFE_ID.test(environmentId)) {
			throw new UnexpectedError('Promotion environment ID is not a generated ID');
		}
		const rootFolder = path.join(
			this.instanceSettings.n8nFolder,
			'promotions',
			'environments',
			environmentId,
		);
		return {
			rootFolder,
			repositoryFolder: path.join(rootFolder, 'repository'),
			nextRepositoryFolder: path.join(rootFolder, 'repository-next'),
			sshDir: path.join(rootFolder, '.ssh'),
			descriptorFile: path.join(rootFolder, DESCRIPTOR_FILE),
		};
	}

	/** Written only after a clone succeeds, so a half-cloned checkout never matches. */
	async writeDescriptor(descriptor: PromotionCacheDescriptor): Promise<void> {
		const { rootFolder, descriptorFile } = this.paths(descriptor.environmentId);
		await mkdir(rootFolder, { recursive: true });
		await writeFile(descriptorFile, JSON.stringify(descriptor), 'utf8');
	}

	/** A missing or unreadable descriptor counts as no cache. */
	async readDescriptor(environmentId: string): Promise<PromotionCacheDescriptor | null> {
		const { descriptorFile } = this.paths(environmentId);
		try {
			const raw = await readFile(descriptorFile, 'utf8');
			return jsonParse<PromotionCacheDescriptor>(raw, { fallbackValue: undefined }) ?? null;
		} catch {
			return null;
		}
	}

	/**
	 * Whether the checkout on this machine was cloned from the configuration we just
	 * resolved. Catches a remote or branch change made by another process, which
	 * could not invalidate this machine's cache.
	 */
	async matchesDescriptor(expected: PromotionCacheDescriptor): Promise<boolean> {
		const stored = await this.readDescriptor(expected.environmentId);
		if (!stored) return false;
		return (
			stored.schemaVersion === expected.schemaVersion &&
			stored.remoteUrl === expected.remoteUrl &&
			stored.checkoutBranchName === expected.checkoutBranchName
		);
	}

	/**
	 * Marks the checkout unusable before a branched promotion changes it.
	 * A successful base reset or a new clone can restore the descriptor.
	 */
	async invalidateDescriptor(environmentId: string): Promise<void> {
		await rm(this.paths(environmentId).descriptorFile, { force: true });
	}

	/** Drops the checkout and its descriptor. Keeps the pinned SSH host keys. */
	async resetCheckout(environmentId: string): Promise<void> {
		const { repositoryFolder, nextRepositoryFolder, descriptorFile } = this.paths(environmentId);
		await rm(repositoryFolder, { recursive: true, force: true });
		await rm(nextRepositoryFolder, { recursive: true, force: true });
		await rm(descriptorFile, { force: true });
	}

	/** Removes everything for an environment, host keys included. */
	async purge(environmentId: string): Promise<void> {
		await rm(this.paths(environmentId).rootFolder, { recursive: true, force: true });
	}
}
