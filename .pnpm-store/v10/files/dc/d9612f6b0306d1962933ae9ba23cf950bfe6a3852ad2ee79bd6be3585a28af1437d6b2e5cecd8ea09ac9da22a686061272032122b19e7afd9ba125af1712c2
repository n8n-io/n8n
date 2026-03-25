/// <reference types="node" />
import { NetStream, CommandItem } from "./types";
import Deque = require("denque");
import { EventEmitter } from "events";
import SubscriptionSet from "./SubscriptionSet";
export interface Condition {
    select: number;
    auth?: string | [string, string];
    subscriber: false | SubscriptionSet;
}
export declare type FlushQueueOptions = {
    offlineQueue?: boolean;
    commandQueue?: boolean;
};
export interface DataHandledable extends EventEmitter {
    stream: NetStream;
    status: string;
    condition: Condition | null;
    commandQueue: Deque<CommandItem>;
    disconnect(reconnect: boolean): void;
    recoverFromFatalError(commandError: Error, err: Error, options: FlushQueueOptions): void;
    handleReconnection(err: Error, item: CommandItem): void;
}
interface ParserOptions {
    stringNumbers: boolean;
}
export default class DataHandler {
    private redis;
    constructor(redis: DataHandledable, parserOptions: ParserOptions);
    private returnFatalError;
    private returnError;
    private returnReply;
    private handleSubscriberReply;
    private handleMonitorReply;
    private shiftCommand;
}
export {};
