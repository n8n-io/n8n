import Browserbase from "@browserbasehq/sdk";
import { LogLine } from "./log";
export interface StagehandAPIConstructorParams {
    apiKey: string;
    projectId: string;
    logger: (message: LogLine) => void;
}
export interface ExecuteActionParams {
    method: "act" | "extract" | "observe" | "navigate" | "end";
    args?: unknown;
    params?: unknown;
}
export interface StartSessionParams {
    modelName: string;
    modelApiKey: string;
    domSettleTimeoutMs: number;
    verbose: number;
    debugDom: boolean;
    systemPrompt?: string;
    browserbaseSessionCreateParams?: Browserbase.Sessions.SessionCreateParams;
}
export interface StartSessionResult {
    sessionId: string;
}
export interface SuccessResponse<T> {
    success: true;
    data: T;
}
export interface ErrorResponse {
    success: false;
    message: string;
}
export type ApiResponse<T> = SuccessResponse<T> | ErrorResponse;
