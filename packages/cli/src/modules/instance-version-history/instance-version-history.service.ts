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

@Service()
export class InstanceVersionHistoryService {
	private cache: VersionEntry[] = [];

	constructor(
		private readonly repository: InstanceVersionHistoryRepository,
		private readonly logger: Logger,
	) {
		this.logger = this.logger.scoped('instance-version-history');
	}

	async init(): Promise<void> {
		await this.loadCache();
		await this.checkAndRecordCurrentVersion();
	}

	private async loadCache(): Promise<void> {
		const entries = await this.repository.find({
			order: { createdAt: 'ASC' },
		});
		this.cache = entries.map((e) => ({
			major: e.major,
			minor: e.minor,
			patch: e.patch,
			createdAt: e.createdAt,
		}));
	}

	private async checkAndRecordCurrentVersion(): Promise<void> {
		const current = parseVersion(N8N_VERSION);
		const newest = this.cache.at(-1);

		if (!newest || compareVersions(newest, current) !== 0) {
			const entry = this.repository.create(current);
			const saved = await this.repository.save(entry);
			this.cache.push({
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
	getMinVersionSince(since: Date): SemVer | undefined {
		let min: VersionEntry | undefined;
		for (const entry of this.cache) {
			if (entry.createdAt >= since) {
				if (!min || compareVersions(entry, min) < 0) {
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
	getDateSinceContinuouslyAtLeastVersion(target: SemVer): Date | undefined {
		let result: Date | undefined;
		for (let i = this.cache.length - 1; i >= 0; i--) {
			if (versionGte(this.cache[i], target)) {
				result = this.cache[i].createdAt;
			} else {
				break;
			}
		}
		return result;
	}

	/**
	 * Returns the datetime at which the instance changed to the current version.
	 */
	getCurrentVersionDate(): VersionEntry | undefined {
		const entry = this.cache.at(-1);
		if (!entry) return undefined;
		return { ...entry };
	}

	/**
	 * Returns the first time a version (or above) was adopted by the instance.
	 * Scans from oldest to newest.
	 */
	getFirstAdoptionDate(target: SemVer): Date | undefined {
		for (const entry of this.cache) {
			if (versionGte(entry, target)) {
				return entry.createdAt;
			}
		}
		return undefined;
	}
}
