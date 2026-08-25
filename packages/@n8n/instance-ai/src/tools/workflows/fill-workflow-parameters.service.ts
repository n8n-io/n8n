/**
 * Fill Workflow Parameters — parallel per-node parameter generation over a
 * validated skeleton, with deterministic assembly.
 *
 * Splits the monolithic "write the whole .workflow.ts in one long turn" step:
 * every node gets its own small, focused LLM call (its parameter schema, its
 * purpose, its neighbors and edge contracts), the calls run concurrently, and
 * the workflow source is then assembled deterministically via the SDK codegen
 * (skeleton topology + filled parameters → WorkflowJSON → generateWorkflowCode)
 * and written to the workspace for the normal build-workflow path.
 *
 * Fill posture is best-effort per node: a failed fill leaves that node's
 * parameters empty and is reported, it never sinks the other fills. Parameter
 * correctness is checked with the same canvas-parity issue engine the editor
 * uses, with one repair round per offending node.
 */
import type { WorkflowJSON } from '@n8n/workflow-sdk';
import { generateWorkflowCode } from '@n8n/workflow-sdk';
import type { IDataObject } from 'n8n-workflow';
import { z } from 'zod';

import type {
	FillWorkflowParametersInput,
	FillWorkflowParametersResult,
} from './fill-workflow-parameters.schema';
import { edgesToConnections, validateSkeleton } from './validate-skeleton.service';
import type { SkeletonDiagnostic, WorkflowSkeleton } from './workflow-skeleton.schema';
import type { InstanceAiContext, NodeDescription } from '../../types';
import { SONNET_MODEL } from '../../utils/eval-agents';
import { generateValidatedJson } from '../../utils/generate-validated-json';
import { writeWorkspaceFile } from '../../workspace/workspace-files';

/** Concurrent fill calls; small enough to stay clear of provider rate limits. */
const FILL_CONCURRENCY = 5;

/** Recursive JSON object typed as the engine's IDataObject, so validated fill
 *  output plugs into NodeJSON.parameters without casts. */
const jsonParametersSchema: z.ZodType<IDataObject> = z.record(
	z.lazy(() =>
		z.union([
			z.string(),
			z.number(),
			z.boolean(),
			z.null(),
			jsonParametersSchema,
			z.array(z.union([z.string(), z.number(), z.boolean(), z.null(), jsonParametersSchema])),
		]),
	),
);

const fillResponseSchema = z.object({
	parameters: jsonParametersSchema,
	assumptions: z.array(z.string()).optional(),
});

const FILL_INSTRUCTIONS = `You configure ONE n8n node inside a larger workflow. You receive the workflow brief, this node's role, its neighbors, and its parameter schema ("properties").

Return ONLY a JSON object: {"parameters": {...}, "assumptions": ["..."]}. No prose, no markdown fences.

Rules:
- "parameters" must follow the node's parameter schema: pick the resource/operation the node's role calls for, then set the parameters that apply to that choice (respect "displayOptions"). Omit parameters whose defaults are already right.
- NEVER include credentials or a "credentials" key.
- Reference upstream data with n8n expressions: "={{ $json.field }}" for the direct input item, "={{ $('Node Name').item.json.field }}" for a named node. Use the exact upstream node names and the edge-contract field names you were given.
- Every value that is user-specific and not stated in the brief or hints (a channel, a board id, an email address, an API resource name) must be the placeholder sentinel string "<__PLACEHOLDER_VALUE__short human hint__>" — never invent such values. Add one "assumptions" line per placeholder or guessed value.
- For Code nodes, write complete working JavaScript in the "jsCode" parameter.`;

interface NodeFillOutcome {
	parameters: IDataObject;
	assumptions: string[];
	failure?: string;
	leftoverIssues: string[];
}

function formatEdgeLine(
	direction: 'in' | 'out',
	skeleton: WorkflowSkeleton,
	edge: WorkflowSkeleton['connections'][number],
): string {
	const otherName = direction === 'in' ? edge.from : edge.to;
	const other = skeleton.nodes.find((node) => node.name === otherName);
	const contract = skeleton.contracts?.find(
		(candidate) => candidate.from === edge.from && candidate.to === edge.to,
	);
	const contractText = contract
		? ` — data contract: ${contract.fields
				.map((field) => (field.type ? `${field.name} (${field.type})` : field.name))
				.join(', ')}`
		: '';
	const port = edge.type === 'main' ? '' : ` [${edge.type}]`;
	const role = other ? ` (${other.type}: ${other.purpose})` : '';
	return direction === 'in'
		? `- from "${edge.from}"${port}${role}${contractText}`
		: `- to "${edge.to}"${port}${role}${contractText}`;
}

function buildFillUserText(
	input: FillWorkflowParametersInput,
	node: WorkflowSkeleton['nodes'][number],
	typeVersion: number,
	description: NodeDescription,
): string {
	const { skeleton, brief, nodeHints } = input;
	const incoming = skeleton.connections.filter((edge) => edge.to === node.name);
	const outgoing = skeleton.connections.filter((edge) => edge.from === node.name);
	const hint = nodeHints?.[node.name];

	const sections = [
		`## Workflow\nName: ${skeleton.name}\nBrief: ${brief}`,
		`## This node\nName: ${node.name}\nType: ${node.type} (typeVersion ${typeVersion})\nRole: ${node.purpose}`,
	];
	if (hint) sections.push(`## Instructions for this node\n${hint}`);
	if (incoming.length > 0) {
		sections.push(
			`## Incoming connections\n${incoming.map((edge) => formatEdgeLine('in', skeleton, edge)).join('\n')}`,
		);
	}
	if (outgoing.length > 0) {
		sections.push(
			`## Outgoing connections\n${outgoing.map((edge) => formatEdgeLine('out', skeleton, edge)).join('\n')}`,
		);
	}
	sections.push(
		`## Parameter schema (properties)\n${JSON.stringify(description.properties ?? [])}`,
	);
	return sections.join('\n\n');
}

async function computeParameterIssueLines(
	context: InstanceAiContext,
	nodeType: string,
	typeVersion: number,
	parameters: Record<string, unknown>,
): Promise<string[]> {
	if (!context.nodeService.getParameterIssues) return [];
	const issues = await context.nodeService
		.getParameterIssues(nodeType, typeVersion, parameters)
		.catch(() => ({}) as Record<string, string[]>);
	return Object.entries(issues).flatMap(([parameter, messages]) =>
		messages.map((message) => `${parameter}: ${message}`),
	);
}

async function fillNode(
	context: InstanceAiContext,
	input: FillWorkflowParametersInput,
	node: WorkflowSkeleton['nodes'][number],
	typeVersion: number,
): Promise<NodeFillOutcome> {
	const description = await context.nodeService
		.getDescription(node.type, typeVersion)
		.catch(() => null);
	if (!description) {
		return {
			parameters: {},
			assumptions: [],
			failure: 'node type schema unavailable',
			leftoverIssues: [],
		};
	}
	if ((description.properties ?? []).length === 0) {
		return { parameters: {}, assumptions: [], leftoverIssues: [] };
	}

	const userText = buildFillUserText(input, node, typeVersion, description);
	const generated = await generateValidatedJson('fill-node-parameters', {
		model: SONNET_MODEL,
		instructions: FILL_INSTRUCTIONS,
		userText,
		schema: fillResponseSchema,
		fallbackModelConfig: context.modelId,
	});
	if (!generated.ok) {
		return {
			parameters: {},
			assumptions: [],
			failure: `parameter generation failed (${generated.reason})`,
			leftoverIssues: [],
		};
	}

	let parameters = generated.data.parameters;
	const assumptions = generated.data.assumptions ?? [];

	// One repair round with the canvas-parity issues fed back.
	const issueLines = await computeParameterIssueLines(context, node.type, typeVersion, parameters);
	if (issueLines.length > 0) {
		const repaired = await generateValidatedJson('fill-node-parameters-repair', {
			model: SONNET_MODEL,
			instructions: FILL_INSTRUCTIONS,
			userText: `${userText}\n\n## Your previous parameters were rejected\n${JSON.stringify(parameters)}\n\nIssues:\n${issueLines.map((line) => `- ${line}`).join('\n')}\n\nReturn corrected parameters.`,
			schema: fillResponseSchema,
			fallbackModelConfig: context.modelId,
		});
		if (repaired.ok) {
			parameters = repaired.data.parameters;
			assumptions.push(...(repaired.data.assumptions ?? []));
		}
	}

	const leftoverIssues = await computeParameterIssueLines(
		context,
		node.type,
		typeVersion,
		parameters,
	);
	return { parameters, assumptions, leftoverIssues };
}

async function mapWithConcurrency<T, R>(
	items: T[],
	limit: number,
	task: (item: T) => Promise<R>,
): Promise<R[]> {
	const results = new Array<R>(items.length);
	let nextIndex = 0;
	const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
		while (nextIndex < items.length) {
			const index = nextIndex++;
			results[index] = await task(items[index]);
		}
	});
	await Promise.all(workers);
	return results;
}

/** Layered layout: x by graph depth from the entry nodes, y by lane within a depth. */
function computeNodePositions(skeleton: WorkflowSkeleton): Map<string, [number, number]> {
	const incomingCount = new Map<string, number>(skeleton.nodes.map((node) => [node.name, 0]));
	for (const edge of skeleton.connections) {
		incomingCount.set(edge.to, (incomingCount.get(edge.to) ?? 0) + 1);
	}
	const depths = new Map<string, number>();
	const queue: string[] = skeleton.nodes
		.filter((node) => (incomingCount.get(node.name) ?? 0) === 0)
		.map((node) => node.name);
	for (const name of queue) depths.set(name, 0);
	while (queue.length > 0) {
		const current = queue.shift()!;
		const depth = depths.get(current) ?? 0;
		for (const edge of skeleton.connections) {
			if (edge.from !== current) continue;
			if (depths.has(edge.to)) continue; // visited (also breaks cycles)
			depths.set(edge.to, depth + 1);
			queue.push(edge.to);
		}
	}
	const laneByDepth = new Map<number, number>();
	const positions = new Map<string, [number, number]>();
	for (const node of skeleton.nodes) {
		const depth = depths.get(node.name) ?? 0;
		const lane = laneByDepth.get(depth) ?? 0;
		laneByDepth.set(depth, lane + 1);
		positions.set(node.name, [depth * 260, lane * 180]);
	}
	return positions;
}

function assembleWorkflow(
	skeleton: WorkflowSkeleton,
	resolvedVersions: Record<string, number>,
	fills: Map<string, NodeFillOutcome>,
): WorkflowJSON {
	const positions = computeNodePositions(skeleton);
	const idByName = new Map<string, string>(
		skeleton.nodes.map((node, index) => [node.name, `skeleton-node-${index}`]),
	);
	const nodes = skeleton.nodes.map((node) => ({
		id: idByName.get(node.name)!,
		name: node.name,
		type: node.type,
		typeVersion: resolvedVersions[node.name],
		position: positions.get(node.name) ?? ([0, 0] as [number, number]),
		parameters: fills.get(node.name)?.parameters ?? {},
	}));
	// Assembly runs on a skeleton that already validated, so the throwaway
	// diagnostics array stays empty.
	const throwawayDiagnostics: SkeletonDiagnostic[] = [];
	const workflow: WorkflowJSON = {
		name: skeleton.name,
		nodes,
		connections: edgesToConnections(skeleton, throwawayDiagnostics),
	};
	if (skeleton.groups?.length) {
		workflow.nodeGroups = skeleton.groups.map((group, index) => ({
			id: `skeleton-group-${index}`,
			name: group.name,
			nodeIds: group.nodes.flatMap((name) => idByName.get(name) ?? []),
		}));
	}
	return workflow;
}

export async function fillWorkflowParameters(
	context: InstanceAiContext,
	input: FillWorkflowParametersInput,
): Promise<FillWorkflowParametersResult> {
	const emptyReport = {
		filledNodes: [] as string[],
		failedNodes: [] as Array<{ node: string; reason: string }>,
		parameterIssues: {} as Record<string, string[]>,
		assumptions: {} as Record<string, string[]>,
	};

	if (!context.workspace) {
		return {
			success: false,
			...emptyReport,
			failedNodes: [
				{
					node: '*',
					reason:
						'No runtime workspace available — the sandbox must be enabled to write workflow source files.',
				},
			],
			nextStep:
				'The sandbox workspace is unavailable, so no workflow source can be written. Surface this as a blocking error instead of retrying.',
		};
	}

	const validation = await validateSkeleton(context, input.skeleton);
	if (!validation.valid) {
		return {
			success: false,
			...emptyReport,
			skeletonDiagnostics: validation.diagnostics,
			nextStep:
				'Fix every error in skeletonDiagnostics, then call fill-workflow-parameters again with the corrected skeleton.',
		};
	}

	const outcomes = await mapWithConcurrency(
		input.skeleton.nodes,
		FILL_CONCURRENCY,
		async (node) => await fillNode(context, input, node, validation.resolvedVersions[node.name]),
	);
	const fills = new Map<string, NodeFillOutcome>(
		input.skeleton.nodes.map((node, index) => [node.name, outcomes[index]]),
	);

	const report = { ...emptyReport };
	for (const [name, outcome] of fills) {
		if (outcome.failure) {
			report.failedNodes.push({ node: name, reason: outcome.failure });
		} else {
			report.filledNodes.push(name);
		}
		if (outcome.leftoverIssues.length > 0) report.parameterIssues[name] = outcome.leftoverIssues;
		if (outcome.assumptions.length > 0) report.assumptions[name] = outcome.assumptions;
	}

	const workflow = assembleWorkflow(input.skeleton, validation.resolvedVersions, fills);
	const source = generateWorkflowCode(workflow);
	await writeWorkspaceFile(context.workspace, input.filePath, source, {
		logger: context.logger,
		resourceLabel: 'Assembled workflow source file',
	});

	return {
		success: true,
		filePath: input.filePath,
		...report,
		// Warnings only here: an error-severity diagnostic returns above.
		...(validation.diagnostics.length > 0 ? { skeletonDiagnostics: validation.diagnostics } : {}),
		nextStep:
			'Review skeletonDiagnostics warnings, parameterIssues, and assumptions; fix what matters with ' +
			'workspace_str_replace_file (or re-run with better hints) — do not rewrite the file from scratch. ' +
			`Then run the SDK validate CLI on "${input.filePath}" and call build-workflow with that filePath.`,
	};
}
