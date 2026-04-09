import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';

import { N8N_VERSION } from '@/constants';

import { InstanceVersionHistoryRepository } from './database/repositories/instance-version-history.repository';
import type { SemVer, VersionEntry } from './instance-version-history.types';
import {
	compareVersions,
	formatVersion,
	parseVersion,
	versionGte,
} from './instance-version-history.types';
import { InstanceSettings } from 'n8n-core';

@Service()
export class InstanceVersionHistoryService {
	// Use via `getCache`, not directly
	private _cache: VersionEntry[] | null = null;

	constructor(
		private readonly repository: InstanceVersionHistoryRepository,
		private readonly logger: Logger,
		private readonly instanceSettings: InstanceSettings,
	) {
		this.logger = this.logger.scoped('instance-version-history');
	}

	async init(retries = 3): Promise<void> {
		if (retries === 0) return;
		if (!this.instanceSettings.isLeader) return;

		try {
			// Re-set to null in case any previous queries fetched after
			// we errored on past init attempt
			this._cache = null;
			await this.checkAndRecordCurrentVersion();
		} catch (error) {
			this.logger.warn('Failed to initialize version history', { error });

			setTimeout(async () => await this.init(retries - 1), 10_000);
		}
	}

	private async getCache(): Promise<VersionEntry[]> {
		if (this._cache !== null) return this._cache;

		const entries = await this.repository.find({
			order: { createdAt: 'ASC' },
		});
		this._cache = entries.map((e) => ({
			major: e.major,
			minor: e.minor,
			patch: e.patch,
			createdAt: e.createdAt,
		}));
		return this._cache;
	}

	// Should only be called from leader
	private async checkAndRecordCurrentVersion(): Promise<void> {
		const cache = await this.getCache();
		const current = parseVersion(N8N_VERSION);
		const newest = cache.at(-1);

		if (!newest || compareVersions(newest, current) !== 0) {
			const entry = this.repository.create(current);
			const saved = await this.repository.save(entry);
			cache.push({
				major: saved.major,
				minor: saved.minor,
				patch: saved.patch,
				createdAt: saved.createdAt,
			});

			this.logger.info(
				`Recorded version change: ${newest ? formatVersion(newest) : '(none)'} -> ${N8N_VERSION}`,
			);
		}
	}

	/**
	 * Returns the smallest (minimum) version since the given date.
	 */
	async getMinVersionSince(since: Date): Promise<SemVer | undefined> {
		const cache = await this.getCache();
		let min: VersionEntry | undefined;
		for (const entry of cache) {
			if (entry.createdAt >= since) {
				if (!min || versionGte(min, entry)) {
					min = entry;
				}
			}
		}
		return min ? { major: min.major, minor: min.minor, patch: min.patch } : undefined;
	}

	/**
	 * Returns the datetime from which point onwards the instance has been
	 * continuously at least on the provided version (or higher).
	 *
	 * Walks backwards from the newest entry. While entries are >= target,
	 * tracks the date. Stops at the first entry below the target.
	 *
	 * Example: v2.3.4 (Jan 1) -> v2.2.0 (Jan 2) -> v2.3.5 (Jan 3)
	 * Query for v2.3.4 returns Jan 3 (not Jan 1, because of the downgrade).
	 */
	async getDateSinceContinuouslyAtLeastVersion(target: SemVer): Promise<Date | undefined> {
		const cache = await this.getCache();
		let result: Date | undefined;
		for (let i = cache.length - 1; i >= 0; i--) {
			if (versionGte(cache[i], target)) {
				result = cache[i].createdAt;
			} else {
				break;
			}
		}
		return result;
	}

	/**
	 * Returns the datetime at which the instance changed to the current version.
	 */
	async getCurrentVersionDate(): Promise<VersionEntry | undefined> {
		const cache = await this.getCache();
		const entry = cache.at(-1);
		if (!entry) return undefined;
		return { ...entry };
	}

	/**
	 * Returns the first time a version (or above) was adopted by the instance.
	 * Scans from oldest to newest.
	 */
	async getFirstAdoptionDate(target: SemVer): Promise<Date | undefined> {
		const cache = await this.getCache();
		for (const entry of cache) {
			if (versionGte(entry, target)) {
				return entry.createdAt;
			}
		}
		return undefined;
	}
}
