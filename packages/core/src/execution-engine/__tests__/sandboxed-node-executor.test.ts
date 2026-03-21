import type { INodeType, INodeTypeDescription, INodeExecutionData } from 'n8n-workflow';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

jest.mock('../load-secure-exec', () => ({
	loadSecureExec: async () => await import('secure-exec'),
}));

import { nodeSourceRegistry } from '../../nodes-loader/load-class-in-isolation';
import type { ExecuteContext } from '../node-execution-context';
import { executeSandboxed } from '../sandboxed-node-executor';

const COMMUNITY_NODE_ROOT = resolve(
	__dirname,
	'../../../../../community-nodes/n8n-nodes-nonblocked',
);

const COMMUNITY_NODE_SOURCE = join(COMMUNITY_NODE_ROOT, 'dist/nodes/NonBlocked/NonBlocked.node.js');

function createMockNodeType(
	sourcePath: string,
	className: string,
	descriptionOverrides: Partial<INodeTypeDescription> = {},
): INodeType {
	const nodeType = {
		description: {
			displayName: 'Non-Blocked Demo',
			name: 'nonBlocked',
			group: ['transform'],
			version: 1,
			description: 'Makes an HTTPS request with declared network permissions',
			defaults: { name: 'Non-Blocked Demo' },
			inputs: ['main'],
			outputs: ['main'],
			thirdPartyDeps: true,
			permissions: {
				network: { allowedHosts: ['jsonplaceholder.typicode.com'] },
			},
			properties: [
				{
					displayName: 'URL',
					name: 'url',
					type: 'string' as const,
					default: 'https://jsonplaceholder.typicode.com/posts/1',
				},
			],
			...descriptionOverrides,
		} as INodeTypeDescription,
		async execute() {
			return [[]];
		},
	} as unknown as INodeType;

	nodeSourceRegistry.set(nodeType as object, { sourcePath, className });
	return nodeType;
}

function createMockContext(params: Record<string, unknown> = {}): ExecuteContext {
	const inputData: INodeExecutionData[] = [{ json: { trigger: true } }];

	return {
		getInputData: () => inputData,
		getNodeParameter: (name: string, _itemIndex: number, fallback?: unknown) => {
			return params[name] !== undefined ? params[name] : fallback;
		},
		getNode: () => ({
			name: 'Non-Blocked Demo',
			type: 'n8n-nodes-nonblocked.nonBlocked',
			parameters: params,
		}),
	} as unknown as ExecuteContext;
}

describe('executeSandboxed', () => {
	it('should execute a community node in sandbox and return data', async () => {
		const nodeType = createMockNodeType(COMMUNITY_NODE_SOURCE, 'NonBlocked');
		const context = createMockContext({ url: 'https://jsonplaceholder.typicode.com/posts/1' });

		const result = await executeSandboxed(nodeType, context, {
			network: { allowedHosts: ['jsonplaceholder.typicode.com'] },
		});

		expect(result).not.toBeNull();
		expect(Array.isArray(result)).toBe(true);
		expect(result!.length).toBeGreaterThan(0);

		const firstOutput = result![0];
		expect(Array.isArray(firstOutput)).toBe(true);
		expect(firstOutput.length).toBeGreaterThan(0);

		const item = firstOutput[0];
		expect(item.json).toHaveProperty('id', 1);
		expect(item.json).toHaveProperty('title');
		expect(item.json).toHaveProperty('body');
		expect(item.json).toHaveProperty('userId');
	}, 30_000);

	it('should block network requests to non-allowed hosts', async () => {
		const fixtureDir = join(__dirname, '__fixtures__', 'sandboxed-node');
		if (!existsSync(fixtureDir)) {
			mkdirSync(fixtureDir, { recursive: true });
		}

		const blockedSource = `/* eslint-disable */
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BlockedNode = void 0;

class BlockedNode {
	constructor() {
		this.description = {
			displayName: 'Blocked',
			name: 'blocked',
			group: ['transform'],
			version: 1,
			defaults: { name: 'Blocked' },
			inputs: ['main'],
			outputs: ['main'],
			thirdPartyDeps: true,
			properties: [],
		};
	}

	async execute() {
		var https = require('https');
		return new Promise(function(resolve, reject) {
			https.get('https://example.com', function(res) {
				resolve([[{ json: { status: res.statusCode } }]]);
			}).on('error', function(err) {
				reject(err);
			});
		});
	}
}

exports.BlockedNode = BlockedNode;
`;

		const blockedPath = join(fixtureDir, 'BlockedNode.node.js');
		writeFileSync(blockedPath, blockedSource);

		if (!existsSync(join(fixtureDir, 'package.json'))) {
			writeFileSync(
				join(fixtureDir, 'package.json'),
				JSON.stringify({ name: 'n8n-nodes-blocked-fixture', version: '0.1.0' }),
			);
		}

		const nodeType = createMockNodeType(blockedPath, 'BlockedNode', {
			displayName: 'Blocked',
			name: 'blocked',
			thirdPartyDeps: true,
			properties: [],
		});

		const context = createMockContext();

		await expect(
			executeSandboxed(nodeType, context, {
				network: { allowedHosts: ['jsonplaceholder.typicode.com'] },
			}),
		).rejects.toThrow();
	}, 30_000);

	it('should throw when source is not registered', async () => {
		const nodeType = {
			description: {
				displayName: 'NoPath',
				name: 'noPath',
				thirdPartyDeps: true,
			} as unknown as INodeTypeDescription,
		} as INodeType;

		const context = createMockContext();

		await expect(executeSandboxed(nodeType, context, { network: true })).rejects.toThrow(
			'Cannot sandbox node: source path not available',
		);
	});
});
