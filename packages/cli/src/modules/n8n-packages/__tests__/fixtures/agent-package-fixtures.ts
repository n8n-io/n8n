import type { z } from 'zod';

import type { PackageWriter } from '../../io/package-writer';
import type { ManifestEntry, PackageManifest } from '../../spec/manifest.schema';
import type {
	serializedAgentSchema,
	SerializedAgentTool,
} from '../../spec/serialized/agent.schema';
import type { SerializedSkill } from '../../spec/serialized/skill.schema';

export interface AgentPackageFixture {
	manifest: PackageManifest & { agents: ManifestEntry[]; skills: ManifestEntry[] };
	files: Record<string, unknown>;
}

/** The skill of one Agent, in the `skills/` directory next to its `agents/` directory. */
function agentSkillFile(entry: ManifestEntry): {
	entry: ManifestEntry;
	files: Record<string, unknown>;
} {
	const id = `${entry.id}_skill`;
	const name = `${entry.name} reference`;
	const target = entry.target.replace(/agents\/[^/]+$/, `skills/${id}`);
	const skill: SerializedSkill = {
		id,
		scope: 'agent',
		agentId: entry.id,
		skill: {
			name,
			description: 'Use the support reference.',
			instructions: 'Read references/guide.md.',
			references: [
				{ path: 'references/guide.md', content: `# ${entry.name}\nKeep this reference text.\n` },
			],
		},
		frontmatter: { license: 'MIT' },
	};
	return { entry: { id, name, target }, files: { [`${target}/skill.json`]: skill } };
}

function agentFiles(entry: ManifestEntry, availableInMCP: boolean): Record<string, unknown> {
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
	const skillId = `${entry.id}_skill`;
	const toolId = 'shared_tool';
	const taskId = `${entry.id}_task`;
	const agent: z.input<typeof serializedAgentSchema> = {
		id: entry.id,
		name: entry.name,
		config: {
			name: entry.name,
			model: '',
			instructions: '',
			skills: [{ type: 'skill', id: skillId }],
			tools: [{ type: 'custom', id: toolId, enabled: false, requireApproval: true }],
			tasks: [{ type: 'task', id: taskId, enabled: false }],
			mcpServers: [
				{ name: 'Reference', url: '', transport: 'streamableHttp', authentication: 'none' },
			],
		},
		availableInMCP,
		tools: { [toolId]: tool },
		tasks: { [taskId]: task },
	};
	return {
		...agentSkillFile(entry).files,
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
			sourceN8nVersion: '2.0.0',
			sourceId: 'source-instance',
			agents,
			skills: agents.map((entry) => agentSkillFile(entry).entry),
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
			skills: agents.map((entry) => agentSkillFile(entry).entry),
			projects: [{ id: 'project_source', name: 'Operations', target: projectTarget }],
			workflows: [
				{
					id: 'workflow_source',
					name: 'Lookup',
					target: `${projectTarget}/workflows/lookup`,
					isArchived: false,
				},
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
