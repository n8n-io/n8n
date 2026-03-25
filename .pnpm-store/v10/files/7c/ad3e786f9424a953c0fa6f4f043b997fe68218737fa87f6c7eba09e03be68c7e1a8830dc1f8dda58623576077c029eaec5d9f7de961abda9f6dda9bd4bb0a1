/// <reference types="node" />
import { Readable } from 'stream';
import { Command, CommandIdentifier } from '../command';
import { Logger } from '../logger';
import { FlowController } from './flow-controller';
/**
 * Sends input from concurrently through to commands.
 *
 * Input can start with a command identifier, in which case it will be sent to that specific command.
 * For instance, `0:bla` will send `bla` to command at index `0`, and `server:stop` will send `stop`
 * to command with name `server`.
 *
 * If the input doesn't start with a command identifier, it is then always sent to the default target.
 */
export declare class InputHandler implements FlowController {
    private readonly logger;
    private readonly defaultInputTarget;
    private readonly inputStream?;
    private readonly pauseInputStreamOnFinish;
    constructor({ defaultInputTarget, inputStream, pauseInputStreamOnFinish, logger, }: {
        inputStream?: Readable;
        logger: Logger;
        defaultInputTarget?: CommandIdentifier;
        pauseInputStreamOnFinish?: boolean;
    });
    handle(commands: Command[]): {
        commands: Command[];
        onFinish?: () => void | undefined;
    };
}
