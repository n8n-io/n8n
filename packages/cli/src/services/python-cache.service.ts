import { Service } from '@n8n/di';
import { Logger } from '@n8n/backend-common';
import { ApplicationError } from 'n8n-workflow';
import { createHash } from 'crypto';
import { writeFile, readFile, mkdir, access, stat, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { EventEmitter } from 'events';

interface CachedEnvironment {
	id: string;
	packages: string[];
	path: string;
	createdAt: Date;
	lastUsed: Date;
	useCount: number;
	size: number; // in bytes
	isWarm: boolean;
}

interface CodeCache {
	hash: string;
	code: string;
	compiledPath?: string;
	lastExecuted: Date;
	executionCount: number;
	averageExecutionTime: number;
	cacheHits: number;
}

interface CacheStatistics {
	environments: {
		total: number;
		warm: number;
		totalSize: number;
		hitRate: number;
	};
	code: {
		total: number;
		hitRate: number;
		totalExecutions: number;
		averageExecutionTime: number;
	};
	memory: {
		used: number;
		limit: number;
		utilizationPercent: number;
	};
}

interface CacheConfiguration {
	maxEnvironments: number;
	maxCodeCacheSize: number;
	maxMemoryUsage: number; // in bytes
	environmentTTL: number; // in milliseconds
	codeCacheTTL: number; // in milliseconds
	warmupThreshold: number; // executions before considering for warmup
	cleanupInterval: number; // in milliseconds
}

@Service()
export class PythonCacheService extends EventEmitter {
	private readonly environments = new Map<string, CachedEnvironment>();
	private readonly codeCache = new Map<string, CodeCache>();
	private readonly packageCache = new Map<string, Set<string>>(); // package -> environment IDs
	private readonly executionStats = new Map<string, { count: number; totalTime: number }>();

	private readonly config: CacheConfiguration;
	private readonly baseCacheDir: string;
	private cleanupTimer?: NodeJS.Timeout;
	private currentMemoryUsage = 0;

	constructor(private readonly logger: Logger) {
		super();

		this.config = {
			maxEnvironments: parseInt(process.env.N8N_PYTHON_CACHE_MAX_ENVIRONMENTS || '20', 10),
			maxCodeCacheSize: parseInt(process.env.N8N_PYTHON_CACHE_MAX_CODE_SIZE || '1000', 10),
			maxMemoryUsage: parseInt(process.env.N8N_PYTHON_CACHE_MAX_MEMORY || '1073741824', 10), // 1GB
			environmentTTL: parseInt(process.env.N8N_PYTHON_CACHE_ENV_TTL || '3600000', 10), // 1 hour
			codeCacheTTL: parseInt(process.env.N8N_PYTHON_CACHE_CODE_TTL || '1800000', 10), // 30 minutes
			warmupThreshold: parseInt(process.env.N8N_PYTHON_CACHE_WARMUP_THRESHOLD || '5', 10),
			cleanupInterval: parseInt(process.env.N8N_PYTHON_CACHE_CLEANUP_INTERVAL || '300000', 10), // 5 minutes
		};

		this.baseCacheDir = process.env.N8N_PYTHON_CACHE_DIR || join(process.cwd(), '.python-cache');

		this.logger.info('Python Cache Service initialized', {
			config: this.config,
			baseCacheDir: this.baseCacheDir,
		});

		this.startCleanupTimer();
		this.initializeCache();
	}

	/**
	 * Get or create a cached environment
	 */
	async getOrCreateEnvironment(packages: string[]): Promise<CachedEnvironment> {
		const envId = this.generateEnvironmentId(packages);
		let environment = this.environments.get(envId);

		if (environment) {
			// Update usage statistics
			environment.lastUsed = new Date();
			environment.useCount++;
			this.emit('environmentHit', { envId, packages });
			return environment;
		}

		// Check if we need to evict environments due to limits
		await this.evictEnvironmentsIfNeeded();

		// Create new environment
		environment = await this.createEnvironment(envId, packages);
		this.environments.set(envId, environment);

		// Update package cache for faster lookups
		this.updatePackageCache(envId, packages);

		this.emit('environmentCreated', { envId, packages });
		return environment;
	}

	/**
	 * Cache executed code for hot execution
	 */
	async cacheCode(code: string, executionTime: number): Promise<string> {
		const codeHash = this.generateCodeHash(code);
		let cached = this.codeCache.get(codeHash);

		if (cached) {
			// Update statistics
			cached.lastExecuted = new Date();
			cached.executionCount++;
			cached.cacheHits++;
			cached.averageExecutionTime =
				(cached.averageExecutionTime * (cached.executionCount - 1) + executionTime) /
				cached.executionCount;
		} else {
			// Check if we need to evict code cache entries
			await this.evictCodeCacheIfNeeded();

			// Create new cache entry
			cached = {
				hash: codeHash,
				code,
				lastExecuted: new Date(),
				executionCount: 1,
				averageExecutionTime: executionTime,
				cacheHits: 0,
			};

			// Pre-compile if beneficial
			if (this.shouldPrecompileCode(code)) {
				cached.compiledPath = await this.precompileCode(codeHash, code);
			}

			this.codeCache.set(codeHash, cached);
		}

		this.emit('codeCached', { codeHash, executionTime });
		return codeHash;
	}

	/**
	 * Get cached code by hash
	 */
	getCachedCode(codeHash: string): CodeCache | null {
		const cached = this.codeCache.get(codeHash);
		if (cached) {
			cached.cacheHits++;
			this.emit('codeHit', { codeHash });
		}
		return cached || null;
	}

	/**
	 * Check if code is cached
	 */
	isCodeCached(code: string): boolean {
		const codeHash = this.generateCodeHash(code);
		return this.codeCache.has(codeHash);
	}

	/**
	 * Get code hash
	 */
	getCodeHash(code: string): string {
		return this.generateCodeHash(code);
	}

	/**
	 * Warm up frequently used environments
	 */
	async warmupEnvironments(): Promise<void> {
		this.logger.info('Starting environment warmup process');

		const environmentsToWarmup = Array.from(this.environments.values())
			.filter((env) => !env.isWarm && env.useCount >= this.config.warmupThreshold)
			.sort((a, b) => b.useCount - a.useCount)
			.slice(0, 5); // Warm up top 5 environments

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

	/**
	 * Preload common packages
	 */
	async preloadCommonPackages(): Promise<void> {
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

	/**
	 * Get cache statistics
	 */
	getCacheStatistics(): CacheStatistics {
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

	/**
	 * Clear all caches
	 */
	async clearAllCaches(): Promise<void> {
		this.logger.info('Clearing all Python caches');

		// Clear code cache
		for (const cached of this.codeCache.values()) {
			if (cached.compiledPath) {
				try {
					await unlink(cached.compiledPath);
				} catch (error) {
					// Ignore cleanup errors
				}
			}
		}
		this.codeCache.clear();

		// Clear environment cache
		this.environments.clear();
		this.packageCache.clear();
		this.executionStats.clear();
		this.currentMemoryUsage = 0;

		this.emit('cacheClearedAll');
	}

	/**
	 * Generate environment ID based on packages
	 */
	private generateEnvironmentId(packages: string[]): string {
		const sortedPackages = packages.sort().join(',');
		return createHash('sha256').update(sortedPackages).digest('hex').substring(0, 16);
	}

	/**
	 * Generate code hash
	 */
	private generateCodeHash(code: string): string {
		return createHash('sha256').update(code.trim()).digest('hex').substring(0, 16);
	}

	/**
	 * Create a new cached environment
	 */
	private async createEnvironment(envId: string, packages: string[]): Promise<CachedEnvironment> {
		const envPath = join(this.baseCacheDir, 'environments', envId);

		this.logger.info('Creating cached environment', { envId, packages });

		try {
			// Ensure directory exists
			await mkdir(dirname(envPath), { recursive: true });

			// Create environment metadata
			const environment: CachedEnvironment = {
				id: envId,
				packages: [...packages],
				path: envPath,
				createdAt: new Date(),
				lastUsed: new Date(),
				useCount: 1,
				size: 0,
				isWarm: false,
			};

			// Calculate environment size
			try {
				const stats = await stat(envPath);
				environment.size = stats.size;
			} catch (error) {
				// Directory doesn't exist yet, size will be calculated later
			}

			this.currentMemoryUsage += environment.size;

			return environment;
		} catch (error) {
			this.logger.error('Failed to create cached environment', {
				envId,
				packages,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new ApplicationError('Failed to create cached environment', { cause: error });
		}
	}

	/**
	 * Update package cache for faster lookups
	 */
	private updatePackageCache(envId: string, packages: string[]): void {
		for (const pkg of packages) {
			if (!this.packageCache.has(pkg)) {
				this.packageCache.set(pkg, new Set());
			}
			this.packageCache.get(pkg)!.add(envId);
		}
	}

	/**
	 * Check if code should be pre-compiled
	 */
	private shouldPrecompileCode(code: string): boolean {
		// Pre-compile if code is complex enough to benefit
		return (
			code.length > 500 ||
			code.includes('import') ||
			code.includes('def ') ||
			code.includes('class ')
		);
	}

	/**
	 * Pre-compile Python code
	 */
	private async precompileCode(codeHash: string, code: string): Promise<string> {
		const compiledPath = join(this.baseCacheDir, 'compiled', `${codeHash}.pyc`);

		try {
			await mkdir(dirname(compiledPath), { recursive: true });

			// Create a Python script that compiles the code
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

			const tempSourcePath = join(this.baseCacheDir, 'temp', `${codeHash}.py`);
			await mkdir(dirname(tempSourcePath), { recursive: true });
			await writeFile(tempSourcePath, code);

			const compilerScriptPath = join(this.baseCacheDir, 'temp', 'compiler.py');
			await writeFile(compilerScriptPath, compilerScript);

			// Execute compilation
			const { execFile } = await import('child_process');
			const { promisify } = await import('util');
			const execFileAsync = promisify(execFile);

			await execFileAsync('python3', [compilerScriptPath, tempSourcePath, compiledPath]);

			// Cleanup temp files
			await unlink(tempSourcePath);

			return compiledPath;
		} catch (error) {
			this.logger.warn('Failed to pre-compile code', {
				codeHash,
				error: error instanceof Error ? error.message : String(error),
			});
			throw error;
		}
	}

	/**
	 * Warm up an environment
	 */
	private async warmupEnvironment(environment: CachedEnvironment): Promise<void> {
		// This would involve pre-loading the environment and common modules
		// For now, we'll just mark it as warm
		this.logger.debug('Warming up environment', {
			envId: environment.id,
			packages: environment.packages,
		});

		// Simulate warmup process
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	/**
	 * Evict environments if needed due to limits
	 */
	private async evictEnvironmentsIfNeeded(): Promise<void> {
		// Evict by count
		if (this.environments.size >= this.config.maxEnvironments) {
			const toEvict = this.environments.size - this.config.maxEnvironments + 1;
			await this.evictLRUEnvironments(toEvict);
		}

		// Evict by memory usage
		if (this.currentMemoryUsage > this.config.maxMemoryUsage) {
			await this.evictEnvironmentsByMemory();
		}
	}

	/**
	 * Evict code cache entries if needed
	 */
	private async evictCodeCacheIfNeeded(): Promise<void> {
		if (this.codeCache.size >= this.config.maxCodeCacheSize) {
			const toEvict = this.codeCache.size - this.config.maxCodeCacheSize + 1;
			await this.evictLRUCodeCache(toEvict);
		}
	}

	/**
	 * Evict least recently used environments
	 */
	private async evictLRUEnvironments(count: number): Promise<void> {
		const environments = Array.from(this.environments.entries())
			.sort(([, a], [, b]) => a.lastUsed.getTime() - b.lastUsed.getTime())
			.slice(0, count);

		for (const [envId, environment] of environments) {
			await this.evictEnvironment(envId, environment);
		}
	}

	/**
	 * Evict environments to free memory
	 */
	private async evictEnvironmentsByMemory(): Promise<void> {
		const environments = Array.from(this.environments.entries()).sort(
			([, a], [, b]) => b.size - a.size,
		); // Largest first

		for (const [envId, environment] of environments) {
			await this.evictEnvironment(envId, environment);
			if (this.currentMemoryUsage <= this.config.maxMemoryUsage * 0.8) {
				break;
			}
		}
	}

	/**
	 * Evict least recently used code cache entries
	 */
	private async evictLRUCodeCache(count: number): Promise<void> {
		const cacheEntries = Array.from(this.codeCache.entries())
			.sort(([, a], [, b]) => a.lastExecuted.getTime() - b.lastExecuted.getTime())
			.slice(0, count);

		for (const [codeHash, cached] of cacheEntries) {
			if (cached.compiledPath) {
				try {
					await unlink(cached.compiledPath);
				} catch (error) {
					// Ignore cleanup errors
				}
			}
			this.codeCache.delete(codeHash);
		}
	}

	/**
	 * Evict a specific environment
	 */
	private async evictEnvironment(envId: string, environment: CachedEnvironment): Promise<void> {
		this.logger.debug('Evicting environment', { envId });

		this.environments.delete(envId);
		this.currentMemoryUsage -= environment.size;

		// Update package cache
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

	/**
	 * Initialize cache directories
	 */
	private async initializeCache(): Promise<void> {
		try {
			await mkdir(join(this.baseCacheDir, 'environments'), { recursive: true });
			await mkdir(join(this.baseCacheDir, 'compiled'), { recursive: true });
			await mkdir(join(this.baseCacheDir, 'temp'), { recursive: true });

			this.logger.info('Python cache directories initialized');
		} catch (error) {
			this.logger.error('Failed to initialize cache directories', { error });
		}
	}

	/**
	 * Start cleanup timer
	 */
	private startCleanupTimer(): void {
		this.cleanupTimer = setInterval(() => {
			this.performCleanup();
		}, this.config.cleanupInterval);
	}

	/**
	 * Perform periodic cleanup
	 */
	private performCleanup(): void {
		const now = Date.now();

		// Clean up expired environments
		const expiredEnvironments = Array.from(this.environments.entries()).filter(
			([, env]) => now - env.lastUsed.getTime() > this.config.environmentTTL,
		);

		for (const [envId, environment] of expiredEnvironments) {
			this.evictEnvironment(envId, environment);
		}

		// Clean up expired code cache
		const expiredCodeCache = Array.from(this.codeCache.entries()).filter(
			([, cache]) => now - cache.lastExecuted.getTime() > this.config.codeCacheTTL,
		);

		for (const [codeHash, cached] of expiredCodeCache) {
			if (cached.compiledPath) {
				unlink(cached.compiledPath).catch(() => {});
			}
			this.codeCache.delete(codeHash);
		}

		this.emit('cleanupCompleted', {
			expiredEnvironments: expiredEnvironments.length,
			expiredCodeCache: expiredCodeCache.length,
		});
	}

	/**
	 * Graceful shutdown
	 */
	async shutdown(): Promise<void> {
		this.logger.info('Shutting down Python Cache Service');

		if (this.cleanupTimer) {
			clearInterval(this.cleanupTimer);
		}

		// Final cleanup
		await this.clearAllCaches();

		this.logger.info('Python Cache Service shutdown complete');
	}
}
