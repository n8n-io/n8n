import type { ExecuteEphemeralNodeRequestDto } from '@n8n/api-types';
import { UnexpectedError } from 'n8n-workflow';
import type { INodeTypeDescription, IWebhookDescription } from 'n8n-workflow';
import { ZodError } from 'zod';

import {
	mapToEphemeralNodeList,
	toInlineRequest,
	toPublicResponse,
} from '../ephemeral-nodes.mapper';

const makeDto = (
	overrides: Partial<ExecuteEphemeralNodeRequestDto> = {},
): ExecuteEphemeralNodeRequestDto =>
	({
		nodeType: 'n8n-nodes-base.httpRequest',
		nodeTypeVersion: 4.2,
		nodeParameters: {},
		inputData: [],
		...overrides,
	}) as ExecuteEphemeralNodeRequestDto;

const makeNode = (overrides: Partial<INodeTypeDescription> = {}): INodeTypeDescription =>
	({
		name: 'n8n-nodes-base.httpRequest',
		displayName: 'HTTP Request',
		description: 'Makes an HTTP request',
		group: ['input'],
		version: 4.2,
		defaultVersion: 4.2,
		...overrides,
	}) as INodeTypeDescription;

// ─────────────────────────────────────────────────────────────────────────────
// Execute mapping
// ─────────────────────────────────────────────────────────────────────────────

describe('toInlineRequest', () => {
	it('passes through nodeType, version, parameters, and projectId', () => {
		const result = toInlineRequest(
			makeDto({
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeTypeVersion: 4.2,
				nodeParameters: { url: 'https://example.com' },
			}),
			'project-123',
		);

		expect(result).toMatchObject({
			nodeType: 'n8n-nodes-base.httpRequest',
			nodeTypeVersion: 4.2,
			nodeParameters: { url: 'https://example.com' },
			projectId: 'project-123',
		});
	});

	it('maps `credentials` to `credentialDetails` when provided', () => {
		const result = toInlineRequest(
			makeDto({
				credentials: { httpBearerAuth: { id: 'cred-1', name: 'My Token' } },
			}),
			'project-1',
		);

		expect(result.credentialDetails).toEqual({
			httpBearerAuth: { id: 'cred-1', name: 'My Token' },
		});
	});

	it('leaves `credentialDetails` undefined when no credentials are supplied', () => {
		const result = toInlineRequest(makeDto(), 'project-1');

		expect(result.credentialDetails).toBeUndefined();
	});

	it('wraps each inputData item in a `{ json }` envelope', () => {
		const result = toInlineRequest(
			makeDto({ inputData: [{ foo: 'bar' }, { baz: 1 }] }),
			'project-1',
		);

		expect(result.inputData).toEqual([{ json: { foo: 'bar' } }, { json: { baz: 1 } }]);
	});

	it('returns an empty inputData array when the DTO omits it', () => {
		const result = toInlineRequest(
			makeDto({ inputData: undefined as unknown as ExecuteEphemeralNodeRequestDto['inputData'] }),
			'project-1',
		);

		expect(result.inputData).toEqual([]);
	});
});

describe('toPublicResponse', () => {
	it('serialises a successful result with `json` payloads extracted', () => {
		const response = toPublicResponse({
			status: 'success',
			data: [{ json: { ok: true } }, { json: { count: 2 } }],
		});

		expect(response).toEqual({
			status: 'success',
			data: [{ ok: true }, { count: 2 }],
		});
	});

	it('preserves the error message for failed executions', () => {
		const response = toPublicResponse({
			status: 'error',
			data: [],
			error: 'boom',
		});

		expect(response).toEqual({ status: 'error', data: [], error: 'boom' });
	});

	it('throws UnexpectedError with ZodError cause when the result shape is invalid', () => {
		const invalidResult = {
			status: 'weird' as unknown as 'success',
			data: [],
		};

		expect(() => toPublicResponse(invalidResult)).toThrow(UnexpectedError);

		try {
			toPublicResponse(invalidResult);
		} catch (error) {
			expect(error).toBeInstanceOf(UnexpectedError);
			expect((error as UnexpectedError).message).toBe(
				'Failed to serialize ephemeral node execution response',
			);
			expect((error as UnexpectedError).cause).toBeInstanceOf(ZodError);
		}
	});
});

// ─────────────────────────────────────────────────────────────────────────────
// List mapping
// ─────────────────────────────────────────────────────────────────────────────

describe('mapToEphemeralNodeList', () => {
	it('drops non-allowlisted nodes', () => {
		const result = mapToEphemeralNodeList([
			makeNode({ name: 'n8n-nodes-base.slack', displayName: 'Slack' }),
		]);

		expect(result).toEqual([]);
	});

	it('drops hidden, trigger, polling, and webhook nodes', () => {
		const result = mapToEphemeralNodeList([
			makeNode({ hidden: true }),
			makeNode({ group: ['trigger'] }),
			makeNode({ polling: true }),
			makeNode({ webhooks: [{ name: 'default' } as IWebhookDescription] }),
		]);

		expect(result).toEqual([]);
	});

	it('collapses VersionedNodeType variants to the `version === defaultVersion` entry', () => {
		const result = mapToEphemeralNodeList([
			makeNode({ version: 1, defaultVersion: 4.2 }),
			makeNode({ version: 4, defaultVersion: 4.2 }),
			makeNode({
				version: 4.2,
				defaultVersion: 4.2,
				codex: { categories: ['Core Nodes'] },
			}),
		]);

		expect(result).toEqual([
			{
				nodeType: 'n8n-nodes-base.httpRequest',
				nodeTypeVersion: 4.2,
				displayName: 'HTTP Request',
				description: 'Makes an HTTP request',
				category: 'Core Nodes',
				supportedCredentialTypes: ['httpBearerAuth'],
			},
		]);
	});

	it('falls back to the highest version when no variant matches `defaultVersion`', () => {
		const result = mapToEphemeralNodeList([
			makeNode({ version: 1, defaultVersion: undefined }),
			makeNode({ version: 3, defaultVersion: undefined }),
			makeNode({ version: 2, defaultVersion: undefined }),
		]);

		expect(result).toHaveLength(1);
		expect(result[0].nodeTypeVersion).toBe(3);
	});

	it('handles array-valued `version` via maxVersion', () => {
		const result = mapToEphemeralNodeList([
			makeNode({
				version: [1, 2, 3] as unknown as INodeTypeDescription['version'],
				defaultVersion: undefined,
			}),
		]);

		expect(result[0].nodeTypeVersion).toBe(3);
	});

	it('uses `codex.categories[0]` as category when present', () => {
		const result = mapToEphemeralNodeList([
			makeNode({ codex: { categories: ['Core Nodes', 'Other'] } }),
		]);

		expect(result[0].category).toBe('Core Nodes');
	});

	it('falls back to `group[0]` when codex categories are missing', () => {
		const result = mapToEphemeralNodeList([makeNode({ group: ['input'] })]);

		expect(result[0].category).toBe('input');
	});

	it('omits `category` entirely when neither codex nor group can supply one', () => {
		const result = mapToEphemeralNodeList([makeNode({ group: [] })]);

		expect(result[0]).not.toHaveProperty('category');
	});

	it('reads `supportedCredentialTypes` from the allowlist, ignoring the descriptor', () => {
		const result = mapToEphemeralNodeList([
			makeNode({
				credentials: [{ name: 'somethingElse' }],
			}),
		]);

		expect(result[0].supportedCredentialTypes).toEqual(['httpBearerAuth']);
	});

	it('filters by `nodeType` query parameter', () => {
		const result = mapToEphemeralNodeList([makeNode()], { nodeType: 'does-not-match' });

		expect(result).toEqual([]);
	});

	it('sorts results alphabetically by node name', () => {
		const result = mapToEphemeralNodeList([
			makeNode({ name: 'n8n-nodes-base.linear', displayName: 'Linear' }),
			makeNode(),
		]);

		expect(result.map((n) => n.nodeType)).toEqual([
			'n8n-nodes-base.httpRequest',
			'n8n-nodes-base.linear',
		]);
	});
});
