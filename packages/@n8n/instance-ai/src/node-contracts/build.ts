import { isRecord } from '@n8n/utils/is-record';
import { toEngineConnections, type IDataObject, type WorkflowJSON } from '@n8n/workflow-sdk';
import { getParentNodes, mapConnectionsByDestination, NodeConnectionTypes } from 'n8n-workflow';

import { getContract } from './contracts';
import { getExpressionService } from './expression-check';
import { branchTag, isExpression, primitiveType, schemaToTs } from './helpers';
import type { ExploreResourcesParams, ExploreResourcesResult } from '../types';
import type { ActionContract, ContractInput, JsonSchema } from './types';

export interface ContractIssue {
	code: 'CONTRACT_INPUT_INVALID' | 'CONTRACT_EXPRESSION_TYPE';
	message: string;
	nodeName?: string;
	severity: 'error';
}

// ── Input validation ─────────────────────────────────────────────────────────

function typeMatches(value: unknown, type: JsonSchema['type']): boolean {
	switch (type) {
		case 'string':
			return typeof value === 'string';
		case 'number':
			return typeof value === 'number';
		case 'integer':
			return Number.isInteger(value);
		case 'boolean':
			return typeof value === 'boolean';
		case 'array':
			return Array.isArray(value);
		case 'object':
			return isRecord(value) && !Array.isArray(value);
		case 'null':
			return value === null;
		default:
			return true;
	}
}

function describeType(schema: JsonSchema): string {
	if (schema.enum) return `one of ${schema.enum.map((v) => JSON.stringify(v)).join(', ')}`;
	return schema.type ?? 'a value';
}

/**
 * Validates contract input against the JSON Schema subset contracts use. Any field except a
 * variant discriminator or an `x-n8n-literal` field may hold a `={{ }}` expression.
 */
export function validateContractInput(value: unknown, schema: JsonSchema, path = 'parameters') {
	const issues: string[] = [];
	const visit = (current: unknown, node: JsonSchema, at: string): void => {
		if (current === undefined) return;
		if (isExpression(current)) {
			if (node['x-n8n-literal']) issues.push(`${at}: must be a plain value, not an expression`);
			return;
		}
		if (node.oneOf && node.discriminator) {
			const tagName = node.discriminator.propertyName;
			const tags = node.oneOf.map((branch) => branchTag(branch, node));
			const tag = isRecord(current) ? current[tagName] : undefined;
			const branch = node.oneOf.find((candidate) => branchTag(candidate, node) === tag);
			if (!branch) {
				issues.push(
					`${at}: must be an object with "${tagName}" set to one of ${tags.map((t) => JSON.stringify(t)).join(', ')}` +
						(isExpression(tag) ? ' (a variant selector cannot be an expression)' : ''),
				);
				return;
			}
			visit(current, branch, at);
			return;
		}
		if (node.anyOf) {
			if (!node.anyOf.some((option) => validateContractInput(current, option, at).length === 0)) {
				issues.push(`${at}: does not match any allowed shape`);
			}
			return;
		}
		if (node.const !== undefined && current !== node.const) {
			issues.push(`${at}: must be ${JSON.stringify(node.const)}`);
			return;
		}
		if (node.enum && !node.enum.includes(current)) {
			issues.push(`${at}: must be ${describeType(node)}, got ${JSON.stringify(current)}`);
			return;
		}
		if (node.type && !typeMatches(current, node.type)) {
			issues.push(`${at}: must be ${describeType(node)}, got ${JSON.stringify(current)}`);
			return;
		}
		if (typeof current === 'string' && node.minLength && current.length < node.minLength) {
			issues.push(`${at}: must not be empty`);
		}
		if (Array.isArray(current)) {
			if (node.minItems && current.length < node.minItems) {
				issues.push(`${at}: needs at least ${node.minItems} item(s)`);
			}
			if (node.items) current.forEach((item, i) => visit(item, node.items ?? {}, `${at}[${i}]`));
			return;
		}
		if (!isRecord(current) || (!node.properties && node.additionalProperties === undefined)) return;

		for (const key of node.required ?? []) {
			if (current[key] === undefined) issues.push(`${at}.${key}: is required`);
		}
		const unknown: string[] = [];
		for (const [key, child] of Object.entries(current)) {
			const property = node.properties?.[key];
			if (property) visit(child, property, `${at}.${key}`);
			else if (isRecord(node.additionalProperties)) {
				visit(child, node.additionalProperties, `${at}.${key}`);
			} else if (node.additionalProperties !== true) unknown.push(key);
		}
		if (unknown.length) {
			const known = Object.keys(node.properties ?? {}).join(', ');
			issues.push(`${at}: unknown field(s) ${unknown.join(', ')}. Allowed: ${known}`);
		}
	};
	visit(value, schema, path);
	return issues;
}

// ── Output resolution ────────────────────────────────────────────────────────

/** The item shape a contract node emits for its configured parameters. */
export function resolveContractOutput(
	contract: ActionContract,
	input: ContractInput,
	upstream?: JsonSchema,
): JsonSchema {
	if (contract.deriveOutput) return contract.deriveOutput(input, upstream);
	const find = (value: unknown, schema: JsonSchema): JsonSchema | undefined => {
		if (schema.oneOf && schema.discriminator) {
			const selected = value ?? schema.default;
			const tag = isRecord(selected) ? selected[schema.discriminator.propertyName] : undefined;
			const branch = schema.oneOf.find((candidate) => branchTag(candidate, schema) === tag);
			return branch?.['x-n8n-output'] ?? (branch ? find(selected, branch) : undefined);
		}
		const record = isRecord(value) ? value : {};
		for (const [key, child] of Object.entries(schema.properties ?? {})) {
			const found = find(record[key], child);
			if (found) return found;
		}
		return undefined;
	};
	return find(input, contract.input) ?? contract.output;
}

// ── Compile ──────────────────────────────────────────────────────────────────

export interface CompiledContractNode {
	contract: ActionContract;
	input: ContractInput;
}

/**
 * Replaces every node whose type is an action id with the legacy node it compiles to.
 * Nodes with a legacy type pass through unchanged, so one workflow can mix both.
 */
export function compileContractNodes(json: WorkflowJSON): {
	workflow: WorkflowJSON;
	issues: ContractIssue[];
	contractNodes: Map<string, CompiledContractNode>;
} {
	const issues: ContractIssue[] = [];
	const contractNodes = new Map<string, CompiledContractNode>();
	const nodes = (json.nodes ?? []).map((node) => {
		const contract = getContract(node.type);
		if (!contract) return node;
		const input: ContractInput = isRecord(node.parameters) ? node.parameters : {};
		const inputIssues = validateContractInput(input, contract.input);
		if (inputIssues.length) {
			issues.push({
				code: 'CONTRACT_INPUT_INVALID',
				severity: 'error',
				nodeName: node.name,
				message:
					`'${node.name ?? contract.id}' does not match the ${contract.id} contract: ${inputIssues.join('; ')}. ` +
					`Read it with nodes(action="type-definition", nodeTypes=["${contract.id}"]).`,
			});
		}
		if (node.name) contractNodes.set(node.name, { contract, input });
		// The compile functions only read the input and return a fresh parameters object.
		const parameters = contract.compile.parameters(input) as IDataObject;
		return {
			...node,
			type: contract.compile.type,
			typeVersion: contract.compile.typeVersion,
			parameters,
		};
	});
	return { workflow: { ...json, nodes }, issues, contractNodes };
}

// ── Expression type check ────────────────────────────────────────────────────

/** The TS type an expression must yield to fill a slot of this schema type. */
const slotType = (type: JsonSchema['type']) =>
	type === 'object' ? 'object' : type === 'array' ? 'unknown[]' : primitiveType(type);

interface ExpressionSlot {
	path: string;
	expression: string;
	schema?: JsonSchema;
}

/** Every expression in `value`, with the input schema of its slot when the contract declares one. */
function expressionSlots(
	value: unknown,
	schema: JsonSchema | undefined,
	path: string,
): ExpressionSlot[] {
	if (isExpression(value)) return [{ path, expression: value, schema }];
	const tag =
		schema?.discriminator && isRecord(value) ? value[schema.discriminator.propertyName] : undefined;
	const node = schema?.oneOf?.find((branch) => branchTag(branch, schema) === tag) ?? schema;
	if (Array.isArray(value)) {
		return value.flatMap((item, i) => expressionSlots(item, node?.items, `${path}[${i}]`));
	}
	if (!isRecord(value)) return [];
	return Object.entries(value).flatMap(([key, child]) =>
		expressionSlots(
			child,
			node?.properties?.[key] ??
				(isRecord(node?.additionalProperties) ? node.additionalProperties : undefined),
			`${path}.${key}`,
		),
	);
}

/**
 * Output schemas of contract nodes. A node with one parent builds on the parent's output
 * (Set keeping input fields); a fetched resource schema takes precedence.
 */
function contractOutputs(
	byDestination: ReturnType<typeof mapConnectionsByDestination>,
	contractNodes: Map<string, CompiledContractNode>,
	resourceOutputs: ReadonlyMap<string, JsonSchema>,
): Map<string, JsonSchema> {
	const resolved = new Map<string, JsonSchema>();
	const resolve = (name: string, visiting: ReadonlySet<string>): JsonSchema | undefined => {
		const known = resolved.get(name) ?? resourceOutputs.get(name);
		const compiled = contractNodes.get(name);
		if (known || !compiled || visiting.has(name)) return known;
		const parents = getParentNodes(byDestination, name, NodeConnectionTypes.Main, 1);
		const upstream =
			parents.length === 1 ? resolve(parents[0], new Set([...visiting, name])) : undefined;
		const schema = resolveContractOutput(compiled.contract, compiled.input, upstream);
		resolved.set(name, schema);
		return schema;
	};
	return new Map(
		[...contractNodes.keys()].flatMap((name) => {
			const schema = resolve(name, new Set());
			return schema ? [[name, schema] as const] : [];
		}),
	);
}

export type ExploreResources = (params: ExploreResourcesParams) => Promise<ExploreResourcesResult>;

const RESOURCE_SCHEMA_TIMEOUT_MS = 5_000;

/**
 * Fetches the fields of each contract node's resource (Sheet columns, Notion properties) with
 * the node's own loadOptions method. Best-effort: a missing credential, an error or a slow
 * response leaves that node's output as derived, so a build never depends on the lookup.
 */
export async function fetchResourceOutputs(
	json: WorkflowJSON,
	contractNodes: Map<string, CompiledContractNode>,
	explore: ExploreResources,
): Promise<Map<string, JsonSchema>> {
	const nodesByName = new Map((json.nodes ?? []).map((node) => [node.name, node]));
	const fetched = await Promise.all(
		[...contractNodes].map(async ([name, { contract, input }]) => {
			const node = nodesByName.get(name);
			const source = contract.resourceSchema;
			const [credentialType, credential] = Object.entries(node?.credentials ?? {})[0] ?? [];
			const credentialId = isRecord(credential) ? credential.id : undefined;
			if (!source || !node || !credentialType || typeof credentialId !== 'string') return [];
			const timeout = new Promise<undefined>((resolve) =>
				setTimeout(() => resolve(undefined), RESOURCE_SCHEMA_TIMEOUT_MS).unref(),
			);
			const result = await Promise.race([
				explore({
					nodeType: node.type,
					version: node.typeVersion,
					methodName: source.methodName,
					methodType: 'loadOptions',
					credentialType,
					credentialId,
					currentNodeParameters: isRecord(node.parameters) ? node.parameters : {},
				}).catch(() => undefined),
				timeout,
			]);
			if (!result?.results.length) return [];
			const derived = resolveContractOutput(contract, input);
			return [[name, source.toOutput(result.results, input, derived)] as const];
		}),
	);
	return new Map(fetched.flat());
}

/** `$('Name')` and `$node['Name']` reads; a non-literal name has no captured group. */
const NODE_READ = /\$(?:\(|node\[)\s*(?:(['"])(.*?)\1)?/g;

/**
 * Type-checks expressions in every node downstream of a contract node. Upstream contract
 * outputs are typed; reads of other nodes stay loose. A slot's declared input type is the
 * expected result type.
 */
export async function checkContractOutputReads(
	json: WorkflowJSON,
	contractNodes: Map<string, CompiledContractNode>,
	resourceOutputs: ReadonlyMap<string, JsonSchema> = new Map(),
): Promise<ContractIssue[]> {
	const byDestination = mapConnectionsByDestination(toEngineConnections(json.connections));
	const outputTypes = new Map(
		[...contractOutputs(byDestination, contractNodes, resourceOutputs)].map(([name, schema]) => [
			name,
			schemaToTs(schema),
		]),
	);
	const checks = (json.nodes ?? []).flatMap((node) => {
		const nodeName = node.name;
		if (!nodeName) return [];
		const nodes = Object.fromEntries(
			getParentNodes(byDestination, nodeName, NodeConnectionTypes.Main).flatMap((name) => {
				const type = outputTypes.get(name);
				return type ? [[name, { json: type }]] : [];
			}),
		);
		if (Object.keys(nodes).length === 0) return [];
		const parents = getParentNodes(byDestination, nodeName, NodeConnectionTypes.Main, 1);
		const parentTypes = parents.flatMap((name) => outputTypes.get(name) ?? []);
		const inputJson =
			parents.length > 0 && parentTypes.length === parents.length
				? parentTypes.join(' | ')
				: undefined;
		const compiled = contractNodes.get(nodeName);
		const slots = compiled
			? expressionSlots(compiled.input, compiled.contract.input, 'parameters')
			: expressionSlots(node.parameters, undefined, 'parameters');
		return slots.map((slot) => ({ nodeName, nodes, inputJson, ...slot }));
	});
	if (checks.length === 0) return [];

	const service = await getExpressionService();
	return checks.flatMap(
		({ nodeName, nodes, inputJson, path, expression, schema }): ContractIssue[] => {
			const readsTypedNodesOnly = [...expression.matchAll(NODE_READ)].every(
				(match) => match[2] !== undefined && Object.hasOwn(nodes, match[2]),
			);
			const analysis = service.analyze(
				expression,
				{
					context: 'nodeParameter',
					strict: inputJson !== undefined && readsTypedNodesOnly,
					inputJson,
					nodes,
				},
				slotType(schema?.type),
			);
			const messages = [
				...analysis.blocks.flatMap((block) => block.errors.map((error) => error.message)),
				...(analysis.slotError ? [analysis.slotError] : []),
			];
			if (messages.length === 0) return [];
			return [
				{
					code: 'CONTRACT_EXPRESSION_TYPE',
					severity: 'error',
					nodeName,
					message: `'${nodeName}' ${path} = ${JSON.stringify(expression)}: ${messages.join(' ')}`,
				},
			];
		},
	);
}
