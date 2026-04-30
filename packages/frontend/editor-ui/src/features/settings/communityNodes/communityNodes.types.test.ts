import { describe, it, expect } from 'vitest';
import {
	fromBrowsePackage,
	fromInstalledPackage,
	mergeVettedAndInstalled,
} from './communityNodes.types';
import type { CommunityPackageSummary } from './communityNodes.types';
import type {
	INodeTypeDescription,
	PublicInstalledNode,
	PublicInstalledPackage,
} from 'n8n-workflow';
import type { CommunityNodeType } from '@n8n/api-types';

const makeNodeDescription = (name: string) =>
	({
		displayName: name,
		name,
		icon: 'file:icon.svg',
	}) as unknown as INodeTypeDescription;

const makeBrowsePackage = (
	overrides: Partial<CommunityPackageSummary> = {},
): CommunityPackageSummary => ({
	packageName: 'n8n-nodes-test',
	authorName: 'Author',
	description: 'A test package',
	isOfficialNode: false,
	isInstalled: false,
	numberOfDownloads: 500,
	npmVersion: '1.0.0',
	nodes: [
		{
			name: 'n8n-nodes-test.testNode',
			displayName: 'Test Node',
			nodeDescription: makeNodeDescription('Test Node'),
		} as unknown as CommunityNodeType,
	],
	...overrides,
});

const makeInstalledPackage = (
	overrides: Partial<PublicInstalledPackage> = {},
): PublicInstalledPackage => ({
	packageName: 'n8n-nodes-installed',
	installedVersion: '2.0.0',
	authorName: 'Installed Author',
	installedNodes: [
		{ name: 'InstalledNode', type: 'n8n-nodes-installed.node' } as PublicInstalledNode,
	],
	createdAt: new Date(0),
	updatedAt: new Date(0),
	...overrides,
});

describe('fromBrowsePackage', () => {
	it('should map all browse fields correctly', () => {
		const result = fromBrowsePackage(makeBrowsePackage());

		expect(result.packageName).toBe('n8n-nodes-test');
		expect(result.authorName).toBe('Author');
		expect(result.description).toBe('A test package');
		expect(result.isOfficialNode).toBe(false);
		expect(result.numberOfDownloads).toBe(500);
		expect(result.nodeCount).toBe(1);
		expect(result.installNodeName).toBe('n8n-nodes-test.testNode');
		expect(result.isInstalled).toBe(false);
	});

	it('should pass through nodeDescription from first node', () => {
		const result = fromBrowsePackage(makeBrowsePackage());

		expect(result.nodeDescription).not.toBeNull();
		expect(result.nodeDescription?.displayName).toBe('Test Node');
	});

	it('should handle empty nodes array', () => {
		const result = fromBrowsePackage(makeBrowsePackage({ nodes: [] }));

		expect(result.nodeCount).toBe(0);
		expect(result.nodeDescription).toBeNull();
		expect(result.installNodeName).toBe('');
	});

	it('should reflect isInstalled and isOfficialNode flags', () => {
		const result = fromBrowsePackage(
			makeBrowsePackage({ isInstalled: true, isOfficialNode: true }),
		);

		expect(result.isInstalled).toBe(true);
		expect(result.isOfficialNode).toBe(true);
	});

	it('should not include installed-specific fields', () => {
		const result = fromBrowsePackage(makeBrowsePackage());

		expect(result.installedVersion).toBeUndefined();
		expect(result.updateAvailable).toBeUndefined();
		expect(result.failedLoading).toBeUndefined();
	});

	it('should set isVerified to true', () => {
		const result = fromBrowsePackage(makeBrowsePackage());
		expect(result.isVerified).toBe(true);
	});
});

describe('fromInstalledPackage', () => {
	const mockGetNodeType = (name: string) =>
		name === 'n8n-nodes-installed.node' ? makeNodeDescription('Installed Node') : null;

	it('should map all installed fields correctly', () => {
		const result = fromInstalledPackage(makeInstalledPackage(), mockGetNodeType);

		expect(result.packageName).toBe('n8n-nodes-installed');
		expect(result.authorName).toBe('Installed Author');
		expect(result.isInstalled).toBe(true);
		expect(result.installedVersion).toBe('2.0.0');
		expect(result.nodeCount).toBe(1);
		expect(result.installNodeName).toBe('InstalledNode');
	});

	it('should look up nodeDescription via getNodeType', () => {
		const result = fromInstalledPackage(makeInstalledPackage(), mockGetNodeType);

		expect(result.nodeDescription).not.toBeNull();
		expect(result.nodeDescription?.displayName).toBe('Installed Node');
	});

	it('should return null nodeDescription when type not found', () => {
		const result = fromInstalledPackage(makeInstalledPackage(), () => null);

		expect(result.nodeDescription).toBeNull();
	});

	it('should pass through updateAvailable and failedLoading', () => {
		const result = fromInstalledPackage(
			makeInstalledPackage({ updateAvailable: '3.0.0', failedLoading: true }),
			mockGetNodeType,
		);

		expect(result.updateAvailable).toBe('3.0.0');
		expect(result.failedLoading).toBe(true);
	});

	it('should default browse-specific fields', () => {
		const result = fromInstalledPackage(makeInstalledPackage(), mockGetNodeType);

		expect(result.description).toBe('');
		expect(result.isOfficialNode).toBe(false);
		expect(result.numberOfDownloads).toBe(0);
	});

	it('should handle missing authorName', () => {
		const result = fromInstalledPackage(
			makeInstalledPackage({ authorName: undefined }),
			mockGetNodeType,
		);

		expect(result.authorName).toBe('');
	});

	it('should handle empty installedNodes', () => {
		const result = fromInstalledPackage(
			makeInstalledPackage({ installedNodes: [] }),
			mockGetNodeType,
		);

		expect(result.nodeCount).toBe(0);
		expect(result.nodeDescription).toBeNull();
		expect(result.installNodeName).toBe('');
	});

	it('should set isVerified to false', () => {
		const result = fromInstalledPackage(makeInstalledPackage(), mockGetNodeType);
		expect(result.isVerified).toBe(false);
	});
});

describe('mergeVettedAndInstalled', () => {
	const mockGetNodeType = (name: string) =>
		name === 'n8n-nodes-test.testNode' ? makeNodeDescription('Test Node') : null;

	it('should prefer browse-side metadata for description, downloads, author', () => {
		const result = mergeVettedAndInstalled(
			makeBrowsePackage({
				description: 'Browse description',
				authorName: 'Browse Author',
				numberOfDownloads: 9999,
			}),
			makeInstalledPackage({ authorName: 'Installed Author' }),
			mockGetNodeType,
		);

		expect(result.description).toBe('Browse description');
		expect(result.authorName).toBe('Browse Author');
		expect(result.numberOfDownloads).toBe(9999);
	});

	it('should pull install state from installed-side', () => {
		const result = mergeVettedAndInstalled(
			makeBrowsePackage(),
			makeInstalledPackage({
				installedVersion: '3.1.0',
				updateAvailable: '4.0.0',
				failedLoading: true,
			}),
			mockGetNodeType,
		);

		expect(result.isInstalled).toBe(true);
		expect(result.installedVersion).toBe('3.1.0');
		expect(result.updateAvailable).toBe('4.0.0');
		expect(result.failedLoading).toBe(true);
	});

	it('should always set isVerified to true', () => {
		const result = mergeVettedAndInstalled(
			makeBrowsePackage(),
			makeInstalledPackage(),
			mockGetNodeType,
		);

		expect(result.isVerified).toBe(true);
	});

	it('should fall back installNodeName from vetted to installed when vetted nodes are empty', () => {
		const result = mergeVettedAndInstalled(
			makeBrowsePackage({ nodes: [] }),
			makeInstalledPackage({
				installedNodes: [
					{ name: 'InstalledNode', type: 'n8n-nodes-test.testNode' } as PublicInstalledNode,
				],
			}),
			mockGetNodeType,
		);

		expect(result.installNodeName).toBe('InstalledNode');
	});

	it('should default nodeCount and nodeDescription when both sides have no nodes', () => {
		const result = mergeVettedAndInstalled(
			makeBrowsePackage({ nodes: [] }),
			makeInstalledPackage({ installedNodes: [] }),
			mockGetNodeType,
		);

		expect(result.nodeCount).toBe(0);
		expect(result.nodeDescription).toBeNull();
		expect(result.installNodeName).toBe('');
	});

	it('should prefer vetted nodes for installNodeName and nodeDescription when both sides have nodes', () => {
		const result = mergeVettedAndInstalled(
			makeBrowsePackage(),
			makeInstalledPackage({
				installedNodes: [{ name: 'InstalledNode', type: 'something-else' } as PublicInstalledNode],
			}),
			mockGetNodeType,
		);

		expect(result.installNodeName).toBe('n8n-nodes-test.testNode');
		expect(result.nodeDescription?.displayName).toBe('Test Node');
	});

	it('should fall back nodeCount to installed nodes count when vetted is empty', () => {
		const result = mergeVettedAndInstalled(
			makeBrowsePackage({ nodes: [] }),
			makeInstalledPackage({
				installedNodes: [
					{ name: 'A', type: 'a' } as PublicInstalledNode,
					{ name: 'B', type: 'b' } as PublicInstalledNode,
				],
			}),
			mockGetNodeType,
		);

		expect(result.nodeCount).toBe(2);
	});
});
