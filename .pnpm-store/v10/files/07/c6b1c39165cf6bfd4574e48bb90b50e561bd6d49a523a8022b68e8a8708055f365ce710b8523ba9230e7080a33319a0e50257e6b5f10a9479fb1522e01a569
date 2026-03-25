/// <reference types="node" />

import { Session, Delivery } from "./session";
import { Sender, Receiver, link } from "./link";
import { NetConnectOpts, ListenOptions, Socket } from "net";
import { frames } from "./frames";
import { EventEmitter } from "events";
import { Container } from "./container";
import { ConnectionOptions as TlsConnectionOptions, PeerCertificate, TlsOptions } from "tls";
import { ConnectionError } from "./errors";

/**
 * Describes the signature of the event handler for any event emitted by rhea.
 * @type OnAmqpEvent
 * @param {EventContext} context The rhea event context.
 */
export type OnAmqpEvent = (context: EventContext) => void;

/**
 * Defines the common set of properties that are applicable for a connection, session and a link (sender, receiver).
 * @interface EndpointOptions
 */
export interface EndpointOptions {
  /**
   * @property {string | string[]} [desired_capabilities] Extension capabilities the sender can use if the receiver supports them.
   */
  desired_capabilities?: string | string[];
  /**
   * @property {string | string[]} [offered_capabilities] Extension capabilities the sender supports.
   */
  offered_capabilities?: string | string[];
  /**
   * @property {object} [properties] Properties of the entity (connection, session, link) contain a set of fields
   * intended to provide more information about the entity.
   */
  properties?: { [x: string]: any };
}

export interface ConnectionDetails {
  /**
   * @property {string} host The host name. Default value: `"localhost"`.
   */
  host: string;
  /**
   * @property {number} port The port number. Default value: `5672`.
   */
  port: number;
  /**
   * @property {any} options The options object provided to connection_details().
   */
  options?: any;
  /**
   * @property {Function} connect The `connect` function of `"net"` or `"tls"` module.
   */
  connect?: Function;
  /**
   * @property {string} [transport] - The transport option.
   */
  transport?: "tls" | "ssl" | "tcp";
}

/**
 * Defines the common options that can be provided for client and server connections.
 * @interface CommonConnectionOptions
 * @extends EndpointOptions
 */
interface CommonConnectionOptions extends EndpointOptions {
  /**
   * @property {string} [hostname] - The hostname presented in `open` frame, defaults to host.
   */
  hostname?: string;
  /**
   * @property {string} [container_id] The id of the source container. If not provided then
   * this will be the id (a guid string) of the assocaited container object. When this property is
   * provided, it will be used in the `open` frame to let the peer know about the container id.
   * However, the associated container object would still be the same container object from
   * which the connection is being created.
   *
   * The `"container_id"` is how the peer will identify the 'container' the connection is being
   * established from. The container in AMQP terminology is roughly analogous to a process.
   * Using a different container id on connections from the same process would cause the peer to
   * treat them as coming from distinct processes.
   */
  container_id?: string;
  /**
   * @property {string} [id] A unique name for the connection. If not provided then this will be
   * a string in the following format: "connection-<counter>".
   */
  id?: string;
  /**
   * @property {number} [max_frame_size] The largest frame size that the sending peer
   * is able to accept on this connection. Default: 4294967295
   */
  max_frame_size?: number;

  /**
   * @property {number} [session_buffer_size] The connection sessions outgoing and incoming CircularBuffer size.
   * Default: 2048
   */
  session_buffer_size?: number | { incoming?: number, outgoing?: number };
  /**
   * @property {number} [idle_time_out] The maximum period in milliseconds between activity
   * (frames) on the connection that is desired from the peer. The open frame carries the
   * idle-time-out field for this purpose. To avoid spurious timeouts, the value in idle_time_out
   * is set to be half of the peer’s actual timeout threshold.
   */
  idle_time_out?: number;
  /**
   * @property {number} [channel_max] The highest channel number that can be used on the connection.
   */
  channel_max?: number;
  /**
   * @property {string[]} [outgoing_locales] A list of the locales that the peer supports
   * for sending informational text.
   */
  outgoing_locales?: string[];
  /**
   * @property {string[]} [incoming_locales] A list of locales that the sending peer
   * permits for incoming informational text. This list is ordered in decreasing level of preference.
   */
  incoming_locales?: string[];
  /**
   * @property {SenderOptions} [sender_options] Default options that can be provided while creating any
   * sender link on this connection. These options will be overridden by the specific sender options
   * that will be provided while creating a sender.
   */
  sender_options?: SenderOptions;
  /**
   * @property {ReceiverOptions} [receiver_options] Default options that can be provided while creating any
   * receiver link on this connection. These options will be overridden by the specific receiver options
   * that will be provided while creating a sender.
   */
  receiver_options?: ReceiverOptions;
}

/**
 * Defines the common options that can be provided for client connections.
 * @interface TcpTransportOptions
 */
interface NetTransportOptions {
  /**
   * @property {string} [transport] - The transport option. This is ignored if connection_details is set.
   */
   transport?: "tcp";
 }

/**
 * Defines the common options that can be provided for TLS client connections.
 * @interface TlsTransportOptions
 */
interface TlsTransportOptions {
  /**
   * @property {string} transport - The transport option to request TLS connection. This is ignored if connection_details is set.
   */
   transport: "tls" | "ssl";
}

/**
 * Defines the common options that can be provided for client connections.
 * @interface ClientConnectionOptions
 * @extends CommonConnectionOptions
 */
interface ClientConnectionOptions extends CommonConnectionOptions {
  /**
   * @property {string} [username] - The username.
   */
  username?: string;
  /**
   * @property {string} [sasl_init_hostname] - The hostname for initialising sasl.
   */
  sasl_init_hostname?: string;
  /**
   * @property {boolean} [reconnect] if true (default), the library will automatically attempt to
   * reconnect if disconnected.
   * - if false, automatic reconnect will be disabled
   * - if it is a numeric value, it is interpreted as the delay between
   * reconnect attempts (in milliseconds)
   */
  reconnect?: boolean | number;
  /**
   * @property {number} [reconnect_limit] maximum number of reconnect attempts.
   * Applicable only when reconnect is true.
   */
  reconnect_limit?: number;
  /**
   * @property {number} [initial_reconnect_delay] - Time to wait in milliseconds before
   * attempting to reconnect. Applicable only when reconnect is true or a number is
   * provided for reconnect.
   */
  initial_reconnect_delay?: number;
  /**
   * @property {number} [max_reconnect_delay] - Maximum reconnect delay in milliseconds
   * before attempting to reconnect. Applicable only when reconnect is true.
   */
  max_reconnect_delay?: number;
  /**
   * @property {string} [password] - The secret key to be used while establishing the connection.
   */
  password?: string;
  /**
   * @property {Function} [connection_details] A function which if specified will be invoked to get the options
   * to use (e.g. this can be used to alternate between a set of different host/port combinations)
   */
  connection_details?: (conn_established_counter: number) => ConnectionDetails;
  /**
   * @property {string[]} [non_fatal_errors] An array of error conditions which if received on connection close
   * from peer should not prevent reconnect (by default this only includes `"amqp:connection:forced"`).
   */
  non_fatal_errors?: string[];
  /**
   * @property {boolean} [all_errors_non_fatal] Determines if rhea's auto-reconnect should attempt reconnection on all fatal errors
   */
  all_errors_non_fatal?: boolean;
}

type NetClientConnectionOptions = NetTransportOptions & ClientConnectionOptions & NetConnectOpts
type TlsClientConnectionOptions = TlsTransportOptions & ClientConnectionOptions & TlsConnectionOptions

export type ConnectionOptions = NetClientConnectionOptions | TlsClientConnectionOptions;

/** `net.createServer` options that have no own type in @types/node@10.17.60 */
type NetOptions = { allowHalfOpen?: boolean, pauseOnConnect?: boolean }
/**
 * Defines the options that can be provided while creating a server connection.
 */
type NetServerConnectionOptions = NetTransportOptions & CommonConnectionOptions & ListenOptions & NetOptions
/**
 * Defines the options that can be provided while creating a TLS server connection.
 */
type TlsServerConnectionOptions = TlsTransportOptions & CommonConnectionOptions & ListenOptions & TlsOptions

/**
 * Defines the options that can be provided while creating a server connection.
 */
export type ServerConnectionOptions = NetServerConnectionOptions | TlsServerConnectionOptions

/**
 * Defines the common set of options that can be provided while creating a link (sender, receiver).
 * @interface LinkOptions
 * @extends EndpointOptions
 */
export interface LinkOptions extends EndpointOptions {
  /**
   * @property {string} [name] The name of the link.
   * This should be unique for the container.
   * If not specified a unqiue name is generated.
   */
  name?: string;
  /**
   * @property {number} [snd_settle_mode] it specifies the sender settle mode with following possibile values:
   * - 0 - "unsettled" - The sender will send all deliveries initially unsettled to the receiver.
   * - 1 - "settled" - The sender will send all deliveries settled to the receiver.
   * - 2 - "mixed" - (default) The sender MAY send a mixture of settled and unsettled deliveries to the receiver.
   */
  snd_settle_mode?: 0 | 1 | 2;
  /**
   * @property {number} [rcv_settle_mode] it specifies the receiver settle mode with following possibile values:
   * - 0 - "first" - The receiver will spontaneously settle all incoming transfers.
   * - 1 - "second" - The receiver will only settle after sending the disposition to the sender and receiving a
   * disposition indicating settlement of the delivery from the sender.
   */
  rcv_settle_mode?: 0 | 1;
  /**
   * @property {number} [max_message_size] The maximum message size supported by the link endpoint.
   */
  max_message_size?: number;
}

/**
 * Defines the options that can be provided while creating the source/target for a Sender or Receiver (link).
 * @interface BaseTerminusOptions
 */
export interface BaseTerminusOptions {
  /**
   * @property {number} [durable] It specifies what state of the terminus will be retained durably:
   *  - the state of durable messages (unsettled_state value),
   *  - only existence and configuration of the terminus (configuration value), or
   *  - no state at all (none value);
   */
  durable?: number;
  /**
   * @property {string} [expiry_policy] - The expiry policy of the terminus. Default value "session-end".
   */
  expiry_policy?: string;
  /**
   * @property {boolean} [durable] - It specifies a request for the receiving peer
   * to dynamically create a node at the target/source. Default: false.
   */
  dynamic?: boolean;
  /**
   * @property {object} [dynamic_node_properties] - Properties of the dynamically created node
   */
  dynamic_node_properties?: Dictionary<any>;
  /**
   * @property {string | string []} [capabilities] The extension capabilities the sender supports/desires
   */
  capabilities?: string | string[];
  /**
   * @property {number} [timeout] The duration that an expiring terminus will be retained.
   */
  timeout?: number;
}

/**
 * Defines the options that can be provided while creating the source for a Sender or Receiver (link).
 * @interface TerminusOptions
 * @extends BaseTerminusOptions
 */
export interface TerminusOptions extends BaseTerminusOptions {
  /**
   * @property {string} address - The AMQP address as target for this terminus.
   */
  address: string;
}

/**
 * Defines the options that can be provided while creating the target for a Sender or Receiver (link).
 * @interface TargetTerminusOptions
 * @extends BaseTerminusOptions
 */
export interface TargetTerminusOptions extends BaseTerminusOptions {
  /**
   * @property {string} [address] - The AMQP address as target for this terminus.
   */
  address?: string;
}

/**
 * Describes the source.
 * @interface Source
 * @extends TerminusOptions
 */
export interface Source extends TerminusOptions {
  /**
  * @property {string} [distribution_mode] The distribution mode of the link.
  * Valid values are:
  * - **move** - once successfully transferred over the link, the message will no longer be
  * available to other links from the same node.
  * - **copy** - once successfully transferred over the link, the message is still available
  * for other links from the same node.
  */
  distribution_mode?: "move" | "copy";
  /**
   * @property {object} [filter] - The filters to be added for the terminus.
   */
  filter?: Dictionary<any>;
  /**
   * @property {any} [default_outcome] The default outcome for unsettled transfers.
   */
  default_outcome?: any;
  /**
   * @property {string | string[]} [outcomes] The descriptors for the outcomes that can be chosen
   * on this link.
   */
  outcomes?: string | string[];
}

/**
 * Defines the options that can be set while creating the Receiver (link).
 * @interface ReceiverOptions
 * @extends LinkOptions
 */
export interface ReceiverOptions extends LinkOptions {
  /**
   * @property {object} [credit_window]  A "prefetch" window controlling the flow of messages over
   * this receiver. Defaults to `1000` if not specified. A value of `0` can be used to
   * turn off automatic flow control and manage it directly.
   */
  credit_window?: number;
  /**
   * @property {boolean} [autoaccept] Whether received messages should be automatically accepted.
   * Defaults to `true`.
   */
  autoaccept?: boolean;
  /**
   * @property {object} source  The source from which messages are received.
   */
  source?: Source | string;
  /**
   * @property {object} [target]  The target of a receiving link is the local identifier
   */
  target?: TargetTerminusOptions | string;
  /**
   * @property {boolean} [autosettle] Whether received messages should be automatically settled
   * once the remote settles them. Defaults to `true`.
   */
  autosettle?: boolean;
}

/**
 * Defines the options that can be set while creating the Sender (link).
 * @interface SenderOptions
 * @extends LinkOptions
 */
export interface SenderOptions extends LinkOptions {
  /**
   * @property {boolean} [autosettle] Whether sent messages should be automatically settled
   * once the peer settles them. Defaults to `true`.
   */
  autosettle?: boolean;
  /**
   * @property {object} target  - The target to which messages are sent.
   *
   * If the target is set to `{}` no target address will be associated with the sender; the peer
   * may use the `to` field on each individual message to handle it correctly in that case.
   * This is useful where maintaining or setting up a sender for each target address is
   * too burdensome.
   */
  target?: TargetTerminusOptions | string;
  /**
   * @property {object} [source]  The source of a sending link is the local identifier.
   */
  source?: Source | string;
}

/**
 * Provides a Dictionary like structure <Key, Value> of Type T.
 * @interface Dictionary
 */
export interface Dictionary<T> {
  [key: string]: T;
}

/**
 * Map containing message attributes that will be held in the message header.
 * It conveys information about the message. This is the base interface.
 * @interface MessageAnnotations
 */
export interface MessageAnnotations {
  /**
   * @property {any} Any Supported message annotations.
   */
  [x: string]: any;
}

/**
 * Describes the delivery annotations. It is used for delivery-specific non-standard
 * properties at the head of the message. It conveys information from the sending
 * peer to the receiving peer. This is the base interface for Delivery Annotations.
 *
 * @interface DeliveryAnnotations
 */
export interface DeliveryAnnotations {
  /**
   * @property {any} Any Supported delivery annotations.
   */
  [x: string]: any;
}

/**
 * Describes the defined set of standard properties of the message.
 * @interface MessageProperties
 */
export interface MessageProperties {
  /**
   * @property {string | number | Buffer} [message_id] The application message identifier that
   * uniquely idenitifes a message. The user is responsible for making sure that this is unique in
   * the given context. Guids usually make a good fit.
   */
  message_id?: string | number | Buffer;
  /**
   * @property {string} [reply_to] The address of the node to send replies to.
   */
  reply_to?: string;
  /**
   * @property {string} [to] The address of the node the message is destined for.
   */
  to?: string;
  /**
   * @property {string | number | Buffer} [correlation_id] The id that can be used to mark or
   * identify messages between clients.
   */
  correlation_id?: string | number | Buffer;
  /**
   * @property {string} [content_type] MIME type for the message.
   */
  content_type?: string;
  /**
   * @property {string} [content_encoding] The content-encoding property is used as a modifier to the content-type.
   * When present, its valueindicates what additional content encodings have been applied to the application-data.
   */
  content_encoding?: string;
  /**
   * @property {number} [absolute_expiry_time] The time when this message is considered expired.
   */
  absolute_expiry_time?: Date;
  /**
   * @property {number} [creation_time] The time this message was created.
   */
  creation_time?: Date;
  /**
   * @property {string} [group_id] The group this message belongs to.
   */
  group_id?: string;
  /**
   * @property {number} [group_sequence] The sequence number of this message with its group.
   */
  group_sequence?: number;
  /**
   * @property {string} [reply_to_group_id] The group the reply message belongs to.
   */
  reply_to_group_id?: string;
  /**
   * @property {string} [subject] A common field for summary information about the message
   * content and purpose.
   */
  subject?: string;
  /**
   * @property {string} [user_id] The identity of the user responsible for producing the message.
   */
  user_id?: string;
}

/**
 * Describes the defined set of standard header properties of the message.
 * @interface MessageHeader
 */
export interface MessageHeader {
  /**
   * @property {boolean} [first_acquirer] If this value is true, then this message has not been
   * acquired by any other link. Ifthis value is false, then this message MAY have previously
   * been acquired by another link or links.
   */
  first_acquirer?: boolean;
  /**
   * @property {number} [delivery_count] The number of prior unsuccessful delivery attempts.
   */
  delivery_count?: number;
  /**
   * @property {number} [ttl] time to live in ms.
   */
  ttl?: number;
  /**
   * @property {boolean} [durable] Specifies durability requirements.
   */
  durable?: boolean;
  /**
   * @property {number} [priority] The relative message priority. Higher numbers indicate higher
   * priority messages.
   */
  priority?: number;
}

/**
 * Describes the footer section. It is used for details about the message or delivery
 * which can only be calculated or evaluated once the whole bare message has been
 * constructed or seen (for example message hashes, HMACs, signatures and encryption details).
 *
 * @interface MessageFooter
 */
export interface MessageFooter {
  /**
   * @property {any} Any Supported footer section
   */
  [x: string]: any;
}

/**
 * Describes the AMQP message that is sent or received on the wire.
 * @interface Message
 * @extends MessageProperties
 * @extends MessageHeader
 */
export interface Message extends MessageProperties, MessageHeader {
  /**
   * @property {any} body The message body.
   */
  body: any;
  /**
   * @property {MessageAnnotations} [message_annotations] A dictionary containing message attributes
   * that will be held in the message header
   */
  message_annotations?: MessageAnnotations;
  /**
   * @property {Dictionary<any>} [application_properties] A dictionary containing application
   * specific message properties.
   */
  application_properties?: Dictionary<any>;
  /**
   * @property {DeliveryAnnotations} [delivery_annotations] A dictionary used for delivery-specific
   * non-standard properties at the head of the message.
   */
  delivery_annotations?: DeliveryAnnotations;
  /**
   * @property {MessageFooter} [footer] A dictionary used for the footer section of the message.
   */
  footer?: MessageFooter;
}

/**
 * Defines the AMQP Connection context. This context is provided when you add an
 * event handler to any of the objects created by rhea.
 * @interface EventContext
 */
export interface EventContext {
  /**
   * @property {Connection} connection The amqp connection.
   */
  connection: Connection;
  /**
   * @property {Container} container The amqp container
   */
  container: Container;
  /**
   * @property {Session} [session] The amqp session link that was created on the amqp connection.
   */
  session?: Session;
  /**
   * @property {Delivery} [delivery] The amqp delivery that is received after sending a message.
   */
  delivery?: Delivery;
  /**
   * @property {AmqpMessage} [message] The amqp message that is received in the message event
   * handler when rhea emits a message event on a receiver.
   */
  message?: Message;
  /**
   * @property {Receiver} [receiver] The amqp receiver link that was created on the amqp connection.
   */
  receiver?: Receiver;
  /**
   * @property {Sender} [sender] The amqp sender link that was created on the amqp connection.
   */
  sender?: Sender;
  /**
   * @property {Error | ConnectionError} [error] An optional error object.
   * - On `connection_error` event this property will be present. It will have the same information as
   * `connection.error` but the type will be `ConnectionError`.
   * - An error with SASL will be available through this property, but not through `connection.error`
   * (as the amqp connection was never established).
   * - On `disconnected` event the context will have an error property that will be of type
   * `Error` (or some subclass) as emitted by the underlying socket.
   * - The `session_error`, `sender_error` and `receiver_error` events will not have this (`error`)
   * property on the EventContext.
   */
  error?: Error | ConnectionError;
  /**
   * @property {boolean} [reconnecting] The value is true if the library is attempting to automatically
   * reconnect and false if it has reached the reconnect limit. If reconnect has not been enabled
   * or if the connection is a tcp server, then the reconnecting property is undefined. This property
   * is used in conjunction with "disconnected" event.
   */
  reconnecting?: boolean;
}

/**
 * Defines the amqp error object.
 * @interface AmqpError
 */
export interface AmqpError {
  /**
   * @property {string} [condition] Describes the error condition.
   */
  condition?: string;
  /**
   * @property {string} [description] Describes any supplementary information that is not indicated
   * the error condition.
   */
  description?: string;
  /**
   * @property {any} [info] Describes the information about the error condition.
   */
  info?: any;
  /**
   * @property {any[]} [value] Describes the associated amqp value types.
   */
  value?: any[];
}

export declare interface Connection extends EventEmitter {
  [x: string]: any;
  options: ConnectionOptions;
  readonly container: Container;
  readonly hostname?: string;
  readonly container_id: string;
  readonly max_frame_size?: number;
  readonly idle_time_out?: number;
  readonly channel_max?: number;
  readonly properties?: { [x: string]: any };
  readonly error?: AmqpError | Error;
  connect(): Connection;
  reconnect(): Connection;
  attach_sender(options?: SenderOptions | string): Sender;
  open_sender(options?: SenderOptions | string): Sender;
  attach_receiver(options?: ReceiverOptions | string): Receiver;
  open_receiver(options?: ReceiverOptions | string): Receiver;
  get_option(name: string, default_value: any): any;
  send(msg: Message): Delivery;
  get_error(): ConnectionError | undefined;
  open(): void;
  close(error?: AmqpError): void;
  is_open(): boolean;
  is_remote_open(): boolean;
  /**
   * Determines whether both local and remote endpoints are closed.
   * @returns {boolean} `true` - closed, `false` otherwise.
   */
  is_closed(): boolean;
  create_session(session_buffer_size?: number | { incoming?: number, outgoing?: number }): Session;
  find_sender(filter: Function): Sender | undefined;
  find_receiver(filter: Function): Receiver | undefined;
  find_link(filter: Function): link | undefined;
  each_receiver(action: Function, filter?: Function): void;
  each_sender(action: Function, filter?: Function): void;
  each_link(action: Function, filter?: Function): void;
  on_open(frame: frames): void;
  on_close(frame: frames): void;
  get_peer_certificate(): PeerCertificate | undefined;
  get_tls_socket(): Socket | undefined;
  remove_session(session: Session): void;
  remove_all_sessions(): void;
}

export declare enum ConnectionEvents {
  /**
   * @property {string} connectionOpen Raised when the remote peer indicates the connection is open.
   */
  connectionOpen = "connection_open",
  /**
   * @property {string} connectionClose Raised when the remote peer indicates the connection is closed.
   */
  connectionClose = "connection_close",
  /**
   * @property {string} connectionError Raised when the remote peer indicates an error occurred on
   * the connection.
   */
  connectionError = "connection_error",
  /**
   * @property {string} protocolError Raised when a protocol error is received on the underlying socket.
   */
  protocolError = "protocol_error",
  /**
   * @property {string} error Raised when an error is received on the underlying socket.
   */
  error = "error",
  /**
   * @property {string} disconnected Raised when the underlying tcp connection is lost. The context
   * has a reconnecting property which is true if the library is attempting to automatically reconnect
   * and false if it has reached the reconnect limit. If reconnect has not been enabled or if the connection
   * is a tcp server, then the reconnecting property is undefined. The context may also have an error
   * property giving some information about the reason for the disconnect.
   */
  disconnected = "disconnected",
  /**
   * @property {string} settled Raised when the connection receives a disposition.
   */
  settled = "settled"
}
