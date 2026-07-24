import RefParser from '@apidevtools/json-schema-ref-parser';
import { API_KEY_RESOURCES, type ApiKeyScope } from '@n8n/permissions';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'yaml';

import {
	extractScopeFromEovHandlerChain,
	loadPublicControllerScopeMap,
	publicApiRouteKey,
	resolvePublicApiImplementedScope,
} from '../shared/public-api-scope-lookup';

import '../controllers';

vi.unmock('node:fs');

const PUBLIC_API_ROOT = path.resolve(__dirname, '..', '..');
const OPENAPI_SPEC_PATH = path.join(PUBLIC_API_ROOT, 'v1', 'openapi.yml');

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete'] as const;

type Method = (typeof HTTP_METHODS)[number];

type Operation = {
	pathStr: string;
	method: Method;
	operationId: string;
	handlerPath: string | null;
	requiredScope: string | null;
};

type RawOperation = {
	operationId?: string;
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
			if (!op) continue;
			const operationId = op['x-eov-operation-id'] ?? op.operationId;
			if (!operationId) {
				throw new Error(
					`Missing operationId / x-eov-operation-id for ${method.toUpperCase()} ${pathStr}`,
				);
			}
			ops.push({
				pathStr,
				method,
				operationId,
				handlerPath: op['x-eov-operation-handler'] ?? null,
				requiredScope: op['x-required-scope'] ?? null,
			});
		}
	}
	return ops;
}

async function loadEovHandlerScope(
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
	return extractScopeFromEovHandlerChain(middlewares);
}

/** Compare scopes as an unordered set so `a,b`, `b,a`, and `a, b` all match. */
function normalizeScopeSet(scope: string | undefined): string {
	if (!scope) return '';
	return scope
		.split(',')
		.map((s) => s.trim())
		.filter(Boolean)
		.sort()
		.join(',');
}

describe('Public API scope parity', () => {
	let ops: Operation[];
	let controllerScopes: Map<string, string | undefined>;

	beforeAll(async () => {
		ops = await loadOperations();
		controllerScopes = loadPublicControllerScopeMap();
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

	test('every x-required-scope matches eov handler or @PublicApiController @ApiKeyScope', async () => {
		const mismatches: string[] = [];
		for (const op of ops) {
			if (op.requiredScope === null) continue;

			// A route must be defined by the eov handler XOR a @PublicApiController,
			// never both — otherwise the enforced scope is ambiguous.
			if (
				op.handlerPath !== null &&
				controllerScopes.has(publicApiRouteKey(op.method, op.pathStr))
			) {
				throw new Error(
					`${op.method.toUpperCase()} ${op.pathStr} is defined by both an eov handler and a @PublicApiController. ` +
						'Remove the eov handler (its `x-eov-operation-handler` in the OpenAPI spec and the handler middleware) and keep the @PublicApiController.',
				);
			}

			const eovHandlerScope =
				op.handlerPath !== null
					? await loadEovHandlerScope(op.handlerPath, op.operationId)
					: undefined;

			const implemented = resolvePublicApiImplementedScope(
				controllerScopes,
				op.method,
				op.pathStr,
				eovHandlerScope,
			);

			const expected = op.requiredScope === 'none' ? undefined : op.requiredScope;
			if (normalizeScopeSet(implemented) !== normalizeScopeSet(expected)) {
				mismatches.push(
					`${op.method.toUpperCase()} ${op.pathStr}: YAML says "${op.requiredScope}", implemented scope is "${
						implemented ?? 'none'
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
