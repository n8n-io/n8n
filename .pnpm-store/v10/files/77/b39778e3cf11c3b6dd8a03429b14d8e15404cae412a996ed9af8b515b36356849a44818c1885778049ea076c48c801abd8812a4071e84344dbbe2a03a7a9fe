import { checkExceptions, createWaiter, WaiterState } from "@smithy/util-waiter";
import { HeadBucketCommand } from "../commands/HeadBucketCommand";
const checkState = async (client, input) => {
    let reason;
    try {
        const result = await client.send(new HeadBucketCommand(input));
        reason = result;
    }
    catch (exception) {
        reason = exception;
        if (exception.name && exception.name == "NotFound") {
            return { state: WaiterState.SUCCESS, reason };
        }
    }
    return { state: WaiterState.RETRY, reason };
};
export const waitForBucketNotExists = async (params, input) => {
    const serviceDefaults = { minDelay: 5, maxDelay: 120 };
    return createWaiter({ ...serviceDefaults, ...params }, input, checkState);
};
export const waitUntilBucketNotExists = async (params, input) => {
    const serviceDefaults = { minDelay: 5, maxDelay: 120 };
    const result = await createWaiter({ ...serviceDefaults, ...params }, input, checkState);
    return checkExceptions(result);
};
