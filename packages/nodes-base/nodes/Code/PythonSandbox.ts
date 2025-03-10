import * as fs from 'fs';
import { ApplicationError, type IExecuteFunctions, type INodeExecutionData } from 'n8n-workflow';
import * as path from 'path';
import { Worker } from 'worker_threads';

import type { SandboxContext } from './Sandbox';
import { Sandbox } from './Sandbox';

type PythonSandboxContext = {
	[K in keyof SandboxContext as K extends `$${infer I}` ? `_${I}` : K]: SandboxContext[K];
};

type PyodideError = Error & { type: string };

const envAccessBlocked = process.env.N8N_BLOCK_ENV_ACCESS_IN_NODE === 'true';

export class PythonSandbox extends Sandbox {
	private readonly context: PythonSandboxContext;

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
		}, {} as PythonSandboxContext);
	}

	async runCode<T = unknown>(): Promise<T> {
		return await this.runCodeInPython<T>();
	}

	async runCodeAllItems() {
		const executionResult = await this.runCodeInPython<INodeExecutionData[]>();
		return this.validateRunCodeAllItems(executionResult);
	}

	async runCodeEachItem(itemIndex: number) {
		const executionResult = await this.runCodeInPython<INodeExecutionData>();
		return this.validateRunCodeEachItem(executionResult, itemIndex);
	}

	private async runCodeInPython<T>() {
		const workerFilePath = await this.createWorkerFile();

		try {
			return await this.executePythonInWorker<T>(workerFilePath);
		} catch (error) {
			throw this.getPrettyError(error as PyodideError);
		} finally {
			// Clean up the temporary worker file
			try {
				fs.unlinkSync(workerFilePath);
			} catch (e) {
				console.error('Failed to delete temporary worker file:', e);
			}
		}
	}

	/**
	 * Creates a temporary worker file for Python code execution
	 */
	private async createWorkerFile(): Promise<string> {
		const packageCacheDir = this.helpers.getStoragePath();
		const tempDir = path.join(packageCacheDir, 'workers');

		if (!fs.existsSync(tempDir)) {
			fs.mkdirSync(tempDir, { recursive: true });
		}

		const workerFilePath = path.join(tempDir, `python-worker-${Date.now()}.js`);

		fs.writeFileSync(workerFilePath, this.generateWorkerCode());

		return workerFilePath;
	}

	/**
	 * Generates the worker thread code for Python execution
	 */
	private generateWorkerCode(): string {
		return `
			const { parentPort, workerData } = require('worker_threads');
			const { pythonCode, context, packageCacheDir } = workerData;

			async function runPython() {
				try {
					const { LoadPyodide } = require('${path.resolve(__dirname, './Pyodide.js')}');
					const pyodide = await LoadPyodide(packageCacheDir);

					await pyodide.runPythonAsync('jsproxy_typedict[0] = type(Object.new().as_object_map())');
					await pyodide.loadPackagesFromImports(pythonCode);

					const globalsDict = pyodide.globals.get('dict')();
					for (const [key, value] of Object.entries(context)) {
						if ((key === '_env' && ${envAccessBlocked}) || key === '_node') continue;
						globalsDict.set(key, value);
					}

					const indentedCode = pythonCode.split('\\n').map(line => '  ' + line).join('\\n');
					const result = await pyodide.runPythonAsync(
						\`async def __main():\n\${indentedCode}\nawait __main()\`,
						{ globals: globalsDict }
					);

					const jsResult = result?.toJs ?
						result.toJs({ dict_converter: Object.fromEntries, create_proxies: false }) :
						result;
					// Clean up
					globalsDict.destroy();

					// Send result back to main thread
					parentPort.postMessage({ success: true, result: jsResult });
				} catch (error) {
					// Send error back to main thread
					parentPort.postMessage({
						success: false,
						error: error.message,
						type: error.type || 'Error'
					});
				}
			}

			runPython();
		`;
	}

	private async executePythonInWorker<T>(workerFilePath: string): Promise<T> {
		return await new Promise((resolve, reject) => {
			try {
				function sanitizeForWorker(input: any, seen = new WeakMap()) {
					if (typeof input !== 'object' || input === null) {
						if (typeof input === 'function' || typeof input === 'symbol') {
							return undefined;
						}
						return input;
					}

					// Handle circular references: if we've seen this object, return the same reference
					if (seen.has(input)) {
						return seen.get(input);
					}

					let output: any;

					if (Array.isArray(input)) {
						output = [];
						// Mark the object as seen before recursing
						seen.set(input, output);
						for (const item of input) {
							const sanitizedItem = sanitizeForWorker(item, seen);
							if (sanitizedItem !== undefined) {
								output.push(sanitizedItem);
							}
						}
						return output;
					}

					output = {};
					seen.set(input, output);
					for (const key in input) {
						if (Object.prototype.hasOwnProperty.call(input, key)) {
							const value = input[key];
							// If the value is non-cloneable, skip it
							if (typeof value === 'function' || typeof value === 'symbol') {
								continue;
							}
							const sanitizedValue = sanitizeForWorker(value, seen);
							if (sanitizedValue !== undefined) {
								output[key] = sanitizedValue;
							}
						}
					}

					return output;
				}

				const worker = new Worker(workerFilePath, {
					workerData: {
						pythonCode: this.pythonCode,
						context: sanitizeForWorker(this.context),
						packageCacheDir: this.helpers.getStoragePath(),
					},
				});

				console.log('before on message');
				worker.on('message', (data) => {
					console.log('on message', data);
					if (data.success) {
						resolve(data.result as T);
					} else {
						const error = new Error(data.error);
						(error as PyodideError).type = data.type;
						reject(error);
					}
				});

				worker.on('error', (error) => {
					reject(error);
				});

				worker.on('exit', (code) => {
					if (code !== 0 && code !== null) {
						reject(new Error(`Worker stopped with exit code ${code}`));
					}
				});
			} catch (error) {
				reject(error);
			}
		});
	}

	private getPrettyError(error: PyodideError): Error {
		const errorTypeIndex = error.message.indexOf(error.type);
		if (errorTypeIndex !== -1) {
			return new ApplicationError(error.message.slice(errorTypeIndex), {
				level: ['TypeError', 'AttributeError'].includes(error.type) ? 'warning' : 'error',
			});
		}

		return error;
	}
}
