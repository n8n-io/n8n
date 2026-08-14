import type { GitKeyGeneratorType } from '@n8n/api-types';
import { resolveProxyUrl } from '@n8n/backend-network';
import { generateKeyPairSync } from 'node:crypto';

/**
 * Pure, stateless helpers for constructing Git credential/SSH plumbing.
 * Shared between the git-connections and source-control modules so the
 * security-sensitive escaping and command construction lives in one place.
 */

/** Single-quote a value for safe inclusion in a POSIX shell command. */
const quoteShellArg = (value: string) => `'${value.replace(/'/g, "'\"'\"'")}'`;

/**
 * Build the `config` entries for an HTTPS Git client: an inline credential
 * helper carrying the username/password, path-scoped so the credentials are
 * only used for the configured repository URL, plus an `http.proxy` entry when
 * a proxy is resolved for the repository URL.
 */
export function buildHttpsGitConfig(
	repositoryUrl: string,
	credentials: { username: string; password: string },
): string[] {
	const helper = `!f() { echo username=${quoteShellArg(credentials.username)}; echo password=${quoteShellArg(credentials.password)}; }; f`;
	const config = [`credential.helper=${helper}`, 'credential.useHttpPath=true'];
	// Git uses http.proxy for both HTTP and HTTPS URLs.
	const proxyUrl = resolveProxyUrl(repositoryUrl);
	if (proxyUrl) config.push(`http.proxy=${proxyUrl}`);
	return config;
}

/**
 * Build the `GIT_SSH_COMMAND` that points SSH at n8n's own private key and
 * known_hosts file. Paths are POSIX-normalized (works cross-platform) and
 * double-quotes are escaped to prevent command injection.
 * StrictHostKeyChecking=accept-new accepts and pins the host key on first
 * connection, then verifies it on subsequent connections (MITM protection).
 */
export function buildSshCommand(paths: { privateKeyPath: string; knownHostsPath: string }): string {
	const escape = (value: string) => value.split(/[/\\]/).join('/').replace(/"/g, '\\"');
	return `ssh -o UserKnownHostsFile="${escape(paths.knownHostsPath)}" -o StrictHostKeyChecking=accept-new -i "${escape(paths.privateKeyPath)}"`;
}

/**
 * Generate an SSH key pair (ed25519 or rsa) in OpenSSH format. `comment` is the
 * label embedded in the key (visible when the public key is added as a deploy
 * key), so each caller passes its own.
 */
export async function generateSshKeyPair(keyType: GitKeyGeneratorType, comment: string) {
	// sshpk is CommonJS (`export =`): under nodenext, a native dynamic import only
	// hoists some named exports onto the namespace (parsePrivateKey is missed), so
	// read the real module.exports off `.default`.
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
