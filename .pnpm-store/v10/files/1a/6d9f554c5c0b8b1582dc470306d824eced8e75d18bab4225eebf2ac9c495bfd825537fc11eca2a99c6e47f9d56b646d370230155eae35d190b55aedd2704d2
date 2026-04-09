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
            if (returnComparator() === "InService") {
                return { state: WaiterState.SUCCESS, reason };
            }
        }
        catch (e) { }
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
            return { state: WaiterState.FAILURE, reason };
        }
    }
    return { state: WaiterState.RETRY, reason };
};
export const waitForEndpointInService = async (params, input) => {
    const serviceDefaults = { minDelay: 30, maxDelay: 3600 };
    return createWaiter({ ...serviceDefaults, ...params }, input, checkState);
};
export const waitUntilEndpointInService = async (params, input) => {
    const serviceDefaults = { minDelay: 30, maxDelay: 3600 };
    const result = await createWaiter({ ...serviceDefaults, ...params }, input, checkState);
    return checkExceptions(result);
};
