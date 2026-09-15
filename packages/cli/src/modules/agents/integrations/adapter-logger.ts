import type { Logger } from '@n8n/backend-common';
import type { Logger as ChatLogger } from 'chat';

/**
 * Bridge a Chat SDK adapter's logger onto n8n's.
 *
 * Only the message string is forwarded. Adapter metadata arguments are dropped:
 * the Discord adapter was observed passing message text, IDs, request
 * signatures and public keys that way, none of which belongs in instance logs.
 */
export function createAdapterLogger(logger: Logger, prefix: string): ChatLogger {
	const forward =
		(level: 'debug' | 'info' | 'warn' | 'error') =>
		(message: string, ..._args: unknown[]) => {
			logger[level](`${prefix} ${message}`);
		};
	const chatLogger: ChatLogger = {
		child: () => chatLogger,
		debug: forward('debug'),
		info: forward('info'),
		warn: forward('warn'),
		error: forward('error'),
	};
	return chatLogger;
}
