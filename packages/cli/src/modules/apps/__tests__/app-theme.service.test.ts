import type { Workspace } from '@n8n/agents';
import type { AppTheme } from '@n8n/api-types';
import type { User } from '@n8n/db';
import { gunzipSync } from 'node:zlib';
import { create as createTar, Parser } from 'tar';
import { mock } from 'vitest-mock-extended';

import type { AppSourceSnapshotService } from '@/modules/instance-ai/app-preview/app-source-snapshot.service';

import { AppDraftService, patchTarball } from '../app-draft.service';
import type { AppPublishService } from '../app-publish.service';
import { AppThemeService, deriveAppTheme } from '../app-theme.service';
import type { App } from '../app.entity';
import type { AppsService } from '../apps.service';

vi.mock('@n8n/agents/sandbox', () => ({
	getWorkspaceRoot: vi.fn(async () => await Promise.resolve('/home/user/workspace')),
}));

const APP = { id: 'app-1', name: 'Greeter', namespace: 'greeter', activeVersionId: 'v-0' } as App;
const USER = { id: 'user-1' } as User;
const THEME: AppTheme = {
	mode: 'dark',
	vars: { '--primary': 'oklch(0.6 0.2 280)', '--radius': '1rem' },
};
const EXISTING_OVERRIDES = ':root {\n\t--chart-1: #ff00ff;\n\t--primary: #000000;\n}\n';

/** Gzipped tar of `files`, packed the way the sandbox packs a snapshot (`tar -czf … .`). */
async function tgz(files: Record<string, string>): Promise<Buffer> {
	const { mkdtemp, mkdir, writeFile, rm } = await import('node:fs/promises');
	const os = await import('node:os');
	const path = await import('node:path');
	const dir = await mkdtemp(path.join(os.tmpdir(), 'theme-test-'));
	try {
		for (const [file, content] of Object.entries(files)) {
			await mkdir(path.dirname(path.join(dir, file)), { recursive: true });
			await writeFile(path.join(dir, file), content);
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

/** File entries of a gzipped tar, by normalized path. */
async function listFiles(tarball: Buffer): Promise<Record<string, string>> {
	const files: Record<string, string> = {};
	await new Promise<void>((resolve, reject) => {
		const parser = new Parser({
			onReadEntry: (entry) => {
				if (entry.type !== 'File') {
					entry.resume();
					return;
				}
				const chunks: Buffer[] = [];
				entry.on('data', (chunk: Buffer) => chunks.push(chunk));
				entry.on('end', () => {
					files[entry.path.replace(/^\.\//, '')] = Buffer.concat(chunks).toString('utf8');
				});
			},
		});
		parser.on('error', reject);
		parser.on('end', resolve);
		parser.end(gunzipSync(tarball));
	});
	return files;
}

function createService() {
	const appsService = mock<AppsService>();
	appsService.getApp.mockResolvedValue(APP);
	appsService.listVersions.mockResolvedValue([]);
	const snapshotService = mock<AppSourceSnapshotService>();
	const service = new AppThemeService(
		new AppDraftService(appsService, mock<AppPublishService>(), snapshotService),
	);
	return { service, appsService, snapshotService };
}

function createDraft(overrides: { existing?: string } = {}) {
	const filesystem = {
		exists: vi.fn().mockResolvedValue(true),
		readFile: vi.fn().mockResolvedValue(overrides.existing ?? ''),
		writeFile: vi.fn().mockResolvedValue(undefined),
	};
	const workspace = { filesystem } as unknown as Workspace;
	return { draft: workspace, filesystem };
}

describe('deriveAppTheme', () => {
	it('derives primary, contrast foreground, radius and spacing from the settings', () => {
		const theme = deriveAppTheme({
			mode: 'light',
			primary: '#ff6900',
			radius: 8,
			density: 'compact',
		});

		expect(theme.mode).toBe('light');
		expect(theme.settings).toEqual({
			mode: 'light',
			primary: '#ff6900',
			radius: 8,
			density: 'compact',
		});
		expect(theme.vars).toEqual({
			'--primary': '#ff6900',
			'--primary-foreground': '#fafafa',
			'--ring': '#ff6900',
			'--radius': '8px',
			'--space-unit': '0.2rem',
		});
		expect(theme.darkVars).toBeUndefined();
	});

	it('picks dark text over a light primary and the template defaults when unset', () => {
		const theme = deriveAppTheme({ mode: 'system', primary: '#fde68a' });

		expect(theme.vars['--primary-foreground']).toBe('#0a0a0a');
		expect(theme.vars['--radius']).toBe('4px');
		expect(theme.vars['--space-unit']).toBe('0.25rem');
		expect(theme.vars['--font-sans']).toBeUndefined();
	});

	it('tints light and dark surfaces with the primary hue', () => {
		const theme = deriveAppTheme({ mode: 'system', primary: '#4f46e5', tone: 'tinted' });

		// Indigo sits near 275° in OKLCH; every surface shares that hue at low chroma.
		expect(theme.vars['--background']).toMatch(/^oklch\(98\.20% 0\.00\d+ 27\d\.\d+\)$/);
		expect(theme.vars['--border']).toMatch(/^oklch\(90\.50% /);
		expect(theme.darkVars?.['--background']).toMatch(/^oklch\(22\.00% /);
		expect(theme.darkVars?.['--card']).toMatch(/^oklch\(25\.00% /);
	});

	it('keeps a gray primary from tinting anything', () => {
		const theme = deriveAppTheme({ mode: 'system', primary: '#18181b', tone: 'tinted' });

		expect(theme.vars['--background']).toMatch(/^oklch\(98\.20% 0\.000\d /);
	});
});

describe('AppThemeService', () => {
	it('drops the previously derived keys before merging a derived theme, and writes a .dark block', async () => {
		const { service } = createService();
		const { draft, filesystem } = createDraft({
			existing:
				':root {\n\t--chart-1: #ff00ff;\n\t--background: oklch(1 0 0);\n}\n.dark {\n\t--chart-1: #00ff00;\n\t--background: oklch(0 0 0);\n}\n',
		});

		await service.applyTheme(
			'app-1',
			{
				mode: 'dark',
				settings: { mode: 'dark', primary: '#000000' },
				vars: { '--primary': '#000000' },
				darkVars: { '--card': 'oklch(0.2 0 0)' },
			},
			USER,
			{ draft },
		);

		const written = filesystem.writeFile.mock.calls.find(([file]) =>
			String(file).endsWith('theme-overrides.css'),
		)?.[1] as string;
		expect(written).toBe(
			':root {\n\t--chart-1: #ff00ff;\n\t--primary: #000000;\n}\n.dark {\n\t--chart-1: #00ff00;\n\t--card: oklch(0.2 0 0);\n}\n',
		);
	});

	describe('with the app sandbox', () => {
		it('writes both theme files into the app directory and snapshots the draft', async () => {
			const { service, appsService, snapshotService } = createService();
			const { draft, filesystem } = createDraft();
			appsService.listVersions.mockResolvedValue([{ id: 's-9' }] as never);

			const result = await service.applyTheme('app-1', THEME, USER, { draft });

			// The scoped workspace resolves root-relative paths and forwards its own options.
			expect(filesystem.exists).toHaveBeenCalledWith(
				'/home/user/workspace/apps/greeter/package.json',
				undefined,
			);
			expect(filesystem.writeFile).toHaveBeenCalledWith(
				'/home/user/workspace/apps/greeter/src/theme-overrides.css',
				':root {\n\t--primary: oklch(0.6 0.2 280);\n\t--radius: 1rem;\n}\n',
				undefined,
			);
			expect(filesystem.writeFile).toHaveBeenCalledWith(
				'/home/user/workspace/apps/greeter/src/theme-mode.ts',
				"export const THEME_MODE: 'light' | 'dark' | 'system' = 'dark';\n",
				undefined,
			);
			expect(snapshotService.snapshotAfterRun).toHaveBeenCalledWith('app-1', USER, draft);
			expect(appsService.getSourceTarball).not.toHaveBeenCalled();
			expect(appsService.createSourceSnapshot).not.toHaveBeenCalled();
			expect(result).toEqual({ versionId: 's-9' });
		});

		it('merges onto the variables already in theme-overrides.css', async () => {
			const { service } = createService();
			const { draft, filesystem } = createDraft({ existing: EXISTING_OVERRIDES });

			await service.applyTheme('app-1', THEME, USER, { draft });

			const written = filesystem.writeFile.mock.calls.find(([file]) =>
				String(file).endsWith('theme-overrides.css'),
			)?.[1] as string;
			expect(written).toContain('--chart-1: #ff00ff;');
			expect(written).toContain('--primary: oklch(0.6 0.2 280);');
			expect(written).not.toContain('#000000');
		});
	});

	describe('without a sandbox', () => {
		it('patches the theme files into the newest stored source and stores it as a snapshot', async () => {
			const { service, appsService, snapshotService } = createService();
			const original = {
				'package.json': '{ "name": "greeter" }',
				'src/main.ts': 'export {};',
				'src/theme-overrides.css': EXISTING_OVERRIDES,
				'src/theme-mode.ts': "export const THEME_MODE: 'light' | 'dark' | 'system' = 'light';\n",
				'src/pages/Home.vue': '<template><h1>Hi</h1></template>',
			};
			appsService.getSourceTarball.mockResolvedValue({
				versionId: 'v-3',
				data: await tgz(original),
			});
			appsService.createSourceSnapshot.mockResolvedValue({ id: 's-4' } as never);

			const result = await service.applyTheme('app-1', THEME, USER);

			expect(result).toEqual({ versionId: 's-4' });
			expect(snapshotService.snapshotAfterRun).not.toHaveBeenCalled();
			const [appId, patched] = appsService.createSourceSnapshot.mock.calls[0];
			expect(appId).toBe('app-1');
			expect(await listFiles(patched)).toEqual({
				...original,
				'src/theme-overrides.css':
					':root {\n\t--chart-1: #ff00ff;\n\t--primary: oklch(0.6 0.2 280);\n\t--radius: 1rem;\n}\n',
				'src/theme-mode.ts': "export const THEME_MODE: 'light' | 'dark' | 'system' = 'dark';\n",
			});
		});

		it('adds the theme files to a source that has none', async () => {
			const patched = await patchTarball(await tgz({ 'package.json': '{}' }), async () => ({
				'src/theme-overrides.css': ':root {}\n',
				'src/theme-mode.ts': 'export const THEME_MODE = "system";\n',
			}));

			expect(await listFiles(patched)).toEqual({
				'package.json': '{}',
				'src/theme-overrides.css': ':root {}\n',
				'src/theme-mode.ts': 'export const THEME_MODE = "system";\n',
			});
		});

		it('reports an app without any stored source', async () => {
			const { service, appsService } = createService();
			appsService.getSourceTarball.mockResolvedValue(null);

			const result = await service.applyTheme('app-1', THEME, USER);

			expect(result).toEqual({ error: true, message: expect.stringContaining('no source yet') });
			expect(appsService.createSourceSnapshot).not.toHaveBeenCalled();
		});
	});
});
