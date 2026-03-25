import { ChainableCommander } from "./utils/RedisCommander";
export interface Transaction {
    pipeline(commands?: unknown[][]): ChainableCommander;
    multi(options: {
        pipeline: false;
    }): Promise<"OK">;
    multi(): ChainableCommander;
    multi(options: {
        pipeline: true;
    }): ChainableCommander;
    multi(commands?: unknown[][]): ChainableCommander;
}
export declare function addTransactionSupport(redis: any): void;
