import { EventEmitter } from 'events';

import {
  RowDataPacket,
  OkPacket,
  ResultSetHeader,
  FieldPacket,
  QueryOptions,
  ConnectionOptions,
  PoolOptions,
  PoolClusterOptions,
  Pool as CorePool,
  ConnectionState,
} from './index.js';
import { ExecutableBase as ExecutableBaseClass } from './typings/mysql/lib/protocol/sequences/promise/ExecutableBase.js';
import { QueryableBase as QueryableBaseClass } from './typings/mysql/lib/protocol/sequences/promise/QueryableBase.js';

export * from './index.js';

// Expose class interfaces
declare class QueryableAndExecutableBase extends QueryableBaseClass(
  ExecutableBaseClass(EventEmitter)
) {}

export interface PreparedStatementInfo {
  close(): Promise<void>;
  execute(
    parameters: any | any[] | { [param: string]: any }
  ): Promise<
    [
      (
        | RowDataPacket[][]
        | RowDataPacket[]
        | OkPacket
        | OkPacket[]
        | ResultSetHeader
      ),
      FieldPacket[],
    ]
  >;
}

export interface Connection extends QueryableAndExecutableBase {
  config: ConnectionOptions;

  threadId: number;

  readonly state: ConnectionState;

  connect(): Promise<void>;

  ping(): Promise<void>;

  beginTransaction(): Promise<void>;

  commit(): Promise<void>;

  rollback(): Promise<void>;

  changeUser(options: ConnectionOptions): Promise<void>;

  prepare(options: string | QueryOptions): Promise<PreparedStatementInfo>;

  unprepare(sql: string | QueryOptions): void;

  end(options?: any): Promise<void>;

  destroy(): void;

  pause(): void;

  resume(): void;

  escape(value: any): string;

  escapeId(value: string): string;
  escapeId(values: string[]): string;

  format(sql: string, values?: any | any[] | { [param: string]: any }): string;
}

export interface PoolConnection extends Connection {
  release(): void;
  connection: Connection;
}

export interface Pool extends Connection {
  getConnection(): Promise<PoolConnection>;

  releaseConnection(connection: PoolConnection): void;

  on(event: 'connection', listener: (connection: PoolConnection) => any): this;
  on(event: 'acquire', listener: (connection: PoolConnection) => any): this;
  on(event: 'release', listener: (connection: PoolConnection) => any): this;
  on(event: 'enqueue', listener: () => any): this;

  end(): Promise<void>;

  pool: CorePool;
}

export interface PoolNamespace extends QueryableAndExecutableBase {
  getConnection(): Promise<PoolConnection>;
}

export interface PoolCluster extends EventEmitter {
  config: PoolClusterOptions;

  add(config: PoolOptions): void;
  add(group: string, connectionUri: string): void;
  add(group: string, config: PoolOptions): void;

  end(): Promise<void>;

  getConnection(): Promise<PoolConnection>;
  getConnection(group: string): Promise<PoolConnection>;
  getConnection(group: string, selector: string): Promise<PoolConnection>;

  of(pattern: string, selector?: string): PoolNamespace;

  on(event: string, listener: (...args: any[]) => void): this;
  on(event: 'remove', listener: (nodeId: number) => void): this;
  on(event: 'warn', listener: (err: Error) => void): this;
}

export function createConnection(connectionUri: string): Promise<Connection>;
export function createConnection(
  config: ConnectionOptions
): Promise<Connection>;

export function createPool(connectionUri: string): Pool;
export function createPool(config: PoolOptions): Pool;

export function createPoolCluster(config?: PoolClusterOptions): PoolCluster;
