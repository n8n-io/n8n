import { RedisError } from "redis-errors";
export default class ClusterAllFailedError extends RedisError {
    lastNodeError: RedisError;
    static defaultMessage: string;
    constructor(message: any, lastNodeError: RedisError);
    get name(): string;
}
