import { isRecord } from '@n8n/utils/is-record';

import type { RuleNode, RuleWorkflow } from './types';

export const STICKY_NOTE_TYPE = 'n8n-nodes-base.stickyNote';

const MAX_WALK_DEPTH = 12;

export function isExpression(value: unknown): value is string {
	return typeof value === 'string' && value.startsWith('=');
}

/** Host nodes without sticky notes. */
export function getCheckedNodes(workflow: RuleWorkflow): RuleNode[] {
	const hostNodes =
		workflow.hostNodeCount === undefined
			? workflow.nodes
			: workflow.nodes.slice(0, workflow.hostNodeCount);
	return hostNodes.filter((node) => node.type !== STICKY_NOTE_TYPE);
}

function parsePath(path: string): string[] {
	return path
		.replace(/\[(\d+)\]/g, '.$1')
		.split('.')
		.filter((segment) => segment.length > 0);
}

/** Reads `a.b[0].c` from an object. Returns `undefined` for a missing path. */
export function getByPath(source: unknown, path: string): unknown {
	let current: unknown = source;
	for (const segment of parsePath(path)) {
		if (Array.isArray(current)) {
			current = current[Number(segment)];
		} else if (isRecord(current)) {
			current = current[segment];
		} else {
			return undefined;
		}
	}
	return current;
}

export function getSetting(workflow: RuleWorkflow, path: string): unknown {
	return getByPath(workflow.settings ?? undefined, path);
}

export function getParameter(node: RuleNode, path: string): unknown {
	return getByPath(node.parameters ?? undefined, path);
}

export interface StringParameter {
	readonly path: string;
	/** The property name, or the `name` of a `{ name, value }` pair such as an HTTP header. */
	readonly key: string;
	readonly value: string;
	/** True when `key` is the user-typed name of a `{ name, value }` pair. */
	readonly fromPair: boolean;
}

/** Every string value inside a node's parameters, with its path. */
export function collectStringParameters(node: RuleNode): StringParameter[] {
	const found: StringParameter[] = [];

	const walk = (value: unknown, path: string, key: string, fromPair: boolean, depth: number) => {
		if (depth > MAX_WALK_DEPTH) return;
		if (typeof value === 'string') {
			found.push({ path, key, value, fromPair });
			return;
		}
		if (Array.isArray(value)) {
			value.forEach((item, index) => walk(item, `${path}[${index}]`, key, false, depth + 1));
			return;
		}
		if (!isRecord(value)) return;

		const pairName = typeof value.name === 'string' ? value.name : undefined;
		for (const [childKey, child] of Object.entries(value)) {
			const childPath = path ? `${path}.${childKey}` : childKey;
			const isPairValue = childKey === 'value' && pairName !== undefined;
			walk(child, childPath, isPairValue ? pairName : childKey, isPairValue, depth + 1);
		}
	};

	walk(node.parameters, '', '', false, 0);
	return found;
}

export function hasValue(value: unknown): boolean {
	if (value === undefined || value === null) return false;
	if (typeof value === 'string') return value.trim().length > 0;
	if (Array.isArray(value)) return value.length > 0;
	return true;
}
