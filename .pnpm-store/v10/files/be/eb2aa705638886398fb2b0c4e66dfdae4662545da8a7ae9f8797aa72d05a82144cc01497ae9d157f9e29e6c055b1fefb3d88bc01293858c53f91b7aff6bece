import { Command } from '../command';
import { Logger } from '../logger';
import { FlowController } from './flow-controller';
/**
 * Logs the stdout and stderr output of commands.
 */
export declare class LogOutput implements FlowController {
    private readonly logger;
    constructor({ logger }: {
        logger: Logger;
    });
    handle(commands: Command[]): {
        commands: Command[];
    };
}
