import type { ContextEstablishmentOptions } from '@n8n/decorators';
import type { INode, INodeExecutionData } from 'n8n-workflow';
import type { MockProxy } from 'vitest-mock-extended';
import { mock } from 'vitest-mock-extended';

import {
	RuntimeCredentialsContextHook,
	RuntimeCredentialsFinalizeHook,
} from '../runtime-credentials-context-hook';
import type { RuntimeCredentialsService, StripResult } from '../runtime-credentials.service';

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

describe('RuntimeCredentialsContextHook (capture)', () => {
	let service: MockProxy<RuntimeCredentialsService>;
	let hook: RuntimeCredentialsContextHook;

	beforeEach(() => {
		service = mock<RuntimeCredentialsService>();
		hook = new RuntimeCredentialsContextHook(service);
	});

	it('works on a copy, leaves the trigger items alone, and emits the alias-keyed contextUpdate', async () => {
		const input: INodeExecutionData[] = [{ json: { headers: { authorization: 'Bearer xyz' } } }];
		service.strip.mockReturnValue(stripResult([], { api_key: ['Bearer xyz'] }));

		const result = await hook.execute(buildOptions(input));

		const [copy, triggerType] = service.strip.mock.calls[0];
		expect(copy).toEqual(input);
		expect(copy).not.toBe(input);
		expect(copy[0].json).not.toBe(input[0].json);
		expect(triggerType).toBe('n8n-nodes-base.webhook');
		expect(result).toEqual({
			contextUpdate: {
				secureArtifacts: { version: 1, artifacts: { api_key: ['Bearer xyz'] } },
			},
		});
		expect(result).not.toHaveProperty('triggerItems');
	});

	it('passes an empty array to service.strip when triggerItems is null', async () => {
		service.strip.mockReturnValue(stripResult([], {}));

		await hook.execute(buildOptions(null));

		expect(service.strip).toHaveBeenCalledWith([], 'n8n-nodes-base.webhook');
	});

	it('returns no contextUpdate when no alias matched', async () => {
		service.strip.mockReturnValue(stripResult([], {}));

		await expect(hook.execute(buildOptions([{ json: {} }]))).resolves.toEqual({});
	});

	it('does not store a marker that an earlier run left in the input as an artifact', async () => {
		service.strip.mockReturnValue(
			stripResult([], {
				marked: ['[moved to credential: gmailOAuth2]'],
				mixed: ['[moved to credential: gmailOAuth2]', 'real-value'],
			}),
		);

		const result = await hook.execute(buildOptions([{ json: {} }]));

		expect(result).toEqual({
			contextUpdate: { secureArtifacts: { version: 1, artifacts: { mixed: ['real-value'] } } },
		});
	});
});

describe('RuntimeCredentialsFinalizeHook (clear)', () => {
	it('clears the matched values on the real trigger items after the other hooks ran', async () => {
		const service = mock<RuntimeCredentialsService>();
		const hook = new RuntimeCredentialsFinalizeHook(service);
		const input: INodeExecutionData[] = [{ json: { headers: { authorization: '**********' } } }];
		const cleared: INodeExecutionData[] = [
			{ json: { headers: { authorization: '[moved to credential: gmailOAuth2]' } } },
		];
		service.strip.mockReturnValue(stripResult(cleared, { ignored: ['**********'] }));

		const result = await hook.execute(buildOptions(input));

		expect(service.strip).toHaveBeenCalledWith(input, 'n8n-nodes-base.webhook');
		expect(result).toEqual({ triggerItems: cleared });
	});
});
