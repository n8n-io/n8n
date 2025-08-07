'use strict';
var __createBinding =
	(this && this.__createBinding) ||
	(Object.create
		? function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				var desc = Object.getOwnPropertyDescriptor(m, k);
				if (!desc || ('get' in desc ? !m.__esModule : desc.writable || desc.configurable)) {
					desc = {
						enumerable: true,
						get: function () {
							return m[k];
						},
					};
				}
				Object.defineProperty(o, k2, desc);
			}
		: function (o, m, k, k2) {
				if (k2 === undefined) k2 = k;
				o[k2] = m[k];
			});
var __setModuleDefault =
	(this && this.__setModuleDefault) ||
	(Object.create
		? function (o, v) {
				Object.defineProperty(o, 'default', { enumerable: true, value: v });
			}
		: function (o, v) {
				o['default'] = v;
			});
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
var __importStar =
	(this && this.__importStar) ||
	(function () {
		var ownKeys = function (o) {
			ownKeys =
				Object.getOwnPropertyNames ||
				function (o) {
					var ar = [];
					for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
					return ar;
				};
			return ownKeys(o);
		};
		return function (mod) {
			if (mod && mod.__esModule) return mod;
			var result = {};
			if (mod != null)
				for (var k = ownKeys(mod), i = 0; i < k.length; i++)
					if (k[i] !== 'default') __createBinding(result, mod, k[i]);
			__setModuleDefault(result, mod);
			return result;
		};
	})();
var __metadata =
	(this && this.__metadata) ||
	function (k, v) {
		if (typeof Reflect === 'object' && typeof Reflect.metadata === 'function')
			return Reflect.metadata(k, v);
	};
Object.defineProperty(exports, '__esModule', { value: true });
exports.PythonCacheService = void 0;
const di_1 = require('@n8n/di');
const backend_common_1 = require('@n8n/backend-common');
const n8n_workflow_1 = require('n8n-workflow');
const crypto_1 = require('crypto');
const promises_1 = require('fs/promises');
const path_1 = require('path');
const events_1 = require('events');
let PythonCacheService = class PythonCacheService extends events_1.EventEmitter {
	constructor(logger) {
		super();
		this.logger = logger;
		this.environments = new Map();
		this.codeCache = new Map();
		this.packageCache = new Map();
		this.executionStats = new Map();
		this.currentMemoryUsage = 0;
		this.config = {
			maxEnvironments: parseInt(process.env.N8N_PYTHON_CACHE_MAX_ENVIRONMENTS || '20', 10),
			maxCodeCacheSize: parseInt(process.env.N8N_PYTHON_CACHE_MAX_CODE_SIZE || '1000', 10),
			maxMemoryUsage: parseInt(process.env.N8N_PYTHON_CACHE_MAX_MEMORY || '1073741824', 10),
			environmentTTL: parseInt(process.env.N8N_PYTHON_CACHE_ENV_TTL || '3600000', 10),
			codeCacheTTL: parseInt(process.env.N8N_PYTHON_CACHE_CODE_TTL || '1800000', 10),
			warmupThreshold: parseInt(process.env.N8N_PYTHON_CACHE_WARMUP_THRESHOLD || '5', 10),
			cleanupInterval: parseInt(process.env.N8N_PYTHON_CACHE_CLEANUP_INTERVAL || '300000', 10),
		};
		this.baseCacheDir =
			process.env.N8N_PYTHON_CACHE_DIR || (0, path_1.join)(process.cwd(), '.python-cache');
		this.logger.info('Python Cache Service initialized', {
			config: this.config,
			baseCacheDir: this.baseCacheDir,
		});
		this.startCleanupTimer();
		this.initializeCache();
	}
	async getOrCreateEnvironment(packages) {
		const envId = this.generateEnvironmentId(packages);
		let environment = this.environments.get(envId);
		if (environment) {
			environment.lastUsed = new Date();
			environment.useCount++;
			this.emit('environmentHit', { envId, packages });
			return environment;
		}
		await this.evictEnvironmentsIfNeeded();
		environment = await this.createEnvironment(envId, packages);
		this.environments.set(envId, environment);
		this.updatePackageCache(envId, packages);
		this.emit('environmentCreated', { envId, packages });
		return environment;
	}
	async cacheCode(code, executionTime) {
		const codeHash = this.generateCodeHash(code);
		let cached = this.codeCache.get(codeHash);
		if (cached) {
			cached.lastExecuted = new Date();
			cached.executionCount++;
			cached.cacheHits++;
			cached.averageExecutionTime =
				(cached.averageExecutionTime * (cached.executionCount - 1) + executionTime) /
				cached.executionCount;
		} else {
			await this.evictCodeCacheIfNeeded();
			cached = {
				hash: codeHash,
				code,
				lastExecuted: new Date(),
				executionCount: 1,
				averageExecutionTime: executionTime,
				cacheHits: 0,
			};
			if (this.shouldPrecompileCode(code)) {
				cached.compiledPath = await this.precompileCode(codeHash, code);
			}
			this.codeCache.set(codeHash, cached);
		}
		this.emit('codeCached', { codeHash, executionTime });
		return codeHash;
	}
	getCachedCode(codeHash) {
		const cached = this.codeCache.get(codeHash);
		if (cached) {
			cached.cacheHits++;
			this.emit('codeHit', { codeHash });
		}
		return cached || null;
	}
	isCodeCached(code) {
		const codeHash = this.generateCodeHash(code);
		return this.codeCache.has(codeHash);
	}
	getCodeHash(code) {
		return this.generateCodeHash(code);
	}
	async warmupEnvironments() {
		this.logger.info('Starting environment warmup process');
		const environmentsToWarmup = Array.from(this.environments.values())
			.filter((env) => !env.isWarm && env.useCount >= this.config.warmupThreshold)
			.sort((a, b) => b.useCount - a.useCount)
			.slice(0, 5);
		for (const environment of environmentsToWarmup) {
			try {
				await this.warmupEnvironment(environment);
				environment.isWarm = true;
				this.logger.info('Environment warmed up successfully', {
					envId: environment.id,
					packages: environment.packages,
				});
			} catch (error) {
				this.logger.error('Failed to warm up environment', {
					envId: environment.id,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
		this.emit('warmupCompleted', { count: environmentsToWarmup.length });
	}
	async preloadCommonPackages() {
		const commonPackages = [
			['numpy', 'pandas'],
			['requests'],
			['json', 'datetime'],
			['matplotlib', 'seaborn'],
			['scikit-learn'],
		];
		this.logger.info('Preloading common package combinations');
		for (const packages of commonPackages) {
			try {
				await this.getOrCreateEnvironment(packages);
			} catch (error) {
				this.logger.warn('Failed to preload packages', {
					packages,
					error: error instanceof Error ? error.message : String(error),
				});
			}
		}
	}
	getCacheStatistics() {
		const totalEnvironments = this.environments.size;
		const warmEnvironments = Array.from(this.environments.values()).filter((e) => e.isWarm).length;
		const totalEnvironmentSize = Array.from(this.environments.values()).reduce(
			(sum, env) => sum + env.size,
			0,
		);
		const totalCodeExecutions = Array.from(this.codeCache.values()).reduce(
			(sum, cache) => sum + cache.executionCount,
			0,
		);
		const totalCodeHits = Array.from(this.codeCache.values()).reduce(
			(sum, cache) => sum + cache.cacheHits,
			0,
		);
		const averageExecutionTime = Array.from(this.codeCache.values()).reduce(
			(sum, cache, _, arr) => sum + cache.averageExecutionTime / arr.length,
			0,
		);
		const environmentHitRate =
			totalEnvironments > 0
				? Array.from(this.environments.values()).reduce((sum, env) => sum + env.useCount, 0) /
					totalEnvironments
				: 0;
		const codeHitRate = totalCodeExecutions > 0 ? totalCodeHits / totalCodeExecutions : 0;
		return {
			environments: {
				total: totalEnvironments,
				warm: warmEnvironments,
				totalSize: totalEnvironmentSize,
				hitRate: environmentHitRate,
			},
			code: {
				total: this.codeCache.size,
				hitRate: codeHitRate,
				totalExecutions: totalCodeExecutions,
				averageExecutionTime,
			},
			memory: {
				used: this.currentMemoryUsage,
				limit: this.config.maxMemoryUsage,
				utilizationPercent: (this.currentMemoryUsage / this.config.maxMemoryUsage) * 100,
			},
		};
	}
	async clearAllCaches() {
		this.logger.info('Clearing all Python caches');
		for (const cached of this.codeCache.values()) {
			if (cached.compiledPath) {
				try {
					await (0, promises_1.unlink)(cached.compiledPath);
				} catch (error) {}
			}
		}
		this.codeCache.clear();
		this.environments.clear();
		this.packageCache.clear();
		this.executionStats.clear();
		this.currentMemoryUsage = 0;
		this.emit('cacheClearedAll');
	}
	generateEnvironmentId(packages) {
		const sortedPackages = packages.sort().join(',');
		return (0, crypto_1.createHash)('sha256').update(sortedPackages).digest('hex').substring(0, 16);
	}
	generateCodeHash(code) {
		return (0, crypto_1.createHash)('sha256').update(code.trim()).digest('hex').substring(0, 16);
	}
	async createEnvironment(envId, packages) {
		const envPath = (0, path_1.join)(this.baseCacheDir, 'environments', envId);
		this.logger.info('Creating cached environment', { envId, packages });
		try {
			await (0, promises_1.mkdir)((0, path_1.dirname)(envPath), { recursive: true });
			const environment = {
				id: envId,
				packages: [...packages],
				path: envPath,
				createdAt: new Date(),
				lastUsed: new Date(),
				useCount: 1,
				size: 0,
				isWarm: false,
			};
			try {
				const stats = await (0, promises_1.stat)(envPath);
				environment.size = stats.size;
			} catch (error) {}
			this.currentMemoryUsage += environment.size;
			return environment;
		} catch (error) {
			this.logger.error('Failed to create cached environment', {
				envId,
				packages,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new n8n_workflow_1.ApplicationError('Failed to create cached environment', {
				cause: error,
			});
		}
	}
	updatePackageCache(envId, packages) {
		for (const pkg of packages) {
			if (!this.packageCache.has(pkg)) {
				this.packageCache.set(pkg, new Set());
			}
			this.packageCache.get(pkg).add(envId);
		}
	}
	shouldPrecompileCode(code) {
		return (
			code.length > 500 ||
			code.includes('import') ||
			code.includes('def ') ||
			code.includes('class ')
		);
	}
	async precompileCode(codeHash, code) {
		const compiledPath = (0, path_1.join)(this.baseCacheDir, 'compiled', `${codeHash}.pyc`);
		try {
			await (0, promises_1.mkdir)((0, path_1.dirname)(compiledPath), { recursive: true });
			const compilerScript = `
import py_compile
import sys

try:
    py_compile.compile(sys.argv[1], sys.argv[2], doraise=True)
    print("SUCCESS")
except py_compile.PyCompileError as e:
    print(f"ERROR: {e}")
    sys.exit(1)
`;
			const tempSourcePath = (0, path_1.join)(this.baseCacheDir, 'temp', `${codeHash}.py`);
			await (0, promises_1.mkdir)((0, path_1.dirname)(tempSourcePath), { recursive: true });
			await (0, promises_1.writeFile)(tempSourcePath, code);
			const compilerScriptPath = (0, path_1.join)(this.baseCacheDir, 'temp', 'compiler.py');
			await (0, promises_1.writeFile)(compilerScriptPath, compilerScript);
			const { execFile } = await Promise.resolve().then(() =>
				__importStar(require('child_process')),
			);
			const { promisify } = await Promise.resolve().then(() => __importStar(require('util')));
			const execFileAsync = promisify(execFile);
			await execFileAsync('python3', [compilerScriptPath, tempSourcePath, compiledPath]);
			await (0, promises_1.unlink)(tempSourcePath);
			return compiledPath;
		} catch (error) {
			this.logger.warn('Failed to pre-compile code', {
				codeHash,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}
	async warmupEnvironment(environment) {
		this.logger.debug('Warming up environment', {
			envId: environment.id,
			packages: environment.packages,
		});
		await new Promise((resolve) => setTimeout(resolve, 100));
	}
	async evictEnvironmentsIfNeeded() {
		if (this.environments.size >= this.config.maxEnvironments) {
			const toEvict = this.environments.size - this.config.maxEnvironments + 1;
			await this.evictLRUEnvironments(toEvict);
		}
		if (this.currentMemoryUsage > this.config.maxMemoryUsage) {
			await this.evictEnvironmentsByMemory();
		}
	}
	async evictCodeCacheIfNeeded() {
		if (this.codeCache.size >= this.config.maxCodeCacheSize) {
			const toEvict = this.codeCache.size - this.config.maxCodeCacheSize + 1;
			await this.evictLRUCodeCache(toEvict);
		}
	}
	async evictLRUEnvironments(count) {
		const environments = Array.from(this.environments.entries())
			.sort(([, a], [, b]) => a.lastUsed.getTime() - b.lastUsed.getTime())
			.slice(0, count);
		for (const [envId, environment] of environments) {
			await this.evictEnvironment(envId, environment);
		}
	}
	async evictEnvironmentsByMemory() {
		const environments = Array.from(this.environments.entries()).sort(
			([, a], [, b]) => b.size - a.size,
		);
		for (const [envId, environment] of environments) {
			await this.evictEnvironment(envId, environment);
			if (this.currentMemoryUsage <= this.config.maxMemoryUsage * 0.8) {
				break;
			}
		}
	}
	async evictLRUCodeCache(count) {
		const cacheEntries = Array.from(this.codeCache.entries())
			.sort(([, a], [, b]) => a.lastExecuted.getTime() - b.lastExecuted.getTime())
			.slice(0, count);
		for (const [codeHash, cached] of cacheEntries) {
			if (cached.compiledPath) {
				try {
					await (0, promises_1.unlink)(cached.compiledPath);
				} catch (error) {}
			}
			this.codeCache.delete(codeHash);
		}
	}
	async evictEnvironment(envId, environment) {
		this.logger.debug('Evicting environment', { envId });
		this.environments.delete(envId);
		this.currentMemoryUsage -= environment.size;
		for (const pkg of environment.packages) {
			const envIds = this.packageCache.get(pkg);
			if (envIds) {
				envIds.delete(envId);
				if (envIds.size === 0) {
					this.packageCache.delete(pkg);
				}
			}
		}
		this.emit('environmentEvicted', { envId });
	}
	async initializeCache() {
		try {
			await (0, promises_1.mkdir)((0, path_1.join)(this.baseCacheDir, 'environments'), {
				recursive: true,
			});
			await (0, promises_1.mkdir)((0, path_1.join)(this.baseCacheDir, 'compiled'), {
				recursive: true,
			});
			await (0, promises_1.mkdir)((0, path_1.join)(this.baseCacheDir, 'temp'), { recursive: true });
			this.logger.info('Python cache directories initialized');
		} catch (error) {
			this.logger.error('Failed to initialize cache directories', { error });
		}
	}
	startCleanupTimer() {
		this.cleanupTimer = setInterval(() => {
			this.performCleanup();
		}, this.config.cleanupInterval);
	}
	performCleanup() {
		const now = Date.now();
		const expiredEnvironments = Array.from(this.environments.entries()).filter(
			([, env]) => now - env.lastUsed.getTime() > this.config.environmentTTL,
		);
		for (const [envId, environment] of expiredEnvironments) {
			this.evictEnvironment(envId, environment);
		}
		const expiredCodeCache = Array.from(this.codeCache.entries()).filter(
			([, cache]) => now - cache.lastExecuted.getTime() > this.config.codeCacheTTL,
		);
		for (const [codeHash, cached] of expiredCodeCache) {
			if (cached.compiledPath) {
				(0, promises_1.unlink)(cached.compiledPath).catch(() => {});
			}
			this.codeCache.delete(codeHash);
		}
		this.emit('cleanupCompleted', {
			expiredEnvironments: expiredEnvironments.length,
			expiredCodeCache: expiredCodeCache.length,
		});
	}
	async shutdown() {
		this.logger.info('Shutting down Python Cache Service');
		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
		}
		await this.clearAllCaches();
		this.logger.info('Python Cache Service shutdown complete');
	}
};
exports.PythonCacheService = PythonCacheService;
exports.PythonCacheService = PythonCacheService = __decorate(
	[(0, di_1.Service)(), __metadata('design:paramtypes', [backend_common_1.Logger])],
	PythonCacheService,
);
//# sourceMappingURL=python-cache.service.js.map
