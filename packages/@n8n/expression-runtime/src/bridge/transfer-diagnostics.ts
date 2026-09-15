import { types } from 'node:util';

import type { WorkflowData } from '../types';
import { ExpressionError } from '../types';

export interface TransferRules {
	functions: boolean;
	proxies: boolean;
	cycles: boolean;
}

export const VM_TRANSFER_RULES: TransferRules = {
	functions: true,
	proxies: true,
	cycles: false,
};

export const QUICKJS_TRANSFER_RULES: TransferRules = {
	functions: false,
	proxies: false,
	cycles: true,
};

interface TransferRejection {
	path: string;
	descriptor: string;
}

function childPath(path: string, key: string): string {
	return path === '' ? key : `${path}.${key}`;
}

function findRejection(
	value: unknown,
	rules: TransferRules,
	path: string,
	ancestors: Set<object>,
): TransferRejection | undefined {
	if (typeof value === 'function') {
		return rules.functions ? { path, descriptor: 'a function' } : undefined;
	}
	if (typeof value !== 'object' || value === null) return undefined;
	if (types.isProxy(value)) {
		return rules.proxies ? { path, descriptor: 'a proxy' } : undefined;
	}
	if (ancestors.has(value)) {
		return rules.cycles ? { path, descriptor: 'a circular reference' } : undefined;
	}
	ancestors.add(value);
	try {
		if (Array.isArray(value)) {
			for (let index = 0; index < value.length; index++) {
				const elementPath = `${path}[${index}]`;
				let element: unknown;
				try {
					element = value[index];
				} catch {
					return { path: elementPath, descriptor: 'a getter that throws' };
				}
				const found = findRejection(element, rules, elementPath, ancestors);
				if (found) return found;
			}
			return undefined;
		}

		let keys: string[];
		try {
			keys = Object.keys(value);
		} catch {
			return undefined;
		}
		for (const key of keys) {
			const keyPath = childPath(path, key);
			let member: unknown;
			try {
				member = Reflect.get(value, key);
			} catch {
				return { path: keyPath, descriptor: 'a getter that throws' };
			}
			const found = findRejection(member, rules, keyPath, ancestors);
			if (found) return found;
		}
		return undefined;
	} finally {
		ancestors.delete(value);
	}
}

export function untransferableItemError(
	value: unknown,
	rules: TransferRules,
	nodeName?: string,
): ExpressionError {
	const found = findRejection(value, rules, '', new Set<object>());
	const source = nodeName === undefined ? 'an upstream node' : `node '${nodeName}'`;
	const where =
		found === undefined || found.path === '' ? 'the item' : `the value at ${found.path}`;
	const cause = found === undefined ? '' : ` (${found.descriptor})`;
	return new ExpressionError(
		`Can't read item from ${source}: ${where} cannot be used in an expression${cause}`,
		nodeName === undefined ? {} : { nodeCause: nodeName },
	);
}

export function nodeNameForCall(rawMsg: unknown, data: WorkflowData): string | undefined {
	if (
		typeof rawMsg === 'object' &&
		rawMsg !== null &&
		'nodeName' in rawMsg &&
		typeof rawMsg.nodeName === 'string'
	) {
		return rawMsg.nodeName;
	}
	try {
		const prevNode: unknown = data.$prevNode;
		if (
			typeof prevNode === 'object' &&
			prevNode !== null &&
			'name' in prevNode &&
			typeof prevNode.name === 'string'
		) {
			return prevNode.name;
		}
	} catch {}
	return undefined;
}
