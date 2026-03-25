import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { LogLine } from "../../types/log";

export interface CacheEntry {
  timestamp: number;
  data: unknown;
  requestId: string;
}

export interface CacheStore {
  [key: string]: CacheEntry;
}

export class BaseCache<T extends CacheEntry> {
  private readonly CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 1 week in milliseconds
  private readonly CLEANUP_PROBABILITY = 0.01; // 1% chance

  protected cacheDir: string;
  protected cacheFile: string;
  protected lockFile: string;
  protected logger: (message: LogLine) => void;

  private readonly LOCK_TIMEOUT_MS = 1_000;
  protected lockAcquired = false;
  protected lockAcquireFailures = 0;

  // Added for request ID tracking
  protected requestIdToUsedHashes: { [key: string]: string[] } = {};

  constructor(
    logger: (message: LogLine) => void,
    cacheDir: string = path.join(process.cwd(), "tmp", ".cache"),
    cacheFile: string = "cache.json",
  ) {
    this.logger = logger;
    this.cacheDir = cacheDir;
    this.cacheFile = path.join(cacheDir, cacheFile);
    this.lockFile = path.join(cacheDir, "cache.lock");
    this.ensureCacheDirectory();
    this.setupProcessHandlers();
  }

  private setupProcessHandlers(): void {
    const releaseLockAndExit = () => {
      this.releaseLock();
      process.exit();
    };

    process.on("exit", releaseLockAndExit);
    process.on("SIGINT", releaseLockAndExit);
    process.on("SIGTERM", releaseLockAndExit);
    process.on("uncaughtException", (err) => {
      this.logger({
        category: "base_cache",
        message: "uncaught exception",
        level: 2,
        auxiliary: {
          error: {
            value: err.message,
            type: "string",
          },
          trace: {
            value: err.stack,
            type: "string",
          },
        },
      });
      if (this.lockAcquired) {
        releaseLockAndExit();
      }
    });
  }

  protected ensureCacheDirectory(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
      this.logger({
        category: "base_cache",
        message: "created cache directory",
        level: 1,
        auxiliary: {
          cacheDir: {
            value: this.cacheDir,
            type: "string",
          },
        },
      });
    }
  }

  protected createHash(data: unknown): string {
    const hash = crypto.createHash("sha256");
    return hash.update(JSON.stringify(data)).digest("hex");
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public async acquireLock(): Promise<boolean> {
    const startTime = Date.now();
    while (Date.now() - startTime < this.LOCK_TIMEOUT_MS) {
      try {
        if (fs.existsSync(this.lockFile)) {
          const lockAge = Date.now() - fs.statSync(this.lockFile).mtimeMs;
          if (lockAge > this.LOCK_TIMEOUT_MS) {
            fs.unlinkSync(this.lockFile);
            this.logger({
              category: "base_cache",
              message: "Stale lock file removed",
              level: 1,
            });
          }
        }

        fs.writeFileSync(this.lockFile, process.pid.toString(), { flag: "wx" });
        this.lockAcquireFailures = 0;
        this.lockAcquired = true;
        this.logger({
          category: "base_cache",
          message: "Lock acquired",
          level: 1,
        });
        return true;
      } catch (e) {
        this.logger({
          category: "base_cache",
          message: "error acquiring lock",
          level: 2,
          auxiliary: {
            trace: {
              value: e.stack,
              type: "string",
            },
            message: {
              value: e.message,
              type: "string",
            },
          },
        });
        await this.sleep(5);
      }
    }
    this.logger({
      category: "base_cache",
      message: "Failed to acquire lock after timeout",
      level: 2,
    });
    this.lockAcquireFailures++;
    if (this.lockAcquireFailures >= 3) {
      this.logger({
        category: "base_cache",
        message:
          "Failed to acquire lock 3 times in a row. Releasing lock manually.",
        level: 1,
      });
      this.releaseLock();
    }
    return false;
  }

  public releaseLock(): void {
    try {
      if (fs.existsSync(this.lockFile)) {
        fs.unlinkSync(this.lockFile);
        this.logger({
          category: "base_cache",
          message: "Lock released",
          level: 1,
        });
      }
      this.lockAcquired = false;
    } catch (error) {
      this.logger({
        category: "base_cache",
        message: "error releasing lock",
        level: 2,
        auxiliary: {
          error: {
            value: error.message,
            type: "string",
          },
          trace: {
            value: error.stack,
            type: "string",
          },
        },
      });
    }
  }

  /**
   * Cleans up stale cache entries that exceed the maximum age.
   */
  public async cleanupStaleEntries(): Promise<void> {
    if (!(await this.acquireLock())) {
      this.logger({
        category: "llm_cache",
        message: "failed to acquire lock for cleanup",
        level: 2,
      });
      return;
    }

    try {
      const cache = this.readCache();
      const now = Date.now();
      let entriesRemoved = 0;

      for (const [hash, entry] of Object.entries(cache)) {
        if (now - entry.timestamp > this.CACHE_MAX_AGE_MS) {
          delete cache[hash];
          entriesRemoved++;
        }
      }

      if (entriesRemoved > 0) {
        this.writeCache(cache);
        this.logger({
          category: "llm_cache",
          message: "cleaned up stale cache entries",
          level: 1,
          auxiliary: {
            entriesRemoved: {
              value: entriesRemoved.toString(),
              type: "integer",
            },
          },
        });
      }
    } catch (error) {
      this.logger({
        category: "llm_cache",
        message: "error during cache cleanup",
        level: 2,
        auxiliary: {
          error: {
            value: error.message,
            type: "string",
          },
          trace: {
            value: error.stack,
            type: "string",
          },
        },
      });
    } finally {
      this.releaseLock();
    }
  }

  protected readCache(): CacheStore {
    if (fs.existsSync(this.cacheFile)) {
      try {
        const data = fs.readFileSync(this.cacheFile, "utf-8");
        return JSON.parse(data) as CacheStore;
      } catch (error) {
        this.logger({
          category: "base_cache",
          message: "error reading cache file. resetting cache.",
          level: 1,
          auxiliary: {
            error: {
              value: error.message,
              type: "string",
            },
            trace: {
              value: error.stack,
              type: "string",
            },
          },
        });
        this.resetCache();
        return {};
      }
    }
    return {};
  }

  protected writeCache(cache: CacheStore): void {
    try {
      fs.writeFileSync(this.cacheFile, JSON.stringify(cache, null, 2));
      this.logger({
        category: "base_cache",
        message: "Cache written to file",
        level: 1,
      });
    } catch (error) {
      this.logger({
        category: "base_cache",
        message: "error writing cache file",
        level: 2,
        auxiliary: {
          error: {
            value: error.message,
            type: "string",
          },
          trace: {
            value: error.stack,
            type: "string",
          },
        },
      });
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Retrieves data from the cache based on the provided options.
   * @param hashObj - The options used to generate the cache key.
   * @param requestId - The identifier for the current request.
   * @returns The cached data if available, otherwise null.
   */
  public async get(
    hashObj: Record<string, unknown> | string,
    requestId: string,
  ): Promise<T["data"] | null> {
    if (!(await this.acquireLock())) {
      this.logger({
        category: "base_cache",
        message: "Failed to acquire lock for getting cache",
        level: 2,
      });
      return null;
    }

    try {
      const hash = this.createHash(hashObj);
      const cache = this.readCache();

      if (cache[hash]) {
        this.trackRequestIdUsage(requestId, hash);
        return cache[hash].data;
      }
      return null;
    } catch (error) {
      this.logger({
        category: "base_cache",
        message: "error getting cache. resetting cache.",
        level: 1,
        auxiliary: {
          error: {
            value: error.message,
            type: "string",
          },
          trace: {
            value: error.stack,
            type: "string",
          },
        },
      });

      this.resetCache();
      return null;
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Stores data in the cache based on the provided options and requestId.
   * @param hashObj - The options used to generate the cache key.
   * @param data - The data to be cached.
   * @param requestId - The identifier for the cache entry.
   */
  public async set(
    hashObj: Record<string, unknown>,
    data: T["data"],
    requestId: string,
  ): Promise<void> {
    if (!(await this.acquireLock())) {
      this.logger({
        category: "base_cache",
        message: "Failed to acquire lock for setting cache",
        level: 2,
      });
      return;
    }

    try {
      const hash = this.createHash(hashObj);
      const cache = this.readCache();
      cache[hash] = {
        data,
        timestamp: Date.now(),
        requestId,
      };

      this.writeCache(cache);
      this.trackRequestIdUsage(requestId, hash);
    } catch (error) {
      this.logger({
        category: "base_cache",
        message: "error setting cache. resetting cache.",
        level: 1,
        auxiliary: {
          error: {
            value: error.message,
            type: "string",
          },
          trace: {
            value: error.stack,
            type: "string",
          },
        },
      });

      this.resetCache();
    } finally {
      this.releaseLock();

      if (Math.random() < this.CLEANUP_PROBABILITY) {
        this.cleanupStaleEntries();
      }
    }
  }

  public async delete(hashObj: Record<string, unknown>): Promise<void> {
    if (!(await this.acquireLock())) {
      this.logger({
        category: "base_cache",
        message: "Failed to acquire lock for removing cache entry",
        level: 2,
      });
      return;
    }

    try {
      const hash = this.createHash(hashObj);
      const cache = this.readCache();

      if (cache[hash]) {
        delete cache[hash];
        this.writeCache(cache);
      } else {
        this.logger({
          category: "base_cache",
          message: "Cache entry not found to delete",
          level: 1,
        });
      }
    } catch (error) {
      this.logger({
        category: "base_cache",
        message: "error removing cache entry",
        level: 2,
        auxiliary: {
          error: {
            value: error.message,
            type: "string",
          },
          trace: {
            value: error.stack,
            type: "string",
          },
        },
      });
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Tracks the usage of a hash with a specific requestId.
   * @param requestId - The identifier for the current request.
   * @param hash - The cache key hash.
   */
  protected trackRequestIdUsage(requestId: string, hash: string): void {
    this.requestIdToUsedHashes[requestId] ??= [];
    this.requestIdToUsedHashes[requestId].push(hash);
  }

  /**
   * Deletes all cache entries associated with a specific requestId.
   * @param requestId - The identifier for the request whose cache entries should be deleted.
   */
  public async deleteCacheForRequestId(requestId: string): Promise<void> {
    if (!(await this.acquireLock())) {
      this.logger({
        category: "base_cache",
        message: "Failed to acquire lock for deleting cache",
        level: 2,
      });
      return;
    }
    try {
      const cache = this.readCache();
      const hashes = this.requestIdToUsedHashes[requestId] ?? [];
      let entriesRemoved = 0;
      for (const hash of hashes) {
        if (cache[hash]) {
          delete cache[hash];
          entriesRemoved++;
        }
      }
      if (entriesRemoved > 0) {
        this.writeCache(cache);
      } else {
        this.logger({
          category: "base_cache",
          message: "no cache entries found for requestId",
          level: 1,
          auxiliary: {
            requestId: {
              value: requestId,
              type: "string",
            },
          },
        });
      }
      // Remove the requestId from the mapping after deletion
      delete this.requestIdToUsedHashes[requestId];
    } catch (error) {
      this.logger({
        category: "base_cache",
        message: "error deleting cache for requestId",
        level: 2,
        auxiliary: {
          error: {
            value: error.message,
            type: "string",
          },
          trace: {
            value: error.stack,
            type: "string",
          },
          requestId: {
            value: requestId,
            type: "string",
          },
        },
      });
    } finally {
      this.releaseLock();
    }
  }

  /**
   * Resets the entire cache by clearing the cache file.
   */
  public resetCache(): void {
    try {
      fs.writeFileSync(this.cacheFile, "{}");
      this.requestIdToUsedHashes = {}; // Reset requestId tracking
    } catch (error) {
      this.logger({
        category: "base_cache",
        message: "error resetting cache",
        level: 2,
        auxiliary: {
          error: {
            value: error.message,
            type: "string",
          },
          trace: {
            value: error.stack,
            type: "string",
          },
        },
      });
    } finally {
      this.releaseLock();
    }
  }
}
