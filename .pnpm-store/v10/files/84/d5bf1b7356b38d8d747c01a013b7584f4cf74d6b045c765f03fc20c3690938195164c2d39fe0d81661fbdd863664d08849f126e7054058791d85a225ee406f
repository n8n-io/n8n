import { checkExceptions, createWaiter, WaiterState } from "@smithy/util-waiter";
import { DescribeImageVersionCommand } from "../commands/DescribeImageVersionCommand";
const checkState = async (client, input) => {
    let reason;
    try {
        let result = await client.send(new DescribeImageVersionCommand(input));
        reason = result;
        try {
            const returnComparator = () => {
                return result.ImageVersionStatus;
            };
            if (returnComparator() === "CREATED") {
                return { state: WaiterState.SUCCESS, reason };
            }
        }
        catch (e) { }
        try {
            const returnComparator = () => {
                return result.ImageVersionStatus;
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
export const waitForImageVersionCreated = async (params, input) => {
    const serviceDefaults = { minDelay: 60, maxDelay: 3600 };
    return createWaiter({ ...serviceDefaults, ...params }, input, checkState);
};
export const waitUntilImageVersionCreated = async (params, input) => {
    const serviceDefaults = { minDelay: 60, maxDelay: 3600 };
    const result = await createWaiter({ ...serviceDefaults, ...params }, input, checkState);
    return checkExceptions(result);
};
