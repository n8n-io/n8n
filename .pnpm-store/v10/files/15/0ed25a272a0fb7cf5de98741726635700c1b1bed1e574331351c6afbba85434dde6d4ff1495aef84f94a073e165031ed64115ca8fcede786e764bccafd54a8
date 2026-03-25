import { Collection } from '../collection';
import type { Db } from '../db';
import type { Server } from '../sdam/server';
import type { ClientSession } from '../sessions';
import { AbstractOperation, type OperationOptions } from './operation';

export interface CollectionsOptions extends OperationOptions {
  nameOnly?: boolean;
}

/** @internal */
export class CollectionsOperation extends AbstractOperation<Collection[]> {
  override options: CollectionsOptions;
  db: Db;

  constructor(db: Db, options: CollectionsOptions) {
    super(options);
    this.options = options;
    this.db = db;
  }

  override get commandName() {
    return 'listCollections' as const;
  }

  override async execute(
    server: Server,
    session: ClientSession | undefined
  ): Promise<Collection[]> {
    // Let's get the collection names
    const documents = await this.db
      .listCollections(
        {},
        { ...this.options, nameOnly: true, readPreference: this.readPreference, session }
      )
      .toArray();
    const collections: Collection[] = [];
    for (const { name } of documents) {
      if (!name.includes('$')) {
        // Filter collections removing any illegal ones
        collections.push(new Collection(this.db, name, this.db.s.options));
      }
    }
    // Return the collection objects
    return collections;
  }
}
