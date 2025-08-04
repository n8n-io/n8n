import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import { ApplicationError } from 'n8n-workflow';
import { spawn, execFile } from 'child_process';
import { promisify } from 'util';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import type { PythonExecutionOptions, PythonExecutionResult } from '../types/python-executor.types';

interface SecurityConfig {
	maxExecutionTime: number;
	maxMemoryMB: number;
	maxCpuPercent: number;
	allowedPackages: string[];
	blockedPackages: string[];
	networkAccess: boolean;
	fileSystemAccess: {
		allowRead: string[];
		allowWrite: string[];
		blocked: string[];
	};
	dockerImage: string;
	maxConcurrentExecutions: number;
}

interface SecurityContext {
	executionId: string;
	workspaceDir: string;
	userId: string;
	timestamp: Date;
	restrictions: SecurityRestrictions;
}

interface SecurityRestrictions {
	timeout: number;
	memory: number;
	cpu: number;
	networkAllowed: boolean;
	allowedPaths: string[];
	blockedOperations: string[];
}

interface ExecutionAuditLog {
	executionId: string;
	userId: string;
	code: string;
	packages: string[];
	duration: number;
	exitCode: number;
	resourceUsage: {
		maxMemory: number;
		cpuTime: number;
	};
	securityViolations: string[];
	timestamp: Date;
}

@Service()
export class PythonSandboxService {
	private readonly execFileAsync = promisify(execFile);
	private readonly securityConfig: SecurityConfig;
	private readonly auditLogs: ExecutionAuditLog[] = [];
	private readonly activeExecutions = new Map<string, NodeJS.Timeout>();

	constructor(private readonly logger: Logger) {
		this.securityConfig = this.loadSecurityConfig();
		this.validateDockerAvailability();
	}

	/**
	 * Execute Python code in a secure Docker sandbox
	 */
	async executeSecurely(
		options: PythonExecutionOptions,
		userId: string,
	): Promise<PythonExecutionResult> {
		const executionId = randomUUID();
		const startTime = Date.now();

		this.logger.info('Starting secure Python execution', {
			executionId,
			userId,
			packages: options.packages || [],
		});

		// Check concurrent execution limits
		if (this.activeExecutions.size >= this.securityConfig.maxConcurrentExecutions) {
			throw new ApplicationError('Maximum concurrent Python executions reached', {
				extra: { limit: this.securityConfig.maxConcurrentExecutions },
			});
		}

		// Create security context
		const securityContext = await this.createSecurityContext(executionId, userId, options);

		// Set up execution timeout
		const timeoutHandle = setTimeout(() => {
			this.terminateExecution(executionId);
		}, securityContext.restrictions.timeout);

		this.activeExecutions.set(executionId, timeoutHandle);

		try {
			// Validate code security
			await this.validateCodeSecurity(options.code, securityContext);

			// Validate packages
			await this.validatePackages(options.packages || [], securityContext);

			// Create secure workspace
			const workspaceDir = await this.createSecureWorkspace(executionId);
			securityContext.workspaceDir = workspaceDir;

			// Execute in Docker sandbox
			const result = await this.executeInDockerSandbox(options, securityContext);

			// Log successful execution
			await this.auditExecution(securityContext, result, null);

			return {
				...result,
				executionTime: Date.now() - startTime,
			};
		} catch (error) {
			// Log failed execution
			await this.auditExecution(securityContext, null, error as Error);
			throw error;
		} finally {
			// Cleanup
			clearTimeout(timeoutHandle);
			this.activeExecutions.delete(executionId);
			await this.cleanupWorkspace(securityContext.workspaceDir);
		}
	}

	/**
	 * Load security configuration from environment and config file
	 */
	private loadSecurityConfig(): SecurityConfig {
		const defaultConfig: SecurityConfig = {
			maxExecutionTime: parseInt(process.env.N8N_PYTHON_MAX_EXECUTION_TIME || '30000', 10),
			maxMemoryMB: parseInt(process.env.N8N_PYTHON_MAX_MEMORY_MB || '512', 10),
			maxCpuPercent: parseInt(process.env.N8N_PYTHON_MAX_CPU_PERCENT || '80', 10),
			allowedPackages: [
				'numpy',
				'pandas',
				'requests',
				'matplotlib',
				'scipy',
				'scikit-learn',
				'pillow',
				'beautifulsoup4',
				'lxml',
				'openpyxl',
				'xlrd',
				'jsonschema',
				'pydantic',
				'fastapi',
				'httpx',
				'aiohttp',
				'python-dateutil',
				'pytz',
				'cryptography',
				'jwt',
				'passlib',
				'bcrypt',
				'click',
				'typer',
			],
			blockedPackages: [
				'subprocess32',
				'pexpect',
				'fabric',
				'paramiko',
				'psutil',
				'py-cpuinfo',
				'GPUtil',
				'wmi',
				'pywin32',
				'win32api',
			],
			networkAccess: process.env.N8N_PYTHON_NETWORK_ACCESS !== 'false',
			fileSystemAccess: {
				allowRead: ['/tmp', '/workspace'],
				allowWrite: ['/tmp', '/workspace'],
				blocked: ['/etc', '/root', '/home', '/usr', '/var', '/sys', '/proc'],
			},
			dockerImage: process.env.N8N_PYTHON_DOCKER_IMAGE || 'n8n-python-executor:latest',
			maxConcurrentExecutions: parseInt(process.env.N8N_PYTHON_MAX_CONCURRENT || '5', 10),
		};

		// Using default configuration for now
		this.logger.debug('Using default security configuration');
		return defaultConfig;
	}

	/**
	 * Create security context for execution
	 */
	private async createSecurityContext(
		executionId: string,
		userId: string,
		options: PythonExecutionOptions,
	): Promise<SecurityContext> {
		const restrictions: SecurityRestrictions = {
			timeout: Math.min(
				options.timeout || this.securityConfig.maxExecutionTime,
				this.securityConfig.maxExecutionTime,
			),
			memory: this.securityConfig.maxMemoryMB * 1024 * 1024, // Convert to bytes
			cpu: this.securityConfig.maxCpuPercent,
			networkAllowed: this.securityConfig.networkAccess,
			allowedPaths: [
				...this.securityConfig.fileSystemAccess.allowRead,
				...this.securityConfig.fileSystemAccess.allowWrite,
			],
			blockedOperations: ['subprocess', 'os.system', 'eval', 'exec', '__import__'],
		};

		return {
			executionId,
			workspaceDir: '',
			userId,
			timestamp: new Date(),
			restrictions,
		};
	}

	/**
	 * Validate code for security issues
	 */
	private async validateCodeSecurity(code: string, context: SecurityContext): Promise<void> {
		const violations: string[] = [];

		// Check for dangerous imports
		const dangerousImports = ['subprocess', 'os', 'sys', 'socket', 'urllib', 'http.client'];
		for (const imp of dangerousImports) {
			if (code.includes(`import ${imp}`) || code.includes(`from ${imp}`)) {
				violations.push(`Dangerous import detected: ${imp}`);
			}
		}

		// Check for eval/exec usage
		if (code.includes('eval(') || code.includes('exec(')) {
			violations.push('Dynamic code execution (eval/exec) not allowed');
		}

		// Check for file operations
		const fileOperations = ['open(', 'file(', 'with open'];
		for (const op of fileOperations) {
			if (code.includes(op)) {
				// Allow read-only operations in allowed paths
				const hasWrite =
					code.includes("'w'") ||
					code.includes('"w"') ||
					code.includes("'a'") ||
					code.includes('"a"');
				if (hasWrite) {
					violations.push('File write operations require explicit permission');
				}
			}
		}

		if (violations.length > 0) {
			throw new ApplicationError('Code security validation failed', {
				extra: { violations, executionId: context.executionId },
			});
		}
	}

	/**
	 * Validate requested packages against security policy
	 */
	private async validatePackages(packages: string[], context: SecurityContext): Promise<void> {
		const violations: string[] = [];

		for (const pkg of packages) {
			// Check if package is explicitly blocked
			if (this.securityConfig.blockedPackages.includes(pkg)) {
				violations.push(`Package '${pkg}' is blocked by security policy`);
				continue;
			}

			// If we have an allowlist, check if package is allowed
			if (
				this.securityConfig.allowedPackages.length > 0 &&
				!this.securityConfig.allowedPackages.includes(pkg)
			) {
				violations.push(`Package '${pkg}' is not in the allowed packages list`);
			}
		}

		if (violations.length > 0) {
			throw new ApplicationError('Package validation failed', {
				extra: { violations, executionId: context.executionId },
			});
		}
	}

	/**
	 * Create secure workspace directory
	 */
	private async createSecureWorkspace(executionId: string): Promise<string> {
		const workspaceDir = join('/tmp', `n8n-python-${executionId}`);
		await mkdir(workspaceDir, { recursive: true, mode: 0o700 });
		return workspaceDir;
	}

	/**
	 * Execute code in Docker sandbox
	 */
	private async executeInDockerSandbox(
		options: PythonExecutionOptions,
		context: SecurityContext,
	): Promise<{ result: any; stdout: string; stderr: string }> {
		return new Promise((resolve, reject) => {
			const dockerArgs = [
				'run',
				'--rm',
				'--memory',
				`${context.restrictions.memory}`,
				'--cpus',
				`${context.restrictions.cpu / 100}`,
				'--network',
				context.restrictions.networkAllowed ? 'bridge' : 'none',
				'--user',
				'1000:1000', // Non-root user
				'--workdir',
				'/workspace',
				'-v',
				`${context.workspaceDir}:/workspace`,
				'--security-opt',
				'no-new-privileges:true',
				'--cap-drop',
				'ALL',
				'--read-only',
				'--tmpfs',
				'/tmp:rw,noexec,nosuid,size=100m',
				this.securityConfig.dockerImage,
				'python3',
				'-c',
				this.wrapCodeForExecution(options.code, options.context),
			];

			const child = spawn('docker', dockerArgs, {
				timeout: context.restrictions.timeout,
				stdio: ['pipe', 'pipe', 'pipe'],
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
						// Parse result from stdout
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
								extra: { stdout, stderr, executionId: context.executionId },
							}),
						);
					}
				} else {
					reject(
						new ApplicationError(`Python execution failed with code ${code}`, {
							extra: { code, stdout, stderr, executionId: context.executionId },
						}),
					);
				}
			});

			child.on('error', (error) => {
				reject(
					new ApplicationError('Docker execution error', {
						cause: error,
						extra: { executionId: context.executionId },
					}),
				);
			});
		});
	}

	/**
	 * Wrap user code with security and context injection
	 */
	private wrapCodeForExecution(code: string, context: Record<string, any>): string {
		return `
import json
import sys
from io import StringIO

# Inject context
${Object.entries(context)
	.map(([key, value]) => `${key} = ${JSON.stringify(value)}`)
	.join('\n')}

# Capture stdout
old_stdout = sys.stdout
sys.stdout = captured_output = StringIO()

try:
	# Execute user code
	${code}
	
	# Get the result (if any variable named 'result' exists)
	result = locals().get('result', None)
	
	# Print result marker
	print("__N8N_RESULT__:" + json.dumps(result), file=old_stdout)
	
except Exception as e:
	print("__N8N_ERROR__:" + json.dumps({
		"message": str(e),
		"type": type(e).__name__
	}), file=sys.stderr)
	sys.exit(1)
finally:
	sys.stdout = old_stdout
`;
	}

	/**
	 * Terminate a running execution
	 */
	private terminateExecution(executionId: string): void {
		this.logger.warn('Terminating Python execution due to timeout', { executionId });
		// In a real implementation, this would kill the Docker container
		// For now, we just remove it from active executions
		this.activeExecutions.delete(executionId);
	}

	/**
	 * Clean up workspace directory
	 */
	private async cleanupWorkspace(workspaceDir: string): Promise<void> {
		if (!workspaceDir || workspaceDir === '/') return;

		try {
			await execFile('rm', ['-rf', workspaceDir]);
		} catch (error) {
			this.logger.warn('Failed to cleanup workspace', { workspaceDir, error });
		}
	}

	/**
	 * Audit execution for security monitoring
	 */
	private async auditExecution(
		context: SecurityContext,
		_result: { result: any; stdout: string; stderr: string } | null,
		error: Error | null,
	): Promise<void> {
		const auditLog: ExecutionAuditLog = {
			executionId: context.executionId,
			userId: context.userId,
			code: '[REDACTED]', // Don't log full code for privacy
			packages: [], // Would extract from options
			duration: Date.now() - context.timestamp.getTime(),
			exitCode: error ? 1 : 0,
			resourceUsage: {
				maxMemory: 0, // Would be populated from Docker stats
				cpuTime: 0,
			},
			securityViolations: error ? [error.message] : [],
			timestamp: context.timestamp,
		};

		this.auditLogs.push(auditLog);

		// In production, this would write to a persistent audit log
		this.logger.info('Python execution audit', auditLog as any);
	}

	/**
	 * Validate Docker availability
	 */
	private async validateDockerAvailability(): Promise<void> {
		try {
			await this.execFileAsync('docker', ['--version']);
			this.logger.info('Docker availability confirmed');
		} catch (error) {
			this.logger.error('Docker not available - Python sandbox will not function', { error });
			throw new ApplicationError('Docker is required for secure Python execution');
		}
	}

	/**
	 * Get security configuration
	 */
	getSecurityConfig(): SecurityConfig {
		return { ...this.securityConfig };
	}

	/**
	 * Get audit logs
	 */
	getAuditLogs(): ExecutionAuditLog[] {
		return [...this.auditLogs];
	}
}
