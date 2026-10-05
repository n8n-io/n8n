import { Service } from '@n8n/di';

import type { Agent } from '@/modules/agents/entities/agent.entity';

import type { AgentExportSource } from './agent-version-policy';
import {
	createManifestEntry,
	entityFilePath,
	packageDirectory,
	writeManifestEntry,
} from '../../io/manifest-entry';
import { formatEntityFile } from '../../io/entity-file-format';
import type { PackageWriter } from '../../io/package-writer';
import type { ManifestEntry } from '../../spec/manifest.schema';
import {
	serializedAgentSchema,
	serializedAgentMetadataSchema,
	serializedAgentSkillSchema,
	serializedAgentToolSchema,
	serializedAgentTaskSchema,
	type SerializedAgent,
	type SerializedAgentTask,
} from '../../spec/serialized/agent.schema';
import { PackageExportBlockedError } from '../package-export.errors';
import { definePackageSerializationPayload } from '../package-serialization.types';

type AgentPackageKeyHandling = {
	id: 'copy';
	name: 'copy';
	schema: 'transform';
	integrations: 'transform';
	tools: 'transform';
	skills: 'transform';
	availableInMCP: 'copy';
	project: 'exclude';
	projectId: 'exclude';
	createdAt: 'exclude';
	updatedAt: 'exclude';
	versionId: 'exclude';
	activeVersionId: 'exclude';
	activeVersion: 'exclude';
	revision: 'exclude';
	setupCompletedAt: 'exclude';
};

const serializePayload = definePackageSerializationPayload<
	Agent,
	SerializedAgent,
	AgentPackageKeyHandling
>();

@Service()
export class AgentSerializer {
	async write(
		writer: PackageWriter,
		baseDir: string,
		agent: AgentExportSource,
		taskDefinitions: SerializedAgentTask[],
	): Promise<ManifestEntry> {
		const entry = createManifestEntry('agents', baseDir, agent);
		const assets = await this.writeAssets(writer, entry.target, agent, taskDefinitions);
		const content = serializedAgentSchema.parse(
			serializePayload({
				id: agent.id,
				name: agent.name,
				config: agent.schema ? { ...agent.schema, integrations: agent.integrations ?? [] } : null,
				availableInMCP: agent.availableInMCP,
				...assets,
			}),
		);
		await writer.writeDirectory(entry.target);
		await writer.writeFile(entityFilePath('agents', entry.target), formatEntityFile(content));
		await writer.writeFile(
			`${entry.target}/agent-metadata.json`,
			formatEntityFile(
				serializedAgentMetadataSchema.parse({
					versionId: agent.versionId,
					publishedVersionId: agent.activeVersionId,
				}),
			),
		);
		return entry;
	}

	private async writeAssets(
		writer: PackageWriter,
		target: string,
		agent: AgentExportSource,
		taskDefinitions: SerializedAgentTask[],
	) {
		const skills: ManifestEntry[] = [];
		const tools: ManifestEntry[] = [];
		const tasks: ManifestEntry[] = [];
		for (const id of new Set((agent.schema?.skills ?? []).map((ref) => ref.id))) {
			const skill = this.requireBody(agent.skills?.[id], 'skill', id, agent.id);
			skills.push(
				await writeManifestEntry(
					writer,
					'agentSkills',
					packageDirectory('agentSkills', target),
					{ id, name: skill.name },
					serializedAgentSkillSchema.parse({ id, ...skill }),
				),
			);
		}
		for (const id of new Set(
			(agent.schema?.tools ?? []).flatMap((ref) => (ref.type === 'custom' ? [ref.id] : [])),
		)) {
			const tool = this.requireBody(agent.tools?.[id], 'tool', id, agent.id);
			tools.push(
				await writeManifestEntry(
					writer,
					'agentTools',
					packageDirectory('agentTools', target),
					{ id, name: tool.descriptor.name },
					serializedAgentToolSchema.parse({ id, ...tool }),
				),
			);
		}
		const tasksById = new Map(taskDefinitions.map((task) => [task.id, task]));
		for (const id of new Set((agent.schema?.tasks ?? []).map((ref) => ref.id))) {
			const task = this.requireBody(tasksById.get(id), 'task', id, agent.id);
			tasks.push(
				await writeManifestEntry(
					writer,
					'agentTasks',
					packageDirectory('agentTasks', target),
					task,
					serializedAgentTaskSchema.parse({
						id: task.id,
						name: task.name,
						objective: task.objective,
						cronExpression: task.cronExpression,
						timezone: task.timezone,
					}),
				),
			);
		}
		return { skills, tools, tasks };
	}

	private requireBody<T>(body: T | undefined, kind: string, id: string, agentId: string): T {
		if (body === undefined)
			throw new PackageExportBlockedError(
				`Agent "${agentId}" refers to missing ${kind} "${id}". Export aborted.`,
			);
		return body;
	}
}
