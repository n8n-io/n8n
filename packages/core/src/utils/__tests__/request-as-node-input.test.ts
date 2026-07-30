import { requestAsNodeInput } from '../request-as-node-input';

describe('requestAsNodeInput', () => {
	it('should combine the body and the headers', () => {
		expect(requestAsNodeInput({ body: { test: 'body' }, headers: { test: 'header' } })).toEqual({
			test: 'body',
			headers: { test: 'header' },
		});
	});

	it('should not let the body stand in for the headers', () => {
		expect(
			requestAsNodeInput({
				body: { headers: { 'x-user-id': 'spoofed' } },
				headers: { 'x-user-id': 'real' },
			}),
		).toEqual({ headers: { 'x-user-id': 'real' } });
	});

	it.each([undefined, 'raw text', ['a'], Buffer.from('raw')])(
		'should ignore a body that is not an object: %s',
		(body) => {
			expect(requestAsNodeInput({ body, headers: { test: 'header' } })).toEqual({
				headers: { test: 'header' },
			});
		},
	);

	it('should return empty headers when there is no request', () => {
		expect(requestAsNodeInput()).toEqual({ headers: {} });
	});
});
