import { ResponseError } from '@n8n/rest-api-client';
import { effectScope, nextTick, ref } from 'vue';

import { requestErrorMessage, useTokenRequest } from '../composables/useTokenRequest';
import { deferred, fakeToken } from './linkedInstances.fixtures';

const FALLBACK = 'Something went wrong. Try again.';

function setup() {
	const open = ref(true);
	const scope = effectScope();
	const request = scope.run(() => useTokenRequest(open, () => FALLBACK));
	if (!request) throw new Error('The composable did not run');
	return { open, scope, ...request };
}

describe('requestErrorMessage', () => {
	it('shows the message of a server error', () => {
		expect(requestErrorMessage(new ResponseError('Refused'), FALLBACK)).toBe('Refused');
	});

	it.each([
		['a server error without a message', new ResponseError('  ')],
		['an error from this client', new Error('Unexpected response')],
		['a value that is not an error', 'boom'],
	])('shows the general message for %s', (_label, error) => {
		expect(requestErrorMessage(error, FALLBACK)).toBe(FALLBACK);
	});
});

describe('useTokenRequest', () => {
	it('returns the result and clears the token after a request', async () => {
		const { token, send, serverError, isSubmitting, scope } = setup();
		token.value = fakeToken();

		await expect(send(async () => 'linked')).resolves.toBe('linked');

		expect(token.value).toBe('');
		expect(serverError.value).toBeUndefined();
		expect(isSubmitting.value).toBe(false);
		scope.stop();
	});

	it('records the error and clears the token after a failed request', async () => {
		const { token, send, serverError, scope } = setup();
		token.value = fakeToken();

		await expect(
			send(async () => await Promise.reject(new ResponseError('Refused'))),
		).resolves.toBeUndefined();

		expect(serverError.value).toBe('Refused');
		expect(token.value).toBe('');
		scope.stop();
	});

	it('shows that a request runs until it ends', async () => {
		const { send, isSubmitting, scope } = setup();
		const request = deferred<string>();

		const sending = send(async () => await request.promise);
		expect(isSubmitting.value).toBe(true);
		request.resolve('done');
		await sending;

		expect(isSubmitting.value).toBe(false);
		scope.stop();
	});

	it('clears the token and the error when the dialog closes', async () => {
		const { open, token, send, serverError, scope } = setup();
		await send(async () => await Promise.reject(new ResponseError('Refused')));
		token.value = fakeToken();

		open.value = false;
		await nextTick();

		expect(token.value).toBe('');
		expect(serverError.value).toBeUndefined();
		scope.stop();
	});

	it('ignores a request that ends after the dialog closed and opened again', async () => {
		const { open, token, send, serverError, isSubmitting, scope } = setup();
		const request = deferred<string>();
		const sending = send(async () => await request.promise);

		open.value = false;
		await nextTick();
		open.value = true;
		await nextTick();
		const newToken = fakeToken();
		token.value = newToken;
		request.reject(new ResponseError('Refused'));

		await expect(sending).resolves.toBeUndefined();
		// The new opening keeps what the user typed and shows no old error.
		expect(token.value).toBe(newToken);
		expect(serverError.value).toBeUndefined();
		expect(isSubmitting.value).toBe(false);
		scope.stop();
	});

	it('returns nothing for a request that succeeds after the dialog closed', async () => {
		const { open, send, scope } = setup();
		const request = deferred<string>();
		const sending = send(async () => await request.promise);

		open.value = false;
		await nextTick();
		request.resolve('linked');

		await expect(sending).resolves.toBeUndefined();
		scope.stop();
	});
});
