import type { Plugin } from 'vue';
import { AxiosError } from 'axios';
import { ResponseError } from '@/utils/apiUtils';
import * as Sentry from '@sentry/vue';

const ignoredErrors = [
	{ instanceof: AxiosError },
	{ instanceof: ResponseError, message: /ECONNREFUSED/ },
	{ instanceof: ResponseError, message: "Can't connect to n8n." },
	{ instanceof: ResponseError, message: 'Unauthorized' },
	{ instanceof: Error, message: /ResizeObserver/ },
] as const;

export function beforeSend(event: Sentry.ErrorEvent, { originalException }: Sentry.EventHint) {
	if (
		!originalException ||
		ignoredErrors.some((entry) => {
			const typeMatch = originalException instanceof entry.instanceof;
			if (!typeMatch) {
				return false;
			}

			if ('message' in entry) {
				if (entry.message instanceof RegExp) {
					return entry.message.test(originalException.message ?? '');
				} else {
					return originalException.message === entry.message;
				}
			}

			return true;
		})
	) {
		return null;
	}

	return event;
}

export const SentryPlugin: Plugin = {
	install: (app) => {
		if (!window.sentry?.dsn) {
			return;
		}

		const { dsn, release, environment, serverName } = window.sentry;

		Sentry.init({
			app,
			dsn,
			release,
			environment,
			beforeSend,
		});

		if (serverName) {
			Sentry.setTag('server_name', serverName);
		}
	},
};
