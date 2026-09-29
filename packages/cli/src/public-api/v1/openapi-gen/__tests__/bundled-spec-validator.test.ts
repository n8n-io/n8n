import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isRecord } from '@n8n/utils/is-record';
import express from 'express';
import { middleware } from 'express-openapi-validator';
import request from 'supertest';
import { parse } from 'yaml';

import { publicApiValidatorFormats } from '@/public-api/public-api-validator-formats';

import { DECORATOR_ROOT_FILENAME, mergeDecoratorDocument, type OpenApiDocument } from '../generate';

type ApiSpec = Parameters<typeof middleware>[0]['apiSpec'];

// Only the build merges decorator components into the spec (build.mjs `buildPublicApiSpec`), so
// this test repeats that bundle and merge and runs the real validator on the result.
const V1_DIR = path.resolve(__dirname, '../..');
const CLI_DIR = path.resolve(__dirname, '../../../../..');
const EOV_SPEC_FILENAME = 'openapi.yml';

interface OperationEntry {
	path: string;
	method: string;
	operation: Record<string, unknown>;
}

function isDecoratorRouted(operation: Record<string, unknown>): boolean {
	return operation['x-decorator-routed'] === true;
}

function bundle(tmpDir: string): OpenApiDocument {
	const sourcePaths = [
		path.join(V1_DIR, EOV_SPEC_FILENAME),
		path.join(V1_DIR, DECORATOR_ROOT_FILENAME),
	];
	const sources = sourcePaths.map((sourcePath) => `"${sourcePath}"`).join(' ');
	execSync(`pnpm openapi bundle ${sources} --output "${tmpDir}"`, {
		cwd: CLI_DIR,
		stdio: 'pipe',
	});

	const eovDoc = parse(
		fs.readFileSync(path.join(tmpDir, EOV_SPEC_FILENAME), 'utf8'),
	) as OpenApiDocument;
	const decoratorDoc = parse(
		fs.readFileSync(path.join(tmpDir, DECORATOR_ROOT_FILENAME), 'utf8'),
	) as OpenApiDocument;

	return mergeDecoratorDocument(eovDoc, decoratorDoc);
}

function collectEovOperations(document: OpenApiDocument): OperationEntry[] {
	const methods = ['get', 'put', 'post', 'patch', 'delete'];
	const operations: OperationEntry[] = [];

	for (const [pathKey, pathItem] of Object.entries(document.paths ?? {})) {
		for (const method of methods) {
			const operation = pathItem[method] as Record<string, unknown> | undefined;
			if (!operation || isDecoratorRouted(operation)) continue;
			operations.push({ path: pathKey, method, operation });
		}
	}

	return operations;
}

function buildApp(mergedDocument: OpenApiDocument): express.Express {
	const app = express();
	app.use(express.json());

	app.use(
		middleware({
			apiSpec: mergedDocument as unknown as ApiSpec,
			operationHandlers: false,
			validateRequests: true,
			validateApiSpec: true,
			formats: publicApiValidatorFormats,
			validateSecurity: {
				handlers: {
					ApiKeyAuth: () => true,
					BearerAuth: () => true,
					CookieAuth: () => true,
				},
			},
		}),
	);

	app.use((_req, res) => {
		res.status(200).json({});
	});

	const errorHandler: express.ErrorRequestHandler = (err, _req, res, _next) => {
		const status = isRecord(err) && typeof err.status === 'number' ? err.status : 500;
		const message = err instanceof Error ? err.message : 'Unknown error';
		res.status(status).json({ message });
	};
	app.use(errorHandler);

	return app;
}

function toExpressPath(openApiPath: string): string {
	return openApiPath.replace(/\{[^}]+\}/g, 'aaaaaaaaaaaaaaaa');
}

/** supertest exposes one method per HTTP verb rather than a generic `(method, url)` call. */
function sendRequest(app: express.Express, method: string, url: string): request.Test {
	switch (method) {
		case 'get':
			return request(app).get(url);
		case 'put':
			return request(app).put(url);
		case 'post':
			return request(app).post(url);
		case 'patch':
			return request(app).patch(url);
		case 'delete':
			return request(app).delete(url);
		default:
			throw new Error(`Unsupported HTTP method: ${method}`);
	}
}

describe('bundled Public API spec against the real EOV validator', () => {
	let tmpDir: string;
	let app: express.Express;
	let operations: OperationEntry[];

	beforeAll(() => {
		tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'n8n-public-api-bundle-'));
		const mergedDocument = bundle(tmpDir);
		operations = collectEovOperations(mergedDocument);
		app = buildApp(mergedDocument);
	}, 60_000);

	afterAll(() => {
		fs.rmSync(tmpDir, { recursive: true, force: true });
	});

	it('found at least one EOV-routed operation to check', () => {
		expect(operations.length).toBeGreaterThan(0);
	});

	it('every EOV-routed operation accepts a request without throwing an internal server error', async () => {
		const failures: Array<{ method: string; path: string; message: string }> = [];

		const methodsWithBody = ['put', 'post', 'patch'];

		for (const { path: pathKey, method } of operations) {
			const expressPath = `/api/v1${toExpressPath(pathKey)}`;
			let requestBuilder = sendRequest(app, method, expressPath).set('X-N8N-API-KEY', 'test');
			if (methodsWithBody.includes(method)) {
				requestBuilder = requestBuilder.send({});
			}

			// eslint-disable-next-line no-await-in-loop -- sequential requests keep failures ordered
			const response = await requestBuilder;
			if (response.status === 500) {
				failures.push({
					method: method.toUpperCase(),
					path: pathKey,
					message: (response.body as { message?: string }).message ?? '',
				});
			}
		}

		expect(failures).toEqual([]);
	}, 60_000);
});
