import { checkExceptions, createWaiter, WaiterState } from "@smithy/util-waiter";
import { DescribeTransformJobCommand } from "../commands/DescribeTransformJobCommand";
const checkState = async (client, input) => {
    let reason;
    try {
        const result = await client.send(new DescribeTransformJobCommand(input));
        reason = result;
        try {
            const returnComparator = () => {
                return result.TransformJobStatus;
            };
            if (returnComparator() === "Completed") {
                return { state: WaiterState.SUCCESS, reason };
            }
        }
        catch (e) { }
        try {
            const returnComparator = () => {
                return result.TransformJobStatus;
            };
            if (returnComparator() === "Stopped") {
                return { state: WaiterState.SUCCESS, reason };
            }
        }
        catch (e) { }
        try {
            const returnComparator = () => {
                return result.TransformJobStatus;
            };
            if (returnComparator() === "Failed") {
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
export const waitForTransformJobCompletedOrStopped = async (params, input) => {
    const serviceDefaults = { minDelay: 60, maxDelay: 3600 };
    return createWaiter({ ...serviceDefaults, ...params }, input, checkState);
};
export const waitUntilTransformJobCompletedOrStopped = async (params, input) => {
    const serviceDefaults = { minDelay: 60, maxDelay: 3600 };
    const result = await createWaiter({ ...serviceDefaults, ...params }, input, checkState);
    return checkExceptions(result);
};
