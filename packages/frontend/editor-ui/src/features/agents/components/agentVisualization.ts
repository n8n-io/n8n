import type {
	AgentFileDto,
	AgentJsonConfig,
	AgentSkill,
	AgentTaskDto,
	ChatIntegrationDescriptor,
} from '@n8n/api-types';
import { sanitizeAgentToolName } from '@n8n/api-types';
import { isRecord } from '@n8n/utils/is-record';
import { describeSchedule } from '../utils/scheduleBuilder';
import { modelToString } from '../utils/model-string';
import { nodeNameToToolName } from 'n8n-workflow';
import { updatedIconSet } from '@n8n/design-system';
import type { NodeIconSource } from '@/features/shared/toolsConnection/types';
import type { BaseTextKey } from '@n8n/i18n';
import type { AgentResource } from '../types';
import type { AgentVisualizationNode } from './AgentVisualization.types';

export function buildAgentVisualization(
	config: AgentJsonConfig,
	agent: AgentResource | null,
	files: AgentFileDto[],
	skills: Array<{ id: string; skill: AgentSkill }>,
	text: (key: BaseTextKey) => string,
	icons: {
		node?: (name: string, version?: number) => NodeIconSource | undefined;
		channels?: ChatIntegrationDescriptor[];
		tasks?: AgentTaskDto[];
		agentNames?: Map<string, string>;
	} = {},
): AgentVisualizationNode {
	const group = (
		id: string,
		key: BaseTextKey,
		icon: AgentVisualizationNode['icon'],
		children: AgentVisualizationNode[],
	): AgentVisualizationNode => ({
		id,
		label: text(key),
		icon,
		children,
		iconSource: children.length === 1 ? children[0].iconSource : undefined,
		inactive: children.length > 0 && children.every((child) => child.inactive === true),
	});
	const tools = (config.tools ?? []).map(
		(tool, index): AgentVisualizationNode => ({
			id: `tool-${index}`,
			label:
				tool.type === 'custom'
					? (agent?.tools[tool.id]?.descriptor.name ?? tool.id)
					: tool.type === 'workflow'
						? (tool.name ?? tool.workflow)
						: tool.name,
			description:
				tool.type === 'custom' ? agent?.tools[tool.id]?.descriptor.description : tool.description,
			editSection: `tool-${index}`,
			capability: {
				kind: 'tool',
				index,
				id: tool.type === 'custom' ? tool.id : tool.type === 'workflow' ? tool.workflow : tool.name,
				toolType: tool.type,
			},
			icon: tool.type === 'workflow' ? 'workflow' : tool.type === 'custom' ? 'code' : 'wrench',
			iconSource:
				tool.type === 'node'
					? icons.node?.(tool.node.nodeType, tool.node.nodeTypeVersion)
					: undefined,
			inactive: tool.enabled === false,
			activity: {
				toolNames:
					tool.type === 'node'
						? [nodeNameToToolName(tool.name)]
						: tool.type === 'workflow'
							? [sanitizeAgentToolName(tool.name ?? tool.workflow)]
							: [tool.id, sanitizeAgentToolName(agent?.tools[tool.id]?.descriptor.name ?? tool.id)],
			},
			configuration:
				tool.type === 'custom'
					? { ...tool, ...agent?.tools[tool.id]?.descriptor, code: agent?.tools[tool.id]?.code }
					: tool,
		}),
	);
	const root: AgentVisualizationNode = {
		id: 'agent',
		label: config.name,
		icon: 'bot',
		children: [
			{
				id: 'instructions',
				label: text('agents.builder.visualization.instructions'),
				icon: 'file-text',
				content: config.instructions,
			},
			group(
				'channels',
				'agents.builder.visualization.channels',
				'messages-square',
				(config.integrations ?? []).map((channel, index): AgentVisualizationNode => {
					const descriptor = icons.channels?.find((item) => item.type === channel.type);
					return {
						id: `channel-${index}`,
						label: descriptor?.label ?? channel.type,
						description:
							channel.type === 'slack' &&
							isRecord(channel.settings) &&
							channel.settings.onlyRespondWhenMentioned === true
								? text('agents.builder.visualization.onMention')
								: undefined,
						editSection: `channel:${channel.type}`,
						capability: { kind: 'channel', id: channel.type, index },
						icon: 'messages-square',
						iconSource:
							descriptor && descriptor.icon in updatedIconSet
								? { type: 'icon', name: descriptor.icon }
								: undefined,
						configuration: channel,
						activity: { toolNames: descriptor?.approvableActions?.map((action) => action.name) },
					};
				}),
			),
			group('tools', 'agents.builder.visualization.tools', 'wrench', [
				...tools.filter((_, index) => config.tools?.[index].type !== 'workflow'),
				...Object.entries(config.providerTools ?? {}).map(([name, configuration]) => ({
					id: `provider-${name}`,
					editSection: 'provider-tools',
					activity: { toolNames: [name, name.split('.').at(-1) ?? name] },
					label: name,
					icon: 'wrench' as const,
					configuration,
				})),
			]),
			group(
				'workflows',
				'agents.builder.visualization.workflows',
				'workflow',
				tools.filter((_, index) => config.tools?.[index].type === 'workflow'),
			),
			group(
				'skills',
				'agents.builder.visualization.skills',
				'book-open',
				(config.skills ?? []).map((reference) => {
					const skill = skills.find(({ id }) => id === reference.id)?.skill;
					return {
						id: `skill-${reference.id}`,
						activity: { skillId: reference.id },
						label: skill?.name ?? reference.id,
						description: skill?.description,
						editSection: `skill:${reference.id}`,
						inactive: reference.enabled === false,
						capability: { kind: 'skill', id: reference.id },
						icon: 'book-open',
						content: skill?.instructions,
						configuration: skill
							? { description: skill.description, allowedTools: skill.allowedTools }
							: reference,
						children: skill?.references?.map((file, index) => ({
							id: `reference-${index}`,
							editSection: `skill:${reference.id}`,
							label: file.path,
							icon: 'file-text',
							content: file.content,
						})),
					};
				}),
			),
			{
				id: 'memory',
				label: text('agents.builder.visualization.memory'),
				icon: 'brain',
				inactive: config.memory?.enabled === false,
				configuration: config.memory,
			},
			group(
				'mcp',
				'agents.builder.visualization.mcp',
				'plug',
				(config.mcpServers ?? []).map((server, index) => ({
					id: `mcp-${index}`,
					label: server.name,
					icon: 'mcp',
					iconSource: server.metadata?.nodeTypeName
						? icons.node?.(server.metadata.nodeTypeName)
						: undefined,
					description: server.description,
					editSection: `mcp:${server.name}`,
					capability: { kind: 'mcpServer', id: server.name, index },
					configuration: server,
					activity: { toolPrefix: `${nodeNameToToolName(server.name)}_` },
				})),
			),
			group('knowledge', 'agents.builder.visualization.knowledge', 'database', [
				...files.map((file) => ({
					id: `file-${file.id}`,
					editSection: 'knowledge',
					activity: { fileId: file.id },
					label: file.fileName,
					icon: 'file-text' as const,
					configuration: {
						mimeType: file.mimeType,
						fileSizeBytes: file.fileSizeBytes,
						createdAt: file.createdAt,
					},
				})),
				...(config.vectorStores ?? []).map((store, index) => ({
					id: `store-${index}`,
					label: store.name,
					editSection: `store:${index}`,
					capability: { kind: 'vectorStore', id: store.name, index },
					icon: 'database' as const,
					configuration: store,
					activity: { toolNames: [nodeNameToToolName(`search_${store.name}`)] },
				})),
			]),
			group(
				'sub-agents',
				'agents.builder.visualization.subAgents',
				'bot',
				(config.subAgents?.agents ?? []).map((child, index) => ({
					id: `sub-agent-${index}`,
					label: icons.agentNames?.get(child.agentId) ?? child.agentId,
					editSection: `sub-agent:${child.agentId}`,
					capability: { kind: 'subAgent', id: child.agentId, index },
					icon: 'bot',
					configuration: child,
				})),
			),
			group(
				'schedules',
				'agents.builder.visualization.schedules',
				'clock',
				(config.tasks ?? []).map((task) => {
					const body = icons.tasks?.find((item) => item.id === task.id);
					return {
						id: `task-${task.id}`,
						label: body?.name ?? task.id,
						description: body
							? [describeSchedule(body.cronExpression), body.timezone].filter(Boolean).join(' · ')
							: undefined,
						content: body?.objective,
						editSection: `task:${task.id}`,
						capability: { kind: 'task', id: task.id },
						icon: 'clock',
						configuration: body ?? task,
						inactive: task.enabled === false,
					};
				}),
			),
			{
				id: 'settings',
				label: text('agents.builder.visualization.settings'),
				icon: 'settings',
				configuration: {
					model: config.model,
					credential: config.credential,
					...config.config,
					subAgents: config.subAgents
						? {
								maxChildren: config.subAgents.maxChildren,
								modelsByDifficulty: config.subAgents.modelsByDifficulty,
							}
						: undefined,
				},
			},
		],
	};
	const groups = root.children ?? [];
	const configured = groups.filter((node) => {
		if (node.id === 'settings') return false;
		if (node.id === 'instructions') return Boolean(config.instructions.trim());
		if (node.id === 'memory') return Boolean(config.memory);
		return Boolean(node.children?.length);
	});
	const knowledge = groups.find((node) => node.id === 'knowledge');
	const skillsGroup = groups.find((node) => node.id === 'skills');
	if (knowledge && skillsGroup?.children?.length) {
		knowledge.children?.push(skillsGroup);
		if (!configured.includes(knowledge)) configured.push(knowledge);
	}
	const invocation = group(
		'invocation',
		'agents.builder.visualization.invocation',
		'messages-square',
		configured.filter((node) => node.id === 'channels' || node.id === 'schedules'),
	);
	invocation.description = invocation.children?.length
		? undefined
		: text('agents.builder.visualization.startQuestion');
	invocation.editSection = 'invocation';
	invocation.addActions = [
		{ id: 'invocation', label: text('agents.builder.visualization.addChannelSchedule') },
	];
	const addLabels: Record<string, BaseTextKey> = {
		tools: 'agents.builder.visualization.addTool',
		workflows: 'agents.builder.visualization.addWorkflow',
		knowledge: 'agents.builder.visualization.addFile',
		skills: 'agents.builder.visualization.addSkill',
		mcp: 'agents.builder.visualization.addMcp',
		'sub-agents': 'agents.builder.visualization.addSubAgent',
	};
	for (const node of groups) {
		node.editSection ??= node.id;
		if (addLabels[node.id]) node.addActions = [{ id: node.id, label: text(addLabels[node.id]) }];
	}
	if (knowledge)
		knowledge.addActions = [
			{ id: 'knowledge', label: text('agents.builder.visualization.addFile') },
			{ id: 'skills', label: text('agents.builder.visualization.addSkill') },
			{ id: 'vector-store', label: text('agents.builder.visualization.addVectorStore') },
		];
	root.children = [
		invocation,
		...configured.filter((node) => !['channels', 'schedules', 'skills'].includes(node.id)),
	];
	// Keep related capabilities next to each other in the fixed layout.
	const order = [
		'invocation',
		'instructions',
		'tools',
		'mcp',
		'workflows',
		'sub-agents',
		'knowledge',
		'memory',
	];
	root.children.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
	root.description = modelToString(config.model);
	root.addActions = groups
		.filter(
			(node) =>
				!['settings', 'channels', 'schedules'].includes(node.id) && !configured.includes(node),
		)
		.map((node) => ({ id: node.id, label: node.label }));
	return root;
}
