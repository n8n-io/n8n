import { checkExceptions, createWaiter, WaiterState } from "@smithy/util-waiter";
import { DescribeEndpointCommand } from "../commands/DescribeEndpointCommand";
const checkState = async (client, input) => {
    let reason;
    try {
        let result = await client.send(new DescribeEndpointCommand(input));
        reason = result;
        try {
            const returnComparator = () => {
                return result.EndpointStatus;
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
export const waitForEndpointDeleted = async (params, input) => {
    const serviceDefaults = { minDelay: 30, maxDelay: 1800 };
    return createWaiter({ ...serviceDefaults, ...params }, input, checkState);
};
export const waitUntilEndpointDeleted = async (params, input) => {
    const serviceDefaults = { minDelay: 30, maxDelay: 1800 };
    const result = await createWaiter({ ...serviceDefaults, ...params }, input, checkState);
    return checkExceptions(result);
};
