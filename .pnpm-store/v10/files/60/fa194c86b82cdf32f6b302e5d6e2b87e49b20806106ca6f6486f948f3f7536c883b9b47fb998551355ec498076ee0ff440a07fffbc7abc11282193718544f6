import { fetch } from 'undici';
import { type VerboseLog, type TestContext, type ResponseContext } from '../types';
import type { RequestData } from '../modules/flow-runner';
interface IFetcher {
    verboseLogs?: VerboseLog;
    verboseResponseLogs?: VerboseLog;
    harLogs?: any;
    fetch?: typeof fetch;
}
export declare function normalizeHeaders(headers: Record<string, string> | undefined): Record<string, string>;
export declare function isJsonContentType(contentType: string): boolean;
export declare function isXmlContentType(contentType: string): boolean;
export declare function trimTrailingSlash(str: string): string;
export declare class ApiFetcher implements IFetcher {
    verboseLogs?: VerboseLog;
    verboseResponseLogs?: VerboseLog;
    harLogs?: any;
    fetch?: typeof fetch;
    constructor(params: IFetcher);
    initVerboseLogs: ({ headerParams, host, path, method, body }: VerboseLog) => void;
    getVerboseLogs: () => VerboseLog | undefined;
    initVerboseResponseLogs: ({ headerParams, host, path, method, body, statusCode, responseTime, }: VerboseLog) => void;
    getVerboseResponseLogs: () => VerboseLog | undefined;
    fetchResult: (ctx: TestContext, requestData: RequestData) => Promise<ResponseContext | never>;
}
export {};
//# sourceMappingURL=api-fetcher.d.ts.map