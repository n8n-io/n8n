import type { Document } from '../bson';
import type { Db } from '../db';
import { type TODO_NODE_3286 } from '../mongo_types';
import type { Server } from '../sdam/server';
import type { ClientSession } from '../sessions';
import { type TimeoutContext } from '../timeout';
import { maxWireVersion, MongoDBNamespace } from '../utils';
import { CommandOperation, type CommandOperationOptions } from './command';
import { Aspect, defineAspects } from './operation';

/** @public */
export interface ListDatabasesResult {
  databases: ({ name: string; sizeOnDisk?: number; empty?: boolean } & Document)[];
  totalSize?: number;
  totalSizeMb?: number;
  ok: 1 | 0;
}

/** @public */
export interface ListDatabasesOptions extends CommandOperationOptions {
  /** A query predicate that determines which databases are listed */
  filter?: Document;
  /** A flag to indicate whether the command should return just the database names, or return both database names and size information */
  nameOnly?: boolean;
  /** A flag that determines which databases are returned based on the user privileges when access control is enabled */
  authorizedDatabases?: boolean;
}

/** @internal */
export class ListDatabasesOperation extends CommandOperation<ListDatabasesResult> {
  override options: ListDatabasesOptions;

  constructor(db: Db, options?: ListDatabasesOptions) {
    super(db, options);
    this.options = options ?? {};
    this.ns = new MongoDBNamespace('admin', '$cmd');
  }

  override get commandName() {
    return 'listDatabases' as const;
  }

  override async execute(
    server: Server,
    session: ClientSession | undefined,
    timeoutContext: TimeoutContext
  ): Promise<ListDatabasesResult> {
    const cmd: Document = { listDatabases: 1 };

    if (typeof this.options.nameOnly === 'boolean') {
      cmd.nameOnly = this.options.nameOnly;
    }

    if (this.options.filter) {
      cmd.filter = this.options.filter;
    }

    if (typeof this.options.authorizedDatabases === 'boolean') {
      cmd.authorizedDatabases = this.options.authorizedDatabases;
    }

    // we check for undefined specifically here to allow falsy values
    // eslint-disable-next-line no-restricted-syntax
    if (maxWireVersion(server) >= 9 && this.options.comment !== undefined) {
      cmd.comment = this.options.comment;
    }

    return await (super.executeCommand(
      server,
      session,
      cmd,
      timeoutContext
    ) as Promise<TODO_NODE_3286>);
  }
}

defineAspects(ListDatabasesOperation, [Aspect.READ_OPERATION, Aspect.RETRYABLE]);
