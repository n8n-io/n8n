import { Command } from '../command';
import { Logger } from '../logger';
import { FlowController } from './flow-controller';
/**
 * Logs the exit code/signal of commands.
 */
export declare class LogExit implements FlowController {
    private readonly logger;
    constructor({ logger }: {
        logger: Logger;
    });
    handle(commands: Command[]): {
        commands: Command[];
    };
}
