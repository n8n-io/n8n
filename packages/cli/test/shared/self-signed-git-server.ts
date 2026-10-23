import { execFileSync } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { createServer } from 'node:https';
import { tmpdir } from 'node:os';
import path from 'node:path';

/** Git reports a failed TLS verification differently per libcurl TLS backend. */
export const TLS_VERIFICATION_ERROR =
	/SSL certificate problem|server certificate verification failed/;

/**
 * An HTTPS server with a self-signed certificate that answers every request
 * with the smart HTTP advertisement of an empty repository. That is enough to
 * tell a TLS failure from a successful `git ls-remote`.
 */
export async function startSelfSignedGitServer() {
	const dir = await mkdtemp(path.join(tmpdir(), 'n8n-git-tls-'));
	const keyPath = path.join(dir, 'key.pem');
	const certPath = path.join(dir, 'cert.pem');
	execFileSync('openssl', [
		'req',
		'-x509',
		'-nodes',
		'-newkey',
		'rsa:2048',
		'-keyout',
		keyPath,
		'-out',
		certPath,
		'-days',
		'1',
		'-subj',
		'/CN=127.0.0.1',
		'-addext',
		'subjectAltName=IP:127.0.0.1',
	]);
	const server = createServer(
		{ key: await readFile(keyPath), cert: await readFile(certPath) },
		(_request, response) => {
			response.setHeader('Content-Type', 'application/x-git-upload-pack-advertisement');
			response.end('001e# service=git-upload-pack\n00000000');
		},
	);
	await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
	const address = server.address();
	if (!address || typeof address === 'string') throw new Error('Server has no port');

	return {
		dir,
		certPath,
		repositoryUrl: `https://127.0.0.1:${address.port}/repo.git`,
		close: async () => {
			server.closeAllConnections();
			await new Promise<void>((resolve) => server.close(() => resolve()));
			await rm(dir, { recursive: true, force: true });
		},
	};
}
