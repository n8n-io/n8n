import type { BSONSerializeOptions, Document } from '../bson';
import { type MongoDBResponseConstructor } from '../cmap/wire_protocol/responses';
import { type Db } from '../db';
import { type TODO_NODE_3286 } from '../mongo_types';
import type { ReadPreferenceLike } from '../read_preference';
import type { Server } from '../sdam/server';
import type { ClientSession } from '../sessions';
import { type TimeoutContext } from '../timeout';
import { MongoDBNamespace } from '../utils';
import { AbstractOperation } from './operation';

/** @public */
export type RunCommandOptions = {
  /** Specify ClientSession for this command */
  session?: ClientSession;
  /** The read preference */
  readPreference?: ReadPreferenceLike;
  /**
   * @experimental
   * Specifies the time an operation will run until it throws a timeout error
   */
  timeoutMS?: number;
  /** @internal */
  omitMaxTimeMS?: boolean;
} & BSONSerializeOptions;

/** @internal */
export class RunCommandOperation<T = Document> extends AbstractOperation<T> {
  constructor(
    parent: Db,
    public command: Document,
    public override options: RunCommandOptions & { responseType?: MongoDBResponseConstructor }
  ) {
    super(options);
    this.ns = parent.s.namespace.withCollection('$cmd');
  }

  override get commandName() {
    return 'runCommand' as const;
  }

  override async execute(
    server: Server,
    session: ClientSession | undefined,
    timeoutContext: TimeoutContext
  ): Promise<T> {
    this.server = server;
    const res: TODO_NODE_3286 = await server.command(
      this.ns,
      this.command,
      {
        ...this.options,
        readPreference: this.readPreference,
        session,
        timeoutContext
      },
      this.options.responseType
    );

    return res;
  }
}

export class RunAdminCommandOperation<T = Document> extends AbstractOperation<T> {
  constructor(
    public command: Document,
    public override options: RunCommandOptions & {
      noResponse?: boolean;
      bypassPinningCheck?: boolean;
    }
  ) {
    super(options);
    this.ns = new MongoDBNamespace('admin', '$cmd');
  }

  override get commandName() {
    return 'runCommand' as const;
  }

  override async execute(
    server: Server,
    session: ClientSession | undefined,
    timeoutContext: TimeoutContext
  ): Promise<T> {
    this.server = server;
    const res: TODO_NODE_3286 = await server.command(this.ns, this.command, {
      ...this.options,
      readPreference: this.readPreference,
      session,
      timeoutContext
    });
    return res;
  }
}
