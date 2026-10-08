import { BUILTIN_NODES_PACKAGES } from '@n8n/constants';
import { isRecord } from '@n8n/utils/is-record';
import {
	executeFilter,
	jsonParse,
	type IConnections,
	type INodeParameters,
	type INodeTypeDescription,
	type NodeParameterValue,
} from 'n8n-workflow';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { z } from 'zod';

/**
 * Readers for the files of the software factory template pack and the built node types, and
 * stand-ins that run the code and the expressions of the template outside n8n.
 */

export const FACTORY_DIR = path.resolve(__dirname, '../../../../../docs/future-n8n-poc/factory');

export const WORKFLOW_FILE = 'software-factory.workflow.json';

export const AGENT_FILES = [
	'agents/planner.agent.json',
	'agents/implementer.agent.json',
	'agents/critic.agent.json',
] as const;

export type AgentFile = (typeof AGENT_FILES)[number];

export function readPackText(relativePath: string): string {
	return readFileSync(path.join(FACTORY_DIR, relativePath), 'utf8');
}

export function readPackJson(relativePath: string): unknown {
	return jsonParse(readPackText(relativePath));
}

/** A credential that a person chooses after import: no id, only a name. */
const placeholderCredentialSchema = z.object({ id: z.null(), name: z.string().trim().min(1) }).strict();

const templateNodeSchema = z
	.object({
		id: z.string().uuid(),
		name: z.string().min(1),
		type: z.string().min(1),
		typeVersion: z.number(),
		position: z.tuple([z.number(), z.number()]),
		parameters: z.custom<INodeParameters>(isRecord),
		credentials: z.record(placeholderCredentialSchema).optional(),
		notes: z.string().optional(),
		notesInFlow: z.boolean().optional(),
		onError: z.enum(['continueRegularOutput', 'continueErrorOutput', 'stopWorkflow']).optional(),
	})
	.strict();

/** The shape the template keeps to: no ids of the source instance, no pinned data. */
export const templateWorkflowSchema = z
	.object({
		name: z.string().min(1),
		nodes: z.array(templateNodeSchema),
		connections: z.custom<IConnections>(isRecord),
		settings: z.record(z.unknown()),
	})
	.strict();

export type TemplateWorkflow = z.infer<typeof templateWorkflowSchema>;
export type TemplateNode = TemplateWorkflow['nodes'][number];

export function readTemplateWorkflow(): TemplateWorkflow {
	return templateWorkflowSchema.parse(readPackJson(WORKFLOW_FILE));
}

export function nodeByName(workflow: TemplateWorkflow, name: string): TemplateNode {
	const node = workflow.nodes.find((candidate) => candidate.name === name);
	if (!node) throw new Error(`The template has no node "${name}"`);
	return node;
}

/**
 * The node types of the built-in node packages, with the package prefix that workflows use.
 * Each version line of a node is its own entry.
 */
export function loadBuiltinNodeTypes(): INodeTypeDescription[] {
	const requireFromHere = createRequire(__filename);
	return BUILTIN_NODES_PACKAGES.flatMap((packageName) => {
		const packageDir = path.dirname(requireFromHere.resolve(`${packageName}/package.json`));
		const nodesFile = path.join(packageDir, 'dist', 'types', 'nodes.json');
		return jsonParse<INodeTypeDescription[]>(readFileSync(nodesFile, 'utf8')).map(
			(description) => ({ ...description, name: `${packageName}.${description.name}` }),
		);
	});
}

/** The data that the code or the expression of one node sees. */
export interface TemplateRun {
	/** Output of earlier nodes by name. A node that is not here did not run. */
	nodes?: Record<string, Record<string, unknown>>;
	/** The first input item (`$input` in a Code node, `$json` in an expression). */
	json?: Record<string, unknown>;
	executionId?: string;
	runIndex?: number;
}

function sandboxOf(run: TemplateRun): Record<string, unknown> {
	const nodes = run.nodes ?? {};
	const reference = (name: string) => {
		const isExecuted = Object.hasOwn(nodes, name);
		const item = () => {
			if (!isExecuted) throw new Error(`Node '${name}' hasn't been executed`);
			return { json: nodes[name] };
		};
		return { isExecuted, first: item, last: item };
	};
	return {
		$: reference,
		$input: { first: () => ({ json: run.json ?? {} }) },
		$json: run.json ?? {},
		$execution: { id: run.executionId ?? '1' },
		$runIndex: run.runIndex ?? 0,
	};
}

/** Values from another realm have other prototypes. A JSON round trip makes them plain. */
const plain = (value: unknown): unknown =>
	value === undefined ? undefined : jsonParse(JSON.stringify(value));

/** Runs the JavaScript of a Code node with stand-ins for `$`, `$input` and `$execution`. */
export function runCodeNode(jsCode: string, run: TemplateRun): unknown {
	return plain(runInNewContext(`(() => {\n${jsCode}\n})()`, sandboxOf(run)));
}

const evaluate = (expression: string, run: TemplateRun) =>
	plain(runInNewContext(`(${expression})`, sandboxOf(run)));

const textOf = (value: unknown) =>
	value === undefined || value === null
		? ''
		: typeof value === 'object'
			? JSON.stringify(value)
			: String(value);

/**
 * Resolves a parameter value like n8n does. A value that is one `={{ … }}` expression keeps the
 * type of its result. Text with `{{ … }}` parts becomes a string.
 */
export function evaluateParameter(value: unknown, run: TemplateRun): unknown {
	if (typeof value !== 'string' || !value.startsWith('=')) return value;
	const template = value.slice(1);
	const single = /^\{\{([\s\S]*)\}\}$/.exec(template);
	if (single && !single[1].includes('{{')) return evaluate(single[1], run);
	return template.replace(/\{\{([\s\S]*?)\}\}/g, (_match, expression: string) =>
		textOf(evaluate(expression, run)),
	);
}

const filterValueSchema = z.object({
	options: z.object({
		caseSensitive: z.boolean(),
		leftValue: z.string(),
		typeValidation: z.enum(['strict', 'loose']),
		version: z.union([z.literal(1), z.literal(2), z.literal(3)]),
	}),
	conditions: z.array(
		z.object({
			id: z.string(),
			leftValue: z.unknown(),
			rightValue: z.unknown(),
			operator: z.object({
				type: z.enum(['string', 'number', 'boolean', 'array', 'object', 'dateTime', 'any']),
				operation: z.string(),
				singleValue: z.boolean().optional(),
			}),
		}),
	),
	combinator: z.enum(['and', 'or']),
});

const parameterValueSchema = z.union([z.string(), z.number(), z.boolean(), z.null(), z.undefined()]);

const toParameterValue = (value: unknown): NodeParameterValue => parameterValueSchema.parse(value);

/** Whether a filter value (If conditions or a Switch rule) passes, with the real filter logic. */
export function passesFilter(filterValue: unknown, run: TemplateRun): boolean {
	const filter = filterValueSchema.parse(filterValue);
	return executeFilter({
		...filter,
		conditions: filter.conditions.map((condition) => ({
			...condition,
			leftValue: toParameterValue(evaluateParameter(condition.leftValue, run)),
			rightValue: toParameterValue(evaluateParameter(condition.rightValue, run)),
		})),
	});
}
