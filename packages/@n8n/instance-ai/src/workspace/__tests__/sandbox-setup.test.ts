import type { Workspace } from '@mastra/core/workspace';
import { jsonParse } from 'n8n-workflow';

import type { InstanceAiContext, SearchableNodeDescription } from '../../types';
import type { setupSandboxWorkspace as setupSandboxWorkspaceFunction } from '../sandbox-setup';
import { formatNodeCatalogLine } from '../sandbox-setup';

type SetupSandboxWorkspace = typeof setupSandboxWorkspaceFunction;
type RunInSandboxMock = jest.Mock<
	Promise<{ exitCode: number; stdout: string; stderr: string }>,
	[Workspace, string, string?]
>;
type ReadFileViaSandboxMock = jest.Mock<Promise<string | null>, [Workspace, string]>;

function createSetupContext(): InstanceAiContext {
	return {
		nodeService: {
			listSearchable: jest.fn().mockResolvedValue([]),
		},
		workflowService: {
			list: jest.fn().mockResolvedValue([]),
		},
	} as unknown as InstanceAiContext;
}

function createLocalWorkspace(
	writeFile: jest.Mock<Promise<void>, [string, string, { recursive: true }]>,
): Workspace {
	return {
		filesystem: {
			provider: 'local',
			basePath: '/sandbox',
			writeFile,
		},
	} as unknown as Workspace;
}

function loadSetupSandboxWorkspaceWithFsMocks(
	runInSandbox: RunInSandboxMock,
	readFileViaSandbox: ReadFileViaSandboxMock,
): SetupSandboxWorkspace {
	jest.resetModules();
	jest.doMock('../sandbox-fs', () => ({
		runInSandbox,
		readFileViaSandbox,
		escapeSingleQuotes: (value: string) => value.replace(/'/g, "'\\''"),
	}));

	let sandboxSetup: { setupSandboxWorkspace: SetupSandboxWorkspace } | undefined;
	jest.isolateModules(() => {
		// eslint-disable-next-line @typescript-eslint/no-require-imports
		sandboxSetup = require('../sandbox-setup') as {
			setupSandboxWorkspace: SetupSandboxWorkspace;
		};
	});

	if (!sandboxSetup) throw new Error('Failed to load sandbox setup module');
	return sandboxSetup.setupSandboxWorkspace;
}

function loadSandboxPackageJson(linkSdk: boolean): {
	dependencies: Record<string, string>;
	devDependencies: Record<string, string>;
} {
	jest.resetModules();
	if (linkSdk) {
		process.env.N8N_INSTANCE_AI_SANDBOX_LINK_SDK = '1';
	} else {
		delete process.env.N8N_INSTANCE_AI_SANDBOX_LINK_SDK;
	}

	let packageJson = '';
	jest.isolateModules(() => {
		const sandboxSetup = jest.requireActual<{ PACKAGE_JSON: string }>('../sandbox-setup');
		packageJson = sandboxSetup.PACKAGE_JSON;
	});

	return jsonParse<{
		dependencies: Record<string, string>;
		devDependencies: Record<string, string>;
	}>(packageJson);
}

describe('PACKAGE_JSON', () => {
	const originalLinkSdk = process.env.N8N_INSTANCE_AI_SANDBOX_LINK_SDK;

	afterEach(() => {
		jest.resetModules();
		if (originalLinkSdk === undefined) {
			delete process.env.N8N_INSTANCE_AI_SANDBOX_LINK_SDK;
		} else {
			process.env.N8N_INSTANCE_AI_SANDBOX_LINK_SDK = originalLinkSdk;
		}
	});

	it('should include a registry SDK dependency when workspace SDK linking is disabled', () => {
		const packageJson = loadSandboxPackageJson(false);

		expect(packageJson.dependencies['@n8n/workflow-sdk']).toBeDefined();
		expect(packageJson.dependencies.tsx).toBeDefined();
	});

	it('should omit the registry SDK dependency when workspace SDK linking is enabled', () => {
		const packageJson = loadSandboxPackageJson(true);

		expect(packageJson.dependencies).not.toHaveProperty('@n8n/workflow-sdk');
		expect(packageJson.dependencies.tsx).toBeDefined();
	});
});

describe('setupSandboxWorkspace', () => {
	afterEach(() => {
		jest.dontMock('../sandbox-fs');
		jest.resetModules();
	});

	it('writes the initialized marker only after workspace files and npm install succeed', async () => {
		const runInSandbox: RunInSandboxMock = jest.fn<
			Promise<{ exitCode: number; stdout: string; stderr: string }>,
			[Workspace, string, string?]
		>();
		runInSandbox.mockResolvedValue({ exitCode: 0, stdout: '', stderr: '' });
		const readFileViaSandbox: ReadFileViaSandboxMock = jest.fn<
			Promise<string | null>,
			[Workspace, string]
		>();
		readFileViaSandbox.mockResolvedValue(null);
		const setupSandboxWorkspace = loadSetupSandboxWorkspaceWithFsMocks(
			runInSandbox,
			readFileViaSandbox,
		);
		const writeFile = jest.fn<Promise<void>, [string, string, { recursive: true }]>(async () => {});

		await setupSandboxWorkspace(createLocalWorkspace(writeFile), createSetupContext());

		const markerCallIndex = writeFile.mock.calls.findIndex(
			([path]) => path === '/sandbox/.sandbox-initialized',
		);
		expect(markerCallIndex).toBeGreaterThan(-1);
		expect(writeFile.mock.invocationCallOrder[markerCallIndex]).toBeGreaterThan(
			runInSandbox.mock.invocationCallOrder[0],
		);
	});

	it('does not write the initialized marker when npm install fails', async () => {
		const runInSandbox: RunInSandboxMock = jest.fn<
			Promise<{ exitCode: number; stdout: string; stderr: string }>,
			[Workspace, string, string?]
		>();
		runInSandbox.mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'install failed' });
		const readFileViaSandbox: ReadFileViaSandboxMock = jest.fn<
			Promise<string | null>,
			[Workspace, string]
		>();
		readFileViaSandbox.mockResolvedValue(null);
		const setupSandboxWorkspace = loadSetupSandboxWorkspaceWithFsMocks(
			runInSandbox,
			readFileViaSandbox,
		);
		const writeFile = jest.fn<Promise<void>, [string, string, { recursive: true }]>(async () => {});

		await expect(
			setupSandboxWorkspace(createLocalWorkspace(writeFile), createSetupContext()),
		).rejects.toThrow('Sandbox npm install failed');

		expect(writeFile.mock.calls).not.toContainEqual([
			'/sandbox/.sandbox-initialized',
			expect.any(String),
			{ recursive: true },
		]);
	});
});

describe('formatNodeCatalogLine', () => {
	it('should format a basic node with a string version', () => {
		const node: SearchableNodeDescription = {
			name: 'n8n-nodes-base.httpRequest',
			displayName: 'HTTP Request',
			description: 'Makes an HTTP request and returns the response data',
			version: 1,
			inputs: ['main'],
			outputs: ['main'],
		};

		const result = formatNodeCatalogLine(node);

		expect(result).toBe(
			'n8n-nodes-base.httpRequest | HTTP Request | Makes an HTTP request and returns the response data | v1',
		);
	});

	it('should pick the last element when version is an array', () => {
		const node: SearchableNodeDescription = {
			name: 'n8n-nodes-base.slack',
			displayName: 'Slack',
			description: 'Send messages to Slack',
			version: [1, 2, 3],
			inputs: ['main'],
			outputs: ['main'],
		};

		const result = formatNodeCatalogLine(node);

		expect(result).toBe('n8n-nodes-base.slack | Slack | Send messages to Slack | v3');
	});

	it('should append aliases when codex.alias is present and non-empty', () => {
		const node: SearchableNodeDescription = {
			name: 'n8n-nodes-base.gmail',
			displayName: 'Gmail',
			description: 'Send and receive emails via Gmail',
			version: 2,
			inputs: ['main'],
			outputs: ['main'],
			codex: { alias: ['email', 'google mail'] },
		};

		const result = formatNodeCatalogLine(node);

		expect(result).toBe(
			'n8n-nodes-base.gmail | Gmail | Send and receive emails via Gmail | v2 | aliases: email, google mail',
		);
	});

	it('should not append aliases when codex.alias is an empty array', () => {
		const node: SearchableNodeDescription = {
			name: 'n8n-nodes-base.set',
			displayName: 'Set',
			description: 'Sets values on items',
			version: 1,
			inputs: ['main'],
			outputs: ['main'],
			codex: { alias: [] },
		};

		const result = formatNodeCatalogLine(node);

		expect(result).toBe('n8n-nodes-base.set | Set | Sets values on items | v1');
	});

	it('should not append aliases when codex is present but alias is undefined', () => {
		const node: SearchableNodeDescription = {
			name: 'n8n-nodes-base.noOp',
			displayName: 'No Operation',
			description: 'Does nothing',
			version: 1,
			inputs: ['main'],
			outputs: ['main'],
			codex: {},
		};

		const result = formatNodeCatalogLine(node);

		expect(result).toBe('n8n-nodes-base.noOp | No Operation | Does nothing | v1');
	});

	it('should handle pipe characters in description (documents current behavior)', () => {
		// The pipe character in the description is not escaped, which means
		// the catalog line becomes ambiguous when parsed by splitting on " | ".
		// This test documents the current behavior.
		const node: SearchableNodeDescription = {
			name: 'n8n-nodes-base.ifNode',
			displayName: 'IF',
			description: 'Route items based on true | false condition',
			version: 1,
			inputs: ['main'],
			outputs: ['main'],
		};

		const result = formatNodeCatalogLine(node);

		expect(result).toBe(
			'n8n-nodes-base.ifNode | IF | Route items based on true | false condition | v1',
		);

		// Splitting on ' | ' yields 5 parts instead of 4 due to unescaped pipe in description
		const parts = result.split(' | ');
		expect(parts).toHaveLength(5);
	});

	it('should handle a single-element version array', () => {
		const node: SearchableNodeDescription = {
			name: 'n8n-nodes-base.code',
			displayName: 'Code',
			description: 'Run custom JavaScript code',
			version: [2],
			inputs: ['main'],
			outputs: ['main'],
		};

		const result = formatNodeCatalogLine(node);

		expect(result).toBe('n8n-nodes-base.code | Code | Run custom JavaScript code | v2');
	});
});
