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
		// Default: official and not installed yet, so an install actually happens.
		communityNodeTypesService.findVettedNodeType.mockResolvedValue(catalogEntry());
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

	/** Success payload. Fails loudly if the tool returned an execution error. */
	const call = async (nodeType = NODE_TYPE) => {
		const result = await createTool().handler({ nodeType }, mock());
		expect(result.isError).toBeFalsy();
		return result.structuredContent as Record<string, unknown>;
	};

	/**
	 * Error payload, parsed out of `content`. A failure sets `isError: true` and
	 * omits `structuredContent`, because the output schema describes successes.
	 */
	const callExpectingError = async (nodeType = NODE_TYPE) => {
		const result = await createTool().handler({ nodeType }, mock());
		expect(result.isError).toBe(true);
		expect(result.structuredContent).toBeUndefined();
		const [block] = result.content;
		if (block.type !== 'text') throw new Error('expected a text content block');
		return JSON.parse(block.text) as Record<string, unknown>;
	};

	describe('happy path', () => {
		test('installs the package the node type belongs to', async () => {
			const structured = await call();

			expect(lifecycleService.install).toHaveBeenCalledWith(
				{ name: PACKAGE, verify: true },
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

		test('delegates version pinning to install(), which always verifies the checksum', async () => {
			// No version is passed on purpose: install() resolves the latest vetted
			// version and its checksum from one catalog lookup, so the pair can
			// never straddle a catalog refresh.
			await call();

			const [args] = lifecycleService.install.mock.calls[0];
			expect(args.version).toBeUndefined();
			expect(args.verify).toBe(true);

			expect(communityNodeTypesService.findVetted).not.toHaveBeenCalled();
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
			communityNodeTypesService.findVettedNodeType.mockResolvedValue(
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
			communityNodeTypesService.findVettedNodeType.mockResolvedValue(
				catalogEntry({ isInstalled: true }),
			);
			nodeTypes.getByNameAndVersion.mockReturnValue({
				description: { credentials: [{ name: 'firecrawlApi' }] },
			} as never);

			expect(await call()).toHaveProperty('credentialTypes', ['firecrawlApi']);
		});

		test('counts as a success in telemetry', async () => {
			communityNodeTypesService.findVettedNodeType.mockResolvedValue(
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

			const structured = await callExpectingError();

			expect(lifecycleService.install).not.toHaveBeenCalled();
			expect(structured.error).toContain('do not have permission');
			expect(structured.hint).toContain('admin');
		});

		test('reports a failure when install() refuses the package', async () => {
			// The vetted-package check lives inside install(), next to the checksum
			// it resolves; the tool reports the rejection without retry advice that
			// could leak the npm error text.
			class BadRequestError extends Error {}
			lifecycleService.install.mockRejectedValue(
				new BadRequestError('Package n8n-nodes-sketchy is not vetted for installation'),
			);

			const structured = await callExpectingError();

			expect(structured.error).toContain('failed (BadRequestError)');
		});

		test('refuses a node type absent from the catalog even when its package is vetted', async () => {
			// Package-level vetting is not enough: the exact node type has to be one
			// search_nodes could have offered.
			communityNodeTypesService.findVettedNodeType.mockResolvedValue(null);

			const structured = await callExpectingError(`${PACKAGE}.notARealNode`);

			expect(lifecycleService.install).not.toHaveBeenCalled();
			expect(structured.error).toContain('not a node type in the verified community catalog');
		});

		test('refuses a vetted node that is not an official node', async () => {
			// search_nodes filters on isOfficialNode, so installing one it withheld
			// would let the tool bypass discovery.
			communityNodeTypesService.findVettedNodeType.mockResolvedValue(
				catalogEntry({ isOfficialNode: false }),
			);

			const structured = await callExpectingError();

			expect(lifecycleService.install).not.toHaveBeenCalled();
			expect(structured.error).toContain('not an official verified node');
		});

		test('reports an install failure without leaking the npm error text', async () => {
			// The message is built around the npm execFile rejection, so it can carry
			// a private registry URL or a host path. Only the class name is safe.
			lifecycleService.install.mockRejectedValue(
				new Error('npm ERR! 404 --registry=https://npm.internal.example.corp /home/node/.n8n'),
			);

			const structured = await callExpectingError();

			expect(structured.error).not.toContain('npm.internal.example.corp');
			expect(structured.error).not.toContain('/home/node');
			expect(structured.error).toContain('Error');
			expect(structured.hint).toContain('no retry will succeed');
		});

		test('a registry lookup failure is reported as retryable, not as a blocked install', async () => {
			// The narrow try around install() exists for this: a catalog timeout
			// must not inherit the "no retry will succeed" advice.
			communityNodeTypesService.findVettedNodeType.mockRejectedValue(new Error('ETIMEDOUT'));

			const structured = await callExpectingError();

			expect(lifecycleService.install).not.toHaveBeenCalled();
			expect(structured.error).toContain('Could not reach the verified community node catalog');
			expect(structured.hint).toContain('transient');
			expect(structured.hint).not.toContain('no retry will succeed');
		});
	});

	describe('package names with dots', () => {
		test('installs a package whose npm name contains a dot', async () => {
			// npm allows dots, so deriving the package from the node type by
			// splitting on the first dot would ask for `n8n-nodes-chatwoot`.
			const DOTTED_PACKAGE = 'n8n-nodes-chatwoot.io';
			const DOTTED_NODE = `${DOTTED_PACKAGE}.chatwoot`;
			communityNodeTypesService.findVettedNodeType.mockResolvedValue(
				catalogEntry({ name: DOTTED_NODE, packageName: DOTTED_PACKAGE }),
			);
			lifecycleService.install.mockResolvedValue(
				mock<InstalledPackages>({
					packageName: DOTTED_PACKAGE,
					installedVersion: '2.0.0',
					installedNodes: [
						{ type: DOTTED_NODE, latestVersion: 1 },
					] as InstalledPackages['installedNodes'],
				}),
			);

			await call(DOTTED_NODE);

			expect(lifecycleService.install).toHaveBeenCalledWith(
				{ name: DOTTED_PACKAGE, verify: true },
				user,
				'mcp',
			);
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

			await callExpectingError();

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
