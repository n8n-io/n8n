import type { Document } from '../bson';
import type { Collection } from '../collection';
import type { Server } from '../sdam/server';
import type { ClientSession } from '../sessions';
import { type TimeoutContext } from '../timeout';
import { CommandOperation, type CommandOperationOptions } from './command';
import { Aspect, defineAspects } from './operation';

/** @public */
export interface EstimatedDocumentCountOptions extends CommandOperationOptions {
  /**
   * The maximum amount of time to allow the operation to run.
   *
   * This option is sent only if the caller explicitly provides a value. The default is to not send a value.
   */
  maxTimeMS?: number;
}

/** @internal */
export class EstimatedDocumentCountOperation extends CommandOperation<number> {
  override options: EstimatedDocumentCountOptions;
  collectionName: string;

  constructor(collection: Collection, options: EstimatedDocumentCountOptions = {}) {
    super(collection, options);
    this.options = options;
    this.collectionName = collection.collectionName;
  }

  override get commandName() {
    return 'count' as const;
  }

  override async execute(
    server: Server,
    session: ClientSession | undefined,
    timeoutContext: TimeoutContext
  ): Promise<number> {
    const cmd: Document = { count: this.collectionName };

    if (typeof this.options.maxTimeMS === 'number') {
      cmd.maxTimeMS = this.options.maxTimeMS;
    }

    // we check for undefined specifically here to allow falsy values
    // eslint-disable-next-line no-restricted-syntax
    if (this.options.comment !== undefined) {
      cmd.comment = this.options.comment;
    }

    const response = await super.executeCommand(server, session, cmd, timeoutContext);

    return response?.n || 0;
  }
}

defineAspects(EstimatedDocumentCountOperation, [
  Aspect.READ_OPERATION,
  Aspect.RETRYABLE,
  Aspect.CURSOR_CREATING
]);
