'use strict';
var __decorate =
	(this && this.__decorate) ||
	function (decorators, target, key, desc) {
		var c = arguments.length,
			r =
				c < 3
					? target
					: desc === null
						? (desc = Object.getOwnPropertyDescriptor(target, key))
						: desc,
			d;
		if (typeof Reflect === 'object' && typeof Reflect.decorate === 'function')
			r = Reflect.decorate(decorators, target, key, desc);
		else
			for (var i = decorators.length - 1; i >= 0; i--)
				if ((d = decorators[i]))
					r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
		return c > 3 && r && Object.defineProperty(target, key, r), r;
	};
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.PythonExecutorService = void 0;
const child_process_1 = require('child_process');
const promises_1 = require('fs/promises');
const path_1 = require('path');
const crypto_1 = require('crypto');
const util_1 = require('util');
const backend_common_1 = require('@n8n/backend-common');
const di_1 = require('@n8n/di');
const n8n_workflow_1 = require('n8n-workflow');
let PythonExecutorService = class PythonExecutorService {
	constructor(logger) {
		this.logger = logger;
		this.venvCache = new Map();
		this.execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
		this.baseVenvDir = process.env.N8N_PYTHON_VENV_DIR || (0, path_1.join)(process.cwd(), '.venvs');
		this.maxExecutionTime = parseInt(process.env.N8N_PYTHON_MAX_EXECUTION_TIME || '30000', 10);
		this.maxVenvs = parseInt(process.env.N8N_PYTHON_MAX_VENVS || '10', 10);
		this.pythonPath = process.env.N8N_PYTHON_PATH || 'python3';
		this.logger.info('Python Executor Service initialized', {
			baseVenvDir: this.baseVenvDir,
			maxExecutionTime: this.maxExecutionTime,
			maxVenvs: this.maxVenvs,
			pythonPath: this.pythonPath,
		});
	}
	async executeCode(options) {
		const startTime = Date.now();
		const executionId = (0, crypto_1.randomUUID)();
		this.logger.debug('Starting Python code execution', { executionId });
		try {
			const venv = await this.getOrCreateVenv(options.packages || []);
			const scriptPath = await this.createTempScript(executionId, options.code, options.context);
			try {
				const result = await this.executePythonScript(
					venv.pythonPath,
					scriptPath,
					options.timeout || this.maxExecutionTime,
				);
				const executionTime = Date.now() - startTime;
				this.logger.debug('Python code execution completed', {
					executionId,
					executionTime,
				});
				return {
					...result,
					executionTime,
				};
			} finally {
				await this.cleanupTempScript(scriptPath);
			}
		} catch (error) {
			const executionTime = Date.now() - startTime;
			this.logger.error('Python code execution failed', {
				executionId,
				executionTime,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new n8n_workflow_1.ApplicationError('Python execution failed', {
				cause: error,
				extra: { executionId, executionTime },
			});
		}
	}
	async getOrCreateVenv(packages) {
		const venvKey = this.getVenvKey(packages);
		let venv = this.venvCache.get(venvKey);
		if (venv) {
			venv.lastUsed = new Date();
			return venv;
		}
		const venvPath = (0, path_1.join)(this.baseVenvDir, venvKey);
		const pythonPath = (0, path_1.join)(venvPath, 'bin', 'python');
		this.logger.info('Creating new Python virtual environment', {
			venvPath,
			packages,
		});
		try {
			await (0, promises_1.mkdir)((0, path_1.dirname)(venvPath), { recursive: true });
			await this.execFileAsync(this.pythonPath, ['-m', 'venv', venvPath], {
				timeout: 60000,
			});
			if (packages.length > 0) {
				await this.execFileAsync(
					(0, path_1.join)(venvPath, 'bin', 'pip'),
					['install', '--no-cache-dir', ...packages],
					{
						timeout: 300000,
					},
				);
			}
			venv = {
				path: venvPath,
				pythonPath,
				created: new Date(),
				lastUsed: new Date(),
				packages: [...packages],
			};
			this.venvCache.set(venvKey, venv);
			await this.cleanupOldVenvs();
			this.logger.info('Python virtual environment created successfully', {
				venvPath,
				packages,
			});
			return venv;
		} catch (error) {
			this.logger.error('Failed to create Python virtual environment', {
				venvPath,
				packages,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new n8n_workflow_1.ApplicationError('Failed to create Python virtual environment', {
				cause: error,
			});
		}
	}
	async executePythonScript(pythonPath, scriptPath, timeout) {
		return new Promise((resolve, reject) => {
			const executorScript = (0, path_1.join)(
				__dirname,
				'../../../../docker/python-executor/python-executor.py',
			);
			const child = (0, child_process_1.spawn)(pythonPath, [executorScript, scriptPath], {
				timeout,
				stdio: ['pipe', 'pipe', 'pipe'],
				env: {
					...process.env,
					PATH: process.env.PATH,
					PYTHONPATH: '',
					N8N_PYTHON_SANDBOX: 'true',
				},
			});
			let stdout = '';
			let stderr = '';
			child.stdout?.on('data', (data) => {
				stdout += data.toString();
			});
			child.stderr?.on('data', (data) => {
				stderr += data.toString();
			});
			child.on('close', (code) => {
				if (code === 0) {
					try {
						const lines = stdout.trim().split('\n');
						const resultLine = lines.find((line) => line.startsWith('__N8N_RESULT__:'));
						let result;
						if (resultLine) {
							const resultJson = resultLine.replace('__N8N_RESULT__:', '');
							result = JSON.parse(resultJson);
						}
						resolve({
							result,
							stdout: stdout.replace(/^__N8N_RESULT__:.*$/gm, '').trim(),
							stderr,
						});
					} catch (error) {
						reject(
							new n8n_workflow_1.ApplicationError('Failed to parse Python execution result', {
								cause: error,
								extra: { stdout, stderr },
							}),
						);
					}
				} else {
					const errorLines = stderr.trim().split('\n');
					const errorLine = errorLines.find((line) => line.startsWith('__N8N_ERROR__:'));
					if (errorLine) {
						try {
							const errorJson = errorLine.replace('__N8N_ERROR__:', '');
							const errorData = JSON.parse(errorJson);
							reject(
								new n8n_workflow_1.ApplicationError(
									`Python execution error: ${errorData.message}`,
									{
										extra: {
											code,
											stdout,
											stderr,
											pythonError: errorData,
										},
									},
								),
							);
						} catch {
							reject(
								new n8n_workflow_1.ApplicationError(`Python script exited with code ${code}`, {
									extra: { code, stdout, stderr },
								}),
							);
						}
					} else {
						reject(
							new n8n_workflow_1.ApplicationError(`Python script exited with code ${code}`, {
								extra: { code, stdout, stderr },
							}),
						);
					}
				}
			});
			child.on('error', (error) => {
				reject(
					new n8n_workflow_1.ApplicationError('Python script execution error', {
						cause: error,
						extra: { stdout, stderr },
					}),
				);
			});
		});
	}
	async createTempScript(executionId, code, context) {
		const scriptPath = (0, path_1.join)(this.baseVenvDir, `temp_${executionId}.py`);
		const scriptContent = `# N8N_CONTEXT_START
${JSON.stringify(context, null, 2)}
# N8N_CONTEXT_END

# N8N_CODE_START
${code}`;
		await (0, promises_1.writeFile)(scriptPath, scriptContent, 'utf8');
		return scriptPath;
	}
	async cleanupTempScript(scriptPath) {
		try {
			await (0, promises_1.unlink)(scriptPath);
		} catch (error) {
			this.logger.warn('Failed to cleanup temporary Python script', {
				scriptPath,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
	getVenvKey(packages) {
		const sortedPackages = packages.sort();
		const packagesString = sortedPackages.join(',');
		return `venv_${Buffer.from(packagesString)
			.toString('base64')
			.replace(/[^a-zA-Z0-9]/g, '')}`;
	}
	async cleanupOldVenvs() {
		if (this.venvCache.size <= this.maxVenvs) {
			return;
		}
		const venvs = Array.from(this.venvCache.entries()).sort(
			([, a], [, b]) => a.lastUsed.getTime() - b.lastUsed.getTime(),
		);
		const toRemove = venvs.slice(0, venvs.length - this.maxVenvs);
		for (const [key, venv] of toRemove) {
			try {
				this.venvCache.delete(key);
				this.logger.info('Removed old virtual environment from cache', {
					venvPath: venv.path,
					lastUsed: venv.lastUsed,
				});
			} catch (error) {
				this.logger.warn('Failed to cleanup old virtual environment', {
					venvPath: venv.path,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}
	async checkPythonAvailability() {
		try {
			const { stdout } = await this.execFileAsync(this.pythonPath, ['--version'], {
				timeout: 5000,
			});
			return {
				available: true,
				version: stdout.trim(),
			};
		} catch (error) {
			return {
				available: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	}
	getVenvStats() {
		return {
			total: this.venvCache.size,
			maxAllowed: this.maxVenvs,
			environments: Array.from(this.venvCache.entries()).map(([key, venv]) => ({
				key,
				created: venv.created,
				lastUsed: venv.lastUsed,
				packages: venv.packages,
			})),
		};
	}
};
exports.PythonExecutorService = PythonExecutorService;
exports.PythonExecutorService = PythonExecutorService = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [backend_common_1.Logger])],
	PythonExecutorService,
);
//# sourceMappingURL=python-executor.service.js.map
