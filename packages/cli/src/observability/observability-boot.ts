import { Logger } from '@n8n/backend-common';
import { Container } from '@n8n/di';
import { getErrorMessage } from '@n8n/utils/errors/get-error-message';

import { OtelSdk } from './otel-sdk';

export function startObservability(): void {
	try {
		Container.get(OtelSdk).start();
	} catch (error) {
		Container.get(Logger).error('Failed to set up observability at startup, so tracing stays off', {
			error: getErrorMessage(error),
		});
	}
}
