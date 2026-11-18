import { type Context, createContext, runInContext } from 'node:vm';

/** Node.js globals that user code can use. A new context lacks them. */
function getNativeGlobals() {
	return {
		Buffer,
		setTimeout,
		setInterval,
		setImmediate,
		clearTimeout,
		clearInterval,
		clearImmediate,
		btoa,
		atob,
		TextDecoder,
		TextDecoderStream,
		TextEncoder,
		TextEncoderStream,
		FormData,
	};
}

/**
 * Isolates the globals and built-ins of a task from other tasks. Objects passed
 * in from the process, e.g. `Buffer` and `globals`, stay shared.
 */
export function createTaskContext(globals: Record<string, unknown> = {}): Context {
	return createContext({ __isExecutionContext: true, ...getNativeGlobals(), ...globals });
}

/** Runs user code as the body of an async function in the context of a task. */
export async function runInTaskContext(code: string, context: Context): Promise<unknown> {
	const source = [
		'globalThis.global = globalThis',
		'var module = { exports: {} }',
		`module.exports = async function VmCodeWrapper() {${code}\n}()`,
	].join('; '); // One line, so error line numbers match the user code

	const result: unknown = runInContext(source, context);
	return await result;
}
