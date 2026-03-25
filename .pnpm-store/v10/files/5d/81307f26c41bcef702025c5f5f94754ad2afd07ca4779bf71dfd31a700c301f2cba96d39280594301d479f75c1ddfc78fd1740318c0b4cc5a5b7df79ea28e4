import type { Db } from '../db';
import type { Server } from '../sdam/server';
import type { ClientSession } from '../sessions';
import { type TimeoutContext } from '../timeout';
import { CommandOperation, type CommandOperationOptions } from './command';
import { Aspect, defineAspects } from './operation';

/** @public */
export type RemoveUserOptions = CommandOperationOptions;

/** @internal */
export class RemoveUserOperation extends CommandOperation<boolean> {
  override options: RemoveUserOptions;
  username: string;

  constructor(db: Db, username: string, options: RemoveUserOptions) {
    super(db, options);
    this.options = options;
    this.username = username;
  }

  override get commandName() {
    return 'dropUser' as const;
  }

  override async execute(
    server: Server,
    session: ClientSession | undefined,
    timeoutContext: TimeoutContext
  ): Promise<boolean> {
    await super.executeCommand(server, session, { dropUser: this.username }, timeoutContext);
    return true;
  }
}

defineAspects(RemoveUserOperation, [Aspect.WRITE_OPERATION]);
