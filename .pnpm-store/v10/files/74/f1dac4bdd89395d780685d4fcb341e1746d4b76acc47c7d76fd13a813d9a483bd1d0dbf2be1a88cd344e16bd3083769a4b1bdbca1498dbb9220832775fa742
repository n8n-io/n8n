import type { Document } from '../bson';
import { Collection } from '../collection';
import type { Server } from '../sdam/server';
import type { ClientSession } from '../sessions';
import { type TimeoutContext } from '../timeout';
import { MongoDBNamespace } from '../utils';
import { CommandOperation, type CommandOperationOptions } from './command';
import { Aspect, defineAspects } from './operation';

/** @public */
export interface RenameOptions extends CommandOperationOptions {
  /** Drop the target name collection if it previously exists. */
  dropTarget?: boolean;
  /** Unclear */
  new_collection?: boolean;
}

/** @internal */
export class RenameOperation extends CommandOperation<Document> {
  constructor(
    public collection: Collection,
    public newName: string,
    public override options: RenameOptions
  ) {
    super(collection, options);
    this.ns = new MongoDBNamespace('admin', '$cmd');
  }

  override get commandName(): string {
    return 'renameCollection' as const;
  }

  override async execute(
    server: Server,
    session: ClientSession | undefined,
    timeoutContext: TimeoutContext
  ): Promise<Collection> {
    // Build the command
    const renameCollection = this.collection.namespace;
    const toCollection = this.collection.s.namespace.withCollection(this.newName).toString();
    const dropTarget =
      typeof this.options.dropTarget === 'boolean' ? this.options.dropTarget : false;

    const command = {
      renameCollection: renameCollection,
      to: toCollection,
      dropTarget: dropTarget
    };

    await super.executeCommand(server, session, command, timeoutContext);
    return new Collection(this.collection.s.db, this.newName, this.collection.s.options);
  }
}

defineAspects(RenameOperation, [Aspect.WRITE_OPERATION]);
