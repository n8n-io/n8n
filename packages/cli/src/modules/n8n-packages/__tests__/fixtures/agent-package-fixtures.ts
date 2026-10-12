import type { z } from 'zod';

import type { PackageWriter } from '../../io/package-writer';
import type { ManifestEntry, PackageManifest } from '../../spec/manifest.schema';
import type {
	serializedAgentSchema,
	SerializedAgentSkill,
	SerializedAgentTool,
} from '../../spec/serialized/agent.schema';

export interface AgentPackageFixture {
	manifest: PackageManifest & { agents: ManifestEntry[] };
	files: Record<string, unknown>;
}

function agentFiles(entry: ManifestEntry, availableInMCP: boolean): Record<string, unknown> {
	const skill: SerializedAgentSkill = {
		name: `${entry.name} reference`,
		description: 'Use the support reference.',
		instructions: 'Read references/guide.md.',
		allowedTools: ['lookup'],
		references: [
			{ path: 'references/guide.md', content: `# ${entry.name}\nKeep this reference text.\n` },
		],
	};
	const tool: SerializedAgentTool = {
		code: 'throw new Error("Package parsing must not run tool code");',
		descriptor: {
			name: 'lookup',
			description: `Look up a ${entry.name} reference.`,
			systemInstruction: 'Use the reference result.',
			inputSchema: { type: 'object', properties: { query: { type: 'string' } } },
			outputSchema: { type: 'object', properties: { text: { type: 'string' } } },
			hasSuspend: true,
			hasResume: true,
			hasToMessage: true,
			requireApproval: true,
			outputTrust: 'untrusted',
			providerOptions: { provider: { cache: false } },
		},
	};
	const task = {
		name: 'Daily summary',
		objective: 'Summarize the open requests.',
		cronExpression: '0 9 * * *',
	};
	const skillId = 'shared-skill';
	const toolId = 'shared_tool';
	const taskId = `${entry.id}_task`;
	const agent: z.input<typeof serializedAgentSchema> = {
		id: entry.id,
		name: entry.name,
		config: {
			name: entry.name,
			model: '',
			instructions: '',
			skills: [{ type: 'skill', id: skillId, enabled: false }],
			tools: [{ type: 'custom', id: toolId, enabled: false, requireApproval: true }],
			tasks: [{ type: 'task', id: taskId, enabled: false }],
			mcpServers: [
				{ name: 'Reference', url: '', transport: 'streamableHttp', authentication: 'none' },
			],
		},
		availableInMCP,
		skills: { [skillId]: skill },
		tools: { [toolId]: tool },
		tasks: { [taskId]: task },
	};
	return {
		[`${entry.target}/agent.json`]: agent,
		[`${entry.target}/agent-metadata.json`]: {
			versionId: 'draft-version',
			publishedVersionId: 'published-version',
		},
	};
}

export function looseAgentsFixture(): AgentPackageFixture {
	const agents = [
		{ id: 'support_source', name: 'Support', target: 'agents/support' },
		{ id: 'research_source', name: 'Research', target: 'agents/research' },
	];
	return {
		manifest: {
			packageFormatVersion: '1',
			exportedAt: '2026-10-01T12:00:00.000Z',
			sourceN8nVersion: '2.0.0',
			sourceId: 'source-instance',
			agents,
			requirements: {
				credentials: [
					{ id: 'model-credential', usedBy: [{ kind: 'agent', id: 'support_source' }] },
				],
				agents: [{ id: 'external-agent', usedBy: [{ kind: 'agent', id: 'support_source' }] }],
			},
		},
		files: { ...agentFiles(agents[0], true), ...agentFiles(agents[1], false) },
	};
}

export function projectAgentsFixture(): AgentPackageFixture {
	const fixture = looseAgentsFixture();
	const projectTarget = 'projects/operations';
	const agents = fixture.manifest.agents.map((entry) => ({
		...entry,
		target: `${projectTarget}/${entry.target}`,
	}));
	return {
		manifest: {
			...fixture.manifest,
			agents,
			projects: [{ id: 'project_source', name: 'Operations', target: projectTarget }],
			workflows: [
				{ id: 'workflow_source', name: 'Lookup', target: `${projectTarget}/workflows/lookup` },
			],
		},
		files: {
			...agentFiles(agents[0], true),
			...agentFiles(agents[1], false),
			[`${projectTarget}/project.json`]: { id: 'project_source', name: 'Operations' },
			[`${projectTarget}/workflows/lookup/workflow.json`]: {
				id: 'workflow_source',
				name: 'Lookup',
				nodes: [],
				connections: {},
				parentFolderId: null,
				isArchived: false,
			},
			[`${projectTarget}/workflows/lookup/workflow-metadata.json`]: {
				versionId: 'workflow-version',
				publishedVersionId: null,
			},
		},
	};
}

export async function writeAgentPackageFixture(
	writer: PackageWriter,
	fixture: AgentPackageFixture,
): Promise<void> {
	await writer.writeFile('manifest.json', JSON.stringify(fixture.manifest));
	for (const [path, content] of Object.entries(fixture.files)) {
		await writer.writeFile(path, typeof content === 'string' ? content : JSON.stringify(content));
	}
}
