import type { Document } from '../bson';
import type { Db } from '../db';
import { MONGODB_ERROR_CODES, MongoServerError } from '../error';
import type { Server } from '../sdam/server';
import type { ClientSession } from '../sessions';
import { type TimeoutContext } from '../timeout';
import { CommandOperation, type CommandOperationOptions } from './command';
import { Aspect, defineAspects } from './operation';

/** @public */
export interface DropCollectionOptions extends CommandOperationOptions {
  /** @experimental */
  encryptedFields?: Document;
}

/** @internal */
export class DropCollectionOperation extends CommandOperation<boolean> {
  override options: DropCollectionOptions;
  db: Db;
  name: string;

  constructor(db: Db, name: string, options: DropCollectionOptions = {}) {
    super(db, options);
    this.db = db;
    this.options = options;
    this.name = name;
  }

  override get commandName() {
    return 'drop' as const;
  }

  override async execute(
    server: Server,
    session: ClientSession | undefined,
    timeoutContext: TimeoutContext
  ): Promise<boolean> {
    const db = this.db;
    const options = this.options;
    const name = this.name;

    const encryptedFieldsMap = db.client.s.options.autoEncryption?.encryptedFieldsMap;
    let encryptedFields: Document | undefined =
      options.encryptedFields ?? encryptedFieldsMap?.[`${db.databaseName}.${name}`];

    if (!encryptedFields && encryptedFieldsMap) {
      // If the MongoClient was configured with an encryptedFieldsMap,
      // and no encryptedFields config was available in it or explicitly
      // passed as an argument, the spec tells us to look one up using
      // listCollections().
      const listCollectionsResult = await db
        .listCollections({ name }, { nameOnly: false })
        .toArray();
      encryptedFields = listCollectionsResult?.[0]?.options?.encryptedFields;
    }

    if (encryptedFields) {
      const escCollection = encryptedFields.escCollection || `enxcol_.${name}.esc`;
      const ecocCollection = encryptedFields.ecocCollection || `enxcol_.${name}.ecoc`;

      for (const collectionName of [escCollection, ecocCollection]) {
        // Drop auxilliary collections, ignoring potential NamespaceNotFound errors.
        const dropOp = new DropCollectionOperation(db, collectionName);
        try {
          await dropOp.executeWithoutEncryptedFieldsCheck(server, session, timeoutContext);
        } catch (err) {
          if (
            !(err instanceof MongoServerError) ||
            err.code !== MONGODB_ERROR_CODES.NamespaceNotFound
          ) {
            throw err;
          }
        }
      }
    }

    return await this.executeWithoutEncryptedFieldsCheck(server, session, timeoutContext);
  }

  private async executeWithoutEncryptedFieldsCheck(
    server: Server,
    session: ClientSession | undefined,
    timeoutContext: TimeoutContext
  ): Promise<boolean> {
    await super.executeCommand(server, session, { drop: this.name }, timeoutContext);
    return true;
  }
}

/** @public */
export type DropDatabaseOptions = CommandOperationOptions;

/** @internal */
export class DropDatabaseOperation extends CommandOperation<boolean> {
  override options: DropDatabaseOptions;

  constructor(db: Db, options: DropDatabaseOptions) {
    super(db, options);
    this.options = options;
  }
  override get commandName() {
    return 'dropDatabase' as const;
  }

  override async execute(
    server: Server,
    session: ClientSession | undefined,
    timeoutContext: TimeoutContext
  ): Promise<boolean> {
    await super.executeCommand(server, session, { dropDatabase: 1 }, timeoutContext);
    return true;
  }
}

defineAspects(DropCollectionOperation, [Aspect.WRITE_OPERATION]);
defineAspects(DropDatabaseOperation, [Aspect.WRITE_OPERATION]);
