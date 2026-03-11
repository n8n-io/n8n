import { Injectable } from '@nestjs/common';
import { nanoid } from 'nanoid';

import { S3StorageService } from '../storage/s3-storage.service';
import type { VolumeMetadata } from '../types';

const VOLUMES_PREFIX = 'volumes/';

@Injectable()
export class VolumesService {
	constructor(private readonly s3: S3StorageService) {}

	async create(name?: string): Promise<VolumeMetadata> {
		const id = `vol_${nanoid(12)}`;
		const volumeName = name ?? id;
		const prefix = `${VOLUMES_PREFIX}${id}/`;

		const metadata: VolumeMetadata = {
			id,
			name: volumeName,
			createdAt: new Date().toISOString(),
		};

		// Write the manifest (acts as the prefix marker + metadata store)
		await this.s3.putObject(`${prefix}.manifest.json`, JSON.stringify(metadata));

		return metadata;
	}

	async list(): Promise<VolumeMetadata[]> {
		const prefixes = await this.s3.listPrefixes(VOLUMES_PREFIX);
		const volumes: VolumeMetadata[] = [];

		for (const prefix of prefixes) {
			try {
				const manifestData = await this.s3.getObject(`${prefix}.manifest.json`);
				const metadata = JSON.parse(manifestData.toString('utf-8')) as VolumeMetadata;
				volumes.push(metadata);
			} catch {
				// Skip volumes with corrupted/missing manifests
			}
		}

		return volumes;
	}

	async delete(id: string): Promise<void> {
		const prefix = `${VOLUMES_PREFIX}${id}/`;
		await this.s3.deletePrefix(prefix);
	}

	async exists(id: string): Promise<boolean> {
		const prefix = `${VOLUMES_PREFIX}${id}/`;
		try {
			await this.s3.getObject(`${prefix}.manifest.json`);
			return true;
		} catch {
			return false;
		}
	}

	/**
	 * Returns the S3 prefix for a volume's data files (excluding manifest).
	 */
	getDataPrefix(id: string): string {
		return `${VOLUMES_PREFIX}${id}/data/`;
	}
}
