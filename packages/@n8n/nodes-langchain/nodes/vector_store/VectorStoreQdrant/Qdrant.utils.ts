import { QdrantClient } from '@qdrant/js-client-rest';
import { UserError } from 'n8n-workflow';

export type QdrantCredential = {
	qdrantUrl: string;
	apiKey: string;
};

function parseQdrantUrl(url: string): {
	protocol: string;
	host: string;
	port: number;
	prefix: string;
} {
	try {
		const parsedUrl = new URL(url);
		// Preserve a reverse-proxy subpath (e.g. `/qdrant`) so it can be carried
		// as the Qdrant client's `prefix`. Root URLs stay prefix-less and a
		// trailing slash is trimmed so the client never emits a double slash.
		let prefix = parsedUrl.pathname;
		if (!prefix || prefix === '/') {
			prefix = '';
		} else if (prefix.length > 1 && prefix.endsWith('/')) {
			prefix = prefix.replace(/\/+$/, '');
		}
		return {
			protocol: parsedUrl.protocol,
			host: parsedUrl.hostname,
			port: parsedUrl.port
				? parseInt(parsedUrl.port, 10)
				: parsedUrl.protocol === 'https:'
					? 443
					: 80,
			prefix,
		};
	} catch (error) {
		throw new UserError(
			`Invalid Qdrant URL: ${url}. Please provide a valid URL with protocol (http/https)`,
		);
	}
}

export function createQdrantClient(credentials: QdrantCredential): QdrantClient {
	const { protocol, host, port, prefix } = parseQdrantUrl(credentials.qdrantUrl);

	const qdrantClient = new QdrantClient({
		host,
		apiKey: credentials.apiKey,
		https: protocol === 'https:',
		port,
		...(prefix ? { prefix } : {}),
	});

	return qdrantClient;
}
