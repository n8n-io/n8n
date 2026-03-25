// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../resource';
import * as Core from '../../core';

export class Logs extends APIResource {
  /**
   * Session Logs
   */
  list(id: string, options?: Core.RequestOptions): Core.APIPromise<LogListResponse> {
    return this._client.get(`/v1/sessions/${id}/logs`, options);
  }
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

export namespace SessionLog {
  export interface Request {
    params: Record<string, unknown>;

    rawBody: string;

    /**
     * milliseconds that have elapsed since the UNIX epoch
     */
    timestamp?: number;
  }

  export interface Response {
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
