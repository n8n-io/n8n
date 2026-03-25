import * as Rx from 'rxjs';
import { Command } from '../command';
import { Logger } from '../logger';
import { FlowController } from './flow-controller';
/**
 * Restarts commands that fail up to a defined number of times.
 */
export declare class RestartProcess implements FlowController {
    private readonly logger;
    private readonly scheduler?;
    readonly delay: number;
    readonly tries: number;
    constructor({ delay, tries, logger, scheduler, }: {
        delay?: number;
        tries?: number;
        logger: Logger;
        scheduler?: Rx.SchedulerLike;
    });
    handle(commands: Command[]): {
        commands: Command[];
    };
}
