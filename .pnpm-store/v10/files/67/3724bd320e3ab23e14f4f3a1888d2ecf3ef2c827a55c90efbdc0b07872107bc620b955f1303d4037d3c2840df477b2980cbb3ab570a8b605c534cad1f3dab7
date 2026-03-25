import { checkExceptions, createWaiter, WaiterState } from "@smithy/util-waiter";
import { HeadObjectCommand } from "../commands/HeadObjectCommand";
const checkState = async (client, input) => {
    let reason;
    try {
        const result = await client.send(new HeadObjectCommand(input));
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
export const waitForObjectNotExists = async (params, input) => {
    const serviceDefaults = { minDelay: 5, maxDelay: 120 };
    return createWaiter({ ...serviceDefaults, ...params }, input, checkState);
};
export const waitUntilObjectNotExists = async (params, input) => {
    const serviceDefaults = { minDelay: 5, maxDelay: 120 };
    const result = await createWaiter({ ...serviceDefaults, ...params }, input, checkState);
    return checkExceptions(result);
};
