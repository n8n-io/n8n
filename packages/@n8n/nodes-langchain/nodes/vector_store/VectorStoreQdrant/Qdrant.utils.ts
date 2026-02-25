import { QdrantClient } from '@qdrant/js-client-rest';
import { UserError } from 'n8n-workflow';

export type QdrantCredential = {
	qdrantUrl: string;
	apiKey: string;
};

function parseQdrantUrl(url: string): { protocol: string; host: string; port: number } {
	try {
		const parsedUrl = new URL(url);
		return {
			protocol: parsedUrl.protocol,
			host: parsedUrl.hostname,
			port: parsedUrl.port
				? parseInt(parsedUrl.port, 10)
				: parsedUrl.protocol === 'https:'
					? 443
					: 80,
		};
	} catch (error) {
		throw new UserError(
			`Invalid Qdrant URL: ${url}. Please provide a valid URL with protocol (http/https)`,
		);
	}
}

export function createQdrantClient(credentials: QdrantCredential): QdrantClient {
	const { protocol, host, port } = parseQdrantUrl(credentials.qdrantUrl);

	const qdrantClient = new QdrantClient({
		host,
		apiKey: credentials.apiKey,
		https: protocol === 'https:',
		port,
	});

	return qdrantClient;
}
