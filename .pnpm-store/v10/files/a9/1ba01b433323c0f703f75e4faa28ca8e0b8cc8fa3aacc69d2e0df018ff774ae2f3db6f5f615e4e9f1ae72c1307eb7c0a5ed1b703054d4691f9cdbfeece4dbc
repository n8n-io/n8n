import type { Document } from '../bson';
import type { Collection } from '../collection';
import type { Server } from '../sdam/server';
import type { ClientSession } from '../sessions';
import { type TimeoutContext } from '../timeout';
import type { MongoDBNamespace } from '../utils';
import { CommandOperation, type CommandOperationOptions } from './command';
import { Aspect, defineAspects } from './operation';

/** @public */
export interface CountOptions extends CommandOperationOptions {
  /** The number of documents to skip. */
  skip?: number;
  /** The maximum amounts to count before aborting. */
  limit?: number;
  /**
   * Number of milliseconds to wait before aborting the query.
   */
  maxTimeMS?: number;
  /** An index name hint for the query. */
  hint?: string | Document;
}

/** @internal */
export class CountOperation extends CommandOperation<number> {
  override options: CountOptions;
  collectionName?: string;
  query: Document;

  constructor(namespace: MongoDBNamespace, filter: Document, options: CountOptions) {
    super({ s: { namespace: namespace } } as unknown as Collection, options);

    this.options = options;
    this.collectionName = namespace.collection;
    this.query = filter;
  }

  override get commandName() {
    return 'count' as const;
  }

  override async execute(
    server: Server,
    session: ClientSession | undefined,
    timeoutContext: TimeoutContext
  ): Promise<number> {
    const options = this.options;
    const cmd: Document = {
      count: this.collectionName,
      query: this.query
    };

    if (typeof options.limit === 'number') {
      cmd.limit = options.limit;
    }

    if (typeof options.skip === 'number') {
      cmd.skip = options.skip;
    }

    if (options.hint != null) {
      cmd.hint = options.hint;
    }

    if (typeof options.maxTimeMS === 'number') {
      cmd.maxTimeMS = options.maxTimeMS;
    }

    const result = await super.executeCommand(server, session, cmd, timeoutContext);
    return result ? result.n : 0;
  }
}

defineAspects(CountOperation, [Aspect.READ_OPERATION, Aspect.RETRYABLE]);
