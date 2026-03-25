import { APIResource } from "../../resource.js";
import * as Core from "../../core.js";
export declare class Logs extends APIResource {
    /**
     * Session Logs
     */
    list(id: string, options?: Core.RequestOptions): Core.APIPromise<LogListResponse>;
}
export interface SessionLog {
    method: string;
    pageId: number;
    sessionId: string;
    frameId?: string;
    loaderId?: string;
    request?: SessionLog.Request;
    response?: SessionLog.Response;
    /**
     * milliseconds that have elapsed since the UNIX epoch
     */
    timestamp?: number;
}
export declare namespace SessionLog {
    interface Request {
        params: Record<string, unknown>;
        rawBody: string;
        /**
         * milliseconds that have elapsed since the UNIX epoch
         */
        timestamp?: number;
    }
    interface Response {
        rawBody: string;
        result: Record<string, unknown>;
        /**
         * milliseconds that have elapsed since the UNIX epoch
         */
        timestamp?: number;
    }
}
export type LogListResponse = Array<SessionLog>;
export declare namespace Logs {
    export { type SessionLog as SessionLog, type LogListResponse as LogListResponse };
}
//# sourceMappingURL=logs.d.ts.map