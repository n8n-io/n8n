/**
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
const TURN_STATE_SCOPE_CACHE = Symbol('turnStateScopeCache')

/**
 * A collection for managing state within a turn context.
 */
export class TurnContextStateCollection extends Map<any, any> {
  /**
   * Gets the value associated with the specified key.
   * @param key The key of the element to get.
   * @returns The element associated with the specified key, or undefined if the key does not exist.
   */
  get<T = any>(key: any): T

  /**
   * Gets the value associated with the specified key.
   * @param key The key of the element to get.
   * @returns The element associated with the specified key, or undefined if the key does not exist.
   */
  get (key: any): any

  get (key: any): unknown {
    return super.get(key)
  }

  /**
   * Pushes a value onto the stack for the specified key.
   * @param key The key of the element to push.
   * @param value The value to push onto the stack.
   */
  push (key: any, value: any): void {
    const current = this.get(key)
    const cache: Map<any, any[]> = this.get(TURN_STATE_SCOPE_CACHE) || new Map<any, any[]>()
    if (cache.has(key)) {
      cache.get(key)?.push(current)
    } else {
      cache.set(key, [current])
    }

    if (value === undefined) {
      value = current
    }
    this.set(key, value)
    this.set(TURN_STATE_SCOPE_CACHE, cache)
  }

  /**
   * Pops a value from the stack for the specified key.
   * @param key The key of the element to pop.
   * @returns The value that was popped from the stack.
   */
  pop (key: any): any {
    const current = this.get(key)

    let previous: any
    const cache: Map<any, any[]> = this.get(TURN_STATE_SCOPE_CACHE) || new Map<any, any[]>()
    if (cache.has(key)) {
      previous = cache.get(key)?.pop()
    }

    this.set(key, previous)
    this.set(TURN_STATE_SCOPE_CACHE, cache)

    return current
  }
}
