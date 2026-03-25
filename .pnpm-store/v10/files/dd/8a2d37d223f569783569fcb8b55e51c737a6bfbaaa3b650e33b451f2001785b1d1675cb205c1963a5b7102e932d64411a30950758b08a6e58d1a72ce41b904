// This file was modified by Oracle on November 04, 2021.
// Type definitions and corresponding descriptions were introduced for the
// connection options relevant for multifactor authentication.
// Modifications copyright (c) 2021, Oracle and/or its affiliates.

import { EventEmitter } from 'events';
import { Readable } from 'stream';
import { Query, QueryError } from './protocol/sequences/Query.js';
import { Prepare, PrepareStatementInfo } from './protocol/sequences/Prepare.js';
import {
  OkPacket,
  FieldPacket,
  RowDataPacket,
  ResultSetHeader,
  OkPacketParams,
  ErrorPacketParams,
} from './protocol/packets/index.js';
import { Connection as PromiseConnection } from '../../../promise.js';
import { AuthPlugin } from './Auth.js';
import { QueryableBase } from './protocol/sequences/QueryableBase.js';
import { ExecutableBase } from './protocol/sequences/ExecutableBase.js';
import { TypeCast } from './parsers/typeCast.js';

export interface SslOptions {
  /**
   * A string or buffer holding the PFX or PKCS12 encoded private key, certificate and CA certificates
   */
  pfx?: string;

  /**
   * Either a string/buffer or list of strings/Buffers holding the PEM encoded private key(s) to use
   */
  key?: string | string[] | Buffer | Buffer[];

  /**
   * A string of passphrase for the private key or pfx
   */
  passphrase?: string;

  /**
   * A string/buffer or list of strings/Buffers holding the PEM encoded certificate(s)
   */
  cert?: string | string[] | Buffer | Buffer[];

  /**
   * Either a string/Buffer or list of strings/Buffers of PEM encoded CA certificates to trust.
   */
  ca?: string | string[] | Buffer | Buffer[];

  /**
   * Either a string or list of strings of PEM encoded CRLs (Certificate Revocation List)
   */
  crl?: string | string[];

  /**
   * A string describing the ciphers to use or exclude
   */
  ciphers?: string;

  /**
   * You can also connect to a MySQL server without properly providing the appropriate CA to trust. You should not do this.
   */
  rejectUnauthorized?: boolean;

  /**
   * Configure the minimum supported version of SSL, the default is TLSv1.2.
   */
  minVersion?: string;

  /**
   * Configure the maximum supported version of SSL, the default is TLSv1.3.
   */
  maxVersion?: string;

  /**
   * You can verify the server name identity presented on the server certificate when connecting to a MySQL server.
   * You should enable this but it is disabled by default right now for backwards compatibility.
   */
  verifyIdentity?: boolean;
}

export interface ConnectionOptions {
  /**
   * DECIMAL and NEWDECIMAL types will be returned as numbers if this option is set to `true` ( default: `false`).
   */
  decimalNumbers?: boolean;

  /**
   * The MySQL user to authenticate as
   */
  user?: string;

  /**
   * The password of that MySQL user
   */
  password?: string;

  /**
   * Alias for the MySQL user password. Makes a bit more sense in a multifactor authentication setup (see
   * "password2" and "password3")
   */
  password1?: string;

  /**
   * 2nd factor authentication password. Mandatory when the authentication policy for the MySQL user account
   * requires an additional authentication method that needs a password.
   * https://dev.mysql.com/doc/refman/8.0/en/multifactor-authentication.html
   */
  password2?: string;

  /**
   * 3rd factor authentication password. Mandatory when the authentication policy for the MySQL user account
   * requires two additional authentication methods and the last one needs a password.
   * https://dev.mysql.com/doc/refman/8.0/en/multifactor-authentication.html
   */
  password3?: string;

  /**
   * Name of the database to use for this connection
   */
  database?: string;

  /**
   * The charset for the connection. This is called 'collation' in the SQL-level of MySQL (like utf8_general_ci).
   * If a SQL-level charset is specified (like utf8mb4) then the default collation for that charset is used.
   * (Default: 'UTF8_GENERAL_CI')
   */
  charset?: string;

  /**
   * The hostname of the database you are connecting to. (Default: localhost)
   */
  host?: string;

  /**
   * The port number to connect to. (Default: 3306)
   */
  port?: number;

  /**
   * The source IP address to use for TCP connection
   */
  localAddress?: string;

  /**
   * The path to a unix domain socket to connect to. When used host and port are ignored
   */
  socketPath?: string;

  /**
   * The timezone used to store local dates. (Default: 'local')
   */
  timezone?: string | 'local';

  /**
   * The milliseconds before a timeout occurs during the initial connection to the MySQL server. (Default: 10 seconds)
   */
  connectTimeout?: number;

  /**
   * Stringify objects instead of converting to values. (Default: 'false')
   */
  stringifyObjects?: boolean;

  /**
   * Allow connecting to MySQL instances that ask for the old (insecure) authentication method. (Default: false)
   */
  insecureAuth?: boolean;

  /**
   * By specifying a function that returns a readable stream, an arbitrary stream can be sent when sending a local fs file.
   */
  infileStreamFactory?: (path: string) => Readable;

  /**
   * Determines if column values should be converted to native JavaScript types.
   *
   * @default true
   *
   * It is not recommended (and may go away / change in the future) to disable type casting, but you can currently do so on either the connection or query level.
   *
   * ---
   *
   * You can also specify a function to do the type casting yourself:
   * ```ts
   * (field: Field, next: () => unknown) => {
   *   return next();
   * }
   * ```
   *
   * ---
   *
   * **WARNING:**
   *
   * YOU MUST INVOKE the parser using one of these three field functions in your custom typeCast callback. They can only be called once:
   *
   * ```js
   * field.string();
   * field.buffer();
   * field.geometry();
   * ```

   * Which are aliases for:
   *
   * ```js
   * parser.parseLengthCodedString();
   * parser.parseLengthCodedBuffer();
   * parser.parseGeometryValue();
   * ```
   *
   * You can find which field function you need to use by looking at `RowDataPacket.prototype._typeCast`.
   */
  typeCast?: TypeCast;

  /**
   * A custom query format function
   */
  queryFormat?: (query: string, values: any) => void;

  /**
   * When dealing with big numbers (BIGINT and DECIMAL columns) in the database, you should enable this option
   * (Default: false)
   */
  supportBigNumbers?: boolean;

  /**
   * Enabling both supportBigNumbers and bigNumberStrings forces big numbers (BIGINT and DECIMAL columns) to be
   * always returned as JavaScript String objects (Default: false). Enabling supportBigNumbers but leaving
   * bigNumberStrings disabled will return big numbers as String objects only when they cannot be accurately
   * represented with [JavaScript Number objects](https://262.ecma-international.org/5.1/#sec-8.5)
   * (which happens when they exceed the [-2^53, +2^53] range), otherwise they will be returned as Number objects.
   * This option is ignored if supportBigNumbers is disabled.
   */
  bigNumberStrings?: boolean;

  /**
   * Force date types (TIMESTAMP, DATETIME, DATE) to be returned as strings rather then inflated into JavaScript Date
   * objects. Can be true/false or an array of type names to keep as strings.
   *
   * (Default: false)
   */
  dateStrings?: boolean | Array<'TIMESTAMP' | 'DATETIME' | 'DATE'>;

  /**
   * This will print all incoming and outgoing packets on stdout.
   * You can also restrict debugging to packet types by passing an array of types (strings) to debug;
   *
   * (Default: false)
   */
  debug?: any;

  /**
   * Generates stack traces on Error to include call site of library entrance ('long stack traces'). Slight
   * performance penalty for most calls. (Default: true)
   */
  trace?: boolean;

  /**
   * Allow multiple mysql statements per query. Be careful with this, it exposes you to SQL injection attacks. (Default: false)
   */
  multipleStatements?: boolean;

  /**
   * List of connection flags to use other than the default ones. It is also possible to blacklist default ones
   */
  flags?: Array<string>;

  /**
   * object with ssl parameters or a string containing name of ssl profile
   */
  ssl?: string | SslOptions;

  /**
   * Return each row as an array, not as an object.
   * This is useful when you have duplicate column names.
   * This can also be set in the `QueryOption` object to be applied per-query.
   */
  rowsAsArray?: boolean;

  /**
   * Enable keep-alive on the socket. (Default: true)
   */
  enableKeepAlive?: boolean;

  /**
   * If keep-alive is enabled users can supply an initial delay. (Default: 0)
   */
  keepAliveInitialDelay?: number;

  charsetNumber?: number;

  compress?: boolean;

  authSwitchHandler?: (data: any, callback: () => void) => any;

  connectAttributes?: { [param: string]: any };

  isServer?: boolean;

  maxPreparedStatements?: number;

  namedPlaceholders?: boolean;

  nestTables?: boolean | string;

  passwordSha1?: string;

  pool?: any;

  stream?: any;

  uri?: string;

  connectionLimit?: number;

  maxIdle?: number;

  idleTimeout?: number;

  Promise?: any;

  queueLimit?: number;

  waitForConnections?: boolean;

  disableEval?: boolean;

  authPlugins?: {
    [key: string]: AuthPlugin;
  };

  /**
   * Force JSON to be returned as string
   *
   * (Default: false)
   */
  jsonStrings?: boolean;

  gracefulEnd?: boolean;
}

export type ConnectionState =
  | 'disconnected'
  | 'protocol_handshake'
  | 'connected'
  | 'authenticated'
  | 'error';

declare class Connection extends QueryableBase(ExecutableBase(EventEmitter)) {
  config: ConnectionOptions;

  threadId: number;

  authorized: boolean;

  readonly state: ConnectionState;

  static createQuery<
    T extends
      | RowDataPacket[][]
      | RowDataPacket[]
      | OkPacket
      | OkPacket[]
      | ResultSetHeader,
  >(
    sql: string,
    callback?: (err: QueryError | null, result: T, fields: FieldPacket[]) => any
  ): Query;
  static createQuery<
    T extends
      | RowDataPacket[][]
      | RowDataPacket[]
      | OkPacket
      | OkPacket[]
      | ResultSetHeader,
  >(
    sql: string,
    values: any | any[] | { [param: string]: any },
    callback?: (err: QueryError | null, result: T, fields: FieldPacket[]) => any
  ): Query;

  beginTransaction(callback: (err: QueryError | null) => void): void;

  connect(callback?: (err: QueryError | null) => void): void;

  commit(callback?: (err: QueryError | null) => void): void;

  changeUser(
    options: ConnectionOptions,
    callback?: (err: QueryError | null) => void
  ): void;

  end(callback?: (err: QueryError | null) => void): void;
  end(options: any, callback?: (err: QueryError | null) => void): void;

  destroy(): void;

  pause(): void;

  resume(): void;

  escape(value: any): string;

  escapeId(value: string): string;
  escapeId(values: string[]): string;

  format(sql: string, values?: any | any[] | { [param: string]: any }): string;

  on(event: string, listener: (...args: any[]) => void): this;

  rollback(callback: (err: QueryError | null) => void): void;

  prepare(
    sql: string,
    callback?: (err: QueryError | null, statement: PrepareStatementInfo) => any
  ): Prepare;

  unprepare(sql: string): PrepareStatementInfo;

  serverHandshake(args: any): any;

  promise(promiseImpl?: PromiseConstructor): PromiseConnection;

  ping(callback?: (err: QueryError | null) => any): void;

  writeOk(args?: OkPacketParams): void;

  writeError(args?: ErrorPacketParams): void;

  writeEof(warnings?: number, statusFlags?: number): void;

  writeTextResult(rows?: Array<any>, columns?: Array<any>): void;

  writePacket(packet: any): void;

  sequenceId: number;
}

export { Connection };
