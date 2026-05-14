import type { ContextEstablishmentOptions } from '@n8n/decorators';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type {
	INode,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	INodeTypes,
	Workflow,
} from 'n8n-workflow';

import { InboundSecretContextHook } from '../inbound-secrets-context-hook';
import type { InboundSecretsService, StripResult } from '../inbound-secrets.service';

describe('InboundSecretContextHook', () => {
	let service: MockProxy<InboundSecretsService>;
	let hook: InboundSecretContextHook;
	let getByNameAndVersion: jest.Mock;

	const buildOptions = (
		triggerItems: INodeExecutionData[] | null,
		sensitiveOutputFields: string[] | undefined = undefined,
		nodeOverrides: Partial<INode> = {},
	): ContextEstablishmentOptions => {
		const description = {
			sensitiveOutputFields,
		} as Partial<INodeTypeDescription> as INodeTypeDescription;
		getByNameAndVersion.mockReturnValue({ description } as INodeType);
		const workflow = { nodeTypes: { getByNameAndVersion } as unknown as INodeTypes } as Workflow;
		return {
			triggerNode: {
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 1,
				...nodeOverrides,
			} as INode,
			workflow,
			triggerItems,
			context: mock(),
			options: {},
		};
	};

	const stripResult = (
		triggerItems: INodeExecutionData[],
		artifactsByItem: Array<Record<string, unknown>>,
	): StripResult =>
		({
			triggerItems,
			artifactsByItem,
		}) as StripResult;

	beforeEach(() => {
		service = mock<InboundSecretsService>();
		getByNameAndVersion = jest.fn();
		hook = new InboundSecretContextHook(service);
	});

	it('delegates to service.strip with description paths and trigger node type', async () => {
		const input: INodeExecutionData[] = [{ json: { headers: { authorization: 'x' } } }];
		const stripped: INodeExecutionData[] = [{ json: { headers: { authorization: undefined } } }];
		service.strip.mockReturnValue(stripResult(stripped, [{ 'headers.authorization': 'x' }]));

		await hook.execute(buildOptions(input, ['headers.authorization', 'headers.cookie']));

		expect(service.strip).toHaveBeenCalledWith(input, 'n8n-nodes-base.webhook', [
			'headers.authorization',
			'headers.cookie',
		]);
	});

	it('passes an empty array to service.strip when triggerItems is null', async () => {
		service.strip.mockReturnValue(stripResult([], []));

		await hook.execute(buildOptions(null));

		expect(service.strip).toHaveBeenCalledWith([], 'n8n-nodes-base.webhook', []);
	});

	it('returns contextUpdate.secureArtifacts keyed by trigger node name when artifacts are captured', async () => {
		const input: INodeExecutionData[] = [{ json: { headers: { authorization: 'Bearer xyz' } } }];
		const stripped: INodeExecutionData[] = [{ json: { headers: { authorization: undefined } } }];
		service.strip.mockReturnValue(
			stripResult(stripped, [{ 'headers.authorization': 'Bearer xyz' }]),
		);

		const result = await hook.execute(buildOptions(input, ['headers.authorization']));

		expect(result).toEqual({
			triggerItems: stripped,
			contextUpdate: {
				secureArtifacts: {
					version: 1,
					artifacts: {
						Webhook: [{ 'headers.authorization': 'Bearer xyz' }],
					},
				},
			},
		});
	});

	it('omits contextUpdate when every per-item map is empty', async () => {
		const input: INodeExecutionData[] = [{ json: { body: { foo: 'bar' } } }];
		service.strip.mockReturnValue(stripResult(input, [{}]));

		const result = await hook.execute(buildOptions(input));

		expect(result).toEqual({ triggerItems: input });
		expect(result.contextUpdate).toBeUndefined();
	});

	it('emits contextUpdate when at least one per-item map carries an entry', async () => {
		const input: INodeExecutionData[] = [
			{ json: { headers: { authorization: 'a' } } },
			{ json: { headers: {} } },
		];
		service.strip.mockReturnValue(stripResult(input, [{ 'headers.authorization': 'a' }, {}]));

		const result = await hook.execute(buildOptions(input, ['headers.authorization']));

		expect(result.contextUpdate).toEqual({
			secureArtifacts: {
				version: 1,
				artifacts: {
					Webhook: [{ 'headers.authorization': 'a' }, {}],
				},
			},
		});
	});

	it('passes an empty descriptionPaths array when the description omits sensitiveOutputFields', async () => {
		service.strip.mockReturnValue(stripResult([], []));

		await hook.execute(buildOptions([], undefined));

		expect(service.strip).toHaveBeenCalledWith([], 'n8n-nodes-base.webhook', []);
	});

	it('fails open when the node-type lookup throws (admin rules still apply)', async () => {
		const input: INodeExecutionData[] = [{ json: { headers: { authorization: 'x' } } }];
		const options = buildOptions(input);
		// Override the default lookup to throw, after `buildOptions` stubbed it.
		getByNameAndVersion.mockImplementation(() => {
			throw new Error('unknown node type');
		});
		service.strip.mockReturnValue(stripResult(input, [{ 'headers.authorization': 'x' }]));

		const result = await hook.execute(options);

		expect(service.strip).toHaveBeenCalledWith(input, 'n8n-nodes-base.webhook', []);
		expect(result.contextUpdate).toEqual({
			secureArtifacts: {
				version: 1,
				artifacts: { Webhook: [{ 'headers.authorization': 'x' }] },
			},
		});
	});
});
