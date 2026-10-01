import { execFile } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const CHILD_PROCESS_TIMEOUT_MS = 20_000;
const TEST_TIMEOUT_MS = 25_000;

const HARDENING_MODULE = path.resolve(__dirname, '../prototype-hardening.ts');
const HEALTH_CHECK_MODULE = path.resolve(__dirname, '../../health-check-server.ts');

/**
 * Run a script in a throwaway process, because `freezeGlobals` mutates
 * process-wide prototypes and would wreck the Vitest worker. Node's type
 * stripping loads the hardening module straight from source.
 */
const runInChildProcess = async (body: string, harden: boolean) => {
	const script = `
		import { EventEmitter } from 'node:events';
		import { registerHooks } from 'node:module';
		import { Stream } from 'node:stream';
		import { Socket } from 'node:net';
		import { get } from 'node:http';
		${harden ? `import { freezeGlobals } from ${JSON.stringify(HARDENING_MODULE)};\nfreezeGlobals();` : ''}

		const evil = function evil() { return 'pwned'; };

		${body}
	`;

	const dir = await mkdtemp(path.join(tmpdir(), 'n8n-hardening-'));
	const scriptPath = path.join(dir, 'hardening-probe.mts');
	try {
		await writeFile(scriptPath, script);

		const { stdout } = await execFileAsync(process.execPath, ['--no-warnings', scriptPath], {
			timeout: CHILD_PROCESS_TIMEOUT_MS,
		});

		return stdout;
	} finally {
		await rm(dir, { recursive: true, force: true });
	}
};

/** Serve a single request through the runner's real health check server. */
const SERVE_ONE_REQUEST = `
	registerHooks({
		resolve(specifier, context, nextResolve) {
			if (specifier === 'n8n-workflow') {
				return {
					shortCircuit: true,
					url: 'data:text/javascript,export class OperationalError extends Error {}',
				};
			}
			return nextResolve(specifier, context);
		},
	});
	const { HealthCheckServer } = await import(${JSON.stringify(HEALTH_CHECK_MODULE)});
	const server = new HealthCheckServer();
	await server.start('127.0.0.1', 0);
	const address = server.server.address();
	const status = await new Promise((resolve, reject) => {
		get('http://127.0.0.1:' + address.port + '/healthz', (res) => {
			res.resume();
			res.on('end', () => resolve(res.statusCode));
		}).on('error', reject);
	});
	console.log('status:' + status);
	await server.stop();
`;

/**
 * Each probe throws when the write is refused outright and returns `false`
 * when it is silently dropped; either way the prototype stayed intact.
 */
const PROBES = `
	const probe = (label, attempt) => {
		try {
			console.log(label + ':' + (attempt() ? 'allowed' : 'blocked'));
		} catch {
			console.log(label + ':blocked');
		}
	};

	probe('ee-emit', () => { EventEmitter.prototype.emit = evil; return EventEmitter.prototype.emit === evil; });
	probe('ee-prepend', () => { EventEmitter.prototype.prependListener = evil; return EventEmitter.prototype.prependListener === evil; });
	probe('stream-prepend', () => { Stream.prototype.prependListener = evil; return Stream.prototype.prependListener === evil; });
	probe('socket-prepend', () => { Socket.prototype.prependListener = evil; return Socket.prototype.prependListener === evil; });
	probe('ee-emit-delete', () => { delete EventEmitter.prototype.emit; return EventEmitter.prototype.emit !== evil && !Object.hasOwn(EventEmitter.prototype, 'emit'); });
	probe('process-emit', () => {
		const original = process.emit;
		process.emit = evil;
		const shadowed = process.emit === evil;
		if (shadowed) Object.defineProperty(process, 'emit', { value: original, writable: true, configurable: true, enumerable: true });
		return shadowed;
	});

	const replacement = function replacement() {};

	const typedArrayPrototype = Object.getPrototypeOf(Uint8Array.prototype);
	probe('typedarray-set', () => { typedArrayPrototype.set = replacement; return typedArrayPrototype.set === replacement; });
	probe('typedarray-length', () => {
		Object.defineProperty(typedArrayPrototype, 'length', { get: replacement, configurable: true });
		return Object.getOwnPropertyDescriptor(typedArrayPrototype, 'length').get === replacement;
	});

	const timer = setTimeout(() => {}, 1_000);
	clearTimeout(timer);
	const timeoutPrototype = Object.getPrototypeOf(timer);
	probe('timeout-refresh', () => { timeoutPrototype.refresh = replacement; return timeoutPrototype.refresh === replacement; });
`;

const REACHABILITY_ASSERTION = `
	const collected = new Set();
	const isFreezable = (value) => value !== null && (typeof value === 'object' || typeof value === 'function');
	const collect = (value) => {
		let current = value;
		while (isFreezable(current) && !collected.has(current)) {
			collected.add(current);
			current = Object.getPrototypeOf(current);
		}
	};

	const timeout = setTimeout(() => {}, 0);
	clearTimeout(timeout);
	const immediate = setImmediate(() => {});
	clearImmediate(immediate);
	function* generatorFunction() {}
	async function* asyncGeneratorFunction() {}
	async function asyncFunction() {}

	const globalFunctions = Object.getOwnPropertyNames(globalThis)
		.map((name) => Reflect.get(globalThis, name))
		.filter((value) => typeof value === 'function');

	for (const globalFunction of globalFunctions) {
		collect(Object.getPrototypeOf(globalFunction));
		collect(globalFunction.prototype);
	}

	const samples = [
		timeout, immediate,
		generatorFunction, asyncGeneratorFunction, asyncFunction,
		[][Symbol.iterator](), [].values().map((value) => value),
		''[Symbol.iterator](),
		new Map()[Symbol.iterator](), new Set()[Symbol.iterator](),
		new FormData().entries(),
	];

	for (const sample of samples) {
		const prototype = Object.getPrototypeOf(sample);
		collect(prototype);
		if (isFreezable(prototype)) collect(prototype.prototype);
	}

	collected.delete(EventEmitter.prototype);

	const extensible = [...collected].filter((value) => Object.isExtensible(value));
	console.log('extensible:' + extensible.map((value) => value?.constructor?.name ?? 'anonymous').join(','));

	const eventEmitterLocked = ['emit', 'on', 'once', 'addListener', 'prependListener', 'prependOnceListener']
		.every((method) => Object.getOwnPropertyDescriptor(EventEmitter.prototype, method).writable === false);
	console.log('ee-locked:' + eventEmitterLocked);
`;

describe('freezeGlobals', { timeout: TEST_TIMEOUT_MS }, () => {
	let probeOutput: string;

	beforeAll(async () => {
		probeOutput = await runInChildProcess(PROBES, true);
	}, TEST_TIMEOUT_MS);

	it('serves an HTTP request in a process that has not been hardened', async () => {
		const stdout = await runInChildProcess(SERVE_ONE_REQUEST, false);

		expect(stdout).toContain('status:200');
	});

	// CAT-3995: Node's HTTP server assigns `prependListener` on every inbound
	// socket, which used to hit the locked `EventEmitter.prototype` property and
	// crash the runner on every health check probe.
	it('serves an HTTP request in a hardened process', async () => {
		const stdout = await runInChildProcess(SERVE_ONE_REQUEST, true);

		expect(stdout).toContain('status:200');
	});

	it('keeps the shared prototypes sealed against sandboxed code', () => {
		expect(probeOutput).toContain('ee-emit:blocked');
		expect(probeOutput).toContain('ee-prepend:blocked');
		expect(probeOutput).toContain('ee-emit-delete:blocked');
		expect(probeOutput).toContain('process-emit:blocked');
		expect(probeOutput).toContain('stream-prepend:blocked');
		expect(probeOutput).toContain('socket-prepend:blocked');
	});

	it('keeps prototypes with no globalThis binding sealed against sandboxed code', () => {
		expect(probeOutput).toContain('typedarray-set:blocked');
		expect(probeOutput).toContain('typedarray-length:blocked');
		expect(probeOutput).toContain('timeout-refresh:blocked');
	});

	it('leaves no prototype reachable from a global extensible, apart from the method-locked one', async () => {
		const stdout = await runInChildProcess(REACHABILITY_ASSERTION, true);

		expect(stdout).toContain('extensible:\n');
		expect(stdout).toContain('ee-locked:true');
	});
});
