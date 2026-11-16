import type { ExecutionSetup, NodeRunRecord } from '../src/execution-context';
import { recordRequest } from '../src/http/http-request';

const secret = { placeholder: '[credential: CRM API key.value]', value: 'test-key' };
const request = {
	method: 'POST',
	url: 'https://crm.example.com/customers?key=test-key',
	headers: { 'x-api-key': 'test-key' },
	body: '{"token":"test-key"}',
};

function record(redact?: boolean) {
	const context = { options: { redact }, redactions: [secret] } as unknown as ExecutionSetup;
	const run: NodeRunRecord = { parameters: [], requests: [] };
	recordRequest(context, run, request);
	return run.requests[0];
}

test('replaces each secret with its placeholder in the url, headers and body', () => {
	expect(record()).toEqual({
		method: 'POST',
		url: 'https://crm.example.com/customers?key=[credential: CRM API key.value]',
		headers: { 'x-api-key': '[credential: CRM API key.value]' },
		body: '{"token":"[credential: CRM API key.value]"}',
	});
});

test('keeps the real secret when redact is false', () => {
	expect(record(false)).toEqual(request);
});

test('redacts credentials in a basic authorization header', () => {
	const context = { options: {}, redactions: [secret] } as unknown as ExecutionSetup;
	const run: NodeRunRecord = { parameters: [], requests: [] };
	const authorization = `Basic ${Buffer.from('ada:test-key').toString('base64')}`;

	recordRequest(context, run, { ...request, headers: { authorization } });

	expect(run.requests[0].headers.authorization).toBe('Basic ada:[credential: CRM API key.value]');
});
