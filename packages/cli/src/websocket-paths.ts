import type { IncomingMessage, Server } from 'http';
import type { Duplex } from 'stream';

import { routedPath } from '@/utils/request-path';

/** Responds 404 and closes the socket for each upgrade request on a path that `isKnownPath` rejects. */
export function rejectUnknownWebSocketPaths(
	server: Server,
	isKnownPath: (path: string | undefined) => boolean,
): void {
	// Runs first, because the feature listeners pass the request to Express, which rewrites `req.url`.
	server.prependListener('upgrade', (req: IncomingMessage, socket: Duplex) => {
		if (!isKnownPath(routedPath(req))) {
			socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
			socket.destroy();
		}
	});
}
