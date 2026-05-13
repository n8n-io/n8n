/**
 * Incremental draft tools — @n8n/agents Tool builders that mutate a
 * shared DraftStore. One Specialist agent receives a subset of these per
 * checklist item.
 *
 * `connect` accepts every NodeConnectionType (main + ai_*), which is what
 * lets the agent attach a Language Model / Memory / Tool to an AI Agent
 * node in the same shape it uses for normal data wiring.
 *
 * After every node-shape mutation we run `getParameterIssues` (the same
 * check the n8n editor uses to red-dot a node) and return the structured
 * issues to the LLM so it can fix them on the next call instead of
 * proceeding with a broken node.
 */

import { Tool } from '@n8n/agents';
import { incNodeConnectionTypeSchema, type IncNodeConnectionType } from '@n8n/api-types';
import { z } from 'zod';

import type { DraftStore } from '../draft-store';
import type { NodeContext } from '../node-context';

const positionSchema = z.tuple([z.number(), z.number()]);

const portDescription =
	'Connection port. Use "main" for normal data flow, or one of the ai_* ' +
	'ports to attach a sub-node to an AI Agent / Chain (ai_languageModel, ' +
	'ai_memory, ai_tool, ai_outputParser, ai_vectorStore, ai_retriever, ' +
	'ai_embedding, ai_reranker, ai_textSplitter, ai_document, ai_chain, ai_agent).';

const validationIssueSchema = z
	.record(z.array(z.string()))
	.describe(
		'Map of parameter name → list of human-readable issues. Empty / absent ' +
			'means the node currently validates cleanly.',
	);

type ValidationIssues = z.infer<typeof validationIssueSchema>;

function formatIssuesForLLM(name: string, issues: ValidationIssues): string {
	const lines = Object.entries(issues).flatMap(([param, msgs]) =>
		msgs.map((m) => `  - ${param}: ${m}`),
	);
	return [`Node "${name}" has parameter issues — fix these before moving on:`, ...lines].join('\n');
}

export function createDraftTools(draft: DraftStore, nodeCtx: NodeContext) {
	const addNode = new Tool('add_node')
		.description(
			'Add one node to the workflow draft. The tool re-validates the node ' +
				'after adding it; if `validationIssues` is returned, FIX the issues ' +
				'with set_node_params before moving to the next step.',
		)
		.input(
			z.object({
				name: z.string().describe('Unique display name for the node within the workflow'),
				type: z
					.string()
					.describe(
						'Full node type, e.g. "n8n-nodes-base.slack" or "@n8n/n8n-nodes-langchain.agent"',
					),
				typeVersion: z.number().optional(),
				position: positionSchema.optional(),
				parameters: z.record(z.unknown()).optional(),
			}),
		)
		.output(
			z.object({
				ok: z.boolean(),
				nodeId: z.string().optional(),
				error: z.string().optional(),
				validationIssues: validationIssueSchema.optional(),
				validationGuidance: z.string().optional(),
			}),
		)
		.handler(async (input) => {
			try {
				const node = draft.addNode(input);
				const issues = await nodeCtx.validateNode(node.type, node.typeVersion, node.parameters);
				if (issues) {
					return {
						ok: true,
						nodeId: node.id,
						validationIssues: issues,
						validationGuidance: formatIssuesForLLM(node.name, issues),
					};
				}
				return { ok: true, nodeId: node.id };
			} catch (error) {
				return { ok: false, error: error instanceof Error ? error.message : String(error) };
			}
		});

	const setNodeParams = new Tool('set_node_params')
		.description(
			'Patch parameters on a node already present in the draft. Merges with ' +
				'existing params. Returns updated `validationIssues` so you can iterate ' +
				'until the node validates cleanly.',
		)
		.input(
			z.object({
				name: z.string(),
				parameters: z.record(z.unknown()),
			}),
		)
		.output(
			z.object({
				ok: z.boolean(),
				error: z.string().optional(),
				validationIssues: validationIssueSchema.optional(),
				validationGuidance: z.string().optional(),
			}),
		)
		.handler(async ({ name, parameters }) => {
			try {
				const node = draft.setNodeParams(name, parameters);
				const issues = await nodeCtx.validateNode(node.type, node.typeVersion, node.parameters);
				if (issues) {
					return {
						ok: true,
						validationIssues: issues,
						validationGuidance: formatIssuesForLLM(node.name, issues),
					};
				}
				return { ok: true };
			} catch (error) {
				return { ok: false, error: error instanceof Error ? error.message : String(error) };
			}
		});

	const connect = new Tool('connect')
		.description(
			'Wire two nodes together. Use this for normal data flow AND for ' +
				'attaching language models, memory, and tools to AI Agent / Chain nodes ' +
				'(pick the matching ai_* port).',
		)
		.systemInstruction(
			'When connecting a Chat Model, Memory, Vector Store, Tool, or Output Parser ' +
				'to an AI Agent / Chain node, set `port` to the ai_* variant — never "main". ' +
				'For sub-node attachments, `from` is the sub-node (model/memory/tool) and ' +
				'`to` is the AI Agent root.',
		)
		.input(
			z.object({
				from: z.string().describe('Source node name (output side)'),
				to: z.string().describe('Destination node name (input side)'),
				port: incNodeConnectionTypeSchema.describe(portDescription),
				fromIndex: z.number().optional(),
				toIndex: z.number().optional(),
			}),
		)
		.output(
			z.object({
				ok: z.boolean(),
				error: z.string().optional(),
			}),
		)
		.handler(async (input) => {
			try {
				draft.connect(input as { from: string; to: string; port: IncNodeConnectionType });
				return { ok: true };
			} catch (error) {
				return { ok: false, error: error instanceof Error ? error.message : String(error) };
			}
		});

	const disconnect = new Tool('disconnect')
		.description('Remove a previously created edge between two nodes.')
		.input(
			z.object({
				from: z.string(),
				to: z.string(),
				port: incNodeConnectionTypeSchema,
				fromIndex: z.number().optional(),
				toIndex: z.number().optional(),
			}),
		)
		.output(z.object({ ok: z.boolean() }))
		.handler(async (input) => {
			draft.disconnect(input as { from: string; to: string; port: IncNodeConnectionType });
			return { ok: true };
		});

	const removeNode = new Tool('remove_node')
		.description('Delete a node from the draft (also removes incident edges).')
		.input(z.object({ name: z.string() }))
		.output(z.object({ ok: z.boolean(), error: z.string().optional() }))
		.handler(async ({ name }) => {
			try {
				draft.removeNode(name);
				return { ok: true };
			} catch (error) {
				return { ok: false, error: error instanceof Error ? error.message : String(error) };
			}
		});

	const inspectDraft = new Tool('inspect_draft')
		.description('Return a summary of the current draft (nodes + edges).')
		.input(z.object({}))
		.output(
			z.object({
				nodes: z.array(z.object({ name: z.string(), type: z.string(), id: z.string() })),
				edges: z.array(
					z.object({
						from: z.string(),
						to: z.string(),
						port: incNodeConnectionTypeSchema,
					}),
				),
			}),
		)
		.handler(async () => {
			const state = draft.getState();
			return {
				nodes: state.nodes.map((n) => ({ name: n.name, type: n.type, id: n.id })),
				edges: state.edges.map((e) => ({ from: e.from, to: e.to, port: e.port })),
			};
		});

	return { addNode, setNodeParams, connect, disconnect, removeNode, inspectDraft };
}

export type DraftToolSet = ReturnType<typeof createDraftTools>;
