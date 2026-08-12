import type { HarnessV1NetworkSandboxSession, HarnessV1SandboxProvider } from '@ai-sdk/harness';
import type {
	Experimental_SandboxProcess as SandboxProcess,
	Experimental_SandboxSession as SandboxSession,
} from '@ai-sdk/provider-utils';
import type { CreateSandboxFromImageParams, PtyHandle, Resources } from '@daytona/sdk';
import { UserError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';

import { HarnessSessionExpiredError } from './n8n-sandbox-provider';
import { raceWithAbort } from '../sdk/abort';
import { DaytonaFilesystem } from '../workspace/filesystem/daytona-filesystem';
import { DaytonaSandbox, DaytonaSandboxNotFoundError } from '../workspace/sandbox/daytona-sandbox';
import type { Logger } from '../workspace/sandbox/logger';
import { DAYTONA_HOME } from '../workspace/sandbox/workspace-root';

const DEFAULT_BRIDGE_PORT = 4000;
const DEFAULT_PREVIEW_URL_TTL_SECONDS = 3600;
const MAX_PREVIEW_URL_TTL_SECONDS = 24 * 60 * 60;
const DEFAULT_BOOTSTRAP_TIMEOUT_MS = 15 * 60 * 1000;
const DEFAULT_HARNESS_CPU = 2;
const DEFAULT_HARNESS_MEMORY_GIB = 4;
const PNPM_FALLBACK_VERSION = '10.32.1';

export interface DaytonaHarnessSandboxProviderOptions {
	apiKey: string;
	apiUrl?: string;
	harness: 'claude-code' | 'codex';
	bridgePort?: number;
	previewUrlTtlSeconds?: number;
	timeout?: number;
	createTimeoutSeconds?: number;
	bootstrapTimeout?: number;
	image?: CreateSandboxFromImageParams['image'];
	resources?: Pick<Resources, 'cpu' | 'memory'>;
	ephemeral?: boolean;
	autoStopInterval?: number;
	logger?: Logger;
	labels?: Record<string, string>;
}

export async function destroyDaytonaHarnessSandbox(options: {
	apiKey: string;
	apiUrl?: string;
	sandboxId: string;
}): Promise<void> {
	const sandbox = new DaytonaSandbox({
		id: options.sandboxId,
		name: options.sandboxId,
		apiKey: options.apiKey,
		apiUrl: options.apiUrl,
	});
	await sandbox.destroy();
}

async function collectBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
	const chunks: Uint8Array[] = [];
	let length = 0;
	for await (const chunk of stream) {
		chunks.push(chunk);
		length += chunk.byteLength;
	}

	const result = new Uint8Array(length);
	let offset = 0;
	for (const chunk of chunks) {
		result.set(chunk, offset);
		offset += chunk.byteLength;
	}
	return result;
}

function bytesToStream(bytes: Uint8Array): ReadableStream<Uint8Array> {
	return new ReadableStream({
		start(controller) {
			controller.enqueue(bytes);
			controller.close();
		},
	});
}

function enqueueBytes(
	controller: ReadableStreamDefaultController<Uint8Array> | undefined,
	bytes: Uint8Array,
) {
	try {
		controller?.enqueue(bytes);
	} catch {
		return;
	}
}

function closeStream(controller: ReadableStreamDefaultController<Uint8Array> | undefined) {
	try {
		controller?.close();
	} catch {
		return;
	}
}

function isMissingDaytonaFile(error: unknown): boolean {
	return (
		error instanceof Error &&
		(error.name === 'DaytonaFileNotFoundError' ||
			('statusCode' in error && error.statusCode === 404))
	);
}

function withPnpmFallback(command: string): string {
	const match = /^pnpm(?=$|\s)([\s\S]*)$/.exec(command);
	if (!match) return command;
	const args = match[1] ?? '';

	return [
		'if command -v npm >/dev/null 2>&1; then',
		`  npm exec --yes --package=pnpm@${PNPM_FALLBACK_VERSION} -- pnpm${args}`,
		'elif command -v pnpm >/dev/null 2>&1; then',
		`  pnpm${args}`,
		'else',
		'  echo "Harness bootstrap requires Node.js with npm or pnpm" >&2',
		'  exit 127',
		'fi',
	].join('\n');
}

function isPnpmCommand(command: string): boolean {
	return /^pnpm(?=$|\s)/.test(command);
}

function toPortUrl(url: string, protocol: 'http' | 'https' | 'ws' | undefined): string {
	if (protocol === undefined || protocol === 'https') return url;
	const parsed = new URL(url);
	if (protocol === 'ws') {
		parsed.protocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
	} else {
		parsed.protocol = 'http:';
	}
	return parsed.toString();
}

function commandInput(command: string): string {
	return `${command}\nexit $?\n`;
}

function createPtyProcess(
	pty: PtyHandle,
	stdout: ReadableStream<Uint8Array>,
	stderr: ReadableStream<Uint8Array>,
	closeOutputs: () => void,
	abortSignal: AbortSignal,
	processAbort: AbortController,
): SandboxProcess {
	let terminatePromise: Promise<void> | undefined;
	const terminate = async () => {
		terminatePromise ??= pty.kill().catch(() => {});
		await terminatePromise;
	};
	const onAbort = () => {
		terminate().catch(() => undefined);
	};
	abortSignal.addEventListener('abort', onAbort, { once: true });
	if (abortSignal.aborted) onAbort();

	const waitPromise = raceWithAbort(async () => {
		const result = await pty.wait();
		if (result.error) throw new Error(result.error);
		return { exitCode: result.exitCode ?? 1 };
	}, abortSignal).finally(async () => {
		abortSignal.removeEventListener('abort', onAbort);
		closeOutputs();
		await pty.disconnect().catch(() => {});
	});
	waitPromise.catch(() => undefined);

	return {
		stdout,
		stderr,
		wait: async () => await waitPromise,
		kill: async () => {
			if (!processAbort.signal.aborted) {
				processAbort.abort(new Error('Sandbox process was killed'));
			}
			await terminate();
		},
	};
}

export function createDaytonaHarnessSandboxProvider(
	options: DaytonaHarnessSandboxProviderOptions,
): HarnessV1SandboxProvider {
	if (!options.apiKey.trim()) throw new UserError('Daytona API key is not configured');
	const bridgePort = options.bridgePort ?? DEFAULT_BRIDGE_PORT;
	const previewUrlTtlSeconds = Math.min(
		MAX_PREVIEW_URL_TTL_SECONDS,
		Math.max(1, options.previewUrlTtlSeconds ?? DEFAULT_PREVIEW_URL_TTL_SECONDS),
	);
	const resources = {
		cpu: options.resources?.cpu ?? DEFAULT_HARNESS_CPU,
		memory: options.resources?.memory ?? DEFAULT_HARNESS_MEMORY_GIB,
	};
	const bootstrapTimeout = Math.max(
		options.timeout ?? 0,
		options.bootstrapTimeout ?? DEFAULT_BOOTSTRAP_TIMEOUT_MS,
	);

	const createSandbox = (sessionId: string, reconnectOnly = false) =>
		new DaytonaSandbox({
			id: sessionId,
			name: sessionId,
			apiKey: options.apiKey,
			apiUrl: options.apiUrl,
			image: options.image,
			ephemeral: options.ephemeral,
			autoStopInterval: options.autoStopInterval,
			timeout: options.timeout,
			createTimeoutSeconds: options.createTimeoutSeconds,
			resources,
			labels: { ...options.labels, n8n_harness_adapter: options.harness },
			logger: options.logger,
			public: false,
			createStrategyMode: 'direct',
			reconnectOnly,
		});
	const buildSession = async (sandbox: DaytonaSandbox): Promise<HarnessV1NetworkSandboxSession> => {
		const filesystem = new DaytonaFilesystem(sandbox);
		const previewTokens = new Set<string>();
		let ports: readonly number[] = [bridgePort];
		let destroyed = false;
		const defaultWorkingDirectory =
			(await sandbox
				.withSandbox(async (instance) => await instance.getWorkDir())
				.catch(() => undefined)) ?? DAYTONA_HOME;

		const revokePreviewUrls = async () => {
			const tokens = [...previewTokens];
			previewTokens.clear();
			for (const token of tokens) {
				await sandbox
					.withSandbox(async (instance) => await instance.expireSignedPreviewUrl(bridgePort, token))
					.catch(() => {});
			}
		};

		const spawn = async (
			processOptions: Parameters<SandboxSession['spawn']>[0],
		): Promise<SandboxProcess> => {
			const processAbort = new AbortController();
			const abortSignal = processOptions.abortSignal
				? AbortSignal.any([processOptions.abortSignal, processAbort.signal])
				: processAbort.signal;
			abortSignal.throwIfAborted();

			let stdoutController: ReadableStreamDefaultController<Uint8Array> | undefined;
			let stderrController: ReadableStreamDefaultController<Uint8Array> | undefined;
			const stdout = new ReadableStream<Uint8Array>({
				start(controller) {
					stdoutController = controller;
				},
			});
			const stderr = new ReadableStream<Uint8Array>({
				start(controller) {
					stderrController = controller;
				},
			});
			const closeOutputs = () => {
				closeStream(stdoutController);
				closeStream(stderrController);
			};

			let pty: PtyHandle;
			try {
				pty = await sandbox.withSandbox(
					async (instance) =>
						await instance.process.createPty({
							id: `n8n-harness-${randomUUID()}`,
							cwd: processOptions.workingDirectory ?? defaultWorkingDirectory,
							envs: processOptions.env,
							cols: 120,
							rows: 30,
							onData: (data) => enqueueBytes(stdoutController, data),
						}),
					{ abortSignal },
				);
				await pty.waitForConnection();
				await pty.sendInput(commandInput(processOptions.command));
			} catch (error) {
				closeOutputs();
				throw error;
			}

			return createPtyProcess(pty, stdout, stderr, closeOutputs, abortSignal, processAbort);
		};

		const restrictedSession: SandboxSession = {
			description: `Isolated Daytona sandbox. Default working directory: ${defaultWorkingDirectory}.`,
			readFile: async ({ path, abortSignal }) => {
				try {
					const content = await filesystem.readFile(path, { abortSignal });
					return bytesToStream(typeof content === 'string' ? Buffer.from(content) : content);
				} catch (error) {
					if (isMissingDaytonaFile(error)) return null;
					throw error;
				}
			},
			readBinaryFile: async ({ path, abortSignal }) => {
				try {
					const content = await filesystem.readFile(path, { abortSignal });
					return new Uint8Array(typeof content === 'string' ? Buffer.from(content) : content);
				} catch (error) {
					if (isMissingDaytonaFile(error)) return null;
					throw error;
				}
			},
			readTextFile: async ({ path, encoding = 'utf-8', startLine, endLine, abortSignal }) => {
				if (!['utf-8', 'utf8'].includes(encoding.toLowerCase())) {
					throw new Error(`Unsupported sandbox text encoding: ${encoding}`);
				}
				try {
					const content = await filesystem.readFile(path, { encoding: 'utf8', abortSignal });
					const text = typeof content === 'string' ? content : content.toString('utf8');
					if (startLine === undefined && endLine === undefined) return text;
					return text
						.split('\n')
						.slice(Math.max(0, (startLine ?? 1) - 1), endLine)
						.join('\n');
				} catch (error) {
					if (isMissingDaytonaFile(error)) return null;
					throw error;
				}
			},
			writeFile: async ({ path, content, abortSignal }) => {
				await filesystem.writeFile(path, await collectBytes(content), {
					recursive: true,
					abortSignal,
				});
			},
			writeBinaryFile: async ({ path, content, abortSignal }) => {
				await filesystem.writeFile(path, content, { recursive: true, abortSignal });
			},
			writeTextFile: async ({ path, content, encoding = 'utf-8', abortSignal }) => {
				if (!['utf-8', 'utf8'].includes(encoding.toLowerCase())) {
					throw new Error(`Unsupported sandbox text encoding: ${encoding}`);
				}
				await filesystem.writeFile(path, content, { recursive: true, abortSignal });
			},
			spawn,
			run: async (processOptions) => {
				const pnpmCommand = isPnpmCommand(processOptions.command);
				const result = await sandbox.executeCommand(
					'sh',
					['-lc', withPnpmFallback(processOptions.command)],
					{
						cwd: processOptions.workingDirectory,
						env: processOptions.env,
						abortSignal: processOptions.abortSignal,
						timeout: pnpmCommand ? bootstrapTimeout : options.timeout,
					},
				);
				return { exitCode: result.exitCode, stdout: result.stdout, stderr: result.stderr };
			},
		};

		return {
			...restrictedSession,
			id: sandbox.id,
			defaultWorkingDirectory,
			get ports() {
				return ports;
			},
			getPortUrl: async ({ port, protocol }) => {
				if (port !== bridgePort || !ports.includes(port)) {
					throw new Error(`Daytona sandbox bridge port ${port} is not available`);
				}
				const preview = await sandbox.withSandbox(
					async (instance) => await instance.getSignedPreviewUrl(port, previewUrlTtlSeconds),
				);
				previewTokens.add(preview.token);
				return toPortUrl(preview.url, protocol);
			},
			stop: async () => {
				await revokePreviewUrls();
				await sandbox._stop();
			},
			destroy: async () => {
				if (destroyed) return;
				destroyed = true;
				await revokePreviewUrls();
				await sandbox._destroy();
			},
			setPorts: async (nextPorts, setPortsOptions) => {
				setPortsOptions?.abortSignal?.throwIfAborted();
				if (nextPorts.some((port) => port !== bridgePort)) {
					throw new Error('The Daytona harness sandbox exposes only its configured bridge port');
				}
				if (!nextPorts.includes(bridgePort)) await revokePreviewUrls();
				ports = [...nextPorts];
			},
			restricted: () => restrictedSession,
		};
	};

	return {
		specificationVersion: 'harness-sandbox-v1',
		providerId: 'daytona',
		createSession: async ({ sessionId = randomUUID(), abortSignal, onFirstCreate } = {}) => {
			abortSignal?.throwIfAborted();
			const sandbox = createSandbox(sessionId);
			try {
				await sandbox._start();
				const session = await buildSession(sandbox);
				if (onFirstCreate) await onFirstCreate(session.restricted(), { abortSignal });
				return session;
			} catch (error) {
				await sandbox._destroy().catch(() => {});
				throw error;
			}
		},
		resumeSession: async ({ sessionId, abortSignal }) => {
			abortSignal?.throwIfAborted();
			const sandbox = createSandbox(sessionId, true);
			try {
				await sandbox._start();
			} catch (error) {
				if (error instanceof DaytonaSandboxNotFoundError) throw new HarnessSessionExpiredError();
				throw error;
			}
			return await buildSession(sandbox);
		},
	};
}
