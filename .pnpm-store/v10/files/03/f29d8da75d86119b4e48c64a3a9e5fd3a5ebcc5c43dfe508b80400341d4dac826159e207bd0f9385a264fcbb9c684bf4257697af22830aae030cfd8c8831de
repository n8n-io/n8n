import { checkExceptions, createWaiter, WaiterState } from "@smithy/util-waiter";
import { DescribeTrainingJobCommand } from "../commands/DescribeTrainingJobCommand";
const checkState = async (client, input) => {
    let reason;
    try {
        let result = await client.send(new DescribeTrainingJobCommand(input));
        reason = result;
        try {
            const returnComparator = () => {
                return result.TrainingJobStatus;
            };
            if (returnComparator() === "Completed") {
                return { state: WaiterState.SUCCESS, reason };
            }
        }
        catch (e) { }
        try {
            const returnComparator = () => {
                return result.TrainingJobStatus;
            };
            if (returnComparator() === "Stopped") {
                return { state: WaiterState.SUCCESS, reason };
            }
        }
        catch (e) { }
        try {
            const returnComparator = () => {
                return result.TrainingJobStatus;
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
export const waitForTrainingJobCompletedOrStopped = async (params, input) => {
    const serviceDefaults = { minDelay: 120, maxDelay: 21600 };
    return createWaiter({ ...serviceDefaults, ...params }, input, checkState);
};
export const waitUntilTrainingJobCompletedOrStopped = async (params, input) => {
    const serviceDefaults = { minDelay: 120, maxDelay: 21600 };
    const result = await createWaiter({ ...serviceDefaults, ...params }, input, checkState);
    return checkExceptions(result);
};
