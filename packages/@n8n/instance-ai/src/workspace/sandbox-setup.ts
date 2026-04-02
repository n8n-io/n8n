/**
 * Sandbox Workspace Setup
 *
 * Handles first-time initialization of the sandbox workspace for the workflow
 * builder agent. Lazy and idempotent — checks for marker file before running.
 *
 * File I/O uses sandbox command execution (works for both Daytona and Local).
 * All files are bundled and sent in a single base64-encoded shell script to
 * minimize round-trips to the sandbox API.
 *
 * Workspace layout (relative to $HOME):
 *   ~/workspace/
 *     package.json                    # @n8n/workflow-sdk dependency
 *     tsconfig.json                   # strict, noEmit, skipLibCheck
 *     node_modules/@n8n/workflow-sdk/ # full SDK with .d.ts types
 *     workflows/                      # existing n8n workflows as JSON
 *     node-types/
 *       index.txt                     # searchable catalog: nodeType | displayName | description | version
 *     src/
 *       workflow.ts                   # agent writes main workflow here
 *     chunks/
 *       *.ts                          # reusable node/workflow modules
 */

import type { Workspace } from '@mastra/core/workspace';

import type { InstanceAiContext, SearchableNodeDescription } from '../types';
import { runInSandbox, readFileViaSandbox, escapeSingleQuotes } from './sandbox-fs';

export const WORKSPACE_DIR = 'workspace';

/** Default home directory inside the n8n sandbox service container. */
export const N8N_SANDBOX_HOME = '/home/user';

/** Absolute workspace root for n8n sandbox service Dockerfile steps (build-time). */
export const N8N_SANDBOX_WORKSPACE_ROOT = `${N8N_SANDBOX_HOME}/${WORKSPACE_DIR}`;

export const PACKAGE_JSON = JSON.stringify(
	{
		name: 'sandbox-workspace',
		private: true,
		dependencies: {
			'@n8n/workflow-sdk': '*',
			tsx: '*',
		},
		devDependencies: {
			'@types/node': '*',
		},
	},
	null,
	2,
);

/**
 * Runner script that executes a workflow TS file via tsx, calls validate() + toJSON(),
 * and outputs structured JSON to stdout. Executed via: node --import tsx build.mjs ./src/workflow.ts
 */
export const BUILD_MJS = `const filePath = process.argv[2] || './src/workflow.ts';
try {
  const mod = await import(filePath);
  const wf = mod.default;
  if (!wf || typeof wf.toJSON !== 'function') {
    console.log(JSON.stringify({ success: false, errors: ['Default export is not a workflow. Make sure your file has: export default workflow(...)'] }));
    process.exit(1);
  }
  const validation = wf.validate();
  const json = wf.toJSON();
  const warnings = [...(validation.errors || []), ...(validation.warnings || [])];
  // Use a replacer to preserve undefined values as null — newCredential() produces
  // NewCredentialImpl which serializes to undefined in toJSON(). Without this,
  // JSON.stringify drops the credential keys entirely and the server can't resolve them.
  const replacer = (k, v) => v === undefined ? null : v;
  console.log(JSON.stringify({ success: true, workflow: json, warnings }, replacer));
} catch (e) {
  console.log(JSON.stringify({ success: false, errors: [e instanceof Error ? e.message : String(e)] }));
  process.exit(1);
}
`;

export const TSCONFIG_JSON = JSON.stringify(
	{
		compilerOptions: {
			strict: true,
			// Disable strictNullChecks because the SDK's ifElse() returns NodeInstance
			// where onTrue?/onFalse? are optional in the type (they're always present at runtime).
			// Without this, tsc rejects `.onTrue()` / `.onFalse()` calls.
			strictNullChecks: false,
			noEmit: true,
			target: 'ES2022',
			module: 'ES2022',
			moduleResolution: 'bundler',
			esModuleInterop: true,
			skipLibCheck: true,
		},
		include: ['src/**/*.ts', 'chunks/**/*.ts'],
	},
	null,
	2,
);

/**
 * Build a searchable catalog line for a node type.
 * Format: nodeType | displayName | description | version | aliases: ...
 */
export function formatNodeCatalogLine(node: SearchableNodeDescription): string {
	const version = Array.isArray(node.version)
		? `v${node.version[node.version.length - 1]}`
		: `v${node.version}`;

	const parts = [node.name, node.displayName, node.description, version];

	if (node.codex?.alias && node.codex.alias.length > 0) {
		parts.push(`aliases: ${node.codex.alias.join(', ')}`);
	}

	return parts.join(' | ');
}

/**
 * Build a shell script that writes all files at once.
 * Each file is base64-encoded and decoded in-place.
 * This sends everything in a single executeCommand call.
 */
function buildBatchWriteScript(root: string, files: Map<string, string>): string {
	const lines: string[] = ['#!/bin/bash', 'set -e'];

	// Collect all unique directories
	const dirs = new Set<string>();
	for (const path of files.keys()) {
		const lastSlash = path.lastIndexOf('/');
		if (lastSlash > 0) {
			dirs.add(path.substring(0, lastSlash));
		}
	}

	// Create all directories in one mkdir call (single-quoted + escaped to prevent shell injection)
	const dirList = [...dirs].map((d) => `'${escapeSingleQuotes(`${root}/${d}`)}'`).join(' ');
	if (dirList) {
		lines.push(
			`mkdir -p '${escapeSingleQuotes(`${root}/src`)}' '${escapeSingleQuotes(`${root}/chunks`)}' ${dirList}`,
		);
	} else {
		lines.push(
			`mkdir -p '${escapeSingleQuotes(`${root}/src`)}' '${escapeSingleQuotes(`${root}/chunks`)}'`,
		);
	}

	// Write each file via base64 decode (single-quoted paths to prevent shell injection)
	for (const [path, content] of files) {
		const b64 = Buffer.from(content, 'utf-8').toString('base64');
		lines.push(`echo '${b64}' | base64 -d > '${escapeSingleQuotes(`${root}/${path}`)}'`);
	}

	return lines.join('\n');
}

/**
 * Resolve the absolute workspace root by querying $HOME from the sandbox.
 * Caches per workspace instance (WeakMap) so parallel sandboxes don't collide.
 */
const workspaceRootCache = new WeakMap<Workspace, string>();

export async function getWorkspaceRoot(workspace: Workspace): Promise<string> {
	const cached = workspaceRootCache.get(workspace);
	if (cached) return cached;
	const result = await runInSandbox(workspace, 'echo $HOME');
	const home = result.stdout.trim() || '/home/daytona';
	const root = `${home}/${WORKSPACE_DIR}`;
	workspaceRootCache.set(workspace, root);
	return root;
}

/**
 * Initialize the sandbox workspace for the workflow builder agent.
 * Idempotent — skips if already initialized (checks marker file).
 *
 * Bundles all config files, workflow JSONs, and the node catalog into a single
 * shell script that runs in one sandbox command to minimize API round-trips.
 *
 * @returns true if initialization ran, false if already initialized
 */
export async function setupSandboxWorkspace(
	workspace: Workspace,
	context: InstanceAiContext,
): Promise<boolean> {
	const root = await getWorkspaceRoot(workspace);
	const markerFile = `${root}/.sandbox-initialized`;

	// Check marker file for idempotency
	const marker = await readFileViaSandbox(workspace, markerFile);
	if (marker !== null) return false;

	// ── Collect all files ──────────────────────────────────────────────────

	const files = new Map<string, string>();

	// Config files
	files.set('package.json', PACKAGE_JSON);
	files.set('tsconfig.json', TSCONFIG_JSON);
	files.set('build.mjs', BUILD_MJS);

	// Node types catalog
	const nodeTypes = await context.nodeService.listSearchable();
	const catalogLines = nodeTypes.map(formatNodeCatalogLine);
	files.set('node-types/index.txt', catalogLines.join('\n'));

	// Existing workflows as JSON (fetch in parallel)
	try {
		const workflows = await context.workflowService.list({ limit: 100 });
		const results = await Promise.allSettled(
			workflows.map(async (summary) => {
				const detail = await context.workflowService.get(summary.id);
				return { id: summary.id, json: JSON.stringify(detail, null, 2) };
			}),
		);
		for (const r of results) {
			if (r.status === 'fulfilled') {
				files.set(`workflows/${r.value.id}.json`, r.value.json);
			}
		}
	} catch {
		// Workflow listing failed — continue without syncing
	}

	// Marker file
	files.set('.sandbox-initialized', new Date().toISOString());

	// ── Send everything in one command ─────────────────────────────────────

	const script = buildBatchWriteScript(root, files);
	const scriptB64 = Buffer.from(script, 'utf-8').toString('base64');

	const result = await runInSandbox(workspace, `echo '${scriptB64}' | base64 -d | bash`);
	if (result.exitCode !== 0) {
		throw new Error(`Sandbox setup failed: ${result.stderr}`);
	}

	// npm install (must run after package.json is in place)
	const npmResult = await runInSandbox(workspace, 'npm install --ignore-scripts', root);
	if (npmResult.exitCode !== 0) {
		throw new Error(`Sandbox npm install failed: ${npmResult.stderr}`);
	}

	return true;
}
