import type { Document } from '../../bson';
import type { Collection } from '../../collection';
import { MONGODB_ERROR_CODES, MongoServerError } from '../../error';
import type { Server } from '../../sdam/server';
import type { ClientSession } from '../../sessions';
import { type TimeoutContext } from '../../timeout';
import { AbstractOperation } from '../operation';

/** @internal */
export class DropSearchIndexOperation extends AbstractOperation<void> {
  constructor(
    private readonly collection: Collection,
    private readonly name: string
  ) {
    super();
  }

  override get commandName() {
    return 'dropSearchIndex' as const;
  }

  override async execute(
    server: Server,
    session: ClientSession | undefined,
    timeoutContext: TimeoutContext
  ): Promise<void> {
    const namespace = this.collection.fullNamespace;

    const command: Document = {
      dropSearchIndex: namespace.collection
    };

    if (typeof this.name === 'string') {
      command.name = this.name;
    }

    try {
      await server.command(namespace, command, { session, timeoutContext });
    } catch (error) {
      const isNamespaceNotFoundError =
        error instanceof MongoServerError && error.code === MONGODB_ERROR_CODES.NamespaceNotFound;
      if (!isNamespaceNotFoundError) {
        throw error;
      }
    }
  }
}
