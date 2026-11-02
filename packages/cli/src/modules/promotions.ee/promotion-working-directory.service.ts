import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { jsonParse, UnexpectedError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { PromotionCacheDescriptor } from './promotions.types';

/** Environment IDs are generated UUIDs, so anything else is not ours. */
const SAFE_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

const DESCRIPTOR_FILE = 'cache.json';

export function isMissing(error: unknown): boolean {
	return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

/**
 * Renames `folder` to a unique name in `trashFolder`. The rename is atomic, so the live
 * path is gone at once, and a Git command that still runs writes into the trash. Returns
 * the trash path to delete, or `undefined` when `folder` does not exist.
 */
export async function moveToTrash(
	folder: string,
	trashFolder: string,
): Promise<string | undefined> {
	await mkdir(trashFolder, { recursive: true });
	const trashed = path.join(trashFolder, randomUUID());
	try {
		await rename(folder, trashed);
		return trashed;
	} catch (error) {
		if (isMissing(error)) return undefined;
		throw error;
	}
}

/** Deletes folders that `moveToTrash` returned. Can take long, so call it outside the environment lock. */
export async function deleteTrash(trashedFolders: string[]): Promise<void> {
	for (const folder of trashedFolders) {
		await rm(folder, { recursive: true, force: true });
	}
}

/**
 * Owns the local checkout of one environment: where it lives, whether it still matches
 * the stored configuration, and how to remove it.
 *
 * Checkouts are disposable caches. Read-only paths use a checkout without the environment
 * lock, so a removal moves folders to trash instead of deleting them in place.
 */
@Service()
export class PromotionWorkingDirectoryService {
	constructor(private readonly instanceSettings: InstanceSettings) {}

	paths(environmentId: string) {
		if (!SAFE_ID.test(environmentId)) {
			throw new UnexpectedError('Promotion environment ID is not a generated ID');
		}
		const rootFolder = path.join(this.environmentsFolder(), environmentId);
		return {
			rootFolder,
			repositoryFolder: path.join(rootFolder, 'repository'),
			nextRepositoryFolder: path.join(rootFolder, 'repository-next'),
			sshDir: path.join(rootFolder, '.ssh'),
			descriptorFile: path.join(rootFolder, DESCRIPTOR_FILE),
			trashFolder: this.trashFolder(),
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

	/**
	 * Drops the descriptor, then moves the checkout to trash. Keeps the pinned SSH host
	 * keys. The descriptor goes first, so a partial removal never looks connected.
	 * Returns the trash folders for `deleteTrash`.
	 */
	async resetCheckout(environmentId: string): Promise<string[]> {
		const { repositoryFolder, nextRepositoryFolder, descriptorFile, trashFolder } =
			this.paths(environmentId);
		await rm(descriptorFile, { force: true });
		const trashed: string[] = [];
		for (const folder of [repositoryFolder, nextRepositoryFolder]) {
			const moved = await moveToTrash(folder, trashFolder);
			if (moved) trashed.push(moved);
		}
		return trashed;
	}

	/**
	 * Drops the descriptor, then moves everything for an environment to trash, host keys
	 * included. Returns the trash folders for `deleteTrash`.
	 */
	async purge(environmentId: string): Promise<string[]> {
		const { rootFolder, descriptorFile, trashFolder } = this.paths(environmentId);
		await rm(descriptorFile, { force: true });
		const moved = await moveToTrash(rootFolder, trashFolder);
		return moved ? [moved] : [];
	}

	/** Deletes the folders that `resetCheckout` or `purge` moved to trash. */
	async deleteTrash(trashedFolders: string[]): Promise<void> {
		await deleteTrash(trashedFolders);
	}

	/** Deletes everything in the trash, for example what a failed deletion or a crash left. */
	async emptyTrash(): Promise<void> {
		const trashFolder = this.trashFolder();
		let names: string[];
		try {
			names = await readdir(trashFolder);
		} catch (error) {
			if (isMissing(error)) return;
			throw error;
		}
		await deleteTrash(names.map((name) => path.join(trashFolder, name)));
	}

	async listEnvironmentIds(): Promise<string[]> {
		try {
			const entries = await readdir(this.environmentsFolder(), { withFileTypes: true });
			return entries
				.filter((entry) => entry.isDirectory() && SAFE_ID.test(entry.name))
				.map((entry) => entry.name);
		} catch (error) {
			if (isMissing(error)) return [];
			throw error;
		}
	}

	private environmentsFolder() {
		return path.join(this.instanceSettings.n8nFolder, 'promotions', 'environments');
	}

	/** Beside the environments folder, so it is on the same filesystem and is never listed as an environment. */
	private trashFolder() {
		return path.join(this.instanceSettings.n8nFolder, 'promotions', 'trash');
	}
}
