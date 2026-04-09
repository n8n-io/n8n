import { CloseEvent, Command } from '../command';
import { Logger } from '../logger';
import { FlowController } from './flow-controller';
type TimingInfo = {
    name: string;
    duration: string;
    'exit code': string | number;
    killed: boolean;
    command: string;
};
/**
 * Logs timing information about commands as they start/stop and then a summary when all commands finish.
 */
export declare class LogTimings implements FlowController {
    static mapCloseEventToTimingInfo({ command, timings, killed, exitCode, }: CloseEvent): TimingInfo;
    private readonly logger?;
    private readonly timestampFormat;
    constructor({ logger, timestampFormat, }: {
        logger?: Logger;
        timestampFormat?: string;
    });
    private printExitInfoTimingTable;
    handle(commands: Command[]): {
        commands: Command[];
        onFinish?: undefined;
    } | {
        commands: Command[];
        onFinish: () => void;
    };
}
export {};
