import { EventEmitter } from 'events';
import { PoolConnection } from './PoolConnection.js';
import { PoolOptions } from './Pool.js';
import { ExecutableBase as ExecutableBaseClass } from './protocol/sequences/ExecutableBase.js';
import { QueryableBase as QueryableBaseClass } from './protocol/sequences/QueryableBase.js';

// Expose class interfaces
declare class QueryableAndExecutableBase extends QueryableBaseClass(
  ExecutableBaseClass(EventEmitter)
) {}

export interface PoolClusterOptions {
  /**
   * If true, PoolCluster will attempt to reconnect when connection fails. (Default: true)
   */
  canRetry?: boolean;

  /**
   * If connection fails, node's errorCount increases. When errorCount is greater than removeNodeErrorCount,
   * remove a node in the PoolCluster. (Default: 5)
   */
  removeNodeErrorCount?: number;

  /**
   * If connection fails, specifies the number of milliseconds before another connection attempt will be made.
   * If set to 0, then node will be removed instead and never re-used. (Default: 0)
   */
  restoreNodeTimeout?: number;

  /**
   * The default selector. (Default: RR)
   * RR: Select one alternately. (Round-Robin)
   * RANDOM: Select the node by random function.
   * ORDER: Select the first node available unconditionally.
   */
  defaultSelector?: string;
}

export interface PoolNamespace extends QueryableAndExecutableBase {
  getConnection(
    callback: (
      err: NodeJS.ErrnoException | null,
      connection: PoolConnection
    ) => any
  ): void;
}

declare class PoolCluster extends EventEmitter {
  config: PoolClusterOptions;

  add(config: PoolOptions): void;
  add(group: string, connectionUri: string): void;
  add(group: string, config: PoolOptions): void;

  remove(pattern: string): void;

  end(callback?: (err: NodeJS.ErrnoException | null) => void): void;

  getConnection(
    callback: (
      err: NodeJS.ErrnoException | null,
      connection: PoolConnection
    ) => void
  ): void;
  getConnection(
    group: string,
    callback: (
      err: NodeJS.ErrnoException | null,
      connection: PoolConnection
    ) => void
  ): void;
  getConnection(
    group: string,
    selector: string,
    callback: (
      err: NodeJS.ErrnoException | null,
      connection: PoolConnection
    ) => void
  ): void;

  of(pattern: string, selector?: string): PoolNamespace;

  on(event: string, listener: (...args: any[]) => void): this;
  on(event: 'online', listener: (nodeId: number) => void): this;
  on(event: 'offline', listener: (nodeId: number) => void): this;
  on(event: 'remove', listener: (nodeId: number) => void): this;
  on(event: 'warn', listener: (err: Error) => void): this;
}

export { PoolCluster };
