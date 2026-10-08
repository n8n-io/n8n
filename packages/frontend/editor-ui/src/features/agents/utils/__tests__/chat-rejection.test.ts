import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import { readChatRejection } from '../chat-rejection';

const jsonResponse = (status: number, body: unknown) =>
	new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});

describe('readChatRejection', () => {
	it('reads the message and the name of the user who answered a card first', async () => {
		const response = jsonResponse(409, {
			code: 409,
			message: 'This request was already answered',
			meta: { answeredBy: { name: 'Alice Owner' } },
		});

		await expect(readChatRejection(response)).resolves.toEqual({
			status: 409,
			message: 'This request was already answered',
			answeredBy: 'Alice Owner',
		});
	});

	it('reads a refusal without meta', async () => {
		const response = jsonResponse(403, { code: 403, message: 'Only Alice can answer this.' });

		await expect(readChatRejection(response)).resolves.toEqual({
			status: 403,
			message: 'Only Alice can answer this.',
		});
	});

	it('keeps the message when the meta has another shape', async () => {
		const response = jsonResponse(409, { message: 'Taken', meta: { answeredBy: 'Alice' } });

		await expect(readChatRejection(response)).resolves.toEqual({ status: 409, message: 'Taken' });
	});

	it('drops blank texts', async () => {
		const response = jsonResponse(409, { message: '  ', meta: { answeredBy: { name: '' } } });

		await expect(readChatRejection(response)).resolves.toEqual({ status: 409 });
	});

	it.each([
		['an empty body', new Response(null, { status: 502 })],
		['a body that is not JSON', new Response('<html>Bad gateway</html>', { status: 502 })],
		['a JSON body that is not an object', jsonResponse(502, ['error'])],
	])('returns only the status for %s', async (_, response) => {
		await expect(readChatRejection(response)).resolves.toEqual({ status: 502 });
	});

	it('never throws, whatever JSON the body holds', async () => {
		await fc.assert(
			fc.asyncProperty(fc.jsonValue(), async (body) => {
				const rejection = await readChatRejection(jsonResponse(400, body));
				expect(rejection.status).toBe(400);
				if (rejection.message !== undefined) expect(rejection.message.trim()).not.toBe('');
				if (rejection.answeredBy !== undefined) expect(rejection.answeredBy.trim()).not.toBe('');
			}),
		);
	});
});
