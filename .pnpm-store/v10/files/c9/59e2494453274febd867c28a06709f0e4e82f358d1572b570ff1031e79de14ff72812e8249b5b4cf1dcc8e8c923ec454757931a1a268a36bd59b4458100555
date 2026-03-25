import { SentinelAddress } from "./types";
export default class SentinelIterator implements Iterator<Partial<SentinelAddress>> {
    private cursor;
    private sentinels;
    constructor(sentinels: Array<Partial<SentinelAddress>>);
    next(): {
        done: boolean;
        value: Partial<SentinelAddress>;
    };
    reset(moveCurrentEndpointToFirst: boolean): void;
    add(sentinel: SentinelAddress): boolean;
    toString(): string;
}
