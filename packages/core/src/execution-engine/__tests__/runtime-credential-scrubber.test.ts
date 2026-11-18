import { NodeApiError, type INode, type INodeExecutionData } from 'n8n-workflow';

import { buildRuntimeCredentialScrubber } from '../runtime-credential-scrubber';

describe('buildRuntimeCredentialScrubber', () => {
	it('returns undefined when no value is long enough to scrub', () => {
		expect(buildRuntimeCredentialScrubber({})).toBeUndefined();
		expect(buildRuntimeCredentialScrubber({ pin: ['1234'], flag: [true] })).toBeUndefined();
	});

	it('replaces the values in nested output with a placeholder', () => {
		const scrubber = buildRuntimeCredentialScrubber({ tenant_key: ['sk_acme_123'] })!;
		const items: INodeExecutionData[] = [
			{
				json: {
					headers: { 'x-api-key': 'sk_acme_123' },
					echoed: ['Bearer sk_acme_123', 'other'],
					count: 3,
				},
			},
		];

		scrubber.scrubItems([items, null]);

		expect(items[0].json).toEqual({
			headers: { 'x-api-key': '[runtime credential: tenant_key]' },
			echoed: ['Bearer [runtime credential: tenant_key]', 'other'],
			count: 3,
		});
	});

	it('replaces a longer value before a value it contains', () => {
		const scrubber = buildRuntimeCredentialScrubber({ short: ['secret'], long: ['secret-long'] })!;
		const items: INodeExecutionData[] = [{ json: { text: 'secret-long and secret' } }];

		scrubber.scrubItems([items]);

		expect(items[0].json.text).toBe('[runtime credential: long] and [runtime credential: short]');
	});

	it('scrubs the message, description and fields of an error', () => {
		const scrubber = buildRuntimeCredentialScrubber({ tenant_key: ['sk_acme_123'] })!;
		const error = new NodeApiError(
			{ name: 'HTTP', type: 'n8n-nodes-base.httpRequest' } as INode,
			{ message: 'invalid key sk_acme_123' },
			{ message: 'Rejected sk_acme_123', description: 'Key sk_acme_123 is wrong' },
		);

		scrubber.scrubError(error);

		expect(JSON.stringify({ ...error, message: error.message, stack: error.stack })).not.toContain(
			'sk_acme_123',
		);
		expect(error.message).toBe('Rejected [runtime credential: tenant_key]');
	});

	it('scrubs only values of at least six characters', () => {
		expect(buildRuntimeCredentialScrubber({ pin: ['12345'] })).toBeUndefined();

		const scrubber = buildRuntimeCredentialScrubber({ pin: ['123456'], plain: 'sk_plain' })!;
		const items: INodeExecutionData[] = [{ json: { text: 'code 123456, key sk_plain' } }];
		scrubber.scrubItems([items]);

		expect(items[0].json.text).toBe(
			'code [runtime credential: pin], key [runtime credential: plain]',
		);
	});

	it('scrubs the json and the error of the same item', () => {
		const scrubber = buildRuntimeCredentialScrubber({ tenant_key: ['sk_acme_123'] })!;
		const error = new NodeApiError(
			{ name: 'HTTP', type: 'n8n-nodes-base.httpRequest' } as INode,
			{ message: 'bad key' },
			{ message: 'Rejected sk_acme_123' },
		);
		const items: INodeExecutionData[] = [{ json: { echoed: 'sk_acme_123' }, error }];

		scrubber.scrubItems([items]);

		expect(items[0].json.echoed).toBe('[runtime credential: tenant_key]');
		expect(error.message).toBe('Rejected [runtime credential: tenant_key]');
	});

	it('handles circular output without looping', () => {
		const scrubber = buildRuntimeCredentialScrubber({ tenant_key: ['sk_acme_123'] })!;
		const json: Record<string, unknown> = { value: 'sk_acme_123' };
		json.self = json;

		scrubber.scrubItems([[{ json } as INodeExecutionData]]);

		expect(json.value).toBe('[runtime credential: tenant_key]');
	});
});
