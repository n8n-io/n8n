import { GooglePlatformType } from "./types.cjs";

//#region src/auth.d.ts
type GoogleAbstractedClientOpsMethod = "GET" | "POST" | "DELETE";
type GoogleAbstractedClientOpsResponseType = "json" | "stream" | "blob";
type GoogleAbstractedClientOps = {
  url?: string;
  method?: GoogleAbstractedClientOpsMethod;
  headers?: Record<string, string>;
  data?: unknown;
  responseType?: GoogleAbstractedClientOpsResponseType;
  signal?: AbortSignal;
};
interface GoogleAbstractedClient {
  request: (opts: GoogleAbstractedClientOps) => unknown;
  getProjectId: () => Promise<string>;
  get clientType(): string;
}
declare abstract class GoogleAbstractedFetchClient implements GoogleAbstractedClient {
  abstract get clientType(): string;
  abstract getProjectId(): Promise<string>;
  abstract request(opts: GoogleAbstractedClientOps): unknown;
  _fetch: typeof fetch;
  _buildData(res: Response, opts: GoogleAbstractedClientOps): Promise<any>;
  /**
   * Build and throw a standardised Google request error.
   * Both the `!res.ok` path (native fetch) and the catch path (gaxios)
   * funnel through here so the caller always sees the same shape.
   */
  protected _throwRequestError(status: number, body: string | undefined, response: unknown, context: {
    url: string;
    opts: GoogleAbstractedClientOps;
    fetchOptions?: Record<string, unknown>;
  }): never;
  _request(url: string | undefined, opts: GoogleAbstractedClientOps, additionalHeaders: Record<string, string>): Promise<{
    data: any;
    config: {};
    status: number;
    statusText: string;
    headers: Headers;
    request: {
      responseURL: string;
    };
  }>;
}
declare class ApiKeyGoogleAuth extends GoogleAbstractedFetchClient {
  apiKey: string;
  constructor(apiKey: string);
  get clientType(): string;
  getProjectId(): Promise<string>;
  request(opts: GoogleAbstractedClientOps): unknown;
}
declare function aiPlatformScope(platform: GooglePlatformType): string[];
declare function ensureAuthOptionScopes<AuthOptions>(authOption: AuthOptions | undefined, scopeProperty: string, scopesOrPlatform: string[] | GooglePlatformType | undefined): AuthOptions;
//#endregion
export { ApiKeyGoogleAuth, GoogleAbstractedClient, GoogleAbstractedClientOps, GoogleAbstractedClientOpsMethod, GoogleAbstractedClientOpsResponseType, GoogleAbstractedFetchClient, aiPlatformScope, ensureAuthOptionScopes };
//# sourceMappingURL=auth.d.cts.map