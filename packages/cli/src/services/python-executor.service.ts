import { execFile, spawn } from 'child_process';
import { writeFile, mkdir, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { randomUUID } from 'crypto';
import { promisify } from 'util';
import { Logger } from '@n8n/backend-common';
import { Service } from '@n8n/di';
import { ApplicationError } from 'n8n-workflow';

interface PythonExecutionOptions {
	code: string;
	context: Record<string, any>;
	timeout?: number;
	venvPath?: string;
	packages?: string[];
}

interface PythonExecutionResult {
	result: any;
	stdout: string;
	stderr: string;
	executionTime: number;
}

interface VirtualEnvironment {
	path: string;
	pythonPath: string;
	created: Date;
	lastUsed: Date;
	packages: string[];
}

@Service()
export class PythonExecutorService {
	private readonly venvCache = new Map<string, VirtualEnvironment>();
	private readonly execFileAsync = promisify(execFile);
	private readonly baseVenvDir: string;
	private readonly maxExecutionTime: number;
	private readonly maxVenvs: number;
	private readonly pythonPath: string;

	constructor(private readonly logger: Logger) {
		// Configuration from environment variables
		this.baseVenvDir = process.env.N8N_PYTHON_VENV_DIR || join(process.cwd(), '.venvs');
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

	/**
	 * Execute Python code in a secure virtual environment
	 */
	async executeCode(options: PythonExecutionOptions): Promise<PythonExecutionResult> {
		const startTime = Date.now();
		const executionId = randomUUID();

		this.logger.debug('Starting Python code execution', { executionId });

		try {
			// Get or create virtual environment
			const venv = await this.getOrCreateVenv(options.packages || []);

			// Create temporary Python script
			const scriptPath = await this.createTempScript(executionId, options.code, options.context);

			try {
				// Execute Python script in the virtual environment
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
				// Clean up temporary script
				await this.cleanupTempScript(scriptPath);
			}
		} catch (error) {
			const executionTime = Date.now() - startTime;

			this.logger.error('Python code execution failed', {
				executionId,
				executionTime,
				error: error instanceof Error ? error.message : String(error),
			});

			throw new ApplicationError('Python execution failed', {
				cause: error,
				extra: { executionId, executionTime },
			});
		}
	}

	/**
	 * Get or create a virtual environment with specified packages
	 */
	private async getOrCreateVenv(packages: string[]): Promise<VirtualEnvironment> {
		const venvKey = this.getVenvKey(packages);

		let venv = this.venvCache.get(venvKey);

		if (venv) {
			venv.lastUsed = new Date();
			return venv;
		}

		// Create new virtual environment
		const venvPath = join(this.baseVenvDir, venvKey);
		const pythonPath = join(venvPath, 'bin', 'python');

		this.logger.info('Creating new Python virtual environment', {
			venvPath,
			packages,
		});

		try {
			// Ensure base directory exists
			await mkdir(dirname(venvPath), { recursive: true });

			// Create virtual environment
			await this.execFileAsync(this.pythonPath, ['-m', 'venv', venvPath], {
				timeout: 60000, // 1 minute timeout for venv creation
			});

			// Install required packages
			if (packages.length > 0) {
				await this.execFileAsync(
					join(venvPath, 'bin', 'pip'),
					['install', '--no-cache-dir', ...packages],
					{
						timeout: 300000, // 5 minutes timeout for package installation
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

			// Cache the virtual environment
			this.venvCache.set(venvKey, venv);

			// Clean up old virtual environments if we have too many
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
			throw new ApplicationError('Failed to create Python virtual environment', {
				cause: error,
			});
		}
	}

	/**
	 * Execute Python script in the specified virtual environment
	 */
	private async executePythonScript(
		pythonPath: string,
		scriptPath: string,
		timeout: number,
	): Promise<{ result: any; stdout: string; stderr: string }> {
		return new Promise((resolve, reject) => {
			// Use the secure Python executor script
			const executorScript = join(
				__dirname,
				'../../../../docker/python-executor/python-executor.py',
			);
			const child = spawn(pythonPath, [executorScript, scriptPath], {
				timeout,
				stdio: ['pipe', 'pipe', 'pipe'],
				env: {
					...process.env,
					// Remove potentially dangerous environment variables
					PATH: process.env.PATH,
					PYTHONPATH: '', // Clear PYTHONPATH to prevent access to system packages
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
						// Parse the result from stdout
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
							new ApplicationError('Failed to parse Python execution result', {
								cause: error,
								extra: { stdout, stderr },
							}),
						);
					}
				} else {
					// Check for structured error in stderr
					const errorLines = stderr.trim().split('\n');
					const errorLine = errorLines.find((line) => line.startsWith('__N8N_ERROR__:'));

					if (errorLine) {
						try {
							const errorJson = errorLine.replace('__N8N_ERROR__:', '');
							const errorData = JSON.parse(errorJson);
							reject(
								new ApplicationError(`Python execution error: ${errorData.message}`, {
									extra: {
										code,
										stdout,
										stderr,
										pythonError: errorData,
									},
								}),
							);
						} catch {
							// Fall back to generic error
							reject(
								new ApplicationError(`Python script exited with code ${code}`, {
									extra: { code, stdout, stderr },
								}),
							);
						}
					} else {
						reject(
							new ApplicationError(`Python script exited with code ${code}`, {
								extra: { code, stdout, stderr },
							}),
						);
					}
				}
			});

			child.on('error', (error) => {
				reject(
					new ApplicationError('Python script execution error', {
						cause: error,
						extra: { stdout, stderr },
					}),
				);
			});
		});
	}

	/**
	 * Create a temporary Python script with the provided code and context
	 */
	private async createTempScript(
		executionId: string,
		code: string,
		context: Record<string, any>,
	): Promise<string> {
		const scriptPath = join(this.baseVenvDir, `temp_${executionId}.py`);

		// Create Python script with structured format for the executor
		const scriptContent = `# N8N_CONTEXT_START
${JSON.stringify(context, null, 2)}
# N8N_CONTEXT_END

# N8N_CODE_START
${code}`;

		await writeFile(scriptPath, scriptContent, 'utf8');
		return scriptPath;
	}

	/**
	 * Clean up temporary script file
	 */
	private async cleanupTempScript(scriptPath: string): Promise<void> {
		try {
			await unlink(scriptPath);
		} catch (error) {
			this.logger.warn('Failed to cleanup temporary Python script', {
				scriptPath,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	/**
	 * Generate a unique key for virtual environment based on packages
	 */
	private getVenvKey(packages: string[]): string {
		const sortedPackages = packages.sort();
		const packagesString = sortedPackages.join(',');
		return `venv_${Buffer.from(packagesString)
			.toString('base64')
			.replace(/[^a-zA-Z0-9]/g, '')}`;
	}

	/**
	 * Clean up old unused virtual environments
	 */
	private async cleanupOldVenvs(): Promise<void> {
		if (this.venvCache.size <= this.maxVenvs) {
			return;
		}

		// Sort by last used date and remove oldest ones
		const venvs = Array.from(this.venvCache.entries()).sort(
			([, a], [, b]) => a.lastUsed.getTime() - b.lastUsed.getTime(),
		);

		const toRemove = venvs.slice(0, venvs.length - this.maxVenvs);

		for (const [key, venv] of toRemove) {
			try {
				// Remove from cache
				this.venvCache.delete(key);

				// TODO: Remove actual directory (requires careful implementation)
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

	/**
	 * Check if Python is available on the system
	 */
	async checkPythonAvailability(): Promise<{
		available: boolean;
		version?: string;
		error?: string;
	}> {
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

	/**
	 * Get virtual environment statistics
	 */
	getVenvStats(): {
		total: number;
		maxAllowed: number;
		environments: Array<{
			key: string;
			created: Date;
			lastUsed: Date;
			packages: string[];
		}>;
	} {
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
}
