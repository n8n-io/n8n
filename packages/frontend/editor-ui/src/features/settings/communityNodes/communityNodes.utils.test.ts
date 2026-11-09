import { describe, it, expect } from 'vitest';
import type { RestrictedPackageType } from '@n8n/api-types';
import {
	describeInstallPolicyNote,
	describeSelectedNodeRestriction,
	isCommunityPackageUpdateAvailable,
	isNodesApiVersionError,
} from './communityNodes.utils';

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
	const incompatibleNodesApiVersionError = (requiredNodesApiVersion: string | null): unknown => ({
		httpStatusCode: 400,
		meta: { requiredNodesApiVersion, supportedNodesApiVersion: '1' },
	});

	it('should match the error metadata, not the message', () => {
		expect(isNodesApiVersionError(incompatibleNodesApiVersionError('3.1'))).toBe(true);
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

describe('describeInstallPolicyNote', () => {
	const onInstance = (type: string, optInAvailable = false): RestrictedPackageType => ({
		type,
		blockedOn: 'instance',
		optInAvailable,
	});
	const inProjects = (type: string): RestrictedPackageType => ({
		type,
		blockedOn: 'projects',
		optInAvailable: false,
	});
	const note = (nodeTypes: RestrictedPackageType[], total = 5) =>
		describeInstallPolicyNote({ nodeTypes }, total);

	it('returns undefined without policy information', () => {
		expect(describeInstallPolicyNote(undefined, 5)).toBeUndefined();
	});

	it('returns undefined when nothing is restricted', () => {
		expect(note([])).toBeUndefined();
	});

	it('counts one node restricted on the instance', () => {
		expect(note([onInstance('a.a')], 1)).toBe('1 of 1 nodes is restricted on this instance.');
	});

	it('counts several nodes restricted on the instance', () => {
		expect(note([onInstance('a.a'), onInstance('a.b'), onInstance('a.c')])).toBe(
			'3 of 5 nodes are restricted on this instance.',
		);
	});

	it('says when projects can allow a restricted node', () => {
		expect(note([onInstance('a.a', true)])).toBe(
			'1 of 5 nodes is restricted on this instance. Projects can allow some of these nodes.',
		);
	});

	it('counts nodes restricted only in projects', () => {
		expect(note([inProjects('a.a')])).toBe('1 node is restricted in some projects.');
		expect(note([inProjects('a.a'), inProjects('a.b')])).toBe(
			'2 nodes are restricted in some projects.',
		);
	});

	it('reports instance and project restrictions together', () => {
		expect(note([onInstance('a.a'), inProjects('a.b'), inProjects('a.c')])).toBe(
			'1 of 5 nodes is restricted on this instance. 2 nodes are restricted in some projects.',
		);
	});
});

describe('describeSelectedNodeRestriction', () => {
	it('names a node the instance restricts', () => {
		expect(describeSelectedNodeRestriction('Apify', 'instance')).toBe(
			'Apify is restricted on this instance.',
		);
	});

	it('names a node the current project restricts', () => {
		expect(describeSelectedNodeRestriction('Apify', 'project')).toBe(
			'Apify is restricted in this project.',
		);
	});
});
