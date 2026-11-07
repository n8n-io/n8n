import type { CloseReason } from '@n8n/imap';
import { type ITriggerFunctions, NodeOperationError } from 'n8n-workflow';

/** `error` already went out through `onError`; only an unexplained close is news. */
export const closeHandler =
	(ctx: ITriggerFunctions) =>
	(reason: CloseReason, cause?: Error): void => {
		if (reason !== 'dropped') {
			ctx.logger.debug(`Email Read Imap: Connection closed (${reason})`);
			return;
		}

		ctx.logger.error('Email Read Imap: Connection closed unexpectedly', { error: cause });
		ctx.emitError(
			new NodeOperationError(ctx.getNode(), 'IMAP connection closed unexpectedly', {
				description:
					'The IMAP server closed the connection without reporting an error, usually because the server (or a proxy/firewall) periodically closes long-lived connections, or was temporarily unavailable. n8n will automatically retry reactivating the workflow.',
			}),
		);
	};
