import type { GitKeyGeneratorType } from '@n8n/api-types';
import { resolveProxyUrl } from '@n8n/backend-network';
import { generateKeyPairSync } from 'node:crypto';

import {
	HTTP_LOW_SPEED_LIMIT_BYTES,
	HTTP_LOW_SPEED_TIME_SECONDS,
	PROMOTION_BRANCH_PREFIX,
	SSH_CONNECT_TIMEOUT_SECONDS,
	SSH_SERVER_ALIVE_COUNT_MAX,
	SSH_SERVER_ALIVE_INTERVAL_SECONDS,
} from './constants';

/**
 * Build the branch name a promote pushes to when the connection requires
 * branching. `:` and `.` are not valid in Git ref names, so replace them.
 */
export function buildPromotionBranchName(now: Date): string {
	return `${PROMOTION_BRANCH_PREFIX}${now.toISOString().replace(/[:.]/g, '-')}`;
}

/** Quote a value for use as one POSIX shell argument. */
const quoteShellArg = (value: string) => `'${value.replace(/'/g, "'\"'\"'")}'`;

/**
 * Build the Git configuration for an HTTPS connection.
 *
 * The credential helper serves every request from this Git process. Each
 * connection uses a separate process and configuration.
 */
export function buildHttpsGitConfig(
	repositoryUrl: string,
	credentials: { username: string; password: string },
): string[] {
	const helper = `!f() { echo username=${quoteShellArg(credentials.username)}; echo password=${quoteShellArg(credentials.password)}; }; f`;
	const config = [
		`credential.helper=${helper}`,
		'credential.useHttpPath=true',
		`http.lowSpeedLimit=${HTTP_LOW_SPEED_LIMIT_BYTES}`,
		`http.lowSpeedTime=${HTTP_LOW_SPEED_TIME_SECONDS}`,
	];
	// Git uses http.proxy for both HTTP and HTTPS URLs.
	const proxyUrl = resolveProxyUrl(repositoryUrl);
	if (proxyUrl) config.push(`http.proxy=${proxyUrl}`);
	return config;
}

/** Build the shell-safe SSH command used for Git connections. */
export function buildSshCommand(paths: { privateKeyPath: string; knownHostsPath: string }): string {
	const normalizeAndQuote = (value: string) => quoteShellArg(value.split(/[/\\]/).join('/'));
	const timeouts = `-o ConnectTimeout=${SSH_CONNECT_TIMEOUT_SECONDS} -o ServerAliveInterval=${SSH_SERVER_ALIVE_INTERVAL_SECONDS} -o ServerAliveCountMax=${SSH_SERVER_ALIVE_COUNT_MAX}`;
	return `ssh ${timeouts} -o UserKnownHostsFile=${normalizeAndQuote(paths.knownHostsPath)} -o StrictHostKeyChecking=accept-new -i ${normalizeAndQuote(paths.privateKeyPath)}`;
}

/** Generate an OpenSSH key pair with the supplied key comment. */
export async function generateSshKeyPair(keyType: GitKeyGeneratorType, comment: string) {
	// Read the CommonJS default export because parsePrivateKey is not a named export.
	const { default: sshpk } = await import('sshpk');
	const generated =
		keyType === 'ed25519'
			? generateKeyPairSync('ed25519', {
					privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
					publicKeyEncoding: { format: 'pem', type: 'spki' },
				})
			: generateKeyPairSync('rsa', {
					modulusLength: 4096,
					privateKeyEncoding: { format: 'pem', type: 'pkcs8' },
					publicKeyEncoding: { format: 'pem', type: 'spki' },
				});
	const publicKey = sshpk.parseKey(generated.publicKey, 'pem');
	publicKey.comment = comment;
	const privateKey = sshpk.parsePrivateKey(generated.privateKey, 'pem');
	privateKey.comment = comment;
	return {
		publicKey: publicKey.toString('ssh'),
		privateKey: privateKey.toString('ssh-private'),
	};
}
