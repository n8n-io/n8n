import type {
  AnyBulkWriteOperation,
  BulkOperationBase,
  BulkWriteOptions,
  BulkWriteResult
} from '../bulk/common';
import type { Collection } from '../collection';
import type { Server } from '../sdam/server';
import type { ClientSession } from '../sessions';
import { type TimeoutContext } from '../timeout';
import { AbstractOperation, Aspect, defineAspects } from './operation';

/** @internal */
export class BulkWriteOperation extends AbstractOperation<BulkWriteResult> {
  override options: BulkWriteOptions;
  collection: Collection;
  operations: ReadonlyArray<AnyBulkWriteOperation>;

  constructor(
    collection: Collection,
    operations: ReadonlyArray<AnyBulkWriteOperation>,
    options: BulkWriteOptions
  ) {
    super(options);
    this.options = options;
    this.collection = collection;
    this.operations = operations;
  }

  override get commandName() {
    return 'bulkWrite' as const;
  }

  override async execute(
    server: Server,
    session: ClientSession | undefined,
    timeoutContext: TimeoutContext
  ): Promise<BulkWriteResult> {
    const coll = this.collection;
    const operations = this.operations;
    const options = {
      ...this.options,
      ...this.bsonOptions,
      readPreference: this.readPreference,
      timeoutContext
    };

    // Create the bulk operation
    const bulk: BulkOperationBase =
      options.ordered === false
        ? coll.initializeUnorderedBulkOp(options)
        : coll.initializeOrderedBulkOp(options);

    // for each op go through and add to the bulk
    for (let i = 0; i < operations.length; i++) {
      bulk.raw(operations[i]);
    }

    // Execute the bulk
    return await bulk.execute({ ...options, session });
  }
}

defineAspects(BulkWriteOperation, [Aspect.WRITE_OPERATION]);
