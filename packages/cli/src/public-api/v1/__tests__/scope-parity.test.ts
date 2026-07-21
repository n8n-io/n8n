import RefParser from '@apidevtools/json-schema-ref-parser';
import { API_KEY_RESOURCES, type ApiKeyScope } from '@n8n/permissions';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

import type { ScopeTaggedMiddleware } from '../shared/middlewares/global.middleware';

vi.unmock('node:fs');

const PUBLIC_API_ROOT = path.resolve(__dirname, '..', '..');
const OPENAPI_SPEC_PATH = path.join(PUBLIC_API_ROOT, 'v1', 'openapi.yml');

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

type Method = (typeof HTTP_METHODS)[number];

type Operation = {
	pathStr: string;
	method: Method;
	operationId: string;
	handlerPath: string;
	requiredScope: string | null;
};

type RawOperation = {
	'x-eov-operation-id'?: string;
	'x-eov-operation-handler'?: string;
	'x-required-scope'?: string;
};

async function loadOperations(): Promise<Operation[]> {
	const spec = await RefParser.dereference(OPENAPI_SPEC_PATH);
	const paths = (spec as { paths?: Record<string, Record<string, RawOperation>> }).paths ?? {};
	const ops: Operation[] = [];
	for (const [pathStr, methods] of Object.entries(paths)) {
		for (const method of HTTP_METHODS) {
			const op = methods[method];
			if (!op?.['x-eov-operation-id'] || !op?.['x-eov-operation-handler']) continue;
			ops.push({
				pathStr,
				method,
				operationId: op['x-eov-operation-id'],
				handlerPath: op['x-eov-operation-handler'],
				requiredScope: op['x-required-scope'] ?? null,
			});
		}
	}
	return ops;
}

async function loadHandlerScope(
	handlerPath: string,
	operationId: string,
): Promise<ApiKeyScope | undefined> {
	const resolved = path.join(PUBLIC_API_ROOT, `${handlerPath}.ts`);
	// Vitest can't `require()` a `.ts` handler (its `export =` form fails Node's
	// strip-only loader); import it and unwrap the CJS-interop default.
	const imported = (await import(resolved)) as {
		default?: Record<string, unknown[]>;
	} & Record<string, unknown[]>;
	const mod = imported.default ?? imported;
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
	let ops: Operation[];

	beforeAll(async () => {
		ops = await loadOperations();
	});

	test('openapi.yml tags are sorted alphabetically by name', () => {
		const spec = yaml.parse(fs.readFileSync(OPENAPI_SPEC_PATH, 'utf8')) as {
			tags?: Array<{ name: string }>;
		};
		const tagNames = (spec.tags ?? []).map((tag) => tag.name);
		const sorted = [...tagNames].sort((a, b) => (a < b ? -1 : 1));
		expect(tagNames).toEqual(sorted);
	});

	test('every operation declares x-required-scope', () => {
		const missing = ops.filter((op) => op.requiredScope === null);
		expect(missing.map((m) => `${m.method.toUpperCase()} ${m.pathStr}`)).toEqual([]);
	});

	test('every x-required-scope matches the handler middleware __apiKeyScope', async () => {
		const mismatches: string[] = [];
		for (const op of ops) {
			if (op.requiredScope === null) continue;
			const handlerScope = await loadHandlerScope(op.handlerPath, op.operationId);
			const expected = op.requiredScope === 'none' ? undefined : op.requiredScope;
			if (handlerScope !== expected) {
				mismatches.push(
					`${op.method.toUpperCase()} ${op.pathStr}: YAML says "${op.requiredScope}", handler tag is "${
						handlerScope ?? 'none'
					}"`,
				);
			}
		}
		expect(mismatches).toEqual([]);
	}, 30_000);

	test('every API key scope in API_KEY_RESOURCES is consumed by at least one endpoint', () => {
		const consumed = new Set(
			ops.flatMap((op) => {
				if (op.requiredScope === null || op.requiredScope === 'none') return [];
				return op.requiredScope.split(',').map((scope) => scope.trim());
			}),
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
