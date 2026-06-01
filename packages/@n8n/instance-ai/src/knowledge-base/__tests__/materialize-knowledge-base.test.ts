import { jsonParse } from 'n8n-workflow';

import {
	buildKnowledgeBaseWorkspaceBundle,
	createPrebakedKnowledgeBaseFromWorkspace,
	KNOWLEDGE_BASE_MANIFEST_FILE,
	loadPrebakedKnowledgeBaseBundle,
	materializeKnowledgeBaseIntoWorkspace,
	SANDBOX_KNOWLEDGE_BASE_DIR,
} from '../materialize-knowledge-base';
import type { SandboxWorkspace } from '../../workspace/sandbox-fs';

const ROOT = '/home/daytona/workspace';

function createSandboxWorkspace(files: Map<string, string>): {
	workspace: SandboxWorkspace;
	writes: Map<string, string>;
} {
	const writes = new Map<string, string>();
	const workspace: SandboxWorkspace = {
		filesystem: {
			provider: 'local',
			writeFile: jest.fn(async (path: string, content: string | Buffer) => {
				writes.set(path, Buffer.isBuffer(content) ? content.toString('utf-8') : content);
			}),
			mkdir: jest.fn(async () => {}),
		},
		sandbox: {
			executeCommand: jest.fn(async (command: string) => {
				const readMatch = /^cat '([^']+)' 2>\/dev\/null$/.exec(command);
				if (readMatch) {
					const content = files.get(readMatch[1]);
					return content === undefined
						? { exitCode: 1, stdout: '', stderr: 'missing' }
						: { exitCode: 0, stdout: content, stderr: '' };
				}

				return { exitCode: 0, stdout: '', stderr: '' };
			}),
		},
	};

	return { workspace, writes };
}

describe('buildKnowledgeBaseWorkspaceBundle', () => {
	it('builds best-practice markdown files, index, and manifest', () => {
		const bundle = buildKnowledgeBaseWorkspaceBundle({ root: ROOT });

		expect(bundle.rootDir).toBe(`${ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}`);
		expect(
			bundle.files.get(`${ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}/best-practices/scheduling.md`),
		).toMatch(/# Best Practices: Scheduling Workflows/);
		expect(
			bundle.files.get(`${ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}/best-practices/index.json`),
		).toBeDefined();
		expect(
			bundle.files.get(`${ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}/${KNOWLEDGE_BASE_MANIFEST_FILE}`),
		).toBeDefined();
		expect(bundle.contentHash).toMatch(/^[a-f0-9]{12}$/);

		const index = jsonParse<{ entries: Array<{ id: string; hasDocumentation: boolean }> }>(
			bundle.files.get(`${ROOT}/${SANDBOX_KNOWLEDGE_BASE_DIR}/best-practices/index.json`) ?? '',
		);
		expect(index.entries.some((entry) => entry.id === 'scheduling' && entry.hasDocumentation)).toBe(
			true,
		);
		expect(
			index.entries.some((entry) => entry.id === 'monitoring' && !entry.hasDocumentation),
		).toBe(true);
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
		const bundle = buildKnowledgeBaseWorkspaceBundle({ root: ROOT });
		const files = new Map<string, string>([
			[bundle.manifestPath, bundle.files.get(bundle.manifestPath) ?? ''],
		]);
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
});
