import type { ContextEstablishmentOptions } from '@n8n/decorators';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { INode, INodeExecutionData } from 'n8n-workflow';

import { InboundSecretContextHook } from '../inbound-secrets-context-hook';
import type { InboundSecretsService, StripResult } from '../inbound-secrets.service';

describe('InboundSecretContextHook', () => {
	let service: MockProxy<InboundSecretsService>;
	let hook: InboundSecretContextHook;

	const buildOptions = (triggerItems: INodeExecutionData[] | null): ContextEstablishmentOptions =>
		({
			triggerNode: {
				name: 'Webhook',
				type: 'n8n-nodes-base.webhook',
				typeVersion: 1,
			} as INode,
			triggerItems,
			context: mock(),
			options: {},
		}) as unknown as ContextEstablishmentOptions;

	const stripResult = (
		triggerItems: INodeExecutionData[],
		artifactsByAlias: Record<string, unknown>,
	): StripResult => ({ triggerItems, artifactsByAlias }) as StripResult;

	beforeEach(() => {
		service = mock<InboundSecretsService>();
		hook = new InboundSecretContextHook(service);
	});

	it('forwards items and trigger type to service.strip and emits the alias-keyed contextUpdate', async () => {
		const input: INodeExecutionData[] = [{ json: { headers: { authorization: 'Bearer xyz' } } }];
		const stripped: INodeExecutionData[] = [{ json: { headers: { authorization: undefined } } }];
		service.strip.mockReturnValue(stripResult(stripped, { api_key: ['Bearer xyz'] }));

		const result = await hook.execute(buildOptions(input));

		expect(service.strip).toHaveBeenCalledWith(input, 'n8n-nodes-base.webhook');
		expect(result).toEqual({
			triggerItems: stripped,
			contextUpdate: {
				secureArtifacts: {
					version: 1,
					artifacts: { api_key: ['Bearer xyz'] },
				},
			},
		});
	});

	it('passes an empty array to service.strip when triggerItems is null', async () => {
		service.strip.mockReturnValue(stripResult([], {}));

		await hook.execute(buildOptions(null));

		expect(service.strip).toHaveBeenCalledWith([], 'n8n-nodes-base.webhook');
	});

	it('omits contextUpdate when no aliases produced a value', async () => {
		const input: INodeExecutionData[] = [{ json: { body: { foo: 'bar' } } }];
		service.strip.mockReturnValue(stripResult(input, {}));

		const result = await hook.execute(buildOptions(input));

		expect(result).toEqual({ triggerItems: input });
		expect(result.contextUpdate).toBeUndefined();
	});
});
