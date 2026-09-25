import { describe, it, expect } from 'vitest';
import { isCommunityPackageUpdateAvailable, isNodesApiVersionError } from './communityNodes.utils';

describe('isCommunityPackageUpdateAvailable', () => {
	const defaults = {
		installedVersion: '1.0.0',
		latestVerifiedVersion: '1.0.0',
		isCommunityNodesFeatureEnabled: true,
		isUnverifiedPackagesEnabled: false,
		isManagedByEnv: false,
	};

	it('returns true when a newer verified version is available', () => {
		expect(
			isCommunityPackageUpdateAvailable({
				...defaults,
				latestVerifiedVersion: '1.1.0',
			}),
		).toBe(true);
	});

	it('ignores a newer npm version when unverified packages are disabled', () => {
		expect(
			isCommunityPackageUpdateAvailable({
				...defaults,
				updateAvailable: '1.1.0',
			}),
		).toBe(false);
	});

	it('returns true for a newer npm version when unverified packages are enabled', () => {
		expect(
			isCommunityPackageUpdateAvailable({
				...defaults,
				updateAvailable: '1.1.0',
				isUnverifiedPackagesEnabled: true,
			}),
		).toBe(true);
	});

	it('returns false when community packages are managed by the environment', () => {
		expect(
			isCommunityPackageUpdateAvailable({
				...defaults,
				latestVerifiedVersion: '1.1.0',
				updateAvailable: '1.2.0',
				isUnverifiedPackagesEnabled: true,
				isManagedByEnv: true,
			}),
		).toBe(false);
	});
});

describe('isNodesApiVersionError', () => {
	const incompatibleNodesApiVersionError = (requiredNodesApiVersion: number | null): unknown => ({
		httpStatusCode: 400,
		meta: { requiredNodesApiVersion, supportedNodesApiVersion: 1 },
	});

	it('should match the error metadata, not the message', () => {
		expect(isNodesApiVersionError(incompatibleNodesApiVersionError(3))).toBe(true);
		// Malformed declared values carry `null` and must be recognized too.
		expect(isNodesApiVersionError(incompatibleNodesApiVersionError(null))).toBe(true);
		// The same copy without the metadata is a generic error.
		expect(
			isNodesApiVersionError(new Error('This community node requires n8n node API version 3.')),
		).toBe(false);
		// Other 400s must not match.
		expect(
			isNodesApiVersionError(
				Object.assign(new Error('Package is banned'), { httpStatusCode: 400 }),
			),
		).toBe(false);
		expect(isNodesApiVersionError(undefined)).toBe(false);
	});
});
