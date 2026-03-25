import { checkExceptions, createWaiter, WaiterState } from "@smithy/util-waiter";
import { DescribeImageCommand } from "../commands/DescribeImageCommand";
const checkState = async (client, input) => {
    let reason;
    try {
        const result = await client.send(new DescribeImageCommand(input));
        reason = result;
        try {
            const returnComparator = () => {
                return result.ImageStatus;
            };
            if (returnComparator() === "CREATED") {
                return { state: WaiterState.SUCCESS, reason };
            }
        }
        catch (e) { }
        try {
            const returnComparator = () => {
                return result.ImageStatus;
            };
            if (returnComparator() === "CREATE_FAILED") {
                return { state: WaiterState.FAILURE, reason };
            }
        }
        catch (e) { }
    }
    catch (exception) {
        reason = exception;
        if (exception.name && exception.name == "ValidationException") {
            return { state: WaiterState.FAILURE, reason };
        }
    }
    return { state: WaiterState.RETRY, reason };
};
export const waitForImageCreated = async (params, input) => {
    const serviceDefaults = { minDelay: 60, maxDelay: 3600 };
    return createWaiter({ ...serviceDefaults, ...params }, input, checkState);
};
export const waitUntilImageCreated = async (params, input) => {
    const serviceDefaults = { minDelay: 60, maxDelay: 3600 };
    const result = await createWaiter({ ...serviceDefaults, ...params }, input, checkState);
    return checkExceptions(result);
};
