/**
 * Experimental task capability assertion helpers.
 * WARNING: These APIs are experimental and may change without notice.
 *
 * @experimental
 */
/**
 * Type representing the task requests capability structure.
 * This is derived from ClientTasksCapability.requests and ServerTasksCapability.requests.
 */
interface TaskRequestsCapability {
    tools?: {
        call?: object;
    };
    sampling?: {
        createMessage?: object;
    };
    elicitation?: {
        create?: object;
    };
}
/**
 * Asserts that task creation is supported for tools/call.
 * Used by Client.assertTaskCapability and Server.assertTaskHandlerCapability.
 *
 * @param requests - The task requests capability object
 * @param method - The method being checked
 * @param entityName - 'Server' or 'Client' for error messages
 * @throws Error if the capability is not supported
 *
 * @experimental
 */
export declare function assertToolsCallTaskCapability(requests: TaskRequestsCapability | undefined, method: string, entityName: 'Server' | 'Client'): void;
/**
 * Asserts that task creation is supported for sampling/createMessage or elicitation/create.
 * Used by Server.assertTaskCapability and Client.assertTaskHandlerCapability.
 *
 * @param requests - The task requests capability object
 * @param method - The method being checked
 * @param entityName - 'Server' or 'Client' for error messages
 * @throws Error if the capability is not supported
 *
 * @experimental
 */
export declare function assertClientRequestTaskCapability(requests: TaskRequestsCapability | undefined, method: string, entityName: 'Server' | 'Client'): void;
export {};
//# sourceMappingURL=helpers.d.ts.map