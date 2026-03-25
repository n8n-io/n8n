/// <reference types="node" />

import { Connection, EventContext } from "./connection";
import { EndpointState } from "./endpoint";
import { EventEmitter } from "events";
import { link, Sender, Receiver } from "./link";
import { frames } from "./frames";
import { AmqpError, MessageAnnotations } from ".";
import { DeliveryOutcome } from "./message";

export interface ReleaseParameters {
  delivery_failed?: boolean;
  undeliverable_here?: boolean;
  message_annotations?: MessageAnnotations;
}

export declare interface Delivery {
  readonly format: number;
  readonly id: number;
  readonly tag: Buffer | string;
  readonly link: Sender | Receiver;
  readonly remote_settled: boolean;
  readonly sent: boolean;
  readonly settled: boolean;
  readonly state?: DeliveryOutcome;
  readonly remote_state?: DeliveryOutcome;
  update(settled: boolean, state?: any): void;
  accept(): void;
  release(params?: ReleaseParameters): void;
  reject(error?: AmqpError): void;
  modified(params?: ReleaseParameters): void;
}

export declare interface Session extends EventEmitter {
  connection: Connection;
  options: any;
  readonly error?: AmqpError | Error;
  get_option(name: string, default_value: any): any;
  attach_sender(args: any): Sender;
  open_sender(args: any): Sender;
  attach_receiver(args: any): Receiver;
  open_receiver(args: any): Receiver;
  find_link(filter: Function): link | undefined;
  find_sender(filter: Function): Sender | undefined;
  find_receiver(filter: Function): Receiver | undefined;
  each_receiver(action: Function, filter: Function): void;
  each_sender(action: Function, filter: Function): void;
  each_link(action: Function, filter: Function): void;
  begin(): void;
  open(): void;
  end(error?: AmqpError): void;
  close(error?: AmqpError): void;
  is_open(): boolean;
  is_remote_open(): boolean;
  /**
   * Determines whether both local and remote endpoint for session or it's underlying
   * connection are closed.
   * @returns {boolean} `true` - closed, `false` otherwise.
   */
  is_closed(): boolean;
  /**
   * Determines whether both local and remote endpoint for just the session itself are closed.
   * @returns {boolean} `true` - closed, `false` otherwise.
   */
  is_itself_closed(): boolean;
  remove(): void;
}

export declare enum SessionEvents {
  /**
   * @property {string} sessionOpen Raised when the remote peer indicates the session is
   * open (i.e. attached in AMQP parlance).
   */
  sessionOpen = "session_open",
  /**
   * @property {string} sessionError Raised when the remote peer receives an error. The context
   * may also have an error property giving some information about the reason for the error.
   */
  sessionError = "session_error",
  /**
   * @property {string} sessionClose Raised when the remote peer indicates the session is closed.
   */
  sessionClose = "session_close",
  /**
   * @property {string} settled Raised when the session receives a disposition.
   */
  settled = "settled"
}
