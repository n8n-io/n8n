/**
 * Prepares and caches a Daytona Image descriptor with config files and
 * node_modules pre-installed. The Image is declarative — actual building
 * happens when a sandbox is created from it.
 *
 * The node-types catalog is NOT baked into the image (too large for API body limit).
 * It's written to each sandbox after creation via the filesystem API.
 *
 * Exported as SnapshotManager for backward compatibility (name in index.ts/service).
 */

import { Image } from '@daytonaio/sdk';

import type { Logger } from '../logger';
import { PACKAGE_JSON, TSCONFIG_JSON, BUILD_MJS } from './sandbox-setup';

/** Base64-encode content for safe embedding in RUN commands (avoids newline/quote issues). */
function b64(s: string): string {
	return Buffer.from(s, 'utf-8').toString('base64');
}

export class SnapshotManager {
	private cachedImage: Image | null = null;

	constructor(
		private readonly baseImage: string | undefined,
		private readonly logger: Logger,
	) {}

	/** Get or prepare the image descriptor. Synchronous after first call. */
	ensureImage(): Image {
		if (this.cachedImage) return this.cachedImage;

		const base = this.baseImage ?? 'daytonaio/sandbox:0.5.0';

		this.cachedImage = Image.base(base)
			.runCommands(
				'mkdir -p /home/daytona/workspace/src /home/daytona/workspace/chunks /home/daytona/workspace/node-types',
			)
			.runCommands(
				`echo '${b64(PACKAGE_JSON)}' | base64 -d > /home/daytona/workspace/package.json`,
				`echo '${b64(TSCONFIG_JSON)}' | base64 -d > /home/daytona/workspace/tsconfig.json`,
				`echo '${b64(BUILD_MJS)}' | base64 -d > /home/daytona/workspace/build.mjs`,
			)
			.runCommands('cd /home/daytona/workspace && npm install --ignore-scripts');

		this.logger.info('Builder image descriptor prepared', {
			base,
			dockerfileLength: this.cachedImage.dockerfile.length,
		});

		return this.cachedImage;
	}

	/** Invalidate cached image (e.g., when base image changes). */
	invalidate(): void {
		this.cachedImage = null;
	}
}
