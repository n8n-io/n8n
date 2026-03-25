import type { Db } from '../db';
import { MongoInvalidArgumentError } from '../error';
import type { Server } from '../sdam/server';
import type { ClientSession } from '../sessions';
import { type TimeoutContext } from '../timeout';
import { enumToString } from '../utils';
import { CommandOperation, type CommandOperationOptions } from './command';

const levelValues = new Set(['off', 'slow_only', 'all']);

/** @public */
export const ProfilingLevel = Object.freeze({
  off: 'off',
  slowOnly: 'slow_only',
  all: 'all'
} as const);

/** @public */
export type ProfilingLevel = (typeof ProfilingLevel)[keyof typeof ProfilingLevel];

/** @public */
export type SetProfilingLevelOptions = CommandOperationOptions;

/** @internal */
export class SetProfilingLevelOperation extends CommandOperation<ProfilingLevel> {
  override options: SetProfilingLevelOptions;
  level: ProfilingLevel;
  profile: 0 | 1 | 2;

  constructor(db: Db, level: ProfilingLevel, options: SetProfilingLevelOptions) {
    super(db, options);
    this.options = options;
    switch (level) {
      case ProfilingLevel.off:
        this.profile = 0;
        break;
      case ProfilingLevel.slowOnly:
        this.profile = 1;
        break;
      case ProfilingLevel.all:
        this.profile = 2;
        break;
      default:
        this.profile = 0;
        break;
    }

    this.level = level;
  }

  override get commandName() {
    return 'profile' as const;
  }

  override async execute(
    server: Server,
    session: ClientSession | undefined,
    timeoutContext: TimeoutContext
  ): Promise<ProfilingLevel> {
    const level = this.level;

    if (!levelValues.has(level)) {
      throw new MongoInvalidArgumentError(
        `Profiling level must be one of "${enumToString(ProfilingLevel)}"`
      );
    }

    // TODO(NODE-3483): Determine error to put here
    await super.executeCommand(server, session, { profile: this.profile }, timeoutContext);
    return level;
  }
}
