import { Result, Task, McpError } from '../types.js';
/**
 * Base message type
 */
export interface BaseResponseMessage {
    type: string;
}
/**
 * Task status update message
 */
export interface TaskStatusMessage extends BaseResponseMessage {
    type: 'taskStatus';
    task: Task;
}
/**
 * Task created message (first message for task-augmented requests)
 */
export interface TaskCreatedMessage extends BaseResponseMessage {
    type: 'taskCreated';
    task: Task;
}
/**
 * Final result message (terminal)
 */
export interface ResultMessage<T extends Result> extends BaseResponseMessage {
    type: 'result';
    result: T;
}
/**
 * Error message (terminal)
 */
export interface ErrorMessage extends BaseResponseMessage {
    type: 'error';
    error: McpError;
}
/**
 * Union type representing all possible messages that can be yielded during request processing.
 * Note: Progress notifications are handled through the existing onprogress callback mechanism.
 * Side-channeled messages (server requests/notifications) are handled through registered handlers.
 */
export type ResponseMessage<T extends Result> = TaskStatusMessage | TaskCreatedMessage | ResultMessage<T> | ErrorMessage;
export type AsyncGeneratorValue<T> = T extends AsyncGenerator<infer U> ? U : never;
export declare function toArrayAsync<T extends AsyncGenerator<unknown>>(it: T): Promise<AsyncGeneratorValue<T>[]>;
export declare function takeResult<T extends Result, U extends AsyncGenerator<ResponseMessage<T>>>(it: U): Promise<T>;
//# sourceMappingURL=responseMessage.d.ts.map