import { Command } from '../command';
/**
 * Interface for a class that controls and/or watches the behavior of commands.
 *
 * This may include logging their output, creating interactions between them, or changing when they
 * actually finish.
 */
export interface FlowController {
    handle(commands: Command[]): {
        commands: Command[];
        onFinish?: () => void;
    };
}
