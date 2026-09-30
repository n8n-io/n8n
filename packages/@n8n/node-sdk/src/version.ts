import { createHash } from 'node:crypto';
import { UnexpectedError, type INodeTypeDescription } from 'n8n-workflow';

import type { ContractDocument } from './define';
import type { JsonSchema } from './schema';

/**
 * The executor contract of frozen actions: `RunContext` and `Http` semantics, parameter
 * reading and validation, output pairing, and the host modules a bundle may import. A change
 * to any of them needs a new ABI.
 */
export const NODE_CONTRACT_ABI = 1;

/** One frozen action version. A published `id` and `version` never change their bytes. */
export interface VersionManifest {
	readonly id: string;
	readonly version: number;
	readonly abi: number;
	readonly contractHash: string;
	readonly bundleHash: string;
	readonly contract: ContractDocument;
	/** The node description at freeze time, so the UI of a version never changes. */
	readonly description: INodeTypeDescription;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === 'object' && value !== null && !Array.isArray(value);

const sortKeys = (value: unknown): unknown =>
	Array.isArray(value)
		? value.map(sortKeys)
		: isRecord(value)
			? Object.fromEntries(
					Object.keys(value)
						.sort()
						.map((key) => [key, sortKeys(value[key])]),
				)
			: value;

/** JSON with sorted object keys, so equal values give equal text. */
export const canonicalJson = (value: unknown) => JSON.stringify(sortKeys(value));

export const sha256 = (text: string) => createHash('sha256').update(text).digest('hex');

export const contractHash = (contract: ContractDocument) => sha256(canonicalJson(contract));

const isManifest = (value: unknown): value is VersionManifest =>
	isRecord(value) &&
	typeof value.id === 'string' &&
	typeof value.version === 'number' &&
	typeof value.abi === 'number' &&
	typeof value.contractHash === 'string' &&
	typeof value.bundleHash === 'string' &&
	isRecord(value.contract) &&
	isRecord(value.description);

export function parseManifest(text: string): VersionManifest {
	const value: unknown = JSON.parse(text);
	if (!isManifest(value) || contractHash(value.contract) !== value.contractHash) {
		throw new UnexpectedError('The version manifest is not valid or its contract changed');
	}
	return value;
}

export interface ContractDiff {
	readonly kind: 'none' | 'additive' | 'breaking';
	readonly changes: readonly string[];
}

interface Change {
	readonly breaking: boolean;
	readonly text: string;
}

const isRequired = (schema: JsonSchema, name: string) => (schema.required ?? []).includes(name);

/** An input change is breaking when it rejects old parameters, an output change when it drops a guarantee. */
function fieldChanges(side: 'input' | 'output', prev: JsonSchema, next: JsonSchema): Change[] {
	const input = side === 'input';
	const before = prev.properties ?? {};
	const after = next.properties ?? {};
	const names = [...new Set([...Object.keys(before), ...Object.keys(after)])];
	return names.flatMap((name): Change[] => {
		const [old, now, at] = [before[name], after[name], `${side}.${name}`];
		if (!now) return [{ breaking: true, text: `${at} removed` }];
		if (!old) return [{ breaking: input && isRequired(next, name), text: `${at} added` }];
		const required = isRequired(next, name);
		const oldEnum = old.enum ?? [];
		const newEnum = now.enum ?? [];
		const dropped = oldEnum.filter((value) => !newEnum.includes(value));
		const added = newEnum.filter((value) => !oldEnum.includes(value));
		return [
			...(old.type !== now.type || Boolean(old.enum) !== Boolean(now.enum)
				? [{ breaking: true, text: `${at} changed type` }]
				: []),
			...(isRequired(prev, name) !== required
				? [{ breaking: input === required, text: `${at} is ${required ? 'required' : 'optional'}` }]
				: []),
			...(dropped.length ? [{ breaking: input, text: `${at} drops ${dropped.join(', ')}` }] : []),
			...(added.length ? [{ breaking: !input, text: `${at} adds ${added.join(', ')}` }] : []),
		];
	});
}

/** Compares the top-level fields of two contracts. A breaking diff needs a new version. */
export function diffContracts(prev: ContractDocument, next: ContractDocument): ContractDiff {
	const changes = [
		...fieldChanges('input', prev.input, next.input),
		...fieldChanges('output', prev.output, next.output),
	];
	return {
		kind: changes.some(({ breaking }) => breaking)
			? 'breaking'
			: changes.length
				? 'additive'
				: 'none',
		changes: changes.map(({ text }) => text),
	};
}
