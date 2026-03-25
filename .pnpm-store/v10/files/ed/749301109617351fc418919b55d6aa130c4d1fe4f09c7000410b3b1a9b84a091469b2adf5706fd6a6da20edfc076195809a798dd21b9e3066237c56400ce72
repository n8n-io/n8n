/// <reference types="node" />
import { Callback, Respondable, CommandParameter } from "./types";
export declare type ArgumentType = string | Buffer | number | (string | Buffer | number | any[])[];
interface CommandOptions {
    /**
     * Set the encoding of the reply, by default buffer will be returned.
     */
    replyEncoding?: BufferEncoding | null;
    errorStack?: Error;
    keyPrefix?: string;
    /**
     * Force the command to be readOnly so it will also execute on slaves
     */
    readOnly?: boolean;
}
declare type ArgumentTransformer = (args: any[]) => any[];
declare type ReplyTransformer = (reply: any) => any;
export interface CommandNameFlags {
    VALID_IN_SUBSCRIBER_MODE: [
        "subscribe",
        "psubscribe",
        "unsubscribe",
        "punsubscribe",
        "ssubscribe",
        "sunsubscribe",
        "ping",
        "quit"
    ];
    VALID_IN_MONITOR_MODE: ["monitor", "auth"];
    ENTER_SUBSCRIBER_MODE: ["subscribe", "psubscribe", "ssubscribe"];
    EXIT_SUBSCRIBER_MODE: ["unsubscribe", "punsubscribe", "sunsubscribe"];
    WILL_DISCONNECT: ["quit"];
}
/**
 * Command instance
 *
 * It's rare that you need to create a Command instance yourself.
 *
 * ```js
 * var infoCommand = new Command('info', null, function (err, result) {
 *   console.log('result', result);
 * });
 *
 * redis.sendCommand(infoCommand);
 *
 * // When no callback provided, Command instance will have a `promise` property,
 * // which will resolve/reject with the result of the command.
 * var getCommand = new Command('get', ['foo']);
 * getCommand.promise.then(function (result) {
 *   console.log('result', result);
 * });
 * ```
 */
export default class Command implements Respondable {
    name: string;
    static FLAGS: {
        [key in keyof CommandNameFlags]: CommandNameFlags[key];
    };
    private static flagMap?;
    private static _transformer;
    /**
     * Check whether the command has the flag
     */
    static checkFlag<T extends keyof CommandNameFlags>(flagName: T, commandName: string): commandName is CommandNameFlags[T][number];
    static setArgumentTransformer(name: string, func: ArgumentTransformer): void;
    static setReplyTransformer(name: string, func: ReplyTransformer): void;
    private static getFlagMap;
    ignore?: boolean;
    isReadOnly?: boolean;
    args: CommandParameter[];
    inTransaction: boolean;
    pipelineIndex?: number;
    isResolved: boolean;
    reject: (err: Error) => void;
    resolve: (result: any) => void;
    promise: Promise<any>;
    private replyEncoding;
    private errorStack;
    private bufferMode;
    private callback;
    private transformed;
    private _commandTimeoutTimer?;
    private slot?;
    private keys?;
    /**
     * Creates an instance of Command.
     * @param name Command name
     * @param args An array of command arguments
     * @param options
     * @param callback The callback that handles the response.
     * If omit, the response will be handled via Promise
     */
    constructor(name: string, args?: Array<ArgumentType>, options?: CommandOptions, callback?: Callback);
    getSlot(): number;
    getKeys(): Array<string | Buffer>;
    /**
     * Convert command to writable buffer or string
     */
    toWritable(_socket: object): string | Buffer;
    stringifyArguments(): void;
    /**
     * Convert buffer/buffer[] to string/string[],
     * and apply reply transformer.
     */
    transformReply(result: Buffer | Buffer[]): string | string[] | Buffer | Buffer[];
    /**
     * Set the wait time before terminating the attempt to execute a command
     * and generating an error.
     */
    setTimeout(ms: number): void;
    private initPromise;
    /**
     * Iterate through the command arguments that are considered keys.
     */
    private _iterateKeys;
    /**
     * Convert the value from buffer to the target encoding.
     */
    private _convertValue;
}
export {};
