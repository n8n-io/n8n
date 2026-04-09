import { checkExceptions, createWaiter, WaiterState } from "@smithy/util-waiter";
import { DescribeProcessingJobCommand, } from "../commands/DescribeProcessingJobCommand";
const checkState = async (client, input) => {
    let reason;
    try {
        let result = await client.send(new DescribeProcessingJobCommand(input));
        reason = result;
        try {
            const returnComparator = () => {
                return result.ProcessingJobStatus;
            };
            if (returnComparator() === "Completed") {
                return { state: WaiterState.SUCCESS, reason };
            }
        }
        catch (e) { }
        try {
            const returnComparator = () => {
                return result.ProcessingJobStatus;
            };
            if (returnComparator() === "Stopped") {
                return { state: WaiterState.SUCCESS, reason };
            }
        }
        catch (e) { }
        try {
            const returnComparator = () => {
                return result.ProcessingJobStatus;
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
export const waitForProcessingJobCompletedOrStopped = async (params, input) => {
    const serviceDefaults = { minDelay: 60, maxDelay: 3600 };
    return createWaiter({ ...serviceDefaults, ...params }, input, checkState);
};
export const waitUntilProcessingJobCompletedOrStopped = async (params, input) => {
    const serviceDefaults = { minDelay: 60, maxDelay: 3600 };
    const result = await createWaiter({ ...serviceDefaults, ...params }, input, checkState);
    return checkExceptions(result);
};
