import Command from "../Command";
import { WriteableStream } from "../types";
import RedisCommander, { ClientContext } from "./RedisCommander";
export interface CommanderOptions {
    keyPrefix?: string;
    showFriendlyErrorStack?: boolean;
}
declare class Commander<Context extends ClientContext = {
    type: "default";
}> {
    options: CommanderOptions;
    /**
     * @ignore
     */
    scriptsSet: {};
    /**
     * @ignore
     */
    addedBuiltinSet: Set<string>;
    /**
     * Return supported builtin commands
     */
    getBuiltinCommands(): string[];
    /**
     * Create a builtin command
     */
    createBuiltinCommand(commandName: string): {
        string: any;
        buffer: any;
    };
    /**
     * Create add builtin command
     */
    addBuiltinCommand(commandName: string): void;
    /**
     * Define a custom command using lua script
     */
    defineCommand(name: string, definition: {
        lua: string;
        numberOfKeys?: number;
        readOnly?: boolean;
    }): void;
    /**
     * @ignore
     */
    sendCommand(command: Command, stream?: WriteableStream, node?: unknown): unknown;
}
interface Commander<Context> extends RedisCommander<Context> {
}
export default Commander;
