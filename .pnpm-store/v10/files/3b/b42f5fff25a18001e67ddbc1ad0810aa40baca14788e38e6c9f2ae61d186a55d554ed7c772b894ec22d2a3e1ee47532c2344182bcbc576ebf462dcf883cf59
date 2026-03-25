import type { Db } from '../db';
import { MongoUnexpectedServerResponseError } from '../error';
import type { Server } from '../sdam/server';
import type { ClientSession } from '../sessions';
import { type TimeoutContext } from '../timeout';
import { CommandOperation, type CommandOperationOptions } from './command';

/** @public */
export type ProfilingLevelOptions = CommandOperationOptions;

/** @internal */
export class ProfilingLevelOperation extends CommandOperation<string> {
  override options: ProfilingLevelOptions;

  constructor(db: Db, options: ProfilingLevelOptions) {
    super(db, options);
    this.options = options;
  }

  override get commandName() {
    return 'profile' as const;
  }

  override async execute(
    server: Server,
    session: ClientSession | undefined,
    timeoutContext: TimeoutContext
  ): Promise<string> {
    const doc = await super.executeCommand(server, session, { profile: -1 }, timeoutContext);
    if (doc.ok === 1) {
      const was = doc.was;
      if (was === 0) return 'off';
      if (was === 1) return 'slow_only';
      if (was === 2) return 'all';
      throw new MongoUnexpectedServerResponseError(`Illegal profiling level value ${was}`);
    } else {
      throw new MongoUnexpectedServerResponseError('Error with profile command');
    }
  }
}
