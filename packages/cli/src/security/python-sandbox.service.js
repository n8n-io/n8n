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
exports.PythonSandboxService = void 0;
const di_1 = require('@n8n/di');
const backend_common_1 = require('@n8n/backend-common');
const n8n_workflow_1 = require('n8n-workflow');
const child_process_1 = require('child_process');
const util_1 = require('util');
const promises_1 = require('fs/promises');
const path_1 = require('path');
const crypto_1 = require('crypto');
let PythonSandboxService = class PythonSandboxService {
	constructor(logger) {
		this.logger = logger;
		this.execFileAsync = (0, util_1.promisify)(child_process_1.execFile);
		this.auditLogs = [];
		this.activeExecutions = new Map();
		this.securityConfig = this.loadSecurityConfig();
		this.validateDockerAvailability();
	}
	async executeSecurely(options, userId) {
		const executionId = (0, crypto_1.randomUUID)();
		const startTime = Date.now();
		this.logger.info('Starting secure Python execution', {
			executionId,
			userId,
			packages: options.packages || [],
		});
		if (this.activeExecutions.size >= this.securityConfig.maxConcurrentExecutions) {
			throw new n8n_workflow_1.ApplicationError('Maximum concurrent Python executions reached', {
				extra: { limit: this.securityConfig.maxConcurrentExecutions },
			});
		}
		const securityContext = await this.createSecurityContext(executionId, userId, options);
		const timeoutHandle = setTimeout(() => {
			this.terminateExecution(executionId);
		}, securityContext.restrictions.timeout);
		this.activeExecutions.set(executionId, timeoutHandle);
		try {
			await this.validateCodeSecurity(options.code, securityContext);
			await this.validatePackages(options.packages || [], securityContext);
			const workspaceDir = await this.createSecureWorkspace(executionId);
			securityContext.workspaceDir = workspaceDir;
			const result = await this.executeInDockerSandbox(options, securityContext);
			await this.auditExecution(securityContext, result, null);
			return {
				...result,
				executionTime: Date.now() - startTime,
			};
		} catch (error) {
			await this.auditExecution(securityContext, null, error);
			throw error;
		} finally {
			clearTimeout(timeoutHandle);
			this.activeExecutions.delete(executionId);
			await this.cleanupWorkspace(securityContext.workspaceDir);
		}
	}
	loadSecurityConfig() {
		const defaultConfig = {
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
		this.logger.debug('Using default security configuration');
		return defaultConfig;
	}
	async createSecurityContext(executionId, userId, options) {
		const restrictions = {
			timeout: Math.min(
				options.timeout || this.securityConfig.maxExecutionTime,
				this.securityConfig.maxExecutionTime,
			),
			memory: this.securityConfig.maxMemoryMB * 1024 * 1024,
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
	async validateCodeSecurity(code, context) {
		const violations = [];
		const dangerousImports = ['subprocess', 'os', 'sys', 'socket', 'urllib', 'http.client'];
		for (const imp of dangerousImports) {
			if (code.includes(`import ${imp}`) || code.includes(`from ${imp}`)) {
				violations.push(`Dangerous import detected: ${imp}`);
			}
		}
		if (code.includes('eval(') || code.includes('exec(')) {
			violations.push('Dynamic code execution (eval/exec) not allowed');
		}
		const fileOperations = ['open(', 'file(', 'with open'];
		for (const op of fileOperations) {
			if (code.includes(op)) {
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
			throw new n8n_workflow_1.ApplicationError('Code security validation failed', {
				extra: { violations, executionId: context.executionId },
			});
		}
	}
	async validatePackages(packages, context) {
		const violations = [];
		for (const pkg of packages) {
			if (this.securityConfig.blockedPackages.includes(pkg)) {
				violations.push(`Package '${pkg}' is blocked by security policy`);
				continue;
			}
			if (
				this.securityConfig.allowedPackages.length > 0 &&
				!this.securityConfig.allowedPackages.includes(pkg)
			) {
				violations.push(`Package '${pkg}' is not in the allowed packages list`);
			}
		}
		if (violations.length > 0) {
			throw new n8n_workflow_1.ApplicationError('Package validation failed', {
				extra: { violations, executionId: context.executionId },
			});
		}
	}
	async createSecureWorkspace(executionId) {
		const workspaceDir = (0, path_1.join)('/tmp', `n8n-python-${executionId}`);
		await (0, promises_1.mkdir)(workspaceDir, { recursive: true, mode: 0o700 });
		return workspaceDir;
	}
	async executeInDockerSandbox(options, context) {
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
				'1000:1000',
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
			const child = (0, child_process_1.spawn)('docker', dockerArgs, {
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
								extra: { stdout, stderr, executionId: context.executionId },
							}),
						);
					}
				} else {
					reject(
						new n8n_workflow_1.ApplicationError(`Python execution failed with code ${code}`, {
							extra: { code, stdout, stderr, executionId: context.executionId },
						}),
					);
				}
			});
			child.on('error', (error) => {
				reject(
					new n8n_workflow_1.ApplicationError('Docker execution error', {
						cause: error,
						extra: { executionId: context.executionId },
					}),
				);
			});
		});
	}
	wrapCodeForExecution(code, context) {
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
	terminateExecution(executionId) {
		this.logger.warn('Terminating Python execution due to timeout', { executionId });
		this.activeExecutions.delete(executionId);
	}
	async cleanupWorkspace(workspaceDir) {
		if (!workspaceDir || workspaceDir === '/') return;
		try {
			await (0, child_process_1.execFile)('rm', ['-rf', workspaceDir]);
		} catch (error) {
			this.logger.warn('Failed to cleanup workspace', { workspaceDir, error });
		}
	}
	async auditExecution(context, _result, error) {
		const auditLog = {
			executionId: context.executionId,
			userId: context.userId,
			code: '[REDACTED]',
			packages: [],
			duration: Date.now() - context.timestamp.getTime(),
			exitCode: error ? 1 : 0,
			resourceUsage: {
				maxMemory: 0,
				cpuTime: 0,
			},
			securityViolations: error ? [error.message] : [],
			timestamp: context.timestamp,
		};
		this.auditLogs.push(auditLog);
		this.logger.info('Python execution audit', auditLog);
	}
	async validateDockerAvailability() {
		try {
			await this.execFileAsync('docker', ['--version']);
			this.logger.info('Docker availability confirmed');
		} catch (error) {
			this.logger.error('Docker not available - Python sandbox will not function', { error });
			throw new n8n_workflow_1.ApplicationError('Docker is required for secure Python execution');
		}
	}
	getSecurityConfig() {
		return { ...this.securityConfig };
	}
	getAuditLogs() {
		return [...this.auditLogs];
	}
};
exports.PythonSandboxService = PythonSandboxService;
exports.PythonSandboxService = PythonSandboxService = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [backend_common_1.Logger])],
	PythonSandboxService,
);
//# sourceMappingURL=python-sandbox.service.js.map
