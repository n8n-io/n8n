import { toHttpRequest } from '../src/http/undici-request';

const url = new URL('https://crm.example.com/upload');

async function* chunks() {
	yield Buffer.from('data');
}

test.each([
	{ body: 'name=Ada', recorded: 'name=Ada' },
	{ body: undefined, recorded: '' },
	{ body: chunks(), recorded: '[stream]' },
])('records the request body $recorded', ({ body, recorded }) => {
	const request = { origin: url.origin, path: url.pathname, method: 'POST', body };

	expect(toHttpRequest(request, url).body).toBe(recorded);
});
