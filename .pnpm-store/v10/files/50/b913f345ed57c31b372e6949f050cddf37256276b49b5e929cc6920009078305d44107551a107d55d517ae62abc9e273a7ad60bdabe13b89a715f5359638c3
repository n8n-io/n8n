import type { Document } from '../bson';
import type { Collection } from '../collection';
import { MongoCompatibilityError, MongoInvalidArgumentError } from '../error';
import { ReadPreference } from '../read_preference';
import type { Server } from '../sdam/server';
import type { ClientSession } from '../sessions';
import { formatSort, type Sort, type SortForCmd } from '../sort';
import { type TimeoutContext } from '../timeout';
import { decorateWithCollation, hasAtomicOperators, maxWireVersion } from '../utils';
import { type WriteConcern, type WriteConcernSettings } from '../write_concern';
import { CommandOperation, type CommandOperationOptions } from './command';
import { Aspect, defineAspects } from './operation';

/** @public */
export const ReturnDocument = Object.freeze({
  BEFORE: 'before',
  AFTER: 'after'
} as const);

/** @public */
export type ReturnDocument = (typeof ReturnDocument)[keyof typeof ReturnDocument];

/** @public */
export interface FindOneAndDeleteOptions extends CommandOperationOptions {
  /** An optional hint for query optimization. See the {@link https://www.mongodb.com/docs/manual/reference/command/update/#update-command-hint|update command} reference for more information.*/
  hint?: Document;
  /** Limits the fields to return for all matching documents. */
  projection?: Document;
  /** Determines which document the operation modifies if the query selects multiple documents. */
  sort?: Sort;
  /** Map of parameter names and values that can be accessed using $$var (requires MongoDB 5.0). */
  let?: Document;
  /**
   * Return the ModifyResult instead of the modified document. Defaults to false
   */
  includeResultMetadata?: boolean;
}

/** @public */
export interface FindOneAndReplaceOptions extends CommandOperationOptions {
  /** Allow driver to bypass schema validation. */
  bypassDocumentValidation?: boolean;
  /** An optional hint for query optimization. See the {@link https://www.mongodb.com/docs/manual/reference/command/update/#update-command-hint|update command} reference for more information.*/
  hint?: Document;
  /** Limits the fields to return for all matching documents. */
  projection?: Document;
  /** When set to 'after', returns the updated document rather than the original. The default is 'before'.  */
  returnDocument?: ReturnDocument;
  /** Determines which document the operation modifies if the query selects multiple documents. */
  sort?: Sort;
  /** Upsert the document if it does not exist. */
  upsert?: boolean;
  /** Map of parameter names and values that can be accessed using $$var (requires MongoDB 5.0). */
  let?: Document;
  /**
   * Return the ModifyResult instead of the modified document. Defaults to false
   */
  includeResultMetadata?: boolean;
}

/** @public */
export interface FindOneAndUpdateOptions extends CommandOperationOptions {
  /** Optional list of array filters referenced in filtered positional operators */
  arrayFilters?: Document[];
  /** Allow driver to bypass schema validation. */
  bypassDocumentValidation?: boolean;
  /** An optional hint for query optimization. See the {@link https://www.mongodb.com/docs/manual/reference/command/update/#update-command-hint|update command} reference for more information.*/
  hint?: Document;
  /** Limits the fields to return for all matching documents. */
  projection?: Document;
  /** When set to 'after', returns the updated document rather than the original. The default is 'before'.  */
  returnDocument?: ReturnDocument;
  /** Determines which document the operation modifies if the query selects multiple documents. */
  sort?: Sort;
  /** Upsert the document if it does not exist. */
  upsert?: boolean;
  /** Map of parameter names and values that can be accessed using $$var (requires MongoDB 5.0). */
  let?: Document;
  /**
   * Return the ModifyResult instead of the modified document. Defaults to false
   */
  includeResultMetadata?: boolean;
}

/** @internal */
interface FindAndModifyCmdBase {
  remove: boolean;
  new: boolean;
  upsert: boolean;
  update?: Document;
  sort?: SortForCmd;
  fields?: Document;
  bypassDocumentValidation?: boolean;
  arrayFilters?: Document[];
  maxTimeMS?: number;
  let?: Document;
  writeConcern?: WriteConcern | WriteConcernSettings;
  /**
   * Comment to apply to the operation.
   *
   * In server versions pre-4.4, 'comment' must be string.  A server
   * error will be thrown if any other type is provided.
   *
   * In server versions 4.4 and above, 'comment' can be any valid BSON type.
   */
  comment?: unknown;
}

function configureFindAndModifyCmdBaseUpdateOpts(
  cmdBase: FindAndModifyCmdBase,
  options: FindOneAndReplaceOptions | FindOneAndUpdateOptions
): FindAndModifyCmdBase {
  cmdBase.new = options.returnDocument === ReturnDocument.AFTER;
  cmdBase.upsert = options.upsert === true;

  if (options.bypassDocumentValidation === true) {
    cmdBase.bypassDocumentValidation = options.bypassDocumentValidation;
  }
  return cmdBase;
}

/** @internal */
export class FindAndModifyOperation extends CommandOperation<Document> {
  override options: FindOneAndReplaceOptions | FindOneAndUpdateOptions | FindOneAndDeleteOptions;
  cmdBase: FindAndModifyCmdBase;
  collection: Collection;
  query: Document;
  doc?: Document;

  constructor(
    collection: Collection,
    query: Document,
    options: FindOneAndReplaceOptions | FindOneAndUpdateOptions | FindOneAndDeleteOptions
  ) {
    super(collection, options);
    this.options = options ?? {};
    this.cmdBase = {
      remove: false,
      new: false,
      upsert: false
    };

    options.includeResultMetadata ??= false;

    const sort = formatSort(options.sort);
    if (sort) {
      this.cmdBase.sort = sort;
    }

    if (options.projection) {
      this.cmdBase.fields = options.projection;
    }

    if (options.maxTimeMS) {
      this.cmdBase.maxTimeMS = options.maxTimeMS;
    }

    // Decorate the findAndModify command with the write Concern
    if (options.writeConcern) {
      this.cmdBase.writeConcern = options.writeConcern;
    }

    if (options.let) {
      this.cmdBase.let = options.let;
    }

    // we check for undefined specifically here to allow falsy values
    // eslint-disable-next-line no-restricted-syntax
    if (options.comment !== undefined) {
      this.cmdBase.comment = options.comment;
    }

    // force primary read preference
    this.readPreference = ReadPreference.primary;

    this.collection = collection;
    this.query = query;
  }

  override get commandName() {
    return 'findAndModify' as const;
  }

  override async execute(
    server: Server,
    session: ClientSession | undefined,
    timeoutContext: TimeoutContext
  ): Promise<Document> {
    const coll = this.collection;
    const query = this.query;
    const options = { ...this.options, ...this.bsonOptions };

    // Create findAndModify command object
    const cmd: Document = {
      findAndModify: coll.collectionName,
      query: query,
      ...this.cmdBase
    };

    decorateWithCollation(cmd, coll, options);

    if (options.hint) {
      // TODO: once this method becomes a CommandOperation we will have the server
      // in place to check.
      const unacknowledgedWrite = this.writeConcern?.w === 0;
      if (unacknowledgedWrite || maxWireVersion(server) < 8) {
        throw new MongoCompatibilityError(
          'The current topology does not support a hint on findAndModify commands'
        );
      }

      cmd.hint = options.hint;
    }

    // Execute the command
    const result = await super.executeCommand(server, session, cmd, timeoutContext);
    return options.includeResultMetadata ? result : (result.value ?? null);
  }
}

/** @internal */
export class FindOneAndDeleteOperation extends FindAndModifyOperation {
  constructor(collection: Collection, filter: Document, options: FindOneAndDeleteOptions) {
    // Basic validation
    if (filter == null || typeof filter !== 'object') {
      throw new MongoInvalidArgumentError('Argument "filter" must be an object');
    }

    super(collection, filter, options);
    this.cmdBase.remove = true;
  }
}

/** @internal */
export class FindOneAndReplaceOperation extends FindAndModifyOperation {
  constructor(
    collection: Collection,
    filter: Document,
    replacement: Document,
    options: FindOneAndReplaceOptions
  ) {
    if (filter == null || typeof filter !== 'object') {
      throw new MongoInvalidArgumentError('Argument "filter" must be an object');
    }

    if (replacement == null || typeof replacement !== 'object') {
      throw new MongoInvalidArgumentError('Argument "replacement" must be an object');
    }

    if (hasAtomicOperators(replacement)) {
      throw new MongoInvalidArgumentError('Replacement document must not contain atomic operators');
    }

    super(collection, filter, options);
    this.cmdBase.update = replacement;
    configureFindAndModifyCmdBaseUpdateOpts(this.cmdBase, options);
  }
}

/** @internal */
export class FindOneAndUpdateOperation extends FindAndModifyOperation {
  constructor(
    collection: Collection,
    filter: Document,
    update: Document,
    options: FindOneAndUpdateOptions
  ) {
    if (filter == null || typeof filter !== 'object') {
      throw new MongoInvalidArgumentError('Argument "filter" must be an object');
    }

    if (update == null || typeof update !== 'object') {
      throw new MongoInvalidArgumentError('Argument "update" must be an object');
    }

    if (!hasAtomicOperators(update)) {
      throw new MongoInvalidArgumentError('Update document requires atomic operators');
    }

    super(collection, filter, options);
    this.cmdBase.update = update;
    configureFindAndModifyCmdBaseUpdateOpts(this.cmdBase, options);

    if (options.arrayFilters) {
      this.cmdBase.arrayFilters = options.arrayFilters;
    }
  }
}

defineAspects(FindAndModifyOperation, [
  Aspect.WRITE_OPERATION,
  Aspect.RETRYABLE,
  Aspect.EXPLAINABLE
]);
