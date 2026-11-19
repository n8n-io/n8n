import { ConflictError, NotFoundError } from '@n8n/errors';

import type { AppVersion } from './app-version.entity';

export function assertBuiltVersion(
	version: AppVersion | null,
	appId: string,
): asserts version is AppVersion & { bundleArtifactId: number } {
	if (!version || version.appId !== appId) throw new NotFoundError('App version not found.');
	if (version.buildStatus !== 'succeeded' || version.bundleArtifactId === null) {
		throw new ConflictError('Select a successful app version with a stored bundle.');
	}
}
