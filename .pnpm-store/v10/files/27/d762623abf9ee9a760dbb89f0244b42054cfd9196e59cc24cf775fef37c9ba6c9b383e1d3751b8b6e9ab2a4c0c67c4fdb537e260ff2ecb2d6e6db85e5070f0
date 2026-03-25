/// <reference types="node" />

export declare interface EndpointState {
  local_open: boolean;
  remote_open: boolean;
  open_requests: number;
  close_requests: number;
  initialised: boolean;
  init(): void;
  open(): boolean;
  close(): boolean;
  disconnected(): void;
  reconnect(): void;
  remote_opened(): boolean;
  remote_closed(): boolean;
  is_open(): boolean;
  is_closed(): boolean;
  has_settled(): boolean;
  need_open(): boolean;
  need_close(): boolean;
  /**
   * Marks state with a specified token (or timestamp if none
   * specified). This marker is then cleared if open() or close() are
   * invoked. Used internally as a way to take action only if
   * application does not do something that alters the state in the
   * meantime.
   */
  mark(token?: any): any;
  /**
   * @property {any} [marker] holds token from previous call to mark,
   * unless open() or close() were called since
   */
  marker: any;
}
