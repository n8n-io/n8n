import { Logger, safeJoinPath } from '@n8n/backend-common';
import { ProjectFilesConfig } from '@n8n/config';
import { Service } from '@n8n/di';
import { InstanceSettings } from 'n8n-core';
import { readdir, stat, unlink } from 'node:fs/promises';

/**
 * Sweeps the multipart staging directory.
 *
 * The controller removes each staged upload as soon as the request finishes, so
 * this only reclaims files left behind by a crash mid-request. It never touches
 * stored blobs: reclaiming those would mean paginating an object-store prefix and
 * diffing it against the database, where a bug deletes live customer files.
 */
@Service()
export class ProjectFileCleanupService {
	private cleanupInterval?: NodeJS.Timeout;

	constructor(
		private readonly config: ProjectFilesConfig,
		private readonly instanceSettings: InstanceSettings,
		private readonly logger: Logger,
	) {}

	start() {
		// Only mains accept uploads, so only mains have a staging dir to sweep.
		if (this.instanceSettings.instanceType !== 'main') return;

		this.cleanupInterval = setInterval(() => {
			void this.sweep();
		}, this.config.cleanupIntervalMs);
	}

	shutdown() {
		if (this.cleanupInterval) {
			clearInterval(this.cleanupInterval);
			this.cleanupInterval = undefined;
		}
	}

	private async sweep(): Promise<void> {
		let fileNames: string[];

		try {
			fileNames = await readdir(this.config.uploadDir);
		} catch (error) {
			// The directory is created lazily; nothing staged yet is not an error.
			if (!this.isEnoent(error)) {
				this.logger.warn('Failed to read project file staging directory', { error });
			}
			return;
		}

		const now = Date.now();

		for (const fileName of fileNames) {
			const filePath = safeJoinPath(this.config.uploadDir, fileName);

			try {
				const { mtimeMs } = await stat(filePath);
				if (now - mtimeMs > this.config.fileMaxAgeMs) await unlink(filePath);
			} catch (error) {
				// A concurrent request may have already removed it.
				if (!this.isEnoent(error)) {
					this.logger.warn('Failed to remove abandoned project file upload', {
						filePath,
						error,
					});
				}
			}
		}
	}

	private isEnoent(error: unknown): boolean {
		return (
			typeof error === 'object' &&
			error !== null &&
			'code' in error &&
			(error as { code: unknown }).code === 'ENOENT'
		);
	}
}
