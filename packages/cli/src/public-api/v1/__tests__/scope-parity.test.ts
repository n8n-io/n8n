import { API_KEY_RESOURCES, type ApiKeyScope } from '@n8n/permissions';
import type * as nodeFs from 'node:fs';
import path from 'node:path';
import { parse as parseYaml } from 'yaml';

import type { ScopeTaggedMiddleware } from '../shared/middlewares/global.middleware';

jest.unmock('node:fs');
const { readdirSync, readFileSync, statSync } = jest.requireActual<typeof nodeFs>('node:fs');

const PUBLIC_API_ROOT = path.resolve(__dirname, '..', '..');

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

type Method = (typeof HTTP_METHODS)[number];

type YamlOperation = {
	file: string;
	method: Method;
	operationId: string;
	handlerPath: string;
	requiredScope: string;
};

function walkYamlPaths(root: string): string[] {
	const out: string[] = [];
	for (const entry of readdirSync(root)) {
		const full = path.join(root, entry);
		const s = statSync(full);
		if (s.isDirectory()) {
			out.push(...walkYamlPaths(full));
		} else if (entry.endsWith('.yml') && full.includes(`${path.sep}paths${path.sep}`)) {
			out.push(full);
		}
	}
	return out;
}

function collectYamlOperations(): YamlOperation[] {
	const handlersRoot = path.join(PUBLIC_API_ROOT, 'v1', 'handlers');
	const files = walkYamlPaths(handlersRoot);
	const ops: YamlOperation[] = [];
	for (const file of files) {
		const doc = parseYaml(readFileSync(file, 'utf8')) as Record<string, unknown>;
		for (const method of HTTP_METHODS) {
			const op = doc[method] as Record<string, unknown> | undefined;
			if (!op) continue;
			const operationId = op['x-eov-operation-id'] as string | undefined;
			const handlerPath = op['x-eov-operation-handler'] as string | undefined;
			const requiredScope = op['x-required-scope'] as string | undefined;
			if (!operationId || !handlerPath) continue;
			ops.push({
				file,
				method,
				operationId,
				handlerPath,
				requiredScope: requiredScope ?? '<missing>',
			});
		}
	}
	return ops;
}

function loadHandlerScope(handlerPath: string, operationId: string): ApiKeyScope | undefined {
	const resolved = path.join(PUBLIC_API_ROOT, `${handlerPath}.ts`);
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const mod = require(resolved) as Record<string, unknown[]>;
	const middlewares = mod[operationId];
	if (!Array.isArray(middlewares)) return undefined;
	for (const mw of middlewares) {
		if (typeof mw !== 'function') continue;
		const scope = (mw as Partial<ScopeTaggedMiddleware>).__apiKeyScope;
		if (scope) return scope;
	}
	return undefined;
}

describe('Public API scope parity', () => {
	const yamlOps = collectYamlOperations();

	test('every path YAML method declares x-required-scope', () => {
		const missing = yamlOps.filter((op) => op.requiredScope === '<missing>');
		expect(
			missing.map((m) => `${path.relative(PUBLIC_API_ROOT, m.file)} ${m.method} ${m.operationId}`),
		).toEqual([]);
	});

	test('every x-required-scope matches the handler middleware __apiKeyScope', () => {
		const mismatches: string[] = [];
		for (const op of yamlOps) {
			if (op.requiredScope === '<missing>') continue;
			const handlerScope = loadHandlerScope(op.handlerPath, op.operationId);
			const expected = op.requiredScope === 'none' ? undefined : op.requiredScope;
			if (handlerScope !== expected) {
				mismatches.push(
					`${op.operationId}: YAML says "${op.requiredScope}", handler tag is "${
						handlerScope ?? 'none'
					}"`,
				);
			}
		}
		expect(mismatches).toEqual([]);
	});

	test('every API key scope in API_KEY_RESOURCES is consumed by at least one endpoint', () => {
		const consumed = new Set(
			yamlOps.map((op) => op.requiredScope).filter((s) => s !== 'none' && s !== '<missing>'),
		);
		const declared = new Set<string>();
		for (const [resource, operations] of Object.entries(API_KEY_RESOURCES)) {
			for (const operation of operations) {
				declared.add(`${resource}:${operation}`);
			}
		}
		const orphans = [...declared].filter((scope) => !consumed.has(scope));
		expect(orphans).toEqual([]);
	});
});
