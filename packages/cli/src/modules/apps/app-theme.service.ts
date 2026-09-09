import { createScopedWorkspace } from '@n8n/agents';
import { getWorkspaceRoot } from '@n8n/agents/sandbox';
import type { AppTheme } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { create as createTar, extract as extractTar } from 'tar';

import { AppSourceSnapshotService } from '@/modules/instance-ai/app-preview/app-source-snapshot.service';

import type { AppPublishDraft } from './app-publish.service';
import { AppsService } from './apps.service';
import { createDistTarFilter } from './serving/dist-tar-filter';

/** Same budget `AppVersionService` accepts for a source upload. */
const SOURCE_TAR_LIMITS = { maxEntries: 50_000, maxBytes: 200 * 1024 * 1024 };

const OVERRIDES_FILE = 'src/theme-overrides.css';
const MODE_FILE = 'src/theme-mode.ts';

export type ThemeSaveResult = { versionId: string | null } | { error: true; message: string };

function themeOverridesCss(vars: Record<string, string>): string {
	const entries = Object.entries(vars);
	if (entries.length === 0) return '';
	const declarations = entries.map(([key, value]) => `\t${key}: ${value};`).join('\n');
	return `:root {\n${declarations}\n}\n`;
}

/**
 * Reads back whatever CSS custom properties are already in theme-overrides.css —
 * Instance AI can edit that file directly with its own variables, and a Theme-tab
 * save must not erase them. Simple regex, not a CSS parser: this file is only ever
 * hand-edited (by the agent) or written by `themeOverridesCss` above, both of which
 * stick to flat `--name: value;` declarations.
 */
function parseThemeOverridesCss(content: string): Record<string, string> {
	const vars: Record<string, string> = {};
	for (const match of content.matchAll(/(--[a-zA-Z0-9-]+)\s*:\s*([^;]+);/g)) {
		vars[match[1]] = match[2].trim();
	}
	return vars;
}

function themeModeTs(theme: AppTheme): string {
	return `export const THEME_MODE: 'light' | 'dark' | 'system' = '${theme.mode}';\n`;
}

const themeFiles = (existingOverrides: string, theme: AppTheme) => ({
	[OVERRIDES_FILE]: themeOverridesCss({
		...parseThemeOverridesCss(existingOverrides),
		...theme.vars,
	}),
	[MODE_FILE]: themeModeTs(theme),
});

/**
 * Writes a saved theme into the app's draft source. Nothing is built or
 * published: with the thread's live sandbox the files land in the app
 * directory (the dev server reloads them) and the draft is snapshotted;
 * otherwise the newest stored source is patched into a new snapshot. The
 * user publishes explicitly afterwards.
 */
@Service()
export class AppThemeService {
	constructor(
		private readonly appsService: AppsService,
		private readonly snapshotService: AppSourceSnapshotService,
	) {}

	async applyTheme(
		appId: string,
		theme: AppTheme,
		user: User,
		options: { draft?: AppPublishDraft } = {},
	): Promise<ThemeSaveResult> {
		const app = await this.appsService.getApp(appId);

		if (options.draft) {
			const written = await this.writeIntoDraft(app.namespace, theme, options.draft);
			if (written) {
				await this.snapshotService.snapshotAfterRun(
					options.draft.threadId,
					user,
					options.draft.workspace,
				);
				const [newest] = await this.appsService.listVersions(appId);
				return { versionId: newest?.id ?? null };
			}
		}

		const source = await this.appsService.getSourceTarball(appId);
		if (!source) {
			return {
				error: true,
				message: `App "${app.name}" has no source yet. Ask the AI Assistant to create it, then save the theme again.`,
			};
		}
		const patched = await patchTarball(source.data, (existingOverrides) =>
			themeFiles(existingOverrides, theme),
		);
		const version = await this.appsService.createSourceSnapshot(appId, patched);
		return { versionId: version.id };
	}

	/** False when the thread sandbox does not hold this app, so the stored source is patched instead. */
	private async writeIntoDraft(
		namespace: string,
		theme: AppTheme,
		draft: AppPublishDraft,
	): Promise<boolean> {
		// Handlers pass root-relative paths; the raw thread workspace resolves against `/`.
		const root = await getWorkspaceRoot(draft.workspace);
		const filesystem = createScopedWorkspace(draft.workspace, root).filesystem;
		if (!filesystem) return false;

		const appDir = `apps/${namespace}`;
		if (!(await filesystem.exists(`${appDir}/package.json`))) return false;

		const existing = await filesystem.readFile(`${appDir}/${OVERRIDES_FILE}`).catch(() => '');
		const files = themeFiles(
			Buffer.isBuffer(existing) ? existing.toString('utf8') : (existing ?? ''),
			theme,
		);
		await Promise.all(
			Object.entries(files).map(
				async ([file, content]) => await filesystem.writeFile(`${appDir}/${file}`, content),
			),
		);
		return true;
	}
}

/**
 * Unpacks the source into a fresh temp directory, replaces the theme files and
 * packs it again. `tar` has no in-memory entry API, and extracting keeps every
 * other entry (modes, mtimes) as it was. Links and out-of-tree paths are dropped
 * by the same filter the dist extraction uses.
 */
export async function patchTarball(
	tarball: Buffer,
	filesFor: (existingOverrides: string) => Record<string, string>,
): Promise<Buffer> {
	const dir = await mkdtemp(path.join(os.tmpdir(), 'n8n-app-theme-'));
	try {
		await new Promise<void>((resolve, reject) => {
			const unpack = extractTar({ cwd: dir, filter: createDistTarFilter(SOURCE_TAR_LIMITS) });
			unpack.on('error', reject);
			unpack.on('end', resolve);
			unpack.end(tarball);
		});
		const existingOverrides = await readFile(path.join(dir, OVERRIDES_FILE), 'utf8').catch(
			() => '',
		);
		for (const [file, content] of Object.entries(filesFor(existingOverrides))) {
			const target = path.join(dir, file);
			await mkdir(path.dirname(target), { recursive: true });
			await writeFile(target, content);
		}
		const chunks: Buffer[] = [];
		for await (const chunk of createTar({ gzip: true, cwd: dir, portable: true }, ['.'])) {
			chunks.push(chunk);
		}
		return Buffer.concat(chunks);
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
}
