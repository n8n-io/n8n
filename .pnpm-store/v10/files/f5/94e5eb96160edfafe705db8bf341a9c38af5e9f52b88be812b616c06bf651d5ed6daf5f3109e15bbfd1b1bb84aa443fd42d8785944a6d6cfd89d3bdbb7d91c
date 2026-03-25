import { Pool as BasePool, PoolOptions } from './lib/Pool.js';
import {
  Connection as BaseConnection,
  ConnectionOptions,
  SslOptions,
} from './lib/Connection.js';
import {
  Query as BaseQuery,
  QueryOptions,
  QueryError,
} from './lib/protocol/sequences/Query.js';
import {
  PoolCluster as BasePoolCluster,
  PoolClusterOptions,
  PoolNamespace,
} from './lib/PoolCluster.js';
import { PoolConnection as BasePoolConnection } from './lib/PoolConnection.js';
import {
  Prepare as BasePrepare,
  PrepareStatementInfo,
} from './lib/protocol/sequences/Prepare.js';
import { Server } from './lib/Server.js';
import {
  escape as SqlStringEscape,
  escapeId as SqlStringEscapeId,
  format as SqlStringFormat,
  raw as SqlStringRaw,
} from 'sql-escaper';
export type { Raw, SqlValue, Timezone } from 'sql-escaper';

export {
  ConnectionOptions,
  SslOptions,
  PoolOptions,
  PoolClusterOptions,
  PoolNamespace,
  QueryOptions,
  QueryError,
  PrepareStatementInfo,
};

export * from './lib/protocol/packets/index.js';
export * from './lib/Auth.js';
export * from './lib/constants/index.js';
export * from './lib/parsers/index.js';
export * from './lib/Connection.js';

// Expose class interfaces
export interface Connection extends BaseConnection {}
export interface Pool extends BasePool {}
export interface PoolConnection extends BasePoolConnection {}
export interface PoolCluster extends BasePoolCluster {}
export interface Query extends BaseQuery {}
export interface Prepare extends BasePrepare {}

export function createConnection(connectionUri: string): BaseConnection;
export function createConnection(config: ConnectionOptions): BaseConnection;

export function createPool(connectionUri: string): BasePool;
export function createPool(config: PoolOptions): BasePool;

export function createPoolCluster(config?: PoolClusterOptions): PoolCluster;

export const escape: typeof SqlStringEscape;
export const escapeId: typeof SqlStringEscapeId;
export const format: typeof SqlStringFormat;
export const raw: typeof SqlStringRaw;

export interface ConnectionConfig extends ConnectionOptions {
  mergeFlags(defaultFlags: string[], userFlags: string[] | string): number;
  getDefaultFlags(options?: ConnectionOptions): string[];
  getCharsetNumber(charset: string): number;
  getSSLProfile(name: string): { ca: string[] };
  parseUrl(url: string): {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    [key: string]: any;
  };
}

export function createServer(handler: (conn: BaseConnection) => any): Server;
