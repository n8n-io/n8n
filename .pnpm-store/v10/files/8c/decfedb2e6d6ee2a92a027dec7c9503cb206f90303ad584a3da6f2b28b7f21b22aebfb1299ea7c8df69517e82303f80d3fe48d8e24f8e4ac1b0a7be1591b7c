/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const CACHE_PURGE_INTERVAL = 60000 // 60 seconds

/**
 * Simple in-memory cache with TTL support.
 * This is used to store authentication tokens for Agentic Identity scenarios only!
 */
export class MemoryCache<T> {
  private cache = new Map<string, { value: T; validUntil: number }>()
  private purgeInterval?: NodeJS.Timeout

  /**
   * Clears the purge interval to allow the process to exit cleanly
   */
  destroy (): void {
    if (this.purgeInterval) {
      clearInterval(this.purgeInterval)
      this.purgeInterval = undefined
    }
  }

  set (key: string, value: T, ttlSeconds: number): void {
    const validUntil = Date.now() + (ttlSeconds * 1000)
    this.cache.set(key, { value, validUntil })
    if (!this.purgeInterval) {
      this.purgeInterval = setInterval(() => this.purge(), CACHE_PURGE_INTERVAL)
    }
  }

  get (key: string): T | undefined {
    const item = this.cache.get(key)
    if (!item) {
      return undefined
    }

    // Check if item has expired
    if (Date.now() > item.validUntil) {
      this.cache.delete(key)
      return undefined
    }
    return item.value
  }

  delete (key: string): boolean {
    return this.cache.delete(key)
  }

  purge (): void {
    const now = Date.now()
    for (const [key, { validUntil }] of this.cache.entries()) {
      if (now > validUntil) {
        this.cache.delete(key)
      }
    }
  }
}
