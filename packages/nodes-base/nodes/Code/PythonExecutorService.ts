import { exec, spawn } from 'child_process';
import { promises as fs } from 'fs';
import { ApplicationError } from 'n8n-workflow';
import { join } from 'path';
import { promisify } from 'util';

import type {
	IPythonExecutorService,
	PythonExecutionOptions,
	PythonExecutionResult,
} from './types/python-executor.types';

const execAsync = promisify(exec);

export class PythonExecutorService implements IPythonExecutorService {
	private pythonPath: string | null = null;
	private venvBasePath: string | null = null;

	constructor(storagePath: string) {
		this.venvBasePath = join(storagePath, 'python-venvs');
	}

	async executeCode(options: PythonExecutionOptions): Promise<PythonExecutionResult> {
		const startTime = Date.now();

		try {
			// Ensure Python is available
			const pythonCheck = await this.checkPythonAvailability();
			if (!pythonCheck.available) {
				throw new ApplicationError(`Python is not available: ${pythonCheck.error}`);
			}

			// Create temporary script file
			const scriptPath = await this.createTempScript(options.code, options.context);

			// Determine Python executable (virtual env or system)
			const pythonExe = options.venvPath
				? join(options.venvPath, 'bin', 'python')
				: this.pythonPath!;

			// Execute Python script
			const result = await this.executePythonScript(
				pythonExe,
				scriptPath,
				options.timeout || 30000,
			);

			// Clean up temp file
			await fs.unlink(scriptPath).catch(() => {});

			const executionTime = Date.now() - startTime;

			return {
				result: this.parseResult(result.stdout),
				stdout: result.stdout,
				stderr: result.stderr,
				executionTime,
			};
		} catch (error) {
			throw new ApplicationError(
				`Python execution failed: ${error instanceof Error ? error.message : String(error)}`,
				{ cause: error },
			);
		}
	}

	async checkPythonAvailability(): Promise<{
		available: boolean;
		version?: string;
		error?: string;
	}> {
		if (this.pythonPath) {
			const version = await this.getPythonVersion();
			return { available: true, version };
		}

		// Try different Python executables
		const pythonCommands = [
			'python3',
			'python',
			'python3.9',
			'python3.10',
			'python3.11',
			'python3.12',
		];

		for (const cmd of pythonCommands) {
			try {
				const { stdout } = await execAsync(`${cmd} --version`);
				const version = stdout.trim();
				this.pythonPath = cmd;
				return { available: true, version };
			} catch (error) {
				continue;
			}
		}

		return {
			available: false,
			error: 'No Python executable found. Please install Python 3.9+ and ensure it is in PATH.',
		};
	}

	private async getPythonVersion(): Promise<string> {
		if (!this.pythonPath) return 'unknown';

		try {
			const { stdout } = await execAsync(`${this.pythonPath} --version`);
			return stdout.trim();
		} catch {
			return 'unknown';
		}
	}

	private async createTempScript(code: string, context: Record<string, any>): Promise<string> {
		const os = await import('os');
		const tempDir = await fs.mkdtemp(join(os.tmpdir(), 'n8n-python-'));
		const scriptPath = join(tempDir, 'script.py');

		// Prepare context variables as Python code
		const contextSetup = Object.entries(context)
			.map(([key, value]) => `${key} = ${JSON.stringify(value)}`)
			.join('\n');

		// Create the full Python script
		const fullScript = `
import json
import sys
import io

# Context variables
${contextSetup}

# Capture stdout for n8n output
_original_stdout = sys.stdout
_n8n_output = io.StringIO()

def print(*args, **kwargs):
    # Print to captured output
    print(*args, file=_n8n_output, **kwargs)
    # Also print to original stdout for debugging
    print(*args, file=_original_stdout, **kwargs)

# User code
async def __main():
${code
	.split('\n')
	.map((line) => '    ' + line)
	.join('\n')}

# Run the main function
import asyncio
result = None
try:
    if asyncio.iscoroutinefunction(__main):
        result = asyncio.run(__main())
    else:
        result = __main()
except Exception as e:
    result = {"error": str(e), "type": type(e).__name__}

# Output the result as JSON
if result is not None:
    print("__N8N_RESULT_START__")
    print(json.dumps(result, default=str))
    print("__N8N_RESULT_END__")
`;

		await fs.writeFile(scriptPath, fullScript);
		return scriptPath;
	}

	private async executePythonScript(
		pythonExe: string,
		scriptPath: string,
		timeout: number,
	): Promise<{ stdout: string; stderr: string; code: number }> {
		return await new Promise((resolve, reject) => {
			let stdout = '';
			let stderr = '';

			const child = spawn(pythonExe, [scriptPath], {
				env: {
					...process.env,
					PYTHONIOENCODING: 'utf-8',
					PYTHONUNBUFFERED: '1',
				},
			});

			child.stdout?.on('data', (data) => {
				stdout += data.toString();
			});

			child.stderr?.on('data', (data) => {
				stderr += data.toString();
			});

			child.on('close', (code) => {
				resolve({ stdout, stderr, code: code || 0 });
			});

			child.on('error', (error) => {
				reject(new ApplicationError(`Failed to spawn Python process: ${error.message}`));
			});

			// Set timeout
			const timer = setTimeout(() => {
				child.kill('SIGTERM');
				reject(new ApplicationError('Python script execution timed out'));
			}, timeout);

			child.on('close', () => {
				clearTimeout(timer);
			});
		});
	}

	private parseResult(stdout: string): any {
		try {
			// Extract result from stdout
			const startMarker = '__N8N_RESULT_START__';
			const endMarker = '__N8N_RESULT_END__';

			const startIndex = stdout.indexOf(startMarker);
			const endIndex = stdout.indexOf(endMarker);

			if (startIndex !== -1 && endIndex !== -1) {
				const resultJson = stdout.substring(startIndex + startMarker.length, endIndex).trim();

				return JSON.parse(resultJson);
			}

			// If no result markers found, return null
			return null;
		} catch (error) {
			// If parsing fails, return the raw stdout
			return { stdout: stdout.trim() };
		}
	}

	/**
	 * Create or get a virtual environment for package isolation
	 */
	async createVirtualEnvironment(envName: string): Promise<string> {
		if (!this.venvBasePath) {
			throw new ApplicationError('Storage path not configured for virtual environments');
		}

		const venvPath = join(this.venvBasePath, envName);

		try {
			// Check if venv already exists
			await fs.access(join(venvPath, 'bin', 'python'));
			return venvPath;
		} catch {
			// Create new venv
			await fs.mkdir(this.venvBasePath, { recursive: true });
			await execAsync(`${this.pythonPath} -m venv "${venvPath}"`);

			// Upgrade pip
			const pythonExe = join(venvPath, 'bin', 'python');
			await execAsync(`${pythonExe} -m pip install --upgrade pip`);

			return venvPath;
		}
	}

	/**
	 * Install packages in virtual environment
	 */
	async installPackages(venvPath: string, packages: string[]): Promise<void> {
		const pythonExe = join(venvPath, 'bin', 'python');
		const packagesString = packages.join(' ');

		try {
			await execAsync(`${pythonExe} -m pip install ${packagesString}`, {
				timeout: 120000, // 2 minutes timeout for package installation
			});
		} catch (error) {
			throw new ApplicationError(
				`Failed to install Python packages: ${error instanceof Error ? error.message : String(error)}`,
			);
		}
	}
}
