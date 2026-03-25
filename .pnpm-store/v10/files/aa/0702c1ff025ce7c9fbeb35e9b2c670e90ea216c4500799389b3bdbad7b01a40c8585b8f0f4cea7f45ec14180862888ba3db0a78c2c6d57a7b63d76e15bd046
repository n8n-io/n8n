import type { BSONSerializeOptions, Document } from '../bson';
import { type MongoDBResponseConstructor } from '../cmap/wire_protocol/responses';
import { MongoInvalidArgumentError } from '../error';
import {
  decorateWithExplain,
  Explain,
  type ExplainOptions,
  validateExplainTimeoutOptions
} from '../explain';
import { ReadConcern } from '../read_concern';
import type { ReadPreference } from '../read_preference';
import type { Server } from '../sdam/server';
import { MIN_SECONDARY_WRITE_WIRE_VERSION } from '../sdam/server_selection';
import type { ClientSession } from '../sessions';
import { type TimeoutContext } from '../timeout';
import { commandSupportsReadConcern, maxWireVersion, MongoDBNamespace } from '../utils';
import { WriteConcern, type WriteConcernOptions } from '../write_concern';
import type { ReadConcernLike } from './../read_concern';
import { AbstractOperation, Aspect, type OperationOptions } from './operation';

/** @public */
export interface CollationOptions {
  locale: string;
  caseLevel?: boolean;
  caseFirst?: string;
  strength?: number;
  numericOrdering?: boolean;
  alternate?: string;
  maxVariable?: string;
  backwards?: boolean;
  normalization?: boolean;
}

/** @public */
export interface CommandOperationOptions
  extends OperationOptions,
    WriteConcernOptions,
    ExplainOptions {
  /** Specify a read concern and level for the collection. (only MongoDB 3.2 or higher supported) */
  readConcern?: ReadConcernLike;
  /** Collation */
  collation?: CollationOptions;
  /**
   * maxTimeMS is a server-side time limit in milliseconds for processing an operation.
   */
  maxTimeMS?: number;
  /**
   * Comment to apply to the operation.
   *
   * In server versions pre-4.4, 'comment' must be string.  A server
   * error will be thrown if any other type is provided.
   *
   * In server versions 4.4 and above, 'comment' can be any valid BSON type.
   */
  comment?: unknown;
  /** Should retry failed writes */
  retryWrites?: boolean;

  // Admin command overrides.
  dbName?: string;
  authdb?: string;
  noResponse?: boolean;
}

/** @internal */
export interface OperationParent {
  s: { namespace: MongoDBNamespace };
  readConcern?: ReadConcern;
  writeConcern?: WriteConcern;
  readPreference?: ReadPreference;
  bsonOptions?: BSONSerializeOptions;
  timeoutMS?: number;
}

/** @internal */
export abstract class CommandOperation<T> extends AbstractOperation<T> {
  override options: CommandOperationOptions;
  readConcern?: ReadConcern;
  writeConcern?: WriteConcern;
  explain?: Explain;

  constructor(parent?: OperationParent, options?: CommandOperationOptions) {
    super(options);
    this.options = options ?? {};

    // NOTE: this was explicitly added for the add/remove user operations, it's likely
    //       something we'd want to reconsider. Perhaps those commands can use `Admin`
    //       as a parent?
    const dbNameOverride = options?.dbName || options?.authdb;
    if (dbNameOverride) {
      this.ns = new MongoDBNamespace(dbNameOverride, '$cmd');
    } else {
      this.ns = parent
        ? parent.s.namespace.withCollection('$cmd')
        : new MongoDBNamespace('admin', '$cmd');
    }

    this.readConcern = ReadConcern.fromOptions(options);
    this.writeConcern = WriteConcern.fromOptions(options);

    if (this.hasAspect(Aspect.EXPLAINABLE)) {
      this.explain = Explain.fromOptions(options);
      if (this.explain) validateExplainTimeoutOptions(this.options, this.explain);
    } else if (options?.explain != null) {
      throw new MongoInvalidArgumentError(`Option "explain" is not supported on this command`);
    }
  }

  override get canRetryWrite(): boolean {
    if (this.hasAspect(Aspect.EXPLAINABLE)) {
      return this.explain == null;
    }
    return super.canRetryWrite;
  }

  public async executeCommand<T extends MongoDBResponseConstructor>(
    server: Server,
    session: ClientSession | undefined,
    cmd: Document,
    timeoutContext: TimeoutContext,
    responseType: T | undefined
  ): Promise<typeof responseType extends undefined ? Document : InstanceType<T>>;

  public async executeCommand(
    server: Server,
    session: ClientSession | undefined,
    cmd: Document,
    timeoutContext: TimeoutContext
  ): Promise<Document>;

  async executeCommand(
    server: Server,
    session: ClientSession | undefined,
    cmd: Document,
    timeoutContext: TimeoutContext,
    responseType?: MongoDBResponseConstructor
  ): Promise<Document> {
    this.server = server;

    const options = {
      ...this.options,
      ...this.bsonOptions,
      timeoutContext,
      readPreference: this.readPreference,
      session
    };

    const serverWireVersion = maxWireVersion(server);
    const inTransaction = this.session && this.session.inTransaction();

    if (this.readConcern && commandSupportsReadConcern(cmd) && !inTransaction) {
      Object.assign(cmd, { readConcern: this.readConcern });
    }

    if (this.trySecondaryWrite && serverWireVersion < MIN_SECONDARY_WRITE_WIRE_VERSION) {
      options.omitReadPreference = true;
    }

    if (this.writeConcern && this.hasAspect(Aspect.WRITE_OPERATION) && !inTransaction) {
      WriteConcern.apply(cmd, this.writeConcern);
    }

    if (
      options.collation &&
      typeof options.collation === 'object' &&
      !this.hasAspect(Aspect.SKIP_COLLATION)
    ) {
      Object.assign(cmd, { collation: options.collation });
    }

    if (typeof options.maxTimeMS === 'number') {
      cmd.maxTimeMS = options.maxTimeMS;
    }

    if (this.hasAspect(Aspect.EXPLAINABLE) && this.explain) {
      cmd = decorateWithExplain(cmd, this.explain);
    }

    return await server.command(this.ns, cmd, options, responseType);
  }
}
