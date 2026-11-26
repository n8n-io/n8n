import { NodeApiError, type INode, type INodeExecutionData } from 'n8n-workflow';

import { buildRuntimeCredentialScrubber } from '../runtime-credential-scrubber';

const build = (...values: Array<[string, string]>) =>
	buildRuntimeCredentialScrubber(values.map(([alias, value]) => ({ alias, value })))!;

describe('buildRuntimeCredentialScrubber', () => {
	it('returns undefined when no value is long enough', () => {
		expect(buildRuntimeCredentialScrubber([])).toBeUndefined();
		expect(buildRuntimeCredentialScrubber([{ alias: 'pin', value: '12345' }])).toBeUndefined();
	});

	it('replaces the value in nested objects and arrays', () => {
		const scrubber = build(['tenant_key', 'sk_acme_123']);
		const items: INodeExecutionData[] = [
			{
				json: {
					headers: { 'x-api-key': 'sk_acme_123' },
					echoed: ['Bearer sk_acme_123', 'other', { deep: ['x sk_acme_123 y'] }],
					count: 3,
				},
			},
		];

		const [out] = scrubber.scrubOutputs([items])!;

		expect(out![0].json).toEqual({
			headers: { 'x-api-key': '[runtime credential: tenant_key]' },
			echoed: [
				'Bearer [runtime credential: tenant_key]',
				'other',
				{ deep: ['x [runtime credential: tenant_key] y'] },
			],
			count: 3,
		});
	});

	it('does not change the input', () => {
		const scrubber = build(['tenant_key', 'sk_acme_123']);
		const json = { nested: { token: 'sk_acme_123' }, list: ['sk_acme_123'] };
		const items: INodeExecutionData[] = [{ json }];

		const [out] = scrubber.scrubOutputs([items])!;

		expect(json).toEqual({ nested: { token: 'sk_acme_123' }, list: ['sk_acme_123'] });
		expect(items[0].json).toBe(json);
		expect(out![0]).not.toBe(items[0]);
	});

	it('keeps the identity of items without a match', () => {
		const scrubber = build(['tenant_key', 'sk_acme_123']);
		const items: INodeExecutionData[] = [{ json: { a: 'nothing here' } }];

		const [out] = scrubber.scrubOutputs([items])!;

		expect(out![0]).toBe(items[0]);
	});

	it('keeps null outputs and binary data', () => {
		const scrubber = build(['tenant_key', 'sk_acme_123']);
		const binary = { data: { data: 'sk_acme_123', mimeType: 'text/plain' } };
		const items: INodeExecutionData[] = [{ json: {}, binary }];

		const result = scrubber.scrubOutputs([null, items])!;

		expect(result[0]).toBeNull();
		expect(result[1]![0].binary).toBe(binary);
	});

	it('replaces a longer value before a value that it contains', () => {
		const scrubber = build(['short', 'secret'], ['long', 'secret-long']);
		const [out] = scrubber.scrubOutputs([[{ json: { text: 'secret-long and secret' } }]])!;

		expect(out![0].json.text).toBe('[runtime credential: long] and [runtime credential: short]');
	});

	it('also replaces the token without the Bearer prefix', () => {
		const scrubber = build(['auth', 'Bearer abcdef123']);
		const [out] = scrubber.scrubOutputs([
			[{ json: { a: 'Bearer abcdef123', b: 'token abcdef123' } }],
		])!;

		expect(out![0].json).toEqual({
			a: '[runtime credential: auth]',
			b: 'token [runtime credential: auth]',
		});
	});

	it('skips a value shorter than 6 characters but scrubs the others', () => {
		const scrubber = build(['short', 'abcde'], ['long', 'abcdef']);
		const [out] = scrubber.scrubOutputs([[{ json: { text: 'abcde abcdef' } }]])!;

		expect(out![0].json.text).toBe('abcde [runtime credential: long]');
	});

	it('scrubs the message, description and fields of an error', () => {
		const scrubber = build(['tenant_key', 'sk_acme_123']);
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

	it('scrubs the error of an output item', () => {
		const scrubber = build(['tenant_key', 'sk_acme_123']);
		const error = new Error('bad sk_acme_123') as unknown as INodeExecutionData['error'];

		scrubber.scrubOutputs([[{ json: {}, error }]]);

		expect(error!.message).toBe('bad [runtime credential: tenant_key]');
	});

	it('handles circular output without looping', () => {
		const scrubber = build(['tenant_key', 'sk_acme_123']);
		const json: Record<string, unknown> = { value: 'sk_acme_123' };
		json.self = json;

		const [out] = scrubber.scrubOutputs([[{ json } as INodeExecutionData]])!;

		expect(out![0].json.value).toBe('[runtime credential: tenant_key]');
	});
});
