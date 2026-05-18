import type { ContextEstablishmentOptions } from '@n8n/decorators';
import type { MockProxy } from 'jest-mock-extended';
import { mock } from 'jest-mock-extended';
import type { INode, INodeExecutionData, Workflow } from 'n8n-workflow';

import { InboundSecretContextHook } from '../inbound-secrets-context-hook';
import type { InboundSecretsService } from '../inbound-secrets.service';

describe('InboundSecretContextHook', () => {
	let service: MockProxy<InboundSecretsService>;
	let hook: InboundSecretContextHook;

	const optionsWith = (triggerItems: INodeExecutionData[] | null): ContextEstablishmentOptions => ({
		triggerNode: { type: 'n8n-nodes-base.webhook' } as INode,
		workflow: mock<Workflow>(),
		triggerItems,
		context: mock(),
		options: {},
	});

	beforeEach(() => {
		service = mock<InboundSecretsService>();
		hook = new InboundSecretContextHook(service);
	});

	it('delegates to service.strip and wraps the result as triggerItems', async () => {
		const input: INodeExecutionData[] = [{ json: { headers: { authorization: 'x' } } }];
		const stripped: INodeExecutionData[] = [{ json: { headers: { authorization: undefined } } }];
		service.strip.mockReturnValue(stripped);

		const result = await hook.execute(optionsWith(input));

		expect(service.strip).toHaveBeenCalledWith(input, 'n8n-nodes-base.webhook');
		expect(result).toEqual({ triggerItems: stripped });
	});

	it('passes an empty array to service.strip when triggerItems is null', async () => {
		service.strip.mockImplementation((items) => items);

		await hook.execute(optionsWith(null));

		expect(service.strip).toHaveBeenCalledWith([], 'n8n-nodes-base.webhook');
	});
});
