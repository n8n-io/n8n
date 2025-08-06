import { ApplicationError, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';

import { PythonExecutorService } from './PythonExecutorService';
import type { SandboxContext } from './Sandbox';
import { Sandbox } from './Sandbox';

type LocalPythonSandboxContext = {
	[K in keyof SandboxContext as K extends `$${infer I}` ? `_${I}` : K]: SandboxContext[K];
};

const envAccessBlocked = process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE === 'true';

export class LocalPythonSandbox extends Sandbox {
	private readonly context: LocalPythonSandboxContext;

	constructor(
		context: SandboxContext,
		private pythonCode: string,
		helpers: IExecuteFunctions['helpers'],
	) {
		super(
			{
				object: {
					singular: 'dictionary',
					plural: 'dictionaries',
				},
			},
			helpers,
		);
		// Since python doesn't allow variable names starting with `$`,
		// rename them to all to start with `_` instead
		this.context = Object.keys(context).reduce((acc, key) => {
			acc[key.startsWith('$') ? key.replace(/^\$/, '_') : key] = context[key];
			return acc;
		}, {} as LocalPythonSandboxContext);
	}

	async runCode<T = unknown>(): Promise<T> {
		return await this.runCodeInLocalPython<T>();
	}

	async runCodeAllItems() {
		const executionResult = await this.runCodeInLocalPython<INodeExecutionData[]>();
		return this.validateRunCodeAllItems(executionResult);
	}

	async runCodeEachItem(itemIndex: number) {
		const executionResult = await this.runCodeInLocalPython<INodeExecutionData>();
		return this.validateRunCodeEachItem(executionResult, itemIndex);
	}

	private async runCodeInLocalPython<T>() {
		// Create the Python executor service with storage path
		const storagePath = this.helpers.getStoragePath();
		const pythonExecutorService = new PythonExecutorService(storagePath);

		// Prepare context for Python execution
		const executionContext: Record<string, any> = {};

		for (const key of Object.keys(this.context)) {
			if ((key === '_env' && envAccessBlocked) || key === '_node') continue;
			const value = this.context[key];
			executionContext[key] = value;
		}

		try {
			const result = await pythonExecutorService.executeCode({
				code: this.pythonCode,
				context: executionContext,
				timeout: 30000, // 30 second timeout
			});

			// Emit any stdout output
			if (result.stdout) {
				this.emit('output', result.stdout);
			}

			// Check for stderr output and handle warnings/errors
			if (result.stderr) {
				// Log stderr but don't necessarily fail for warnings
				console.warn('Python execution stderr:', result.stderr);
			}

			return result.result as T;
		} catch (error) {
			throw this.getPrettyError(error as Error);
		}
	}

	private getPrettyError(error: Error): Error {
		// Extract Python error information if available
		if (error.message.includes('Python script exited with code')) {
			return new ApplicationError('Python code execution failed', {
				level: 'error',
				cause: error,
			});
		}

		if (error.message.includes('timeout')) {
			return new ApplicationError('Python code execution timed out', {
				level: 'error',
				cause: error,
			});
		}

		// For other errors, try to extract meaningful information
		const errorMessage = error.message || 'Unknown Python execution error';

		return new ApplicationError(errorMessage, {
			level: 'error',
			cause: error,
		});
	}
}
