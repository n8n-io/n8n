import type { Collection } from '../collection';
import { MongoAPIError } from '../error';
import type { Server } from '../sdam/server';
import type { ClientSession } from '../sessions';
import { AbstractOperation, type OperationOptions } from './operation';

/** @internal */
export class IsCappedOperation extends AbstractOperation<boolean> {
  override options: OperationOptions;
  collection: Collection;

  constructor(collection: Collection, options: OperationOptions) {
    super(options);
    this.options = options;
    this.collection = collection;
  }

  override get commandName() {
    return 'listCollections' as const;
  }

  override async execute(server: Server, session: ClientSession | undefined): Promise<boolean> {
    const coll = this.collection;
    const [collection] = await coll.s.db
      .listCollections(
        { name: coll.collectionName },
        { ...this.options, nameOnly: false, readPreference: this.readPreference, session }
      )
      .toArray();
    if (collection == null || collection.options == null) {
      throw new MongoAPIError(`collection ${coll.namespace} not found`);
    }
    return !!collection.options?.capped;
  }
}
