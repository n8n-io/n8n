import { ResponseError } from '@n8n/rest-api-client';
import { ref, watch, type WatchSource } from 'vue';

/** The message to show inline. The server writes its messages for users and never repeats a token. */
export function requestErrorMessage(error: unknown, fallback: string): string {
	return error instanceof ResponseError && error.message.trim() !== '' ? error.message : fallback;
}

/**
 * Holds the access token of one dialog and sends one request with it.
 * The token stays only in this component: it is cleared when the dialog opens or closes and
 * when a request ends. A request that ends after the dialog closed changes nothing here.
 */
export function useTokenRequest(open: WatchSource<boolean>, fallbackError: () => string) {
	const token = ref('');
	const serverError = ref<string>();
	const isSubmitting = ref(false);

	// Changes on every open and close. A request reports back only while its opening is current.
	let opening = 0;

	watch(
		open,
		() => {
			opening += 1;
			token.value = '';
			serverError.value = undefined;
			isSubmitting.value = false;
		},
		{ immediate: true },
	);

	/** @returns the result, or `undefined` when the request failed or the dialog closed meanwhile */
	async function send<T>(request: () => Promise<T>): Promise<T | undefined> {
		const current = opening;
		isSubmitting.value = true;
		serverError.value = undefined;
		try {
			const result = await request();
			return current === opening ? result : undefined;
		} catch (error) {
			if (current === opening) serverError.value = requestErrorMessage(error, fallbackError());
			return undefined;
		} finally {
			if (current === opening) {
				token.value = '';
				isSubmitting.value = false;
			}
		}
	}

	return { token, serverError, isSubmitting, send };
}
