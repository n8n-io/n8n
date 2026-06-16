import { jsonParse } from 'n8n-workflow';

import type { SandboxWorkspace } from '../../workspace/sandbox-fs';
import {
	buildKnowledgeBaseWorkspaceBundle,
	KNOWLEDGE_BASE_INDEX_FILE,
	KNOWLEDGE_BASE_MANIFEST_FILE,
	KNOWLEDGE_BASE_TEMPLATES_DIR,
	loadPrebakedKnowledgeBaseBundle,
	materializeKnowledgeBaseIntoWorkspace,
	SANDBOX_KNOWLEDGE_BASE_DIR,
} from '../materialize-knowledge-base';
import { makeBuilderTemplatesTarGz } from './builder-templates-archive.fixtures';

const ROOT = '/home/daytona/workspace';

function createSandboxWorkspace(files: Map<string, string>): {
	workspace: SandboxWorkspace;
	writes: Map<string, string>;
} {
	const writes = new Map<string, string>();
	const workspace: SandboxWorkspace = {
		filesystem: {
			provider: 'local',
			writeFile: vi.fn(async (path: string, content: string | Buffer) => {
				writes.set(path, Buffer.isBuffer(content) ? content.toString('utf-8') : content);
				await Promise.resolve();
			}),
			mkdir: vi.fn(async () => await Promise.resolve()),
		},
		sandbox: {
			executeCommand: vi.fn(async (command: string) => {
				const readMatch = /^cat '([^']+)' 2>\/dev\/null$/.exec(command);
				if (readMatch) {
					const content = files.get(readMatch[1]);
					return await Promise.resolve(
						content === undefined
							? { exitCode: 1, stdout: '', stderr: 'missing' }
							: { exitCode: 0, stdout: content, stderr: '' },
					);
				}

				return await Promise.resolve({ exitCode: 0, stdout: '', stderr: '' });
			}),
		},
	};

	return { workspace, writes };
}

describe('buildKnowledgeBaseWorkspaceBundle', () => {
	it('builds best-practice markdown files, section indexes, root index, and manifest v4', async () => {
		const bundle = await buildKnowledgeBaseWorkspaceBundle({ root: ROOT });

		expect(bundle.rootDir).toBe(`${ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}`);
		expect(
			bundle.files.get(`${ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}/best-practices/scheduling.md`),
		).toMatch(/# Best Practices: Scheduling Workflows/);
		expect(
			bundle.files.get(`${ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}/best-practices/index.json`),
		).toBeDefined();
		expect(
			bundle.files.get(`${ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}/${KNOWLEDGE_BASE_INDEX_FILE}`),
		).toBeDefined();
		const manifest = jsonParse<{
			schemaVersion: number;
			contentHash: string;
		}>(
			bundle.files.get(`${ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}/${KNOWLEDGE_BASE_MANIFEST_FILE}`) ??
				'',
		);
		expect(manifest.schemaVersion).toBe(4);
		expect(manifest.contentHash).toBe(bundle.contentHash);
		expect(bundle.contentHash).toMatch(/^[a-f0-9]{12}$/);

		const bestPracticesIndex = jsonParse<{
			entries: Array<{ id: string; hasDocumentation: boolean }>;
		}>(bundle.files.get(`${ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}/best-practices/index.json`) ?? '');
		expect(
			bestPracticesIndex.entries.some(
				(entry) => entry.id === 'scheduling' && entry.hasDocumentation,
			),
		).toBe(true);
		expect(
			bestPracticesIndex.entries.some(
				(entry) => entry.id === 'monitoring' && !entry.hasDocumentation,
			),
		).toBe(true);

		expect(
			bundle.files.get(
				`${ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}/reference/trigger-input-data-shapes.md`,
			),
		).toContain('# Per-trigger `inputData` shape');
		expect(
			bundle.files.get(
				`${ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}/reference/workflow-builder-guardrails.md`,
			),
		).toContain('# Workflow Builder Guardrails');

		expect(
			bundle.files.get(`${ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}/reference/workflow-sdk-language.md`),
		).toContain('# Workflow SDK language reference');

		const rootIndex = jsonParse<{
			bestPractices: { indexFile: string; entries: Array<{ id: string }> };
			templates: { indexFile: string; entries: unknown[] };
			reference: { indexFile: string; entries: Array<{ id: string; file: string }> };
		}>(
			bundle.files.get(`${ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}/${KNOWLEDGE_BASE_INDEX_FILE}`) ?? '',
		);
		expect(rootIndex.bestPractices.indexFile).toBe('best-practices/index.json');
		expect(rootIndex.templates.indexFile).toBe('templates/index.json');
		expect(rootIndex.reference.indexFile).toBe('reference/index.json');
		expect(rootIndex.templates.entries).toEqual([]);
		expect(rootIndex.reference.entries).toEqual([
			expect.objectContaining({
				id: 'trigger-input-data-shapes',
				file: 'reference/trigger-input-data-shapes.md',
			}),
			expect.objectContaining({
				id: 'workflow-builder-guardrails',
				file: 'reference/workflow-builder-guardrails.md',
			}),
			expect.objectContaining({
				id: 'workflow-sdk-language',
				file: 'reference/workflow-sdk-language.md',
			}),
		]);
		expect(rootIndex.bestPractices.entries.some((entry) => entry.id === 'scheduling')).toBe(true);
		expect(bundle.indexPath).toBe(
			`${ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}/${KNOWLEDGE_BASE_INDEX_FILE}`,
		);
	});

	it('materializes CDN index.txt archives as templates/index.json', async () => {
		const archive = makeBuilderTemplatesTarGz([
			{ name: 'index.txt', content: 'example.ts | Example template' },
			{ name: 'example.ts', content: 'export default {};' },
		]);
		const bundle = await buildKnowledgeBaseWorkspaceBundle({
			root: ROOT,
			templatesArchive: archive,
		});

		const templatesIndex = jsonParse<{ entries: Array<{ id: string; description: string }> }>(
			bundle.files.get(
				`${ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}/${KNOWLEDGE_BASE_TEMPLATES_DIR}/index.json`,
			) ?? '',
		);
		expect(templatesIndex.entries).toEqual([
			{
				id: 'example',
				description: 'Example template',
				file: 'templates/example.ts',
			},
		]);
		expect(
			bundle.files.has(
				`${ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}/${KNOWLEDGE_BASE_TEMPLATES_DIR}/index.txt`,
			),
		).toBe(false);
	});

	it('materializes templates as index.json and includes them in the root index', async () => {
		const withoutTemplates = await buildKnowledgeBaseWorkspaceBundle({ root: ROOT });
		const archive = makeBuilderTemplatesTarGz([
			{
				name: 'index.json',
				content: JSON.stringify({
					entries: [
						{
							id: 'example',
							description: 'Example template',
							file: 'templates/example.ts',
						},
					],
				}),
			},
			{ name: 'example.ts', content: 'export default {};' },
		]);
		const withTemplates = await buildKnowledgeBaseWorkspaceBundle({
			root: ROOT,
			templatesArchive: archive,
		});

		const templatesIndex = jsonParse<{
			entries: Array<{ id: string; description: string; file: string }>;
		}>(
			withTemplates.files.get(
				`${ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}/${KNOWLEDGE_BASE_TEMPLATES_DIR}/index.json`,
			) ?? '',
		);
		expect(templatesIndex.entries).toEqual([
			{
				id: 'example',
				description: 'Example template',
				file: 'templates/example.ts',
			},
		]);
		expect(
			withTemplates.files.get(
				`${ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}/${KNOWLEDGE_BASE_TEMPLATES_DIR}/example.ts`,
			),
		).toBe('export default {};\n');
		expect(
			withTemplates.files.has(
				`${ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}/${KNOWLEDGE_BASE_TEMPLATES_DIR}/index.json`,
			),
		).toBe(true);

		const rootIndex = jsonParse<{
			templates: { entries: Array<{ id: string }> };
		}>(
			withTemplates.files.get(
				`${ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}/${KNOWLEDGE_BASE_INDEX_FILE}`,
			) ?? '',
		);
		expect(rootIndex.templates.entries).toEqual([
			{
				id: 'example',
				description: 'Example template',
				file: 'templates/example.ts',
			},
		]);
		expect(withTemplates.contentHash).not.toBe(withoutTemplates.contentHash);
	});
});

describe('materializeKnowledgeBaseIntoWorkspace', () => {
	it('writes knowledge base files when no prebaked manifest exists', async () => {
		const { workspace, writes } = createSandboxWorkspace(new Map());

		const bundle = await materializeKnowledgeBaseIntoWorkspace({
			workspace,
			root: ROOT,
		});

		expect(bundle.files.size).toBeGreaterThan(0);
		expect(writes.has(bundle.manifestPath)).toBe(true);
		expect(writes.has(bundle.indexPath)).toBe(true);
	});

	it('reuses prebaked knowledge base when the manifest hash matches', async () => {
		const bundle = await buildKnowledgeBaseWorkspaceBundle({ root: ROOT });
		const files = new Map<string, string>();
		for (const [path, content] of bundle.files) {
			files.set(path, content);
		}
		const { workspace, writes } = createSandboxWorkspace(files);

		const prebaked = await loadPrebakedKnowledgeBaseBundle({
			workspace,
			root: ROOT,
		});
		const materialized = await materializeKnowledgeBaseIntoWorkspace({
			workspace,
			root: ROOT,
		});

		expect(prebaked?.contentHash).toBe(bundle.contentHash);
		expect(materialized.contentHash).toBe(bundle.contentHash);
		expect(writes.size).toBe(0);
	});

	it('rematerializes when prebaked manifest exists but payload is incomplete', async () => {
		const bundle = await buildKnowledgeBaseWorkspaceBundle({ root: ROOT });
		const files = new Map<string, string>([
			[bundle.manifestPath, bundle.files.get(bundle.manifestPath) ?? ''],
		]);
		const { workspace, writes } = createSandboxWorkspace(files);

		const materialized = await materializeKnowledgeBaseIntoWorkspace({
			workspace,
			root: ROOT,
		});

		expect(materialized.contentHash).toBe(bundle.contentHash);
		expect(writes.has(bundle.indexPath)).toBe(true);
		expect(writes.size).toBeGreaterThan(1);
	});
});
