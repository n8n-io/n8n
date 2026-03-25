![Node.js CI](https://github.com/amqp/rhea/workflows/Node.js%20CI/badge.svg)

# rhea

A reactive library for the [AMQP](http://amqp.org/) protocol, for easy
development of both clients and servers.

* [Hello World!](#hello-world)
* [API](#api)

## Hello World!

Brief example of sending and receiving a message through a
broker/server listening on port 5672:

```js
var container = require('rhea');
container.on('message', function (context) {
    console.log(context.message.body);
    context.connection.close();
});
container.once('sendable', function (context) {
    context.sender.send({body:'Hello World!'});
});
var connection = container.connect({'port':5672});
connection.open_receiver('examples');
connection.open_sender('examples');
```

output:
```
Hello World!
```
## Dependencies

* debug (For simple debug logging - may be replaced in the near
  term. To enable set e.g. DEBUG=rhea* or DEBUG=rhea:events for more
  qualified debugging)

## Examples

There are some examples of using the library under the examples
folder. These include:

* [helloworld.js](examples/helloworld.js) - essentially the code above, which
  sends and receives a single message through a broker

* [direct_helloworld.js](examples/direct_helloworld.js) - an example
  showing the sending of a single message without the use of a broker,
  by listening on a port and then openning a connection to itself over
  which the message is transfered.

* [send_raw.js](examples/send_raw.js) - explicitly set the [data section](http://docs.oasis-open.org/amqp/core/v1.0/os/amqp-core-messaging-v1.0-os.html#type-data) of the message body

* [simple_send.js](examples/simple_send.js) - connects to a specified
  port then sends a number of messages to a given address

* [simple_recv.js](examples/simple_recv.js) - connects to a specified
  port then subscribes to receive a number of messages from a given
  address

These last two can be used together to demsontrate sending messages
from one process to another, using a broker or similar intermediary to
which they both connect.

* [direct_recv.js](examples/direct_recv.js) - listens on a given port
  for incoming connections over which it will then receive a number of
  messages

The direct_recv.js example can be used in conjunction with the
simple_send.js example to demonstrate sending messages between
processes without the use of any intermediary. Note however the the
default port of one or ther other will need to be changed through the
-p command line option.

* [client.js](examples/client.js) and [server.js](examples/server.js)
  - A request-response example where the 'client' sends messages to a
  'server' (or service) which converts them to upper case and sends
  them back. This demonstrates the use of temporary addresses among
  other things. Using these two together requires a broker or similar
  intermediary.

* In durable_subscription, a
  [subscriber](examples/durable_subscription/subscriber.js) and a
  [publisher]( examples/durable_subscription/publisher.js)which
  demonstrate the notion of a durable subscription when used in
  conjunction with a broker such as ActiveMQ

* In selector a [receiver](examples/selector/recv.js) that uses a
  selector - a SQL like query string that restricts the set of
  messages delivered - and an accompanying
  [sender](examples/selector/send.js)

* In sasl a [sasl client](examples/sasl/simple_sasl_client.js) showing
  how to authenticate to the service you connect to. This can be used
  against any broker as well as either of two example servers showing
  [anonymous](examples/sasl/sasl_anonymous_server.js) and
  [plain](examples/sasl/sasl_plain_server.js) mechanisms.

* A tls [client](examples/tls/tls_client.js) and
  [server](examples/tls/tls_server.js) demonstrating connecting (and
  possibly authenticating) over a tls secured socket.

* A [client](examples/reconnect/client.js) to demonstrate the built in
  automatic reconnection functionality along with a simple [echo
  server](examples/reconnect/echo.js) against which it can be run. It
  can of course also be run against a broker instead (or as well!).

* Both [node based](examples/websockets/client.js) and [web
  based](examples/websockets/client.html) websocket clients along with
  a [server](examples/websockets/echo.js) which will echo back any
  requests received. The clients can also be used against a websocket
  enabled AMQP broker with a queue or topic called 'examples'. The
  node based scritps require the 'ws' node module to be installed. The
  browser based example requires a browserified version of the rhea
  library (this can be created e.g. by calling npm run-script
  browserify or make browserify). The browserified and minimized
  javascript library is stored under the dist/ directory.

To run the examples you will need the dependencies installed: the
library itself depends on the 'debug' module, and some of the examples
depend on the 'yargs' module for command line option parsing.

The 'rhea' module itself must also be findable by node. You can do
this either by checking out the code from git and setting NODE_PATH to
include the directory to which you do so (i.e. the directory in which
'a directory named 'rhea' can be found, or you can install the module
using npm.

Some of the examples assume an AMQP compatible broker, such as those
offered by the ActiveMQ or Qpid Apache projects, is running.

## API

There are five core types of object in the API:

  * <a href="#container">Containers</a>,
  * <a href="#connection">Connections</a>,
  * <a href="#session">Sessions</a>,
  * <a href="#receiver">Receivers</a>,
  * and <a href="#sender">Senders</a>

Each of these inherits all the methods of EventEmitter, allowing
handlers for particular events to be attached. Events that are not
handled at sender or receiver scope are then propagated up to possibly
be handled at session scope. Events that are not handled at session
scope are then propagated up to possibly be handled at connection
scope, and if not there then in container scope.

Two other relevant objects are:

  * <a href="#message">Message</a>
  * and <a href="#delivery">Delivery</a>

---------------------------------------------------------------------
### Container

An AMQP container from which outgoing connections can be made and/or
to which incoming connections can be accepted. The module exports a
default instance of a Container which can be used directly. Other
instances can be created from that if needed using the
create_container method. A container is identified by the
id property. By default a uuid is used, but the property
can be set to something more specific if desired before making or
accepting any connections.

#### methods:

##### connect(options)

Connects to the server specified by the host and port supplied in the
options and returns a <a href="#connection">Connection</a>.

The options argument is an object that may contain node library
[socket.connect](https://nodejs.org/api/net.html#socketconnectoptions-connectlistener)
and
[tls.connect](https://nodejs.org/api/tls.html#tlsconnectoptions-callback)
options and any of the following fields:

  * host - `socket.connect` option, defaults to localhost
  * port - `socket.connect` option, defaults to 5672
  * transport - undefined, 'tcp' or 'tls', determines if
    `socket.connect` or `tls.connect` options are accepted
  * username
  * password
  * sasl_init_hostname
  * reconnect
    * if true (the default), the library will automatically attempt to
      reconnect if disconnected
    * if false, automatic reconnect will be disabled
    * if it is a numeric value, it is interpreted as the delay between
      reconnect attempts (in milliseconds)
    When enabled, reconnect can be further controlled via the
    following options:
    * initial_reconnect_delay (in milliseconds)
    * max_reconnect_delay (in milliseconds)
    * reconnect_limit (maximum number of reconnect attempts)
  * connection_details - a function which if specified will be invoked
    to get the options to use (e.g. this can be used to alternate
    between a set of different host/port combinations)

As well as Container options common for both client and server:

  * id - connection name
  * container_id - (overrides the container identifier)
  * hostname - to present to remote in the open frame (defaults to host)
  * max_frame_size
  * channel_max
  * idle_time_out
  * outgoing_locales - in open frame
  * incoming_locales - in open frame
  * offered_capabilities - in open frame
  * desired_capabilities - in open frame
  * properties - in open frame
  * sender_options - defaults for open_sender
  * receiver_options - defaults for open_receiver
  * non_fatal_errors - an array of error conditions which if received
    on connection close from peer should not prevent reconnect (by
    default this only includes amqp:connection:forced)
  * all_errors_non_fatal - a boolean which determines if rhea's auto-reconnect should attempt reconnection on all fatal errors

If options is undefined, the client will attempt to obtain default
options from a JSON config file. This file is of similar structure to
that used by Apache Qpid Proton clients. The location of the file can
be specified through the MESSAGING_CONNECT_FILE environment variable.
If that is not specified it will look for a file called connect.json
in the current directory, in <home>/.config/messaging or
/etc/messaging/.

The config file offers only limited configurability, specifically:

  * scheme
  * host
  * port
  * user - (note not username)
  * password
  * sasl - (a nested object with field enabled)
  * sasl_mechanisms
  * tls - (a nested object with fields key, cert, ca for paths to
    correspoding files)
  * verify

##### listen(options)

Starts a server socket listening for incoming connections on the port
(and optionally interface) specified in the options.

The options argument is an object that may contain node library
[net.createServer](https://nodejs.org/api/net.html#netcreateserveroptions-connectionlistener)
and its
[server.listen](https://nodejs.org/api/net.html#serverlistenoptions-callback)
or
[tls.createServer](https://nodejs.org/api/tls.html#tlscreateserveroptions-secureconnectionlistener)
and its [server.listen](https://nodejs.org/api/tls.html#serverlisten)
options, most AMQP Container fields listed for `connect` and any of the
following fields:

The options argument is an object that may contain any of the
following fields:

  * transport - undefined, 'tcp' or 'tls', determines if
    `net.createServer` or `tls.createServer` options are accepted
  * host
  * port

##### create_container()

Returns a new container instance. The method takes an options object
which can contain the following field:

  * id

If no id is specified a new uuid will be generated.

##### generate_uuid()

Simple utility for generating a stringified uuid, useful if you wish
to specify distinct container ids for different connections.

##### websocket_connect()

Returns a function that can be used to create another function
suitable for use as the value of 'connection_details' in a connect
call in order to connect over websockets. The function returned here
takes a websocket url and optional arguments. The websocket_connect
method itself take the constructor of the WebSocket implementation to
use. It has been tested with the implementation in firefox and also
that in the node module 'ws'.

##### websocket_accept()

Used to start handling an incoming websocket connection as an AMQP
connection. See the [websocket echo server
example](examples/websockets/echo.js) for how to use it.

---------------------------------------------------------------------
### Connection

#### methods:

##### open_receiver(address|options)

Establishes a link over which messages can be received and returns a
<a href="#receiver">Receiver</a> representing that link. A receiving
link is a subscription, i.e. it expresses a desire to receive
messages.

The argument to this method can either be a simple string indicating
the source of messages of interest (e.g. a queue name), or an options
object that may contain any of the following fields:

  * source - The source from which messages are received. This can be
    a simple string address/name or a nested object itself containing
    the fields:
    * address
    * dynamic
    * expiry_policy
    * durable
  * target - The target of a receiving link is the local
    identifier. It is often not needed, but can be set if it is,
  * name - The name of the link. This should be unique for the
    container. If not specified a unqiue name is generated.
  * credit_window - A 'prefetch' window controlling the flow of
    messages over this receiver. Defaults to 500 if not specified. A
    value of 0 can be used to turn of automatic flow control and
    manage it directly.
  * autoaccept - Whether received messages should be automatically
    accepted. Defaults to true. If set to false, the application
    should call accept, release or reject on the <a
    href="#receiver">delivery</a> field of the context passed to the
    message event.
  * autosettle - Whether received messages should be automatically
    settled once the remote settles them. Defaults to true.

And attach frame fields:

  * snd_settle_mode
  * rcv_settle_mode
  * unsettled
  * max_message_size
  * offered_capabilities
  * desired_capabilities
  * properties

Note: If the link doesn't specify a value for the credit_window and
autoaccept options, the connection options are consulted followed by
the container options. The default is used only if an option is not
specified at any level.

##### open_sender(address|options)

Establishes a link over which messages can be sent and returns a <a
href="#sender">Sender</a> representing that link. A sending link is an
analogous concept to a subscription for outgoing rather than incoming
messages. I.e. it expresses a desire to send messages.

The argument to this method can either be a simple string indicating
the target for messages of interest (e.g. a queue name), or an options
object that may contain any of the following fields:

  * target - The target to which messages are sent. This can be a
    simple string address/name or a nested object itself containing
    the fields:
    * address
    * dynamic
    * expiry_policy
    * durable
  * source - The source of a sending link is the local identifier. It
    is usually not needed, but can be set if it is,
  * name - The name of the link. This should be unique for the
    container. If not specified a unqiue name is generated.
  * autosettle - Whether sent messages should be automatically
    settled once the peer settles them. Defaults to true.

And attach frame fields as for `open_receiver`.

Note: If the link doesn't specify a value for the autosettle option,
the connection options are consulted followed by the container
options. The default is used only if an option is not specified at any
level.

##### send(message)

Sends the specified message over the default sender, which is a
sending link whose target address is null. The use of this method
depends on the peer supporting so-called 'anonymous relay' semantics,
which most AMQP 1.0 brokers do. The message should have the 'to' field
set to the intended destination.

##### close()

Closes a connection (may take an error object which is an object
that consists of condition and description fields).

##### is_open()/is_closed()

Provide information about the connection status. If it's opened or
closed.

##### create_session()

Creates a new session if you want to manage sessions by yourself.

#### events:

##### connection_open

Raised when the remote peer indicates the connection is open.
This occurs also on reconnect.

##### connection_close

Raised when the remote peer indicates the connection is closed.
This can happen either as a response to our close, or by itself.
The connection and sessions will not be reconnected.

##### connection_error

Raised when the remote peer indicates the connection is closed and
specifies an error. A `connection_close` event will always follow this
event, so it only needs to be implemented if there are specific
actions to be taken on a close with an error as opposed to a close.
The error is available as a property on the event context.

If neither the connection_error or the connection_close is handled by
the application, an `error` event will be raised. This can be handled
on the connection or the container. If this is also unhandled, the
application process will exit.

##### protocol_error

Raised when a protocol error is received on the underlying socket.
A `disconnected` event will follow with any reconnect as configured.

##### error

Raised when an error is received on the underlying socket. This
catches any errors otherwise not handled.

##### disconnected

Raised when the underlying tcp connection is lost or nonfatal error
was received. The context has a `reconnecting` property which is true
if the library is attempting to automatically reconnect and false if
it has reached the reconnect limit. If reconnect has not been enabled
or if the connection is a tcp server, then the `reconnecting` property
is undefined. The context may also have an `error` property giving
some information about the reason for the disconnect. If the
disconnect event is not handled, a warning will be logged to the
console.

You should update the application state to resend any unsettled
messages again once the connection is recovered.

##### settled

Raised when remote settled the message.

---------------------------------------------------------------------
### Session

Session is an aggregation of <a href="#receiver">Receiver</a> and <a
href="#sender">Sender</a> links and provides the context and
sequencing of messages for all the links it contains. A <a
href="#connection">Connection</a> creates a default session for you if
you create receivers and senders on the Connection. You only need to
use this object if you want to group your links into more than one
session.

#### methods:

##### open_receiver(address|options)

This adds a receiver on the session. The `open_receiver` on the <a
href="#connection">Connection</a> object finds the session and calls
this.

##### open_sender(address|options)

This adds a sender on the session. The `open_sender` on the <a
href="#connection">Connection</a> object finds the session and calls
this.

##### close()

End a session (may take an error object which is an object that
consists of condition and description fields).

##### is_open()/is_closed()

Provide information about the session status. If it's opened or
closed.

#### events:

##### session_open

Raised when the remote peer indicates the session is open (i.e. begun
in AMQP parlance).

##### session_close

Raised when the remote peer indicates the session is closed (i.e.
ended in AMQP parlance). The session will be removed from the
connection after the event.

##### session_error

Raised when the remote peer indicates the session has ended and
specifies an error. A `session_close` event will always follow this
event, so it only needs to be implemented if there are specific
actions to be taken on a close with an error as opposed to a close.
The error is available as `error` property on the session object.

If neither the session_error or the session_close is handled by the
application, an `error` event will be raised on the container. If this
is also unhandled, the application process will exit.

##### settled

Raised when remote settled the message.

---------------------------------------------------------------------
### Receiver

#### methods:

##### close()

Closes a receiving link (i.e. cancels the subscription). (May take an
error object which is an object that consists of condition and
description fields).

##### detach()

Detaches a link without closing it. For durable subscriptions this
means the subscription is inactive, but not cancelled.

##### add_credit(n)

By default, receivers have a prefetch window that is moved
automatically by the library. However if desired the application can
set the prefecth to zero and manage credit itself. Each invocation of
add_credit() method issues credit for a further 'n' messages to be
sent by the peer over this receiving link. [Note: flow()is an alias
for add_credit()]

##### credit()

Returns the amount of outstanding credit that has been issued.

#### events:

##### message event

Raised when a message is received. The context passed will have a <a
href="#message">message</a>, containing the received content, and a <a
href="#delivery">delivery</a> which can be used to acknowledge receipt
of the message if autoaccept has been disabled.

##### receiver_open

Raised when the remote peer indicates the link is open (i.e. attached
in AMQP parlance).

##### receiver_drained

Raised when the remote peer indicates that it has drained all credit
(and therefore there are no more messages at present that it can send).

##### receiver_flow

Raised when a flow is received for receiver.

##### receiver_error

Raised when the remote peer closes the receiver with an error. A
`receiver_close` event will always follow this event, so it only needs
to be implemented if there are specific actions to be taken on a close
with an error as opposed to a close. The error is available as an
`error` property on the receiver.

##### receiver_close

Raised when the remote peer indicates the link is closed (i.e.
detached in AMQP parlance).

##### settled

Raised when remote settled the message.

---------------------------------------------------------------------
### Sender

#### methods:

##### send(msg)

Sends a <a href="#message">message</a>. The link need not be yet open
nor is any credit needed, but there is a limit of 2048 deliveries in
the <a href="#session">Session</a> queue before it raises an exception
for buffer overflow.

Unsettled messages, whether transmitted or not, are lost on reconnect
and there will be no `accepted`, `released`, `rejected` events. You
may need to resend the messages on a `disconnected` event.

If the messages to be sent can be generated or fetched on demand or
there is large number of messages, it is recommended `send` is called
only while the sender is `sendable()`. When sender is no longer
sendable, continue sending in the `sendable` event.

##### close()

Closes a sending link (may take an error object which is an object
that consists of condition and description fields).

##### detach()

Detaches a link without closing it.

##### sendable()

Returns true if the sender has available credits for sending a
message. Otherwise it returns false.

##### set_drained(bool)

This must be called in response to `sender_draining` event to tell
peer we have drained our messages or credit.

#### events:

##### sendable

Raised when the sender has received credit to be able to transmit
messages to its peer. You will not receive a new event until the peer
sends more credit, even if you have some credit left.

##### accepted

Raised when a sent message is accepted by the peer.

##### released

Raised when a sent message is released by the peer.

##### rejected

Raised when a sent message is rejected by the peer.
`context.delivery.remote_state.error` may carry diagnostics to explain
rejection, for example a `condition` property with value
`amqp:unauthorized-access`.

##### modified

Raised when a sent message is modified by the peer. The
`context.delivery.remote_state` may have `delivery_failed` and
`undeliverable_here` boolean and `message_annotations` map properties
to guide any message retransmission as specified in the AMQP 1.0
specification.

##### sender_open

Raised when the remote peer indicates the link is open (i.e. attached
in AMQP parlance).

##### sender_draining

Raised when the remote peer requests that the sender drain its credit;
sending all available messages within the credit limit and calling
`set_drained(true)`. After this the sender has no credit left.

##### sender_flow

Raised when a flow is received for sender. `sender_draining` and
`sendable` events may follow this event, so it only needs to be
implemented if there are specific actions to be taken.

##### sender_error

Raised when the remote peer closes the sender with an error. A
`sender_close` event will always follow this event, so it only needs
to be implemented if there are specific actions to be taken on a close
with an error as opposed to a close. The error is available as an
`error` property on the sender.

##### sender_close

Raised when the remote peer indicates the link is closed (i.e.
detached in AMQP parlance).

##### settled

Raised when remote settled the message.

### Message

A message is an object that may contain the following fields:

  * durable
  * priority
  * ttl
  * first_acquirer
  * delivery_count
  * delivery_annotations, an object/map of non-standard delivery
    annotations sent to link recipient peer that should be negotiated
    at link attach
  * message_annotations, an object/map of non-standard delivery
    annotations propagated across all steps that should be negotiated
    at link attach
  * message_id
  * user_id
  * to
  * subject
  * reply_to
  * correlation_id
  * content_type
  * content_encoding
  * absolute_expiry_time
  * creation_time
  * group_id
  * group_sequence
  * reply_to_group_id
  * application_properties, an object/map which can take arbitrary,
    application defined named simple values
  * body, which can be of any AMQP type type or `data_section`,
    `data_sections`, `sequence_section` or `sequence_sections` from
    `rhea.message`.
  * footer, an objec`t/map for HMACs or signatures or similar

Messages are passed to the send() method of Connection or Sender, and
are made available as `message` on the event context for the `message`
event on a Receiver or its parent(s).

### Delivery

The delivery object provides information on- and enables control over-
the state of a message transfer.

The methods on a delivery object are:

  * accept, which will positively acknowledge the receipt of the
    message
  * release, which will inform the sender that the message can be
    redelivered (to this or to any other receiver). The release can be
    controlled through an object passed in with one or more fo the
    following fields:
      * delivery_failed, if true the sender should increment the
        delivery_count on the next redelivery attempt, if false it
        should not
      * undeliverable_here, if true the sender should not try to
        redeliver the same message to this receiver
  * reject, which will inform the sender that the message is invalid
    in some way.
  * modified, which sets the modified outcome as defined in the AMQP
    1.0 specification.

If autoaccept is disabled on a receiver, the application should ensure
that it accepts (or releases or rejects) all messages received.

---------------------------------------------------------------------
**Note: For detailed options and types, please refer to the type
definitions in the [typings](./typings) directory**.
