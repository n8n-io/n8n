/**
 * Apps tool (spike) — lets the agent register an App and publish the current
 * sandbox workspace's built output as a servable static app.
 *
 * SPIKE SCOPE: no App/AppVersion/AppBinding entities, no auth modes, no
 * bindings allow-list yet — apps are held in-memory for the lifetime of the
 * process and published to a fixed local directory served by a minimal
 * static route (see `packages/cli/src/modules/app-spike/`). Building the
 * app's files and running its build is NOT this tool's job — the agent does
 * that with the existing `workspace_write_file`/`workspace_execute_command`
 * tools per the `app-builder` skill; this tool only registers the App and
 * copies the finished `dist/` out of the sandbox once built.
 */
import { Tool } from '@n8n/agents';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { z } from 'zod';

import { sanitizeInputSchema } from '../agent/sanitize-mcp-schemas';
import type { InstanceAiContext } from '../types';
import { APPS_TOOL_ID } from './tool-ids';

/**
 * SPIKE: a fixed on-disk directory both this tool (writer) and
 * packages/cli's app-spike serving route (reader) agree on. A real
 * implementation stores built files as an AppVersion row instead — see
 * plan.md Phase 0. Overridable via env for local testing.
 */
export const SPIKE_APPS_SERVE_DIR =
	process.env.N8N_APP_SPIKE_SERVE_DIR ?? path.join('/tmp', 'n8n-app-spike-served');

export { APPS_TOOL_ID };

// ── In-memory spike registry — replace with the App/AppVersion entities ────
// (packages/cli/src/modules/apps/) once this moves past the spike stage.
interface SpikeApp {
	id: string;
	namespace: string;
	name: string;
	distDir: string | null;
}
const spikeApps = new Map<string, SpikeApp>();

function slugify(name: string): string {
	return (
		name
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '') || 'app'
	);
}

// ── Action schemas ──────────────────────────────────────────────────────────

const createAction = z.object({
	action: z
		.literal('create')
		.describe('Register a new App. Call once at the start of building an app.'),
	name: z.string().min(1).max(128).describe('App name'),
});

const publishAction = z.object({
	action: z
		.literal('publish')
		.describe(
			'Publish the built app: copies dist/ out of the sandbox workspace and serves it. ' +
				'Run `npm run build` in the workspace first (via workspace_execute_command) so dist/ exists.',
		),
	appId: z.string().describe('ID returned by the create action'),
	distPath: z
		.string()
		.optional()
		.describe(
			'Path to the built dist/ directory inside the workspace, relative to its root. Defaults to "app/dist".',
		),
});

const allActions = [createAction, publishAction] as const;
type FullInput = z.infer<z.ZodDiscriminatedUnion<'action', typeof allActions>>;

// ── Handlers ─────────────────────────────────────────────────────────────────

function handleCreate(input: Extract<FullInput, { action: 'create' }>) {
	const id = crypto.randomUUID();
	const namespace = slugify(input.name);
	spikeApps.set(id, { id, namespace, name: input.name, distDir: null });
	return {
		appId: id,
		namespace,
		message: `Registered app "${input.name}". Build the app's files in the workspace, run its build, then call publish.`,
	};
}

async function handlePublish(
	context: InstanceAiContext,
	input: Extract<FullInput, { action: 'publish' }>,
) {
	const app = spikeApps.get(input.appId);
	if (!app) return { success: false, error: `Unknown appId: ${input.appId}` };

	const filesystem = context.workspace?.filesystem;
	if (!filesystem) {
		return { success: false, error: 'No workspace filesystem attached to this session.' };
	}

	const distPath = input.distPath ?? 'app/dist';
	const entries = await filesystem.readdir(distPath, { recursive: true });
	const fileEntries = entries.filter((e) => e.type === 'file');
	if (fileEntries.length === 0) {
		return {
			success: false,
			error: `No files found under ${distPath}. Did the build actually run and succeed?`,
		};
	}

	// Copy each built file's bytes out of the sandbox onto local disk, under a
	// directory packages/cli's app-spike serving route also reads from. A real
	// implementation stores this as an AppVersion row (packages/cli/src/modules/apps/)
	// instead of the local filesystem — see plan.md Phase 0.
	const appDir = path.join(SPIKE_APPS_SERVE_DIR, app.namespace);
	for (const entry of fileEntries) {
		const content = await filesystem.readFile(`${distPath}/${entry.name}`);
		const localPath = path.join(appDir, entry.name);
		await mkdir(path.dirname(localPath), { recursive: true });
		await writeFile(localPath, content);
	}
	app.distDir = distPath;

	return {
		success: true,
		namespace: app.namespace,
		url: `/apps/${app.namespace}/`,
		fileCount: fileEntries.length,
	};
}

// ── Tool factory ─────────────────────────────────────────────────────────────

export function createAppsTool(context: InstanceAiContext) {
	const inputSchema = sanitizeInputSchema(z.discriminatedUnion('action', [...allActions]));

	return new Tool(APPS_TOOL_ID)
		.description(
			'Register (create) and publish an App built as a real React app in the sandbox workspace. ' +
				"Load `app-builder` via `load_skill` before calling this tool. Building/editing the app's " +
				'own files and running its build is done with workspace_write_file/workspace_execute_command, ' +
				'not this tool — this tool only registers the App and publishes its finished build.',
		)
		.input(inputSchema)
		.handler(async (input: FullInput) => {
			switch (input.action) {
				case 'create':
					return handleCreate(input);
				case 'publish':
					return await handlePublish(context, input);
			}
		})
		.build();
}
