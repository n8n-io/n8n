import Redis from "./Redis";
import Cluster from "./cluster";
import Command from "./Command";
import Commander from "./utils/Commander";
declare class Pipeline extends Commander<{
    type: "pipeline";
}> {
    redis: Redis | Cluster;
    isCluster: boolean;
    isPipeline: boolean;
    leftRedirections: {
        value?: number;
    };
    promise: Promise<unknown>;
    resolve: (result: unknown) => void;
    reject: (error: Error) => void;
    private replyPending;
    private _queue;
    private _result;
    private _transactions;
    private _shaToScript;
    private preferKey;
    constructor(redis: Redis | Cluster);
    fillResult(value: unknown[], position: number): void;
    sendCommand(command: Command): unknown;
    addBatch(commands: any): this;
}
export default Pipeline;
interface Pipeline {
    length: number;
}
