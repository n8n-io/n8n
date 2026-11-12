import { UserError } from '@n8n/errors';
import { X509Certificate } from 'node:crypto';
import { readFileSync, watch, type FSWatcher } from 'node:fs';
import { createServer as createHttpServer, type RequestListener, type Server } from 'node:http';
import { createServer as createHttpsServer } from 'node:https';
import { dirname } from 'node:path';
import { createSecureContext, type SecureContextOptions, type TLSSocket } from 'node:tls';

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

/** This process's TLS material, which follows changes to the files. */
export interface EngineTlsSource {
	/** The newest valid certificate, key and CA. */
	readonly current: EngineTls;
	/** Calls `listener` after each reload. Returns a function that removes it. */
	subscribe(listener: (tls: EngineTls) => void): () => void;
	/** Stops watching the files. */
	close(): void;
}

const ENV_NAMES: Record<keyof EngineTlsFiles, string> = {
	tlsCertFile: 'N8N_ENGINE_TLS_CERT_FILE',
	tlsKeyFile: 'N8N_ENGINE_TLS_KEY_FILE',
	tlsCaFile: 'N8N_ENGINE_TLS_CA_FILE',
};

const ALL_ENV_NAMES =
	'N8N_ENGINE_TLS_CERT_FILE, N8N_ENGINE_TLS_KEY_FILE and N8N_ENGINE_TLS_CA_FILE';

const HEALTHZ_PATH = '/healthz';

/** Waits for the other files of an update before reloading, so it reads them together. */
const RELOAD_DEBOUNCE_MS = 1000;

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
	tlsEnabled: boolean,
	peerUrls: Record<string, string>,
	logger: Pick<EngineLogger, 'warn'>,
): void {
	if (tlsEnabled) {
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
 * Reads the TLS files and watches them, or returns `undefined` when none is
 * set. Open it once per process and share it between the server and the
 * clients, so both always use the same certificate.
 *
 * Watches the directories, not the files: Kubernetes updates a mounted Secret
 * by swapping a `..data` symlink, and a watch on the file misses that. Files
 * that are not valid, for example half written, keep the current ones. Throws
 * at boot when the files are not usable or cannot be watched.
 */
export function openEngineTls(
	files: EngineTlsFiles,
	logger: Pick<EngineLogger, 'info' | 'error'>,
	debounceMs = RELOAD_DEBOUNCE_MS,
): EngineTlsSource | undefined {
	const initial = loadEngineTls(files);
	if (!initial) return undefined;

	let current = initial;
	// Advances only when every listener took the new files, so a failed apply is retried.
	let applied = initial;
	const listeners = new Set<(tls: EngineTls) => void>();

	const reload = () => {
		let next: EngineTls | undefined;
		try {
			next = loadEngineTls(files);
		} catch (error) {
			logger.error(
				'The engine TLS files changed but are not valid. Keeping the current certificate.',
				{ error },
			);
			return;
		}

		if (!next || isSameTls(next, applied)) return;

		current = next;
		const errors: unknown[] = [];
		for (const listener of listeners) {
			try {
				listener(next);
			} catch (error) {
				errors.push(error);
			}
		}

		if (errors.length > 0) {
			logger.error('Could not apply the reloaded engine TLS certificate', { errors });
			return;
		}

		applied = next;
		logger.info('Reloaded the engine TLS certificate');
	};

	let timer: NodeJS.Timeout | undefined;
	const directories = new Set([files.tlsCertFile, files.tlsKeyFile, files.tlsCaFile].map(dirname));
	const watchers: FSWatcher[] = [];
	for (const directory of directories) {
		try {
			// Not persistent, so the watch alone does not keep the process running.
			const watcher = watch(directory, { persistent: false }, () => {
				clearTimeout(timer);
				timer = setTimeout(reload, debounceMs).unref();
			}).on('error', (error) => {
				logger.error('Stopped watching the engine TLS files', { directory, error });
			});
			watchers.push(watcher);
		} catch (error) {
			for (const watcher of watchers) watcher.close();
			throw new UserError(`Cannot watch ${directory} for changes to ${ALL_ENV_NAMES}`, {
				cause: error,
			});
		}
	}

	return {
		get current() {
			return current;
		},
		subscribe(listener) {
			listeners.add(listener);
			return () => listeners.delete(listener);
		},
		close() {
			clearTimeout(timer);
			for (const watcher of watchers) watcher.close();
		},
	};
}

/**
 * An HTTP server, or with `tls` an HTTPS server that requires a client
 * certificate signed by the engine CA on every path except `/healthz`. It
 * gives new connections the reloaded certificate, and open connections keep
 * the one they started with.
 */
export function createEngineHttpServer(
	handler: RequestListener,
	tls: EngineTlsSource | undefined,
): Server {
	if (!tls) return createHttpServer(handler);

	const server = createHttpsServer(
		{
			...secureContextOptions(tls.current),
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

	const unsubscribe = tls.subscribe((next) => server.setSecureContext(secureContextOptions(next)));
	server.once('close', unsubscribe);

	return server;
}

function secureContextOptions(tls: EngineTls): SecureContextOptions {
	return { ...tls, minVersion: 'TLSv1.2' };
}

function isSameTls(a: EngineTls, b: EngineTls): boolean {
	return a.cert.equals(b.cert) && a.key.equals(b.key) && a.ca.equals(b.ca);
}
