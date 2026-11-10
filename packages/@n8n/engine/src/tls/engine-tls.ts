import { UserError } from '@n8n/errors';
import { X509Certificate } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { createServer as createHttpServer, type RequestListener, type Server } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { createSecureContext, type TLSSocket } from 'node:tls';

import type { EngineLogger } from '../logging';

/** The PEM file paths both planes read from `N8N_ENGINE_TLS_*`. */
export interface EngineTlsFiles {
	tlsCertFile: string;
	tlsKeyFile: string;
	tlsCaFile: string;
}

/** One plane's identity plus the CA it trusts, used for its server and its client. */
export interface EngineTls {
	cert: Buffer;
	key: Buffer;
	ca: Buffer;
}

const ENV_NAMES: Record<keyof EngineTlsFiles, string> = {
	tlsCertFile: 'N8N_ENGINE_TLS_CERT_FILE',
	tlsKeyFile: 'N8N_ENGINE_TLS_KEY_FILE',
	tlsCaFile: 'N8N_ENGINE_TLS_CA_FILE',
};

const ALL_ENV_NAMES =
	'N8N_ENGINE_TLS_CERT_FILE, N8N_ENGINE_TLS_KEY_FILE and N8N_ENGINE_TLS_CA_FILE';

const HEALTHZ_PATH = '/healthz';

/**
 * Reads the TLS files, or returns `undefined` when none is set. Throws at boot
 * when only some are set, or when the files do not form a usable key pair.
 */
export function loadEngineTls(files: EngineTlsFiles): EngineTls | undefined {
	const keys = Object.keys(ENV_NAMES) as Array<keyof EngineTlsFiles>;
	const missing = keys.filter((key) => !files[key]);

	if (missing.length === keys.length) return undefined;

	if (missing.length > 0) {
		throw new UserError(
			`Engine TLS needs ${ALL_ENV_NAMES} together. Missing: ${missing.map((key) => ENV_NAMES[key]).join(', ')}.`,
		);
	}

	const read = (key: keyof EngineTlsFiles) => {
		try {
			return readFileSync(files[key]);
		} catch (error) {
			throw new UserError(`Cannot read ${ENV_NAMES[key]} at ${files[key]}`, { cause: error });
		}
	};
	const tls = { cert: read('tlsCertFile'), key: read('tlsKeyFile'), ca: read('tlsCaFile') };

	try {
		createSecureContext(tls);
		// Parses the first certificate in the CA file and throws if there is none, which
		// `createSecureContext` does not check. It does not verify the certificate itself.
		new X509Certificate(tls.ca);
	} catch (error) {
		throw new UserError(`${ALL_ENV_NAMES} are not a valid certificate, key and CA`, {
			cause: error,
		});
	}

	return tls;
}

/**
 * The secure default for a plane that talks to the other one over the network:
 * TLS with `https://` peer URLs, or plain HTTP only with the explicit opt-out.
 */
export function assertSecureTransport(
	config: { tlsInsecureAllowPlainHttp: boolean },
	tls: EngineTls | undefined,
	peerUrls: Record<string, string>,
	logger: Pick<EngineLogger, 'warn'>,
): void {
	if (tls) {
		for (const [name, url] of Object.entries(peerUrls)) {
			if (!url.startsWith('https://')) {
				throw new UserError(`${name} must start with https:// when engine TLS is on. Got: ${url}`);
			}
		}
		return;
	}

	if (!config.tlsInsecureAllowPlainHttp) {
		throw new UserError(
			`The engine and a remote control plane talk over mutual TLS, so each needs ${ALL_ENV_NAMES}. For local development only, set N8N_ENGINE_TLS_INSECURE_ALLOW_PLAIN_HTTP=true to use plain HTTP.`,
		);
	}

	logger.warn(
		'Engine v2 uses plain HTTP between the control plane and the engine (N8N_ENGINE_TLS_INSECURE_ALLOW_PLAIN_HTTP). Tokens and credentials cross the network unencrypted.',
	);
}

/**
 * An HTTP server, or with `tls` an HTTPS server that requires a client
 * certificate signed by `tls.ca` on every path except `/healthz`.
 */
export function createEngineHttpServer(
	handler: RequestListener,
	tls: EngineTls | undefined,
): Server {
	if (!tls) return createHttpServer(handler);

	return createHttpsServer(
		{
			...tls,
			minVersion: 'TLSv1.2',
			requestCert: true,
			// Checked per request instead, so a probe without a client certificate
			// still reaches `/healthz`.
			rejectUnauthorized: false,
		},
		(req, res) => {
			const path = req.url?.split('?')[0];
			if (path === HEALTHZ_PATH || (req.socket as TLSSocket).authorized) {
				handler(req, res);
				return;
			}

			res
				.writeHead(401, { 'content-type': 'application/json' })
				.end(JSON.stringify({ code: 401, message: 'A valid client certificate is required' }));
		},
	);
}
