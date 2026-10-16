import type {
	AutomationMapAnnotations,
	AutomationMapGraph,
	AutomationMapGroup,
	AutomationMapScope,
} from '@n8n/api-types';
import { extractJsonCandidate } from '@n8n/ai-utilities/llm-output';
import { Logger } from '@n8n/backend-common';
import { OutboundHttp } from '@n8n/backend-network';
import type { User } from '@n8n/db';
import { Service } from '@n8n/di';
import { jsonParse } from 'n8n-workflow';
import { z } from 'zod';

import { InstanceAiModelService } from '@/modules/instance-ai/instance-ai-model.service';
import { createAiProxyFetch } from '@/utils/ai-proxy-fetch';

import {
	dataTableNodeId,
	serviceNodeId,
	stickyNoteText,
	workflowNodeId,
	type FolderSource,
	type WorkflowSource,
} from './automation-map-graph.builder';

const LLM_TIMEOUT_MS = 180_000;

const STOP_WORDS = new Set(
	'a about all an and automation automations build can create dependencies diagram draw everything explain for give how in is it map me my of on overview please project show that the this to visualise visualize what with workflow workflows works'.split(
		' ',
	),
);

const interpretationSchema = z.object({
	name: z.string().min(1).max(120),
	keywords: z.array(z.string()).default([]),
	folderIds: z.array(z.string()).default([]),
	tags: z.array(z.string()).default([]),
	workflowIds: z.array(z.string()).default([]),
});

const annotationSchema = z.object({
	summary: z.string().default(''),
	groups: z
		.array(
			z.object({
				name: z.string(),
				description: z.string().default(''),
				workflowIds: z.array(z.string()),
			}),
		)
		.default([]),
	steps: z
		.array(
			z.object({
				title: z.string(),
				description: z.string().default(''),
				workflowIds: z.array(z.string()).default([]),
			}),
		)
		.default([]),
	workflows: z.record(z.string()).default({}),
});

export interface PromptInterpretation {
	name: string;
	scope: AutomationMapScope;
	aiError: string | null;
}

function errorMessage(error: unknown) {
	return error instanceof Error ? error.message : String(error);
}

function titleCase(words: string[]) {
	return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

export function heuristicInterpretation(prompt: string): PromptInterpretation {
	const keywords = [
		...new Set(
			prompt
				.toLowerCase()
				.split(/[^a-z0-9-]+/)
				.filter((word) => word.length > 2 && !STOP_WORDS.has(word)),
		),
	];
	return {
		name: keywords.length > 0 ? titleCase(keywords) : 'Automation map',
		scope: { keywords, folderIds: [], tags: [], workflowIds: [] },
		aiError: null,
	};
}

function slug(value: string) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '');
}

export function heuristicAnnotations(
	graph: AutomationMapGraph,
	aiError: string | null,
): AutomationMapAnnotations {
	const groupsByName = new Map<string, AutomationMapGroup>();
	for (const workflow of graph.workflows) {
		const name = workflow.missing
			? 'Unavailable'
			: workflow.folderPath.split(' / ').pop() || 'Not in a folder';
		const group = groupsByName.get(name) ?? {
			id: slug(name) || 'group',
			name,
			description: workflow.folderPath ? `Folder: ${workflow.folderPath}` : '',
			workflowIds: [],
		};
		group.workflowIds.push(workflow.id);
		groupsByName.set(name, group);
	}
	const entryPoints = graph.workflows.filter((workflow) =>
		workflow.triggers.some((trigger) => !['subworkflow', 'manual', 'error'].includes(trigger.kind)),
	);
	const summary = [
		`This map shows ${graph.workflows.length} workflows, ${graph.dataTables.length} data tables and ${graph.services.length} external services.`,
		`${entryPoints.length} workflows start on their own (schedule, webhook, form, chat or app event). The other workflows run when another workflow calls them.`,
		'AI annotations are not available, so the map groups workflows by folder.',
	].join(' ');
	return {
		source: 'heuristic',
		summary,
		groups: [...groupsByName.values()],
		steps: [],
		workflowSummaries: {},
		aiError,
	};
}

@Service()
export class AutomationMapAiService {
	constructor(
		private readonly logger: Logger,
		private readonly modelService: InstanceAiModelService,
		private readonly outboundHttp: OutboundHttp,
	) {}

	private async complete(user: User, system: string, prompt: string) {
		const modelConfig = await this.modelService.resolveAgentModelConfig(user);
		const { createModel } = await import('@n8n/agents');
		const { generateText } = await import('ai');
		const result = await generateText({
			model: createModel(modelConfig, createAiProxyFetch(this.outboundHttp)),
			system,
			prompt,
			maxOutputTokens: 16_000,
			abortSignal: AbortSignal.timeout(LLM_TIMEOUT_MS),
		});
		return jsonParse<unknown>(extractJsonCandidate(result.text));
	}

	async interpretPrompt(
		user: User,
		prompt: string,
		workflows: WorkflowSource[],
		folders: FolderSource[],
		folderPath: (folderId: string | null) => string,
	): Promise<PromptInterpretation> {
		const fallback = heuristicInterpretation(prompt);
		const promptWords = fallback.scope.keywords;
		const candidates = workflows
			.filter((workflow) => !workflow.isArchived)
			.filter((workflow) => {
				const searchable =
					`${workflow.name} ${workflow.tags.join(' ')} ${folderPath(workflow.parentFolderId)}`.toLowerCase();
				return promptWords.some((word) => searchable.includes(word));
			})
			.slice(0, 300);
		const tags = [...new Set(workflows.flatMap((workflow) => workflow.tags))].slice(0, 200);

		const system = [
			'You help n8n users map an automation that spans many workflows.',
			'The user describes the automation in a short request. Decide which workflows belong to it.',
			'Prefer folders, tags and name keywords over single workflow ids, so workflows added later are also included.',
			'A keyword matches when it appears in a workflow name, description, tag or folder path, case-insensitive. Use short distinctive keywords.',
			'Do not include workflows that only share a generic word with the request.',
			'Workflows that the selected ones call are added automatically, so you do not need to list helpers.',
			'Reply with JSON only: {"name": string, "keywords": string[], "folderIds": string[], "tags": string[], "workflowIds": string[]}.',
			'"name" is a short title for the map, for example "Conveyor".',
		].join('\n');
		const body = [
			`Request: ${prompt}`,
			'',
			'Folders (id: path):',
			...folders.slice(0, 300).map((folder) => `${folder.id}: ${folderPath(folder.id)}`),
			'',
			`Tags: ${tags.join(', ') || '(none)'}`,
			'',
			'Workflows whose name, tag or folder matches a word of the request (id | name | folder | tags):',
			...candidates.map(
				(workflow) =>
					`${workflow.id} | ${workflow.name} | ${folderPath(workflow.parentFolderId)} | ${workflow.tags.join(', ')}`,
			),
		].join('\n');

		try {
			const parsed = interpretationSchema.parse(await this.complete(user, system, body));
			const scope: AutomationMapScope = {
				keywords: parsed.keywords.map((keyword) => keyword.trim()).filter(Boolean),
				folderIds: parsed.folderIds,
				tags: parsed.tags,
				workflowIds: parsed.workflowIds,
			};
			const isEmpty =
				scope.keywords.length +
					scope.folderIds.length +
					scope.tags.length +
					scope.workflowIds.length ===
				0;
			return { name: parsed.name, scope: isEmpty ? fallback.scope : scope, aiError: null };
		} catch (error) {
			this.logger.warn('Automation map: AI could not interpret the prompt', {
				error: errorMessage(error),
			});
			return { ...fallback, aiError: errorMessage(error) };
		}
	}

	async annotate(
		user: User,
		prompt: string,
		graph: AutomationMapGraph,
		previous: AutomationMapAnnotations | null,
		sources: Map<string, WorkflowSource>,
	): Promise<AutomationMapAnnotations> {
		const names = new Map<string, string>([
			...graph.workflows.map((workflow): [string, string] => [
				workflowNodeId(workflow.id),
				workflow.name,
			]),
			...graph.dataTables.map((table): [string, string] => [
				dataTableNodeId(table.id),
				`table ${table.name}`,
			]),
			...graph.services.map((service): [string, string] => [
				serviceNodeId(service.key),
				service.name,
			]),
		]);
		const describeEdges = (workflowId: string) => {
			const id = workflowNodeId(workflowId);
			return graph.edges
				.filter((edge) => edge.source === id || edge.target === id)
				.map((edge) => {
					const other = edge.source === id ? edge.target : edge.source;
					const direction = edge.source === id ? '->' : '<-';
					const via = edge.via ? ` via ${edge.via}` : '';
					return `${edge.kind}${direction}${names.get(other) ?? other}${via}`;
				})
				.join('; ');
		};

		const workflowLines = graph.workflows.map((workflow) =>
			[
				`### ${workflow.id} | ${workflow.name}`,
				workflow.folderPath ? `folder: ${workflow.folderPath}` : '',
				workflow.missing
					? 'status: unavailable'
					: `status: ${workflow.active ? 'active' : 'inactive'}`,
				workflow.triggers.length
					? `triggers: ${workflow.triggers.map((trigger) => trigger.label).join(', ')}`
					: '',
				workflow.description ? `description: ${workflow.description.slice(0, 400)}` : '',
				stickyNoteText(sources.get(workflow.id)?.nodes ?? [])
					? `notes: ${stickyNoteText(sources.get(workflow.id)?.nodes ?? [])}`
					: '',
				`nodes: ${(sources.get(workflow.id)?.nodes ?? [])
					.filter((node) => node.type !== 'n8n-nodes-base.stickyNote' && !node.disabled)
					.map((node) => node.name)
					.slice(0, 30)
					.join(', ')}`,
				`links: ${describeEdges(workflow.id)}`,
			]
				.filter(Boolean)
				.join('\n'),
		);

		const system = [
			'You explain n8n automations that span many workflows to the people who maintain them.',
			'You get a dependency graph that n8n computed from the workflows. Do not invent workflows or links.',
			'Write in plain, short sentences. Use the names the user sees in n8n.',
			'Reply with JSON only, in this shape:',
			'{"summary": string, "groups": [{"name": string, "description": string, "workflowIds": string[]}], "steps": [{"title": string, "description": string, "workflowIds": string[]}], "workflows": {"<workflowId>": string}}',
			'"summary": 2 to 4 short paragraphs in markdown. Say what the automation does, how work enters it, how it moves and where its state lives.',
			'"groups": 3 to 8 functional areas, in the order work flows through them (entry points first, shared helpers and tools last). Put every workflow in exactly one group.',
			'"steps": 3 to 8 steps that walk a reader through one typical run, each naming the workflows involved.',
			'"workflows": one sentence (max 140 characters) per workflow id about its role in this automation.',
		].join('\n');
		const previousGroups =
			previous?.source === 'ai' ? previous.groups.map((group) => group.name) : [];
		const body = [
			`The user asked: ${prompt}`,
			previousGroups.length
				? `Earlier versions of this map used these groups. Keep them when they still fit: ${previousGroups.join(', ')}`
				: '',
			`Data tables: ${graph.dataTables.map((table) => table.name).join(', ') || '(none)'}`,
			`External services: ${graph.services.map((service) => service.name).join(', ') || '(none)'}`,
			'',
			'Workflows:',
			...workflowLines,
		].join('\n');

		try {
			const parsed = annotationSchema.parse(await this.complete(user, system, body));
			const knownIds = new Set(graph.workflows.map((workflow) => workflow.id));
			const assigned = new Set<string>();
			const groups: AutomationMapGroup[] = parsed.groups
				.map((group, index) => {
					const workflowIds = group.workflowIds.filter(
						(id) => knownIds.has(id) && !assigned.has(id),
					);
					workflowIds.forEach((id) => assigned.add(id));
					return {
						id: `${index}-${slug(group.name)}`,
						name: group.name,
						description: group.description,
						workflowIds,
					};
				})
				.filter((group) => group.workflowIds.length > 0);
			const unassigned = [...knownIds].filter((id) => !assigned.has(id));
			if (unassigned.length > 0) {
				groups.push({ id: 'other', name: 'Other', description: '', workflowIds: unassigned });
			}
			return {
				source: 'ai',
				summary: parsed.summary,
				groups,
				steps: parsed.steps.map((step) => ({
					...step,
					workflowIds: step.workflowIds.filter((id) => knownIds.has(id)),
				})),
				workflowSummaries: Object.fromEntries(
					Object.entries(parsed.workflows).filter(([id]) => knownIds.has(id)),
				),
				aiError: null,
			};
		} catch (error) {
			this.logger.warn('Automation map: AI annotation failed', { error: errorMessage(error) });
			return heuristicAnnotations(graph, errorMessage(error));
		}
	}
}
