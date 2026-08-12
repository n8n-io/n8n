import type { HarnessV1NetworkSandboxSession, HarnessV1SandboxProvider } from '@ai-sdk/harness';
import type {
	Experimental_SandboxProcess as SandboxProcess,
	Experimental_SandboxSession as SandboxSession,
} from '@ai-sdk/provider-utils';
import { type ExecResult, SandboxClient, SandboxServiceError } from '@n8n/sandbox-client';
import { UserError } from 'n8n-workflow';
import { randomUUID } from 'node:crypto';
import { dirname } from 'node:path/posix';

const DEFAULT_WORKING_DIRECTORY = '/home/user/workspace';
const DEFAULT_BRIDGE_PORT = 4000;
const DEFAULT_BRIDGE_LEASE_TTL_MS = 60_000;

export interface N8nHarnessSandboxProviderOptions {
	serviceUrl: string;
	apiKey?: string;
	harness: 'claude-code' | 'codex';
	ownershipEpoch: number;
	claimToken: string;
	bridgePort?: number;
	bridgeLeaseTtlMs?: number;
	bridgeLeaseRetentionMs?: number;
	defaultWorkingDirectory?: string;
}

interface BridgeLease {
	id: string;
	url: string;
}

export class HarnessSessionExpiredError extends UserError {
	constructor() {
		super('This agent session expired. Send your message again to start a new session.');
	}
}

export async function destroyN8nHarnessSandbox(options: {
	serviceUrl: string;
	apiKey?: string;
	sandboxId: string;
}): Promise<void> {
	const client = new SandboxClient({
		baseUrl: options.serviceUrl.replace(/\/+$/, ''),
		apiKey: options.apiKey,
	});
	try {
		await client.deleteSandbox(options.sandboxId);
	} catch (error) {
		if (!(error instanceof SandboxServiceError && error.status === 404)) throw error;
	}
}

type ExecutionEvent =
	| { type: 'started'; seq: number; execId: string }
	| { type: 'stdout'; seq: number; data: string }
	| { type: 'stderr'; seq: number; data: string }
	| {
			type: 'exit';
			seq: number;
			exitCode: number;
	  }
	| { type: 'error'; seq?: number; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null;
}

function parseExecutionEvent(line: string): ExecutionEvent {
	let value: unknown;
	try {
		value = JSON.parse(line);
	} catch {
		throw new SandboxServiceError('Sandbox execution returned an invalid event', 0);
	}
	if (!isRecord(value) || typeof value.type !== 'string') {
		throw new SandboxServiceError('Sandbox execution returned an invalid event', 0);
	}

	const seq = value.seq;
	if (value.type === 'started' && typeof seq === 'number' && typeof value.exec_id === 'string') {
		return { type: 'started', seq, execId: value.exec_id };
	}
	if (value.type === 'stdout' && typeof seq === 'number' && typeof value.data === 'string') {
		return { type: 'stdout', seq, data: value.data };
	}
	if (value.type === 'stderr' && typeof seq === 'number' && typeof value.data === 'string') {
		return { type: 'stderr', seq, data: value.data };
	}
	if (value.type === 'exit' && typeof seq === 'number' && typeof value.exit_code === 'number') {
		return { type: 'exit', seq, exitCode: value.exit_code };
	}
	if (value.type === 'error' && typeof value.error === 'string') {
		return {
			type: 'error',
			error: value.error,
			...(typeof seq === 'number' ? { seq } : {}),
		};
	}

	throw new SandboxServiceError('Sandbox execution returned an invalid event', 0);
}

function parseBridgeLease(value: unknown): BridgeLease {
	if (!isRecord(value)) {
		throw new SandboxServiceError('Sandbox bridge lease response is invalid', 0);
	}
	const id = typeof value.id === 'string' ? value.id : value.lease_id;
	if (typeof id !== 'string' || typeof value.url !== 'string') {
		throw new SandboxServiceError('Sandbox bridge lease response is invalid', 0);
	}
	return { id, url: value.url };
}

async function collectBytes(stream: ReadableStream<Uint8Array>): Promise<Uint8Array> {
	const reader = stream.getReader();
	const chunks: Uint8Array[] = [];
	let length = 0;
	try {
		while (true) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
			length += value.byteLength;
		}
	} finally {
		reader.releaseLock();
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

async function ensureParentDirectory(client: SandboxClient, sandboxId: string, path: string) {
	const parent = dirname(path);
	if (parent !== '.' && parent !== '/') await client.mkdir(sandboxId, parent, true);
}

export function createN8nHarnessSandboxProvider(
	options: N8nHarnessSandboxProviderOptions,
): HarnessV1SandboxProvider {
	const serviceUrl = options.serviceUrl.replace(/\/+$/, '');
	if (!serviceUrl) throw new Error('Sandbox service URL is not configured');

	const client = new SandboxClient({ baseUrl: serviceUrl, apiKey: options.apiKey });
	const bridgePort = options.bridgePort ?? DEFAULT_BRIDGE_PORT;
	const bridgeLeaseTtlMs = options.bridgeLeaseTtlMs ?? DEFAULT_BRIDGE_LEASE_TTL_MS;
	const bridgeLeaseRetentionMs = options.bridgeLeaseRetentionMs;
	const defaultWorkingDirectory = options.defaultWorkingDirectory ?? DEFAULT_WORKING_DIRECTORY;

	const request = async (path: string, init: RequestInit): Promise<Response> => {
		const headers = new Headers(init.headers);
		if (options.apiKey) headers.set('X-Api-Key', options.apiKey);
		if (init.body) headers.set('Content-Type', 'application/json');
		const response = await fetch(`${serviceUrl}${path}`, { ...init, headers });
		if (!response.ok) {
			throw new SandboxServiceError(
				`Sandbox service request failed with status ${response.status}`,
				response.status,
			);
		}
		return response;
	};

	const buildSession = (sandboxId: string): HarnessV1NetworkSandboxSession => {
		let ports: readonly number[] = [bridgePort];
		let bridgeLease: BridgeLease | undefined;
		let bridgeRenewalTimer: NodeJS.Timeout | undefined;
		let bridgeRetentionTimer: NodeJS.Timeout | undefined;
		let destroyed = false;

		const revokeBridgeLease = async () => {
			if (bridgeRenewalTimer) clearInterval(bridgeRenewalTimer);
			if (bridgeRetentionTimer) clearTimeout(bridgeRetentionTimer);
			bridgeRenewalTimer = undefined;
			bridgeRetentionTimer = undefined;
			const lease = bridgeLease;
			bridgeLease = undefined;
			if (!lease) return;
			try {
				await request(
					`/sandboxes/${encodeURIComponent(sandboxId)}/harness-bridge-leases/${encodeURIComponent(lease.id)}`,
					{ method: 'DELETE' },
				);
			} catch (error) {
				if (!(error instanceof SandboxServiceError && error.status === 404)) throw error;
			}
		};

		const destroySandbox = async () => {
			if (destroyed) return;
			destroyed = true;
			let bridgeError: unknown;
			try {
				await revokeBridgeLease();
			} catch (error) {
				bridgeError = error;
			}
			try {
				await client.deleteSandbox(sandboxId);
			} catch (error) {
				if (!(error instanceof SandboxServiceError && error.status === 404)) throw error;
			}
			if (bridgeError instanceof Error) throw bridgeError;
			if (bridgeError !== undefined) {
				throw new Error('Failed to revoke the sandbox bridge lease', { cause: bridgeError });
			}
		};

		const createBridgeLease = async (port: number, abortSignal?: AbortSignal) => {
			if (port !== bridgePort || !ports.includes(port)) {
				throw new Error(`Sandbox bridge port ${port} is not available`);
			}
			if (bridgeLease) return bridgeLease;

			const response = await request(
				`/sandboxes/${encodeURIComponent(sandboxId)}/harness-bridge-leases`,
				{
					method: 'POST',
					signal: abortSignal,
					body: JSON.stringify({
						harness: options.harness,
						port,
						ownership_epoch: options.ownershipEpoch,
						claim_token: options.claimToken,
						ttl_ms: bridgeLeaseTtlMs,
					}),
				},
			);
			bridgeLease = parseBridgeLease(await response.json());

			bridgeRenewalTimer = setInterval(
				() => {
					const lease = bridgeLease;
					if (!lease) return;
					void request(
						`/sandboxes/${encodeURIComponent(sandboxId)}/harness-bridge-leases/${encodeURIComponent(lease.id)}`,
						{
							method: 'PUT',
							body: JSON.stringify({
								ownership_epoch: options.ownershipEpoch,
								claim_token: options.claimToken,
								ttl_ms: bridgeLeaseTtlMs,
							}),
						},
					).catch(() => {});
				},
				Math.max(1000, Math.floor(bridgeLeaseTtlMs / 3)),
			);
			bridgeRenewalTimer.unref();
			if (bridgeLeaseRetentionMs !== undefined) {
				bridgeRetentionTimer = setTimeout(() => {
					if (bridgeRenewalTimer) clearInterval(bridgeRenewalTimer);
					bridgeRenewalTimer = undefined;
				}, bridgeLeaseRetentionMs);
				bridgeRetentionTimer.unref();
			}
			return bridgeLease;
		};

		const spawn = async (
			processOptions: Parameters<SandboxSession['spawn']>[0],
		): Promise<SandboxProcess> => {
			const executionId = randomUUID();
			const processAbort = new AbortController();
			const abortSignal = processOptions.abortSignal
				? AbortSignal.any([processOptions.abortSignal, processAbort.signal])
				: processAbort.signal;
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

			const response = await request(`/sandboxes/${encodeURIComponent(sandboxId)}/executions`, {
				method: 'POST',
				signal: abortSignal,
				body: JSON.stringify({
					command: processOptions.command,
					env: processOptions.env,
					workdir: processOptions.workingDirectory,
					exec_id: executionId,
				}),
			});
			const responseBody = response.body;
			if (!responseBody) throw new SandboxServiceError('Sandbox execution stream is empty', 0);

			const waitPromise = (async () => {
				let buffer = '';
				let lastSequence = -1;
				try {
					const reader = responseBody.getReader();
					const decoder = new TextDecoder();
					while (true) {
						const { done, value } = await reader.read();
						buffer += decoder.decode(value, { stream: !done });
						let newline = buffer.indexOf('\n');
						while (newline >= 0) {
							const line = buffer.slice(0, newline).trim();
							buffer = buffer.slice(newline + 1);
							newline = buffer.indexOf('\n');
							if (!line) continue;
							const event = parseExecutionEvent(line);
							if (event.seq !== undefined) lastSequence = event.seq;
							if (event.type === 'stdout') {
								enqueueBytes(stdoutController, new TextEncoder().encode(event.data));
							} else if (event.type === 'stderr') {
								enqueueBytes(stderrController, new TextEncoder().encode(event.data));
							} else if (event.type === 'error') {
								throw new SandboxServiceError(event.error, 0);
							} else if (event.type === 'exit') {
								return { exitCode: event.exitCode };
							}
						}
						if (done) break;
					}

					const resumed: ExecResult = await client.resumeExecution(
						sandboxId,
						executionId,
						lastSequence >= 0 ? lastSequence : undefined,
					);
					if (resumed.stdout)
						enqueueBytes(stdoutController, new TextEncoder().encode(resumed.stdout));
					if (resumed.stderr)
						enqueueBytes(stderrController, new TextEncoder().encode(resumed.stderr));
					return { exitCode: resumed.exitCode };
				} finally {
					closeStream(stdoutController);
					closeStream(stderrController);
					void client.deleteExecution(sandboxId, executionId).catch(() => {});
				}
			})();
			void waitPromise.catch(() => {});

			return {
				stdout,
				stderr,
				wait: async () => await waitPromise,
				kill: async () => {
					processAbort.abort(new Error('Sandbox process was killed'));
					await client.deleteExecution(sandboxId, executionId).catch(() => {});
				},
			};
		};

		const restrictedSession: SandboxSession = {
			description: `Isolated n8n sandbox. Default working directory: ${defaultWorkingDirectory}.`,
			readFile: async ({ path }) => {
				try {
					return bytesToStream(await client.readFile(sandboxId, path));
				} catch (error) {
					if (error instanceof SandboxServiceError && error.status === 404) return null;
					throw error;
				}
			},
			readBinaryFile: async ({ path }) => {
				try {
					return new Uint8Array(await client.readFile(sandboxId, path));
				} catch (error) {
					if (error instanceof SandboxServiceError && error.status === 404) return null;
					throw error;
				}
			},
			readTextFile: async ({ path, encoding = 'utf-8', startLine, endLine }) => {
				try {
					const content = new TextDecoder(encoding).decode(await client.readFile(sandboxId, path));
					if (startLine === undefined && endLine === undefined) return content;
					const lines = content.split('\n');
					return lines.slice(Math.max(0, (startLine ?? 1) - 1), endLine).join('\n');
				} catch (error) {
					if (error instanceof SandboxServiceError && error.status === 404) return null;
					throw error;
				}
			},
			writeFile: async ({ path, content }) => {
				await ensureParentDirectory(client, sandboxId, path);
				await client.writeFile(sandboxId, path, await collectBytes(content));
			},
			writeBinaryFile: async ({ path, content }) => {
				await ensureParentDirectory(client, sandboxId, path);
				await client.writeFile(sandboxId, path, content);
			},
			writeTextFile: async ({ path, content, encoding = 'utf-8' }) => {
				if (!['utf-8', 'utf8'].includes(encoding.toLowerCase())) {
					throw new Error(`Unsupported sandbox text encoding: ${encoding}`);
				}
				await ensureParentDirectory(client, sandboxId, path);
				await client.writeFile(sandboxId, path, content);
			},
			spawn,
			run: async (processOptions) => {
				const process = await spawn(processOptions);
				const stdout = collectBytes(process.stdout);
				const stderr = collectBytes(process.stderr);
				const result = await process.wait();
				return {
					exitCode: result.exitCode,
					stdout: new TextDecoder().decode(await stdout),
					stderr: new TextDecoder().decode(await stderr),
				};
			},
		};

		return {
			...restrictedSession,
			id: sandboxId,
			defaultWorkingDirectory,
			get ports() {
				return ports;
			},
			getPortUrl: async ({ port }) => (await createBridgeLease(port)).url,
			stop: revokeBridgeLease,
			destroy: destroySandbox,
			setPorts: async (nextPorts, setPortsOptions) => {
				setPortsOptions?.abortSignal?.throwIfAborted();
				if (nextPorts.some((port) => port !== bridgePort)) {
					throw new Error('The n8n harness sandbox exposes only its configured bridge port');
				}
				if (bridgeLease && !nextPorts.includes(bridgePort)) await revokeBridgeLease();
				ports = [...nextPorts];
			},
			restricted: () => restrictedSession,
		};
	};

	return {
		specificationVersion: 'harness-sandbox-v1',
		providerId: 'n8n-sandbox',
		createSession: async ({ sessionId, abortSignal, onFirstCreate } = {}) => {
			abortSignal?.throwIfAborted();
			const sandbox = await client.createSandbox(sessionId ? { id: sessionId } : undefined);
			const session = buildSession(sandbox.id);
			try {
				if (onFirstCreate) await onFirstCreate(session.restricted(), { abortSignal });
			} catch (error) {
				try {
					await session.destroy?.();
				} catch {
					// Preserve the bootstrap error as the actionable failure.
				}
				throw error;
			}
			return session;
		},
		resumeSession: async ({ sessionId, abortSignal }) => {
			abortSignal?.throwIfAborted();
			try {
				await client.getSandbox(sessionId);
			} catch (error) {
				if (error instanceof SandboxServiceError && error.status === 404) {
					throw new HarnessSessionExpiredError();
				}
				throw error;
			}
			return buildSession(sessionId);
		},
	};
}
