/**
 * Script sandbox for secure script execution.
 *
 * Uses vm2 to execute user scripts in an isolated environment with only
 * the tools and workflow context available. No filesystem, network, or
 * other built-in modules are accessible.
 */

import type { Logger } from '@n8n/backend-common';
import { NodeVM } from 'vm2';

import type { WorkflowOperation } from '@/types/workflow';

import { ScriptExecutionError, ScriptTimeoutError, extractErrorLocation } from './errors';
import type { ScriptTools, WorkflowSnapshot } from './tool-interfaces';

/**
 * Configuration for the script sandbox
 */
export interface ScriptSandboxConfig {
	/** Read-only workflow snapshot */
	workflow: WorkflowSnapshot;
	/** Tool wrappers for script to use */
	tools: ScriptTools;
	/** Optional logger */
	logger?: Logger;
	/** Execution timeout in milliseconds (default: 30000) */
	timeout?: number;
}

/**
 * Result from script execution
 */
export interface ScriptExecutionResult {
	/** Whether execution completed successfully */
	success: boolean;
	/** Workflow operations collected during execution */
	operations: WorkflowOperation[];
	/** Console output captured during execution */
	consoleOutput: string[];
	/** Any return value from the script */
	returnValue?: unknown;
	/** Error if execution failed */
	error?: Error;
}

/**
 * Minimal console interface for script execution
 */
interface ScriptConsole {
	log(...args: unknown[]): void;
	warn(...args: unknown[]): void;
	error(...args: unknown[]): void;
	info(...args: unknown[]): void;
	debug(...args: unknown[]): void;
}

/**
 * Create a console-like object that captures output
 */
function createCapturedConsole(output: string[]): ScriptConsole {
	const formatArgs = (...args: unknown[]): string => {
		return args
			.map((arg) => {
				if (typeof arg === 'string') return arg;
				try {
					return JSON.stringify(arg, null, 2);
				} catch {
					return String(arg);
				}
			})
			.join(' ');
	};

	return {
		log: (...args: unknown[]) => {
			output.push(`[LOG] ${formatArgs(...args)}`);
		},
		warn: (...args: unknown[]) => {
			output.push(`[WARN] ${formatArgs(...args)}`);
		},
		error: (...args: unknown[]) => {
			output.push(`[ERROR] ${formatArgs(...args)}`);
		},
		info: (...args: unknown[]) => {
			output.push(`[INFO] ${formatArgs(...args)}`);
		},
		debug: (...args: unknown[]) => {
			output.push(`[DEBUG] ${formatArgs(...args)}`);
		},
	};
}

/**
 * Execute a script in a sandboxed environment
 */
export async function executeScript(
	script: string,
	config: ScriptSandboxConfig,
	getOperations: () => WorkflowOperation[],
): Promise<ScriptExecutionResult> {
	const { workflow, tools, logger, timeout = 30000 } = config;
	const consoleOutput: string[] = [];
	const capturedConsole = createCapturedConsole(consoleOutput);

	// Create sandbox context with only allowed globals
	const sandboxContext = {
		workflow,
		tools,
		console: capturedConsole,
		// Provide Promise for async/await support
		Promise,
		// Provide setTimeout/setImmediate for async patterns
		setTimeout,
		setImmediate,
		clearTimeout,
		clearImmediate,
	};

	// Create VM with strict isolation
	const vm = new NodeVM({
		console: 'redirect',
		sandbox: sandboxContext,
		require: {
			external: false,
			builtin: [], // No built-in modules allowed
		},
		wasm: false,
		eval: false,
	});

	// Redirect VM console to our captured console
	vm.on('console.log', (...args: unknown[]) => capturedConsole.log(...args));
	vm.on('console.warn', (...args: unknown[]) => capturedConsole.warn(...args));
	vm.on('console.error', (...args: unknown[]) => capturedConsole.error(...args));
	vm.on('console.info', (...args: unknown[]) => capturedConsole.info(...args));

	// Wrap script in async IIFE for await support
	const wrappedScript = `
module.exports = (async function() {
${script}
})();
`;

	try {
		logger?.debug('Executing script in sandbox');

		// Execute with timeout
		const executionPromise = vm.run(wrappedScript, __dirname) as Promise<unknown>;

		const timeoutPromise = new Promise<never>((_, reject) => {
			setTimeout(() => {
				reject(
					new ScriptTimeoutError(timeout, {
						partialOperations: getOperations(),
					}),
				);
			}, timeout);
		});

		const result: unknown = await Promise.race([executionPromise, timeoutPromise]);

		const operations = getOperations();
		logger?.debug(`Script completed successfully with ${operations.length} operations`);

		return {
			success: true,
			operations,
			consoleOutput,
			returnValue: result,
		};
	} catch (error) {
		const operations = getOperations();

		if (error instanceof ScriptTimeoutError) {
			logger?.warn(`Script execution timed out after ${timeout}ms`);
			return {
				success: false,
				operations,
				consoleOutput,
				error,
			};
		}

		// Extract error location from stack trace
		const location = error instanceof Error ? extractErrorLocation(error, script) : undefined;

		const executionError = new ScriptExecutionError(
			error instanceof Error ? error.message : 'Unknown script error',
			{
				location,
				partialOperations: operations,
				consoleOutput,
				originalError: error instanceof Error ? error : undefined,
			},
		);

		logger?.warn('Script execution failed', {
			error: executionError.message,
			line: location?.line,
			operationsCompleted: operations.length,
		});

		return {
			success: false,
			operations,
			consoleOutput,
			error: executionError,
		};
	}
}

/**
 * Validate script syntax without executing it.
 * Wraps the script in an async function to allow top-level await,
 * matching how executeScript actually runs the code.
 */
export function validateScriptSyntax(script: string): { valid: boolean; error?: string } {
	try {
		// Wrap in async function to allow await, matching how executeScript runs code
		// eslint-disable-next-line @typescript-eslint/no-implied-eval
		new Function(`return (async function() {\n${script}\n})();`);
		return { valid: true };
	} catch (error) {
		return {
			valid: false,
			error: error instanceof Error ? error.message : 'Invalid syntax',
		};
	}
}
