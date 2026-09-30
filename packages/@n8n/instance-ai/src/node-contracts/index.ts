import { CONTRACTS, getContract } from './contracts';
import { branchTag, schemaToTs } from './helpers';
import type { ActionContract, JsonSchema } from './types';

export type { ActionContract, JsonSchema } from './types';
export { getContract };
export { compileContractNodes, checkContractOutputReads, fetchResourceOutputs } from './build';

export function contractsForNodeType(nodeType: string): ActionContract[] {
	return CONTRACTS.filter((contract) => contract.compile.type === nodeType);
}

/** Maps a legacy `(type, resource, operation, mode)` request to its action, when one exists. */
export function findContractForLegacyRequest(
	nodeType: string,
	discriminators: { resource?: string; operation?: string; mode?: string } = {},
): ActionContract | undefined {
	const candidates = contractsForNodeType(nodeType);
	if (candidates.length === 1 && !candidates[0].compile.discriminators) return candidates[0];
	return candidates.find((contract) => {
		const own = contract.compile.discriminators ?? {};
		return (Object.keys(own) as Array<keyof typeof own>).every(
			(key) => discriminators[key] === own[key],
		);
	});
}

// ── Views ────────────────────────────────────────────────────────────────────

/** Variant selectors by dotted path, e.g. `{ "output.mode": ["simplified", "raw"] }`. */
function collectSelectors(schema: JsonSchema, path = ''): Record<string, string[]> {
	const selectors: Record<string, string[]> = {};
	if (schema.oneOf && schema.discriminator) {
		const key = joinPath(path, schema.discriminator.propertyName);
		selectors[key] = schema.oneOf.map((branch) => String(branchTag(branch, schema)));
		for (const branch of schema.oneOf) Object.assign(selectors, collectSelectors(branch, path));
	}
	for (const [name, child] of Object.entries(schema.properties ?? {})) {
		Object.assign(selectors, collectSelectors(child, joinPath(path, name)));
	}
	return selectors;
}

function joinPath(path: string, name: string) {
	return path ? `${path}.${name}` : name;
}

function flowLine(contract: ActionContract) {
	const { effect, cardinality, passthrough } = contract.flow;
	return `${effect}, ${cardinality}, ${passthrough === 'replace' ? 'replaces input fields' : 'keeps input fields'}`;
}

/** L0: the compact signature search results carry (~60 tokens). */
export function contractSignature(contract: ActionContract) {
	return {
		id: contract.id,
		action: contract.action,
		summary: contract.summary,
		flow: flowLine(contract),
		selectors: collectSelectors(contract.input),
	};
}

function compactType(schema: JsonSchema): string {
	if (schema.const !== undefined) return JSON.stringify(schema.const);
	if (schema.enum) return schema.enum.map((value) => JSON.stringify(value)).join(' | ');
	if (schema.oneOf && schema.discriminator) return `variant(${schema.discriminator.propertyName})`;
	if (schema.type === 'array') return `${compactType(schema.items ?? {})}[]`;
	return schema.type ?? 'any';
}

function compactField(schema: JsonSchema): string {
	const hint = schema['x-n8n-hint'];
	return hint ? `${compactType(schema)} (${hint})` : compactType(schema);
}

/** Nested variants and arrays of them render as views instead of a one-word type. */
function isStructured(schema: JsonSchema): boolean {
	return Boolean(schema.oneOf ?? schema.items?.oneOf ?? schema.items?.properties);
}

/** Branches that render identically share one key, e.g. "title | rich_text". */
function groupIdentical(entries: ReadonlyArray<readonly [string, unknown]>) {
	const groups = new Map<string, { tags: string[]; view: unknown }>();
	for (const [tag, view] of entries) {
		const signature = JSON.stringify(view);
		const group = groups.get(signature);
		if (group) group.tags.push(tag);
		else groups.set(signature, { tags: [tag], view });
	}
	return Object.fromEntries([...groups.values()].map(({ tags, view }) => [tags.join(' | '), view]));
}

/** Outputs render as the TS types that `CONTRACT_EXPRESSION_TYPE` checks against. */
const outputType = (schema: JsonSchema) => schemaToTs(schema, { hints: true });

/** Fields that every branch declares with the same schema render once, as `shared`. */
function sharedFields(schema: JsonSchema): string[] {
	const [first, ...others] = schema.oneOf ?? [];
	if (!first || others.length === 0) return [];
	return Object.entries(first.properties ?? {})
		.filter(([name]) => name !== schema.discriminator?.propertyName)
		.filter(([name, field]) =>
			others.every((branch) => JSON.stringify(branch.properties?.[name]) === JSON.stringify(field)),
		)
		.map(([name]) => name);
}

/** True when a selectable variant branch declares the output shape. */
function hasOutputVariant(schema: JsonSchema): boolean {
	if (schema.oneOf?.some((branch) => branch['x-n8n-output'])) return true;
	return Object.values(schema.properties ?? {}).some(hasOutputVariant);
}

function stripOutput({ 'x-n8n-output': _output, ...rest }: JsonSchema): JsonSchema {
	return rest;
}

/**
 * Variants collapse to their branch names, field signatures and full output unless the
 * caller selected a branch, which then expands with nested schemas.
 */
function viewSchema(
	schema: JsonSchema,
	selections: Record<string, string>,
	path: string,
): Record<string, unknown> | JsonSchema {
	if (schema.oneOf && schema.discriminator) {
		const key = joinPath(path, schema.discriminator.propertyName);
		const chosen = schema.oneOf.find((branch) => branchTag(branch, schema) === selections[key]);
		if (chosen) {
			return {
				...viewSchema(stripOutput(chosen), selections, path),
				...(chosen['x-n8n-output'] ? { output: outputType(chosen['x-n8n-output']) } : {}),
			};
		}
		const renderField = (name: string, field: JsonSchema) =>
			isStructured(field)
				? viewSchema(field, selections, joinPath(path, name))
				: compactField(field);
		const shared = sharedFields(schema);
		return {
			discriminator: schema.discriminator.propertyName,
			...(schema.default !== undefined ? { default: schema.default } : {}),
			...(schema['x-n8n-hint'] ? { 'x-n8n-hint': schema['x-n8n-hint'] } : {}),
			...(shared.length
				? {
						shared: Object.fromEntries(
							shared.map((name) => [
								name,
								renderField(name, schema.oneOf?.[0]?.properties?.[name] ?? {}),
							]),
						),
					}
				: {}),
			variants: groupIdentical(
				schema.oneOf.map((branch) => {
					const tag = String(branchTag(branch, schema));
					const fields = Object.entries(branch.properties ?? {}).filter(
						([name]) => name !== schema.discriminator?.propertyName && !shared.includes(name),
					);
					return [
						tag,
						{
							...(branch['x-n8n-hint'] ? { hint: branch['x-n8n-hint'] } : {}),
							...(fields.length
								? {
										fields: Object.fromEntries(
											fields.map(([name, field]) => [name, renderField(name, field)]),
										),
									}
								: {}),
							...(branch['x-n8n-output'] ? { output: outputType(branch['x-n8n-output']) } : {}),
						},
					] as const;
				}),
			),
		};
	}
	if (schema.type === 'array' && schema.items) {
		return { type: 'array', items: viewSchema(schema.items, selections, path) };
	}
	if (!schema.properties) return schema;
	return {
		...schema,
		properties: Object.fromEntries(
			Object.entries(schema.properties).map(([name, child]) => [
				name,
				viewSchema(child, selections, joinPath(path, name)),
			]),
		),
	};
}

/**
 * Actions of a search hit. The full view goes inline for each action that every
 * action term names (or for a node's only action when the query names no action).
 * The other actions stay one line, so a service-only query stays small.
 */
export function contractSearchActions(nodeType: string, actionTerms: readonly string[]) {
	const contracts = contractsForNodeType(nodeType);
	if (!contracts.length) return undefined;
	const isNamed = (contract: ActionContract) =>
		actionTerms.length
			? actionTerms.every((term) =>
					`${contract.id} ${contract.action} ${contract.summary}`.toLowerCase().includes(term),
				)
			: contracts.length === 1;
	const named = contracts.filter(isNamed);
	const others = contracts.filter((contract) => !isNamed(contract));
	return {
		...(named.length ? { actions: named.map((contract) => contractView(contract)) } : {}),
		...(others.length
			? { otherActions: others.map((contract) => `${contract.id}: ${contract.summary}`) }
			: {}),
	};
}

export function contractView(contract: ActionContract, selections: Record<string, string> = {}) {
	const parameters = JSON.stringify(contract.example, null, 2).replace(/\n/g, '\n  ');
	const credentials = contract.credentials.length
		? `,\n  credentials: { ${contract.credentials[0]}: newCredential('…') }`
		: '';
	return {
		id: contract.id,
		node: contract.node,
		action: contract.action,
		summary: contract.summary,
		flow: contract.flow,
		credentials: contract.credentials,
		usage: `action('${contract.id}', {\n  name: '…',\n  parameters: ${parameters}${credentials}\n})`,
		input: viewSchema(contract.input, selections, ''),
		output: hasOutputVariant(contract.input)
			? 'The selected variant output. Fields named in parameters are typed at build time.'
			: contract.deriveOutput
				? `Derived from parameters at build time. Base: ${outputType(contract.output)}`
				: outputType(contract.output),
	};
}

/**
 * Agents guess action ids from memory. For an unknown id, the actions of the same node
 * first, then actions with the same operation name.
 */
export function nearestContracts(id: string, limit = 3): ActionContract[] {
	const [node, ...rest] = id.split('.');
	const operation = rest.at(-1);
	const score = (contract: ActionContract) =>
		(contract.node === node ? 2 : 0) + (contract.id.endsWith(`.${operation}`) ? 1 : 0);
	return CONTRACTS.filter((contract) => score(contract) > 0)
		.sort((a, b) => score(b) - score(a))
		.slice(0, limit);
}
