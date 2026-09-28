/**
 * Shared network guard for every vitest suite.
 *
 * The node and frontend configs add this file to `setupFiles`, so it runs in
 * every worker before each test file. A `globalSetup` cannot do this job: it
 * runs in the main vitest process only, and the forked workers keep full
 * network access.
 *
 * The guard sits below `http`, `fetch`, and database drivers, at the socket.
 * Every TCP connection to a host other than loopback fails with `ENETUNREACH`.
 * Loopback and IPC sockets stay open so a suite can reach a local database or a
 * local server. Nock keeps working: it answers mocked requests before a socket
 * opens, and this guard catches the ones it lets through.
 *
 * A config for tests that must reach real services sets
 * `test.env.N8N_TEST_ALLOW_NETWORK` to `'true'` to skip the guard.
 */
import net from 'node:net';

const LOOPBACK = /^(localhost|127(\.\d{1,3}){3}|::1|::ffff:127(\.\d{1,3}){3}|0\.0\.0\.0|::)$/i;

type LookupCallback = (error: Error | null, address?: unknown, family?: number) => void;
type Lookup = (hostname: string, options: unknown, callback: LookupCallback) => void;

interface ConnectTarget {
	host?: string;
	port?: number | string;
	path?: string;
	lookup?: Lookup;
}

const blockedError = (host: string, port: number | string | undefined) =>
	Object.assign(new Error(`Network access is blocked in unit tests: ${host}:${port}`), {
		code: 'ENETUNREACH',
	});

const isLoopbackAddress = (address: unknown): boolean => {
	if (typeof address === 'string') return LOOPBACK.test(address);
	if (Array.isArray(address)) {
		return address.every((entry: unknown) =>
			isLoopbackAddress(
				typeof entry === 'object' && entry !== null ? Reflect.get(entry, 'address') : entry,
			),
		);
	}
	return false;
};

// A caller-provided `lookup` (the SSRF policy) must still see the hostname, so
// the block moves to the resolved address.
const guardLookup =
	(target: ConnectTarget, lookup: Lookup): Lookup =>
	(hostname, options, callback) =>
		lookup(hostname, options, (error, address, family) => {
			if (error || isLoopbackAddress(address)) return callback(error, address, family);
			callback(blockedError(hostname, target.port));
		});

// Mirrors `net._normalizeArgs`: `http.Agent` passes an already normalized
// `[options, callback]` array, other callers pass `(options)`, `(path)` or
// `(port, host?)`.
function connectTarget(args: unknown[]): ConnectTarget {
	const first: unknown = Array.isArray(args[0]) ? args[0][0] : args[0];
	if (typeof first === 'object' && first !== null) return first as ConnectTarget;
	if (typeof first === 'string') return { path: first };
	return { port: first as number, host: typeof args[1] === 'string' ? args[1] : undefined };
}

const originalConnect = net.Socket.prototype.connect;

// Guard against a second install: setup files re-run for each test file.
const installedFlag = Symbol.for('n8n.vitest.networkGuard');
const allowNetwork = process.env.N8N_TEST_ALLOW_NETWORK === 'true';
if (!allowNetwork && !Reflect.has(net.Socket.prototype, installedFlag)) {
	Reflect.set(net.Socket.prototype, installedFlag, true);
	net.Socket.prototype.connect = function connect(this: net.Socket, ...args: unknown[]) {
		const target = connectTarget(args);
		if (target.path) return Reflect.apply(originalConnect, this, args) as net.Socket;
		const host = target.host ?? 'localhost';
		if (typeof target.lookup === 'function') {
			// A custom lookup can resolve a loopback name to another address, so
			// the block always moves to the resolved address here.
			const guarded = { ...target, lookup: guardLookup(target, target.lookup) };
			// Node owns the normalized array, the caller owns a plain options object.
			if (Array.isArray(args[0])) args[0][0] = guarded;
			else args[0] = guarded;
		} else if (!LOOPBACK.test(host)) {
			// Async, like a real connect failure. A sync throw breaks `tls.connect`.
			process.nextTick(() => this.destroy(blockedError(host, target.port)));
			return this;
		}
		return Reflect.apply(originalConnect, this, args) as net.Socket;
	} as typeof net.Socket.prototype.connect;
}
