import { Command } from '../command';
import { Logger } from '../logger';
import { FlowController } from './flow-controller';
/**
 * Logs when commands failed executing, e.g. due to the executable not existing in the system.
 */
export declare class LogError implements FlowController {
    private readonly logger;
    constructor({ logger }: {
        logger: Logger;
    });
    handle(commands: Command[]): {
        commands: Command[];
    };
}
