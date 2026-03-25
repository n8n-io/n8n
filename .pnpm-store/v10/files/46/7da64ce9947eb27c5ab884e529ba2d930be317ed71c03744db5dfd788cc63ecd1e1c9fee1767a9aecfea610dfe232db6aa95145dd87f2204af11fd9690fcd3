import { checkExceptions, createWaiter, WaiterState } from "@smithy/util-waiter";
import { DescribeNotebookInstanceCommand, } from "../commands/DescribeNotebookInstanceCommand";
const checkState = async (client, input) => {
    let reason;
    try {
        const result = await client.send(new DescribeNotebookInstanceCommand(input));
        reason = result;
        try {
            const returnComparator = () => {
                return result.NotebookInstanceStatus;
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
            return { state: WaiterState.SUCCESS, reason };
        }
    }
    return { state: WaiterState.RETRY, reason };
};
export const waitForNotebookInstanceDeleted = async (params, input) => {
    const serviceDefaults = { minDelay: 30, maxDelay: 1800 };
    return createWaiter({ ...serviceDefaults, ...params }, input, checkState);
};
export const waitUntilNotebookInstanceDeleted = async (params, input) => {
    const serviceDefaults = { minDelay: 30, maxDelay: 1800 };
    const result = await createWaiter({ ...serviceDefaults, ...params }, input, checkState);
    return checkExceptions(result);
};
