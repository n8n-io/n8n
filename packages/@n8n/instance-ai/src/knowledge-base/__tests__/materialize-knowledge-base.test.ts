import type { Workspace, WorkspaceSandbox } from '@n8n/agents';
import { bestPracticesRegistry } from '@n8n/workflow-sdk/prompts/best-practices';
import { jsonParse } from 'n8n-workflow';

import {
	BEST_PRACTICE_FILE_NAME,
	buildDefaultKnowledgeBaseEnv,
	N8N_KNOWLEDGE_BASE_DIR_ENV,
	N8N_WORKSPACE_DIR_ENV,
	RUNTIME_KB_MANIFEST_FILE,
	RUNTIME_KB_MANIFEST_SCHEMA_VERSION,
	SANDBOX_KB_REGISTRY_FILE,
	SANDBOX_KNOWLEDGE_BASE_DIR,
	buildKnowledgeBaseWorkspaceBundle,
	materializeKnowledgeBaseIntoWorkspace,
	resolveKnowledgeBaseRoot,
} from '../materialize-knowledge-base';
import { loadInstanceAiBestPracticeSource } from '../runtime-best-practices';

function createMockWorkspace() {
	const writes = new Map<string, string>();
	const writeFile = jest.fn(async (path: string, content: string | Buffer) => {
		writes.set(path, Buffer.isBuffer(content) ? content.toString('utf-8') : content);
		await Promise.resolve();
	});
	const readFile = jest.fn(async (path: string) => {
		const content = writes.get(path);
		if (content === undefined) throw new Error(`ENOENT: ${path}`);
		return await Promise.resolve(content);
	});
	const executeCommand = jest.fn<
		ReturnType<NonNullable<WorkspaceSandbox['executeCommand']>>,
		Parameters<NonNullable<WorkspaceSandbox['executeCommand']>>
	>(
		async () =>
			await Promise.resolve({
				success: true,
				exitCode: 0,
				stdout: '',
				stderr: '',
				executionTimeMs: 0,
			}),
	);

	return {
		executeCommand,
		writes,
		workspace: {
			filesystem: { readFile, writeFile },
			sandbox: { executeCommand },
		} as unknown as Workspace,
	};
}

describe('buildDefaultKnowledgeBaseEnv', () => {
	it('defaults N8N_KNOWLEDGE_BASE_DIR to <workspace-root>/knowledge-base', () => {
		const root = '/home/daytona/workspace';

		expect(resolveKnowledgeBaseRoot(root)).toBe(`${root}/${SANDBOX_KNOWLEDGE_BASE_DIR}`);
		expect(buildDefaultKnowledgeBaseEnv(root)).toEqual({
			[N8N_KNOWLEDGE_BASE_DIR_ENV]: `${root}/${SANDBOX_KNOWLEDGE_BASE_DIR}`,
		});
	});
});

function documentedTechniqueIds(): string[] {
	return Object.entries(bestPracticesRegistry)
		.filter(([, doc]) => doc !== undefined)
		.map(([techniqueId]) => techniqueId)
		.sort();
}

describe('buildKnowledgeBaseWorkspaceBundle', () => {
	it('builds BEST_PRACTICE.md files for every documented technique, plus registry and manifest', async () => {
		const source = loadInstanceAiBestPracticeSource();
		const root = '/home/daytona/workspace';

		const bundle = await buildKnowledgeBaseWorkspaceBundle({ source, root });

		if (!bundle) throw new Error('Expected knowledge-base bundle');

		const expectedTechniqueIds = documentedTechniqueIds();
		expect(source.registry.techniques.map((technique) => technique.id).sort()).toEqual(
			expectedTechniqueIds,
		);
		expect(bundle.techniques.map((technique) => technique.id).sort()).toEqual(expectedTechniqueIds);
		for (const techniqueId of expectedTechniqueIds) {
			const practicePath = `${root}/${SANDBOX_KNOWLEDGE_BASE_DIR}/${techniqueId}/${BEST_PRACTICE_FILE_NAME}`;
			expect(bundle.files.has(practicePath)).toBe(true);
		}

		const techniqueDir = `${root}/${SANDBOX_KNOWLEDGE_BASE_DIR}/scheduling`;
		const practicePath = `${techniqueDir}/${BEST_PRACTICE_FILE_NAME}`;
		const registryPath = `${root}/${SANDBOX_KNOWLEDGE_BASE_DIR}/${SANDBOX_KB_REGISTRY_FILE}`;
		const manifestPath = `${root}/${SANDBOX_KNOWLEDGE_BASE_DIR}/${RUNTIME_KB_MANIFEST_FILE}`;

		expect(bundle.files.get(practicePath)).toContain('Best Practices: Scheduling');
		expect(bundle.files.get(practicePath)).toContain('technique: "scheduling"');
		expect(bundle.registryPath).toBe(registryPath);
		expect(bundle.manifestPath).toBe(manifestPath);
		expect(bundle.manifest).toEqual({
			schemaVersion: RUNTIME_KB_MANIFEST_SCHEMA_VERSION,
			techniquesHash: source.registry.techniquesHash,
		});
		expect(bundle.env).toMatchObject({
			[N8N_WORKSPACE_DIR_ENV]: root,
			[N8N_KNOWLEDGE_BASE_DIR_ENV]: `${root}/${SANDBOX_KNOWLEDGE_BASE_DIR}`,
		});

		const registry = jsonParse<{
			techniques: Array<{ id: string; path: string; directory: string }>;
		}>(bundle.files.get(registryPath) ?? '{}');
		expect(registry.techniques.find((technique) => technique.id === 'scheduling')).toMatchObject({
			id: 'scheduling',
			path: practicePath,
			directory: techniqueDir,
		});
	});
});

describe('materializeKnowledgeBaseIntoWorkspace', () => {
	it('writes knowledge-base files into the workspace', async () => {
		const source = loadInstanceAiBestPracticeSource();
		const { workspace, writes, executeCommand } = createMockWorkspace();
		const root = '/home/daytona/workspace';

		const materialized = await materializeKnowledgeBaseIntoWorkspace({
			source,
			workspace,
			root,
		});

		expect(materialized).toBeDefined();
		const practicePath = `${root}/${SANDBOX_KNOWLEDGE_BASE_DIR}/scheduling/${BEST_PRACTICE_FILE_NAME}`;
		const registryPath = `${root}/${SANDBOX_KNOWLEDGE_BASE_DIR}/${SANDBOX_KB_REGISTRY_FILE}`;
		const manifestPath = `${root}/${SANDBOX_KNOWLEDGE_BASE_DIR}/${RUNTIME_KB_MANIFEST_FILE}`;

		expect(executeCommand).not.toHaveBeenCalled();
		expect(writes.get(practicePath)).toContain('Schedule Trigger');
		expect(writes.get(registryPath)).toContain('"scheduling"');
		expect(writes.get(manifestPath)).toContain(source.registry.techniquesHash);
	});
});
