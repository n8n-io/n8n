import { Fetch, FunctionsResponse, FunctionInvokeOptions, FunctionRegion } from './types';
export declare class FunctionsClient {
    protected url: string;
    protected headers: Record<string, string>;
    protected region: FunctionRegion;
    protected fetch: Fetch;
    constructor(url: string, { headers, customFetch, region, }?: {
        headers?: Record<string, string>;
        customFetch?: Fetch;
        region?: FunctionRegion;
    });
    /**
     * Updates the authorization header
     * @param token - the new jwt token sent in the authorisation header
     */
    setAuth(token: string): void;
    /**
     * Invokes a function
     * @param functionName - The name of the Function to invoke.
     * @param options - Options for invoking the Function.
     */
    invoke<T = any>(functionName: string, options?: FunctionInvokeOptions): Promise<FunctionsResponse<T>>;
}
//# sourceMappingURL=FunctionsClient.d.ts.map