import type { Document } from '../bson';
import type { Db } from '../db';
import type { Server } from '../sdam/server';
import type { ClientSession } from '../sessions';
import { type TimeoutContext } from '../timeout';
import { CommandOperation, type CommandOperationOptions } from './command';
import { Aspect, defineAspects } from './operation';

/** @public */
export interface DbStatsOptions extends CommandOperationOptions {
  /** Divide the returned sizes by scale value. */
  scale?: number;
}

/** @internal */
export class DbStatsOperation extends CommandOperation<Document> {
  override options: DbStatsOptions;

  constructor(db: Db, options: DbStatsOptions) {
    super(db, options);
    this.options = options;
  }

  override get commandName() {
    return 'dbStats' as const;
  }

  override async execute(
    server: Server,
    session: ClientSession | undefined,
    timeoutContext: TimeoutContext
  ): Promise<Document> {
    const command: Document = { dbStats: true };
    if (this.options.scale != null) {
      command.scale = this.options.scale;
    }

    return await super.executeCommand(server, session, command, timeoutContext);
  }
}

defineAspects(DbStatsOperation, [Aspect.READ_OPERATION]);
