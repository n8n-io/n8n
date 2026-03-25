import type { Document } from '../../bson';
import type { Collection } from '../../collection';
import type { Server } from '../../sdam/server';
import type { ClientSession } from '../../sessions';
import { type TimeoutContext } from '../../timeout';
import { AbstractOperation } from '../operation';

/**
 * @public
 */
export interface SearchIndexDescription extends Document {
  /** The name of the index. */
  name?: string;

  /** The index definition. */
  definition: Document;

  /** The type of the index.  Currently `search` or `vectorSearch` are supported. */
  type?: string;
}

/** @internal */
export class CreateSearchIndexesOperation extends AbstractOperation<string[]> {
  constructor(
    private readonly collection: Collection,
    private readonly descriptions: ReadonlyArray<SearchIndexDescription>
  ) {
    super();
  }

  override get commandName() {
    return 'createSearchIndexes' as const;
  }

  override async execute(
    server: Server,
    session: ClientSession | undefined,
    timeoutContext: TimeoutContext
  ): Promise<string[]> {
    const namespace = this.collection.fullNamespace;
    const command = {
      createSearchIndexes: namespace.collection,
      indexes: this.descriptions
    };

    const res = await server.command(namespace, command, {
      session,
      timeoutContext
    });

    const indexesCreated: Array<{ name: string }> = res?.indexesCreated ?? [];
    return indexesCreated.map(({ name }) => name);
  }
}
