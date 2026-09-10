import type { PromotionSshKeyType } from '@n8n/api-types';
import { resolveProxyUrl } from '@n8n/backend-network';
import { generateKeyPairSync } from 'node:crypto';

import {
	HTTP_LOW_SPEED_LIMIT_BYTES,
	HTTP_LOW_SPEED_TIME_SECONDS,
	SSH_CONNECT_TIMEOUT_SECONDS,
	SSH_SERVER_ALIVE_COUNT_MAX,
	SSH_SERVER_ALIVE_INTERVAL_SECONDS,
} from './constants';
import type { PromotionOperationInput, ResolvedPromotionConfig } from './promotions.types';

/** Quote a value for use as one POSIX shell argument. */
const quoteShellArg = (value: string) => `'${value.replace(/'/g, "'\"'\"'")}'`;

/**
 * Build the Git configuration for an HTTP(S) remote.
 *
 * The credential helper serves every request from this Git process. Each
 * operation uses a separate process and configuration.
 */
export function buildHttpsGitConfig({ repositoryUrl }: { repositoryUrl: string }): string[] {
	// Read credentials from the operation's environment to keep them out of process arguments.
	const helper =
		'!f() { printf \'%s\\n\' "username=$N8N_GIT_USERNAME" "password=$N8N_GIT_PASSWORD"; }; f';
	const config = [
		`credential.helper=${helper}`,
		'credential.useHttpPath=true',
		`http.lowSpeedLimit=${HTTP_LOW_SPEED_LIMIT_BYTES}`,
		`http.lowSpeedTime=${HTTP_LOW_SPEED_TIME_SECONDS}`,
	];
	// Git uses http.proxy for both HTTP and HTTPS URLs.
	const proxyUrl = resolveProxyUrl(repositoryUrl);
	if (proxyUrl) config.push(`http.proxy=${proxyUrl}`);
	// Git runs with a replaced environment, so carry the CA settings over as config.
	const { GIT_SSL_CAINFO, GIT_SSL_CAPATH } = process.env;
	if (GIT_SSL_CAINFO) config.push(`http.sslCAInfo=${GIT_SSL_CAINFO}`);
	if (GIT_SSL_CAPATH) config.push(`http.sslCAPath=${GIT_SSL_CAPATH}`);
	return config;
}

/** Build the shell-safe SSH command used for Git remotes. */
export function buildSshCommand(paths: { privateKeyPath: string; knownHostsPath: string }): string {
	const normalizeAndQuote = (value: string) => quoteShellArg(value.split(/[/\\]/).join('/'));
	const timeouts = `-o ConnectTimeout=${SSH_CONNECT_TIMEOUT_SECONDS} -o ServerAliveInterval=${SSH_SERVER_ALIVE_INTERVAL_SECONDS} -o ServerAliveCountMax=${SSH_SERVER_ALIVE_COUNT_MAX}`;
	return `ssh ${timeouts} -o UserKnownHostsFile=${normalizeAndQuote(paths.knownHostsPath)} -o StrictHostKeyChecking=accept-new -i ${normalizeAndQuote(paths.privateKeyPath)}`;
}

/** Generate an OpenSSH key pair with the supplied key comment. */
export async function generateSshKeyPair(keyType: PromotionSshKeyType, comment: string) {
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

/**
 * The branch a plain-Git config checks out. Apply reads the branch it imports
 * from; Promote reads the branch it starts from. This is the only place that
 * looks at direction to find a configured branch, so clone, cache identity, and
 * the transport all agree on one value.
 */
export function checkoutBranchName(config: ResolvedPromotionConfig): string {
	return config.direction === 'apply' ? config.settings.branchName : config.settings.baseBranchName;
}

/** Keep the repository URL consistent across Git operations and cache identity. */
export function repositoryUrl(input: PromotionOperationInput): string {
	return input.target.remoteUrl;
}
