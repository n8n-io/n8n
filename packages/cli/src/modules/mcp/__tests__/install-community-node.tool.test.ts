import { User } from '@n8n/db';
import * as permissions from '@n8n/permissions';
import type { Mocked } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { CommunityNodeTypesService } from '@/modules/community-packages/community-node-types.service';
import type { CommunityPackagesLifecycleService } from '@/modules/community-packages/community-packages.lifecycle.service';
import type { InstalledPackages } from '@/modules/community-packages/installed-packages.entity';
import type { NodeTypes } from '@/node-types';
import type { Telemetry } from '@/telemetry';

import { createInstallCommunityNodeTool } from '../tools/workflow-builder/install-community-node.tool';

vi.mock('@n8n/permissions', async (importOriginal) => ({
	...(await importOriginal<typeof permissions>()),
	hasGlobalScope: vi.fn(),
}));

const hasGlobalScope = vi.mocked(permissions.hasGlobalScope);

const NODE_TYPE = '@mendable/n8n-nodes-firecrawl.firecrawl';
const PACKAGE = '@mendable/n8n-nodes-firecrawl';

const vettedEntry = () =>
	({
		packageName: PACKAGE,
		npmVersion: '1.4.2',
		checksum: 'sha512-abc',
	}) as unknown as Awaited<ReturnType<CommunityNodeTypesService['findVetted']>>;

/** Exact catalog entry for NODE_TYPE: official and not installed unless overridden. */
const catalogEntry = (overrides: Record<string, unknown> = {}) =>
	({
		name: NODE_TYPE,
		packageName: PACKAGE,
		npmVersion: '1.4.2',
		isOfficialNode: true,
		isInstalled: false,
		...overrides,
	}) as never;

const installedPackage = () =>
	mock<InstalledPackages>({
		packageName: PACKAGE,
		installedVersion: '1.4.2',
		installedNodes: [
			{ type: NODE_TYPE, latestVersion: 1 },
			{ type: `${PACKAGE}.firecrawlTool`, latestVersion: 1 },
		] as InstalledPackages['installedNodes'],
	});

describe('install_community_node MCP tool', () => {
	const user = Object.assign(new User(), { id: 'user-1' });
	let communityNodeTypesService: Mocked<CommunityNodeTypesService>;
	let lifecycleService: Mocked<CommunityPackagesLifecycleService>;
	let nodeTypes: Mocked<NodeTypes>;
	let telemetry: Mocked<Telemetry>;

	beforeEach(() => {
		vi.clearAllMocks();
		hasGlobalScope.mockReturnValue(true);
		communityNodeTypesService = mock<CommunityNodeTypesService>();
		lifecycleService = mock<CommunityPackagesLifecycleService>();
		nodeTypes = mock<NodeTypes>();
		// Default: nothing installed yet, so an install actually happens.
		nodeTypes.getByNameAndVersion.mockImplementation(() => {
			throw new Error('Unrecognized node type');
		});
		telemetry = mock<Telemetry>();
		communityNodeTypesService.findVetted.mockResolvedValue(vettedEntry());
		// Default: official and not installed yet, so an install actually happens.
		communityNodeTypesService.getCommunityNodeType.mockResolvedValue(catalogEntry());
		lifecycleService.install.mockResolvedValue(installedPackage());
	});

	const createTool = () =>
		createInstallCommunityNodeTool(
			user,
			communityNodeTypesService,
			lifecycleService,
			nodeTypes,
			telemetry,
		);

	const call = async (nodeType = NODE_TYPE) => {
		const result = await createTool().handler({ nodeType }, mock());
		return result.structuredContent as Record<string, unknown>;
	};

	describe('happy path', () => {
		test('installs the package the node type belongs to', async () => {
			const structured = await call();

			expect(lifecycleService.install).toHaveBeenCalledWith(
				{ name: PACKAGE, version: '1.4.2', verify: true },
				user,
				'mcp',
			);
			expect(structured).toMatchObject({
				installed: true,
				packageName: PACKAGE,
				version: '1.4.2',
			});
		});

		test('returns the node types the package registered', async () => {
			const structured = await call();

			expect(structured.nodeTypes).toEqual([NODE_TYPE, `${PACKAGE}.firecrawlTool`]);
		});

		test('pins the registry version and always verifies the checksum', async () => {
			await call();

			const [args] = lifecycleService.install.mock.calls[0];
			expect(args.version).toBe('1.4.2');
			expect(args.verify).toBe(true);
		});

		test('omits credential types when the installed nodes need none', async () => {
			nodeTypes.getByNameAndVersion.mockReturnValue({ description: {} } as never);

			expect(await call()).not.toHaveProperty('credentialTypes');
		});

		test('reports credential types read from the installed nodes, not the registry entry', async () => {
			// The registry payload carries no credential declarations for any
			// vetted package, so the loaded descriptions are the only real source.
			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: { credentials: [{ name: 'firecrawlApi' }] },
			} as never);

			expect(await call()).toHaveProperty('credentialTypes', ['firecrawlApi']);
		});

		test('survives node types that never became resolvable', async () => {
			const structured = await call();

			expect(structured.installed).toBe(true);
			expect(structured).not.toHaveProperty('credentialTypes');
		});
	});

	describe('already installed', () => {
		test('reports it as a normal result, not an error, and does not reinstall', async () => {
			communityNodeTypesService.getCommunityNodeType.mockResolvedValue(
				catalogEntry({ isInstalled: true }),
			);
			nodeTypes.getByNameAndVersion.mockReturnValue({ description: {} } as never);

			const structured = await call();

			expect(lifecycleService.install).not.toHaveBeenCalled();
			expect(structured).toMatchObject({
				installed: false,
				alreadyInstalled: true,
				packageName: PACKAGE,
				nodeTypes: [NODE_TYPE],
			});
			expect(structured).not.toHaveProperty('error');
		});

		test('still reports the credential types the user needs', async () => {
			communityNodeTypesService.getCommunityNodeType.mockResolvedValue(
				catalogEntry({ isInstalled: true }),
			);
			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: { credentials: [{ name: 'firecrawlApi' }] },
			} as never);

			expect(await call()).toHaveProperty('credentialTypes', ['firecrawlApi']);
		});

		test('counts as a success in telemetry', async () => {
			communityNodeTypesService.getCommunityNodeType.mockResolvedValue(
				catalogEntry({ isInstalled: true }),
			);
			nodeTypes.getByNameAndVersion.mockReturnValue({ description: {} } as never);

			await call();

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					results: { success: true, data: { packageName: PACKAGE, alreadyInstalled: true } },
				}),
			);
		});
	});

	describe('refusals', () => {
		test('refuses when the user cannot install packages, and points at an admin', async () => {
			hasGlobalScope.mockReturnValue(false);

			const structured = await call();

			expect(lifecycleService.install).not.toHaveBeenCalled();
			expect(structured.error).toContain('do not have permission');
			expect(structured.hint).toContain('admin');
		});

		test('refuses a package n8n has not vetted', async () => {
			communityNodeTypesService.findVetted.mockResolvedValue(undefined);

			const structured = await call('n8n-nodes-sketchy.sketchy');

			expect(lifecycleService.install).not.toHaveBeenCalled();
			expect(structured.error).toContain('not a verified community package');
		});

		test('refuses a node type absent from the catalog even when its package is vetted', async () => {
			// Package-level vetting is not enough: the exact node type has to be one
			// search_nodes could have offered.
			communityNodeTypesService.getCommunityNodeType.mockResolvedValue(null);

			const structured = await call(`${PACKAGE}.notARealNode`);

			expect(lifecycleService.install).not.toHaveBeenCalled();
			expect(structured.error).toContain('not a node type in the verified community catalog');
		});

		test('refuses a vetted node that is not an official node', async () => {
			// search_nodes filters on isOfficialNode, so installing one it withheld
			// would let the tool bypass discovery.
			communityNodeTypesService.getCommunityNodeType.mockResolvedValue(
				catalogEntry({ isOfficialNode: false }),
			);

			const structured = await call();

			expect(lifecycleService.install).not.toHaveBeenCalled();
			expect(structured.error).toContain('not an official verified node');
		});

		test('reports an install failure instead of throwing', async () => {
			lifecycleService.install.mockRejectedValue(
				new Error('Community packages are managed via environment variables on this instance'),
			);

			const structured = await call();

			expect(structured.error).toContain('environment variables');
			expect(structured.hint).toContain('no retry will succeed');
		});
	});

	describe('telemetry', () => {
		test('reports success with the package installed', async () => {
			await call();

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					tool_name: 'install_community_node',
					results: { success: true, data: { packageName: PACKAGE, nodeCount: 2 } },
				}),
			);
		});

		test('reports a refusal as a failure', async () => {
			hasGlobalScope.mockReturnValue(false);

			await call();

			expect(telemetry.track).toHaveBeenCalledWith(
				'User called mcp tool',
				expect.objectContaining({
					results: expect.objectContaining({ success: false }),
				}),
			);
		});
	});

	describe('annotations', () => {
		test('is marked as mutating, additive and idempotent', () => {
			expect(createTool().config.annotations).toMatchObject({
				readOnlyHint: false,
				destructiveHint: false,
				idempotentHint: true,
				openWorldHint: true,
			});
		});

		test('tells the agent to confirm with the user first', () => {
			expect(createTool().config.description).toContain('confirm with the user');
		});
	});
});
