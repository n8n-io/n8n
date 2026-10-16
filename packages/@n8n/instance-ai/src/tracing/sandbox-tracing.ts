import { AsyncLocalStorage } from 'node:async_hooks';
import { posix } from 'node:path';

import type { InstanceAiTraceRunFinishOptions } from '../types';

const ioTraceScope = new AsyncLocalStorage<boolean>();

interface SandboxTraceOptions<T> {
	inputs?: Record<string, unknown>;
	/** Batch spans summarize file transfers. I/O spans suppress transport details. */
	kind?: 'batch' | 'io';
	processResult?: (
		result: T,
	) => InstanceAiTraceRunFinishOptions | Promise<InstanceAiTraceRunFinishOptions>;
}

export async function traceSandboxOperation<T>(
	operation: string,
	options: SandboxTraceOptions<T>,
	fn: () => Promise<T>,
): Promise<T> {
	if (options.kind === 'io' && ioTraceScope.getStore()) return await fn();

	let tracing: typeof import('./langsmith-tracing');
	try {
		tracing = await import('./langsmith-tracing.js');
	} catch {
		return await fn();
	}
	return await tracing.withCurrentTraceSpan(
		{
			name: `sandbox: ${operation}`,
			canonicalName: `instance-ai.sandbox.${operation}`,
			tags: ['sandbox'],
			metadata: { sandbox_operation: operation },
			inputs: options.inputs,
			processResult: options.processResult,
		},
		async () => (options.kind ? await ioTraceScope.run(true, fn) : await fn()),
	);
}

export function sandboxTracePath(path: string, root?: string): string {
	return root && posix.isAbsolute(path) ? posix.relative(root, path) : path;
}

export function sandboxFileBytes(content: string | Uint8Array): number {
	return typeof content === 'string' ? Buffer.byteLength(content, 'utf8') : content.byteLength;
}

export async function sandboxCommandTraceResult(result: {
	exitCode: number;
	stdout: string;
	stderr: string;
	timedOut?: boolean;
	killed?: boolean;
}): Promise<InstanceAiTraceRunFinishOptions> {
	const error = result.timedOut
		? 'Command timed out'
		: result.killed
			? 'Command was killed'
			: undefined;
	const includeDiagnostics = result.exitCode !== 0 || error !== undefined;
	const { scrubTelemetryText } = await import('./trace-payloads.js');
	return {
		outputs: {
			exitCode: result.exitCode,
			timedOut: result.timedOut ?? false,
			killed: result.killed ?? false,
			stdoutBytes: sandboxFileBytes(result.stdout),
			stderrBytes: sandboxFileBytes(result.stderr),
			...(includeDiagnostics
				? {
						stdout: scrubTelemetryText(result.stdout).slice(0, 2000),
						stderr: scrubTelemetryText(result.stderr).slice(0, 2000),
					}
				: {}),
		},
		...(error ? { error } : {}),
	};
}
