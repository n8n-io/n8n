import { RequestInput } from "../lib/http.js";
import { AfterErrorContext, AfterErrorHook, AfterSuccessContext, AfterSuccessHook, BeforeCreateRequestContext, BeforeCreateRequestHook, BeforeRequestContext, BeforeRequestHook, Hooks, SDKInitHook, SDKInitOptions } from "./types.js";
export declare class SDKHooks implements Hooks {
    sdkInitHooks: SDKInitHook[];
    beforeCreateRequestHooks: BeforeCreateRequestHook[];
    beforeRequestHooks: BeforeRequestHook[];
    afterSuccessHooks: AfterSuccessHook[];
    afterErrorHooks: AfterErrorHook[];
    constructor();
    registerSDKInitHook(hook: SDKInitHook): void;
    registerBeforeCreateRequestHook(hook: BeforeCreateRequestHook): void;
    registerBeforeRequestHook(hook: BeforeRequestHook): void;
    registerAfterSuccessHook(hook: AfterSuccessHook): void;
    registerAfterErrorHook(hook: AfterErrorHook): void;
    sdkInit(opts: SDKInitOptions): SDKInitOptions;
    beforeCreateRequest(hookCtx: BeforeCreateRequestContext, input: RequestInput): RequestInput;
    beforeRequest(hookCtx: BeforeRequestContext, request: Request): Promise<Request>;
    afterSuccess(hookCtx: AfterSuccessContext, response: Response): Promise<Response>;
    afterError(hookCtx: AfterErrorContext, response: Response | null, error: unknown): Promise<{
        response: Response | null;
        error: unknown;
    }>;
}
//# sourceMappingURL=hooks.d.ts.map