// File generated from our OpenAPI spec by Stainless. See CONTRIBUTING.md for details.

import { APIResource } from '../../resource';
import * as Core from '../../core';

export class Recording extends APIResource {
  /**
   * Session Recording
   */
  retrieve(id: string, options?: Core.RequestOptions): Core.APIPromise<RecordingRetrieveResponse> {
    return this._client.get(`/v1/sessions/${id}/recording`, options);
  }
}

export interface SessionRecording {
  /**
   * See
   * [rrweb documentation](https://github.com/rrweb-io/rrweb/blob/master/docs/recipes/dive-into-event.md).
   */
  data: Record<string, unknown>;

  sessionId: string;

  /**
   * milliseconds that have elapsed since the UNIX epoch
   */
  timestamp: number;

  type: number;
}

export type RecordingRetrieveResponse = Array<SessionRecording>;

export declare namespace Recording {
  export {
    type SessionRecording as SessionRecording,
    type RecordingRetrieveResponse as RecordingRetrieveResponse,
  };
}
