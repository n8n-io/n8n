/// <reference types="node" />

import { EventEmitter } from "events";
import { frames } from "./frames";
import { EndpointState } from "./endpoint";
import { Delivery, Session } from "./session";
import { EventContext, Message, TerminusOptions, Connection, LinkOptions, Source, AmqpError, Dictionary } from "./connection";

export declare interface FlowController {
  window: number;
  update(context: EventContext): void;
}

export declare interface LinkError extends Error {
  message: string;
  condition: any;
  link: link;
}

export declare interface link extends EventEmitter {
  init(session: Session, name: string, local_handle: any, opts: any, is_receiver: boolean): void;
  session: Session;
  connection: Connection;
  name: string;
  options: LinkOptions;
  readonly error?: AmqpError | Error;
  readonly snd_settle_mode: 0 | 1 | 2;
  readonly rcv_settle_mode: 0 | 1;
  readonly source: Source;
  readonly target: TerminusOptions;
  readonly max_message_size: number;
  readonly offered_capabilities: string | string[];
  readonly desired_capabilities: string | string[];
  readonly properties: Dictionary<any>;
  set_source(fields: Source): void;
  set_target(fields: TerminusOptions): void;
  attach(): void;
  open(): void;
  detach(): void;
  close(error?: AmqpError): void;
  remove(): void;
  is_open(): boolean;
  is_remote_open(): boolean;
  /**
   * Determines whether both local and remote endpoint for link or it's underlying session
   * or it's underlying connection are closed.
   * @returns {boolean} `true` - closed, `false` otherwise.
   */
  is_closed(): boolean;
  /**
   * Determines whether both local and remote endpoint for just the link itself are closed.
   * @returns {boolean} `true` - closed, `false` otherwise.
   */
  is_itself_closed(): boolean;
  has_credit(): boolean;
  is_receiver(): boolean;
  is_sender(): boolean;
  get_option(name: string, default_value: any): any;
}

export declare interface Sender extends link {
  set_drained(drained: boolean): void;
  /**
   * Determines whether the message is sendable.
   * @returns {boolean} `true` Sendable. `false` Not Sendable.
   */
  sendable(): boolean;
  /**
   * Sends a message
   * @param {Message | Buffer} msg The message to be sent. For default AMQP format msg parameter
   * should be of type Message interface. For a custom format, the msg parameter should be a Buffer
   * and a valid value should be passed to the `format` argument.
   * @param {Buffer | string} [tag] The message tag if any.
   * @param {number} [format] The message format. Specify this if a message with custom format needs
   * to be sent. `0` implies the standard AMQP 1.0 defined format. If no value is provided, then the
   * given message is assumed to be of type Message interface and encoded appropriately.
   * @returns {Delivery} Delivery
   */
  send(msg: Message | Buffer, tag?: Buffer | string, format?: number): Delivery;
}

export declare interface Receiver extends link {
  drain: boolean;
  add_credit(credit: number): void;
  drain_credit(): void;
  set_credit_window(credit_window: number): void;
}

export declare enum ReceiverEvents {
  /**
   * @property {string} message Raised when a message is received.
   */
  message = "message",
  /**
   * @property {string} receiverOpen Raised when the remote peer indicates the link is
   * open (i.e. attached in AMQP parlance).
   */
  receiverOpen = "receiver_open",
  /**
   * @property {string} receiverDrained Raised when the remote peer
   * indicates that it has drained all credit (and therefore there
   * are no more messages at present that it can send).
   */
  receiverDrained  = 'receiver_drained',
  /**
   * @property {string} receiverFlow Raised when a flow is received for receiver.
   */
  receiverFlow = "receiver_flow",
  /**
   * @property {string} receiverError Raised when the remote peer closes the receiver with an
   * error. The context may also have an error property giving some information about the reason
   * for the error.
   */
  receiverError = "receiver_error",
  /**
   * @property {string} receiverClose Raised when the remote peer indicates the link is closed.
   */
  receiverClose = "receiver_close",
  /**
   * @property {string} settled Raised when the receiver link receives a disposition.
   */
  settled = "settled"
}

export declare enum SenderEvents {
  /**
   * @property {string} sendable Raised when the sender has sufficient credit to be able
   * to transmit messages to its peer.
   */
  sendable = "sendable",
  /**
   * @property {string} senderOpen Raised when the remote peer indicates the link is
   * open (i.e. attached in AMQP parlance).
   */
  senderOpen = "sender_open",
  /**
   * @property {string} senderDraining Raised when the remote peer
   * requests that the sender drain its credit; sending all
   * available messages within the credit limit and ensuring credit
   * is used up..
   */
  senderDraining = 'sender_draining',
  /**
   * @property {string} senderFlow Raised when a flow is received for sender.
   */
  senderFlow = "sender_flow",
  /**
   * @property {string} senderError Raised when the remote peer closes the sender with an
   * error. The context may also have an error property giving some information about the
   * reason for the error.
   */
  senderError = "sender_error",
  /**
   * @property {string} senderClose Raised when the remote peer indicates the link is closed.
   */
  senderClose = "sender_close",
  /**
   * @property {string} accepted Raised when a sent message is accepted by the peer.
   */
  accepted = "accepted",
  /**
   * @property {string} released Raised when a sent message is released by the peer.
   */
  released = "released",
  /**
   * @property {string} rejected Raised when a sent message is rejected by the peer.
   */
  rejected = "rejected",
  /**
   * @property {string} modified Raised when a sent message is modified by the peer.
   */
  modified = "modified",
  /**
   * @property {string} settled Raised when the sender link receives a disposition.
   */
  settled = "settled"
}
