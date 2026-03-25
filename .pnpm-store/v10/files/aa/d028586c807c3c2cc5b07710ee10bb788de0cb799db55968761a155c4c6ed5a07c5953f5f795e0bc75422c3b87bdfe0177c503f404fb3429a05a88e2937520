# ![mqtt.js](https://raw.githubusercontent.com/mqttjs/MQTT.js/137ee0e3940c1f01049a30248c70f24dc6e6f829/MQTT.js.png)

![Github Test Status](https://github.com/mqttjs/MQTT.js/workflows/MQTT.js%20CI/badge.svg) [![codecov](https://codecov.io/gh/mqttjs/MQTT.js/branch/master/graph/badge.svg)](https://codecov.io/gh/mqttjs/MQTT.js)

[![Maintenance](https://img.shields.io/badge/Maintained%3F-yes-green.svg)](https://github.com/mqttjs/MQTT.js/graphs/commit-activity)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/mqttjs/MQTT.js/pulls)

[![node](https://img.shields.io/node/v/mqtt.svg) ![npm](https://img.shields.io/npm/v/mqtt.svg?logo=npm) ![NPM Downloads](https://img.shields.io/npm/dm/mqtt.svg)](https://www.npmjs.com/package/mqtt)

MQTT.js is a client library for the [MQTT](http://mqtt.org/) protocol, written
in JavaScript for node.js and the browser.

## Table of Contents

- [Upgrade notes](#notes)
- [Installation](#install)
- [Example](#example)
- [React Native](#react-native)
- [Import Styles](#example)
- [Command Line Tools](#cli)
- [API](#api)
- [Browser](#browser)
- [About QoS](#qos)
- [TypeScript](#typescript)
- [Weapp and Ali support](#weapp-alipay)
- [Contributing](#contributing)
- [Sponsor](#sponsor)
- [License](#license)

MQTT.js is an OPEN Open Source Project, see the [Contributing](#contributing) section to find out what this means.

[![JavaScript Style
Guide](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)

<a name="notes"></a>

## Important notes for existing users

**v5.0.0** (07/2023)

- Removes support for all end of life node versions (v12 and v14), and now supports node v18 and v20.
- Completely rewritten in Typescript 🚀.
- When creating `MqttClient` instance `new` is now required.

**v4.0.0** (Released 04/2020) removes support for all end of life node versions, and now supports node v12 and v14. It also adds improvements to
debug logging, along with some feature additions.

As a **breaking change**, by default a error handler is built into the MQTT.js client, so if any
errors are emitted and the user has not created an event handler on the client for errors, the client will
not break as a result of unhandled errors. Additionally, typical TLS errors like `ECONNREFUSED`, `ECONNRESET` have been
added to a list of TLS errors that will be emitted from the MQTT.js client, and so can be handled as connection errors.

**v3.0.0** adds support for MQTT 5, support for node v10.x, and many fixes to improve reliability.

**Note:** MQTT v5 support is experimental as it has not been implemented by brokers yet.

**v2.0.0** removes support for node v0.8, v0.10 and v0.12, and it is 3x faster in sending
packets. It also removes all the deprecated functionality in v1.0.0,
mainly `mqtt.createConnection` and `mqtt.Server`. From v2.0.0,
subscriptions are restored upon reconnection if `clean: true`.
v1.x.x is now in _LTS_, and it will keep being supported as long as
there are v0.8, v0.10 and v0.12 users.

As a **breaking change**, the `encoding` option in the old client is
removed, and now everything is UTF-8 with the exception of the
`password` in the CONNECT message and `payload` in the PUBLISH message,
which are `Buffer`.

Another **breaking change** is that MQTT.js now defaults to MQTT v3.1.1,
so to support old brokers, please read the [client options doc](#client).

**v1.0.0** improves the overall architecture of the project, which is now
split into three components: MQTT.js keeps the Client,
[mqtt-connection](http://npm.im/mqtt-connection) includes the barebone
Connection code for server-side usage, and [mqtt-packet](http://npm.im/mqtt-packet)
includes the protocol parser and generator. The new Client improves
performance by a 30% factor, embeds Websocket support
([MOWS](http://npm.im/mows) is now deprecated), and it has a better
support for QoS 1 and 2. The previous API is still supported but
deprecated, as such, it is not documented in this README.

<a name="install"></a>

## Installation

```sh
npm install mqtt --save
```

<a name="example"></a>

## Example

For the sake of simplicity, let's put the subscriber and the publisher in the same file:

```js
const mqtt = require("mqtt");
const client = mqtt.connect("mqtt://test.mosquitto.org");

client.on("connect", () => {
  client.subscribe("presence", (err) => {
    if (!err) {
      client.publish("presence", "Hello mqtt");
    }
  });
});

client.on("message", (topic, message) => {
  // message is Buffer
  console.log(message.toString());
  client.end();
});
```

output:

```sh
Hello mqtt
```

<a name="example-react-native"></a>

### React Native

MQTT.js can be used in React Native applications. To use it, see the [React Native example](https://github.com/MaximoLiberata/react-native-mqtt.js-example)

If you want to run your own MQTT broker, you can use
[Mosquitto](http://mosquitto.org) or
[Aedes-cli](https://github.com/moscajs/aedes-cli), and launch it.

You can also use a test instance: test.mosquitto.org.

If you do not want to install a separate broker, you can try using the
[Aedes](https://github.com/moscajs/aedes).

<a name="import_styles"></a>

## Import styles

### CommonJS (Require)

```js
const mqtt = require("mqtt")  // require mqtt
const client = mqtt.connect("mqtt://test.mosquitto.org")  // create a client
```

### ES6 Modules (Import)

#### Default import

```js
import mqtt from "mqtt"; // import namespace "mqtt"
let client = mqtt.connect("mqtt://test.mosquitto.org"); // create a client
```

#### Importing individual components

```js
import { connect } from "mqtt"; // import connect from mqtt
let client = connect("mqtt://test.mosquitto.org"); // create a client
```

<a name="cli"></a>

## Command Line Tools

MQTT.js bundles a command to interact with a broker.
In order to have it available on your path, you should install MQTT.js
globally:

```sh
npm install mqtt -g
```

Then, on one terminal

```sh
mqtt sub -t 'hello' -h 'test.mosquitto.org' -v
```

On another

```sh
mqtt pub -t 'hello' -h 'test.mosquitto.org' -m 'from MQTT.js'
```

See `mqtt help <command>` for the command help.

<a name="debug"></a>

## Debug Logs

MQTT.js uses the [debug](https://www.npmjs.com/package/debug#cmd) package for debugging purposes. To enable debug logs, add the following environment variable on runtime :

```ps
# (example using PowerShell, the VS Code default)
$env:DEBUG='mqttjs*'
```

<a name="reconnecting"></a>

## About Reconnection

An important part of any websocket connection is what to do when a connection
drops off and the client needs to reconnect. MQTT has built-in reconnection
support that can be configured to behave in ways that suit the application.

#### Refresh Authentication Options / Signed Urls with `transformWsUrl` (Websocket Only)

When an mqtt connection drops and needs to reconnect, it's common to require
that any authentication associated with the connection is kept current with
the underlying auth mechanism. For instance some applications may pass an auth
token with connection options on the initial connection, while other cloud
services may require a url be signed with each connection.

By the time the reconnect happens in the application lifecycle, the original
auth data may have expired.

To address this we can use a hook called `transformWsUrl` to manipulate
either of the connection url or the client options at the time of a reconnect.

Example (update clientId & username on each reconnect):

```js
    const transformWsUrl = (url, options, client) => {
      client.options.username = `token=${this.get_current_auth_token()}`;
      client.options.clientId = `${this.get_updated_clientId()}`;

      return `${this.get_signed_cloud_url(url)}`;
    }

    const connection = await mqtt.connectAsync(<wss url>, {
      ...,
      transformWsUrl: transformUrl,
    });

```

Now every time a new WebSocket connection is opened (hopefully not too often),
we will get a fresh signed url or fresh auth token data.

Note: Currently this hook does _not_ support promises, meaning that in order to
use the latest auth token, you must have some outside mechanism running that
handles application-level authentication refreshing so that the websocket
connection can simply grab the latest valid token or signed url.

#### Customize Websockets with `createWebsocket` (Websocket Only)

When you need to add a custom websocket subprotocol or header to open a connection
through a proxy with custom authentication this callback allows you to create your own
instance of a websocket which will be used in the mqtt client.

```js
  const createWebsocket = (url, websocketSubProtocols, options) => {
    const subProtocols = [
      websocketSubProtocols[0],
      'myCustomSubprotocolOrOAuthToken',
    ]
    return new WebSocket(url, subProtocols)
  }

  const client = await mqtt.connectAsync(<wss url>, {
    ...,
    createWebsocket: createWebsocket,
  });
```

#### Enabling Reconnection with `reconnectPeriod` option

To ensure that the mqtt client automatically tries to reconnect when the
connection is dropped, you must set the client option `reconnectPeriod` to a
value greater than 0. A value of 0 will disable reconnection and then terminate
the final connection when it drops.

The default value is 1000 ms which means it will try to reconnect 1 second
after losing the connection.

<a name="topicalias"></a>

## About Topic Alias Management

### Enabling automatic Topic Alias using

If the client sets the option `autoUseTopicAlias:true` then MQTT.js uses existing topic alias automatically.

example scenario:

```bash
1. PUBLISH topic:'t1', ta:1                   (register)
2. PUBLISH topic:'t1'       -> topic:'', ta:1 (auto use existing map entry)
3. PUBLISH topic:'t2', ta:1                   (register overwrite)
4. PUBLISH topic:'t2'       -> topic:'', ta:1 (auto use existing map entry based on the receent map)
5. PUBLISH topic:'t1'                         (t1 is no longer mapped to ta:1)
```

User doesn't need to manage which topic is mapped to which topic alias.
If the user want to register topic alias, then publish topic with topic alias.
If the user want to use topic alias, then publish topic without topic alias. If there is a mapped topic alias then added it as a property and update the topic to empty string.

### Enabling automatic Topic Alias assign

If the client sets the option `autoAssignTopicAlias:true` then MQTT.js uses existing topic alias automatically.
If no topic alias exists, then assign a new vacant topic alias automatically. If topic alias is fully used, then LRU(Least Recently Used) topic-alias entry is overwritten.

example scenario:

```bash
The broker returns CONNACK (TopicAliasMaximum:3)
1. PUBLISH topic:'t1' -> 't1', ta:1 (auto assign t1:1 and register)
2. PUBLISH topic:'t1' -> ''  , ta:1 (auto use existing map entry)
3. PUBLISH topic:'t2' -> 't2', ta:2 (auto assign t1:2 and register. 2 was vacant)
4. PUBLISH topic:'t3' -> 't3', ta:3 (auto assign t1:3 and register. 3 was vacant)
5. PUBLISH topic:'t4' -> 't4', ta:1 (LRU entry is overwritten)
```

Also user can manually register topic-alias pair using PUBLISH topic:'some', ta:X. It works well with automatic topic alias assign.

<a name="api"></a>

## API

- [`mqtt.connect()`](#connect)
- [`mqtt.connectAsync()`](#connect-async)
- [`mqtt.Client()`](#client)
- [`mqtt.Client#connect()`](#client-connect)
- [`mqtt.Client#publish()`](#publish)
- [`mqtt.Client#publishAsync()`](#publish-async)
- [`mqtt.Client#subscribe()`](#subscribe)
- [`mqtt.Client#subscribeAsync()`](#subscribe-async)
- [`mqtt.Client#unsubscribe()`](#unsubscribe)
- [`mqtt.Client#unsubscribeAsync()`](#unsubscribe-async)
- [`mqtt.Client#end()`](#end)
- [`mqtt.Client#endAsync()`](#end-async)
- [`mqtt.Client#removeOutgoingMessage()`](#removeOutgoingMessage)
- [`mqtt.Client#reconnect()`](#reconnect)
- [`mqtt.Client#handleMessage()`](#handleMessage)
- [`mqtt.Client#connected`](#connected)
- [`mqtt.Client#reconnecting`](#reconnecting)
- [`mqtt.Client#getLastMessageId()`](#getLastMessageId)
- [`mqtt.Store()`](#store)
- [`mqtt.Store#put()`](#put)
- [`mqtt.Store#del()`](#del)
- [`mqtt.Store#createStream()`](#createStream)
- [`mqtt.Store#close()`](#close)

---

<a name="connect"></a>

### mqtt.connect([url], options)

Connects to the broker specified by the given url and options and
returns a [Client](#client).

The URL can be on the following protocols: 'mqtt', 'mqtts', 'tcp',
'tls', 'ws', 'wss', 'wxs', 'alis'. If you are trying to connect to a unix socket just append the `+unix` suffix to the protocol (ex: `mqtt+unix`). This will set the `unixSocket` property automatically.

The URL can also be an object as returned by
[`URL.parse()`](http://nodejs.org/api/url.html#url_url_parse_urlstr_parsequerystring_slashesdenotehost),
in that case the two objects are merged, i.e. you can pass a single
object with both the URL and the connect options.

You can also specify a `servers` options with content: `[{ host:
'localhost', port: 1883 }, ... ]`, in that case that array is iterated
at every connect.

For all MQTT-related options, see the [Client](#client)
constructor.

<a name="connect-async"></a>

### connectAsync([url], options)

Asynchronous wrapper around the [`connect`](#connect) function.

Returns a `Promise` that resolves to a `mqtt.Client` instance when the client
fires a `'connect'` or `'end'` event, or rejects with an error if the `'error'`
is fired.

Note that the `manualConnect` option will cause the promise returned by this
function to never resolve or reject as the underlying client never fires any
events.

---

<a name="client"></a>

### mqtt.Client(streamBuilder, options)

The `Client` class wraps a client connection to an
MQTT broker over an arbitrary transport method (TCP, TLS,
WebSocket, ecc).
`Client` is an [EventEmitter](https://nodejs.dev/en/learn/the-nodejs-event-emitter/) that has it's own [events](#events)

`Client` automatically handles the following:

- Regular server pings
- QoS flow
- Automatic reconnections
- Start publishing before being connected

The arguments are:

- `streamBuilder` is a function that returns a subclass of the `Stream` class that supports
  the `connect` event. Typically a `net.Socket`.
- `options` is the client connection options (see: the [connect packet](https://github.com/mcollina/mqtt-packet#connect)). Defaults:
  - `wsOptions`: is the WebSocket connection options. Default is `{}`.
    It's specific for WebSockets. For possible options have a look at: <https://github.com/websockets/ws/blob/master/doc/ws.md>.
  - `keepalive`: `60` seconds, set to `0` to disable
  - `reschedulePings`: reschedule ping messages after sending packets (default `true`)
  - `clientId`: `'mqttjs_' + Math.random().toString(16).substr(2, 8)`
  - `protocolId`: `'MQTT'`
  - `protocolVersion`: `4`
  - `clean`: `true`, set to false to receive QoS 1 and 2 messages while
    offline
  - `reconnectPeriod`: `1000` milliseconds, interval between two
    reconnections. Disable auto reconnect by setting to `0`.
  - `connectTimeout`: `30 * 1000` milliseconds, time to wait before a
    CONNACK is received
  - `username`: the username required by your broker, if any
  - `password`: the password required by your broker, if any
  - `incomingStore`: a [Store](#store) for the incoming packets
  - `outgoingStore`: a [Store](#store) for the outgoing packets
  - `queueQoSZero`: if connection is broken, queue outgoing QoS zero messages (default `true`)
  - `customHandleAcks`: MQTT 5 feature of custom handling puback and pubrec packets. Its callback:

    ```js
      customHandleAcks: function(topic, message, packet, done) {/*some logic with calling done(error, reasonCode)*/}
    ```

  - `autoUseTopicAlias`: enabling automatic Topic Alias using functionality
  - `autoAssignTopicAlias`: enabling automatic Topic Alias assign functionality
  - `properties`: properties MQTT 5.0.
    `object` that supports the following properties:
    - `sessionExpiryInterval`: representing the Session Expiry Interval in seconds `number`,
    - `receiveMaximum`: representing the Receive Maximum value `number`,
    - `maximumPacketSize`: representing the Maximum Packet Size the Client is willing to accept `number`,
    - `topicAliasMaximum`: representing the Topic Alias Maximum value indicates the highest value that the Client will accept as a Topic Alias sent by the Server `number`,
    - `requestResponseInformation`: The Client uses this value to request the Server to return Response Information in the CONNACK `boolean`,
    - `requestProblemInformation`: The Client uses this value to indicate whether the Reason String or User Properties are sent in the case of failures `boolean`,
    - `userProperties`: The User Property is allowed to appear multiple times to represent multiple name, value pairs `object`,
    - `authenticationMethod`: the name of the authentication method used for extended authentication `string`,
    - `authenticationData`: Binary Data containing authentication data `binary`
  - `authPacket`: settings for auth packet `object`
  - `will`: a message that will sent by the broker automatically when
    the client disconnect badly. The format is:
    - `topic`: the topic to publish
    - `payload`: the message to publish
    - `qos`: the QoS
    - `retain`: the retain flag
    - `properties`: properties of will by MQTT 5.0:
      - `willDelayInterval`: representing the Will Delay Interval in seconds `number`,
      - `payloadFormatIndicator`: Will Message is UTF-8 Encoded Character Data or not `boolean`,
      - `messageExpiryInterval`: value is the lifetime of the Will Message in seconds and is sent as the Publication Expiry Interval when the Server publishes the Will Message `number`,
      - `contentType`: describing the content of the Will Message `string`,
      - `responseTopic`: String which is used as the Topic Name for a response message `string`,
      - `correlationData`: The Correlation Data is used by the sender of the Request Message to identify which request the Response Message is for when it is received `binary`,
      - `userProperties`: The User Property is allowed to appear multiple times to represent multiple name, value pairs `object`
  - `transformWsUrl` : optional `(url, options, client) => url` function
    For ws/wss protocols only. Can be used to implement signing
    urls which upon reconnect can have become expired.
  - `createWebsocket` : optional `url, websocketSubProtocols, options) => Websocket` function
      For ws/wss protocols only. Can be used to implement a custom websocket subprotocol or implementation.
  - `resubscribe` : if connection is broken and reconnects,
    subscribed topics are automatically subscribed again (default `true`)
  - `messageIdProvider`: custom messageId provider. when `new UniqueMessageIdProvider()` is set, then non conflict messageId is provided.
  - `log`: custom log function. Default uses [debug](https://www.npmjs.com/package/debug) package.
  - `manualConnect`: prevents the constructor to call `connect`. In this case after the `mqtt.connect` is called you should call `client.connect` manually.
  - `timerVariant`: defaults to `auto`, which tries to determine which timer is most appropriate for you environment, if you're having detection issues, you can set it to `worker` or `native`
  - `unixSocket`: if you want to connect to a unix socket, set this to true

In case mqtts (mqtt over tls) is required, the `options` object is passed through to [`tls.connect()`](http://nodejs.org/api/tls.html#tls_tls_connect_options_callback). If using a **self-signed certificate**, set `rejectUnauthorized: false`. However, be cautious as this exposes you to potential man in the middle attacks and isn't recommended for production.

For those supporting multiple TLS protocols on a single port, like MQTTS and MQTT over WSS, utilize the `ALPNProtocols` option. This lets you define the Application Layer Protocol Negotiation (ALPN) protocol. You can set `ALPNProtocols` as a string array, Buffer, or Uint8Array based on your setup.

If you are connecting to a broker that supports only MQTT 3.1 (not
3.1.1 compliant), you should pass these additional options:

```js
{
  protocolId: 'MQIsdp',
  protocolVersion: 3
}
```

This is confirmed on RabbitMQ 3.2.4, and on Mosquitto < 1.3. Mosquitto
version 1.3 and 1.4 works fine without those.

<a name="events"></a>

#### Event `'connect'`

`function (connack) {}`

Emitted on successful (re)connection (i.e. connack rc=0).

- `connack` received connack packet. When `clean` connection option is `false` and server has a previous session
  for `clientId` connection option, then `connack.sessionPresent` flag is `true`. When that is the case,
  you may rely on stored session and prefer not to send subscribe commands for the client.

#### Event `'reconnect'`

`function () {}`

Emitted when a reconnect starts.

#### Event `'close'`

`function () {}`

Emitted after a disconnection.

#### Event `'disconnect'`

`function (packet) {}`

Emitted after receiving disconnect packet from broker. MQTT 5.0 feature.

#### Event `'offline'`

`function () {}`

Emitted when the client goes offline.

#### Event `'error'`

`function (error) {}`

Emitted when the client cannot connect (i.e. connack rc != 0) or when a
parsing error occurs.

The following TLS errors will be emitted as an `error` event:

- `ECONNREFUSED`
- `ECONNRESET`
- `EADDRINUSE`
- `ENOTFOUND`

#### Event `'end'`

`function () {}`

Emitted when [`mqtt.Client#end()`](#end) is called.
If a callback was passed to `mqtt.Client#end()`, this event is emitted once the
callback returns.

#### Event `'message'`

`function (topic, message, packet) {}`

Emitted when the client receives a publish packet

- `topic` topic of the received packet
- `message` payload of the received packet
- `packet` received packet, as defined in
  [mqtt-packet](https://github.com/mcollina/mqtt-packet#publish)

#### Event `'packetsend'`

`function (packet) {}`

Emitted when the client sends any packet. This includes .published() packets
as well as packets used by MQTT for managing subscriptions and connections

- `packet` received packet, as defined in
  [mqtt-packet](https://github.com/mcollina/mqtt-packet)

#### Event `'packetreceive'`

`function (packet) {}`

Emitted when the client receives any packet. This includes packets from
subscribed topics as well as packets used by MQTT for managing subscriptions
and connections

- `packet` received packet, as defined in
  [mqtt-packet](https://github.com/mcollina/mqtt-packet)

---

<a name="client-connect"></a>

### mqtt.Client#connect()

By default client connects when constructor is called. To prevent this you can set `manualConnect` option to `true` and call `client.connect()` manually.

<a name="publish"></a>

### mqtt.Client#publish(topic, message, [options], [callback])

Publish a message to a topic

- `topic` is the topic to publish to, `String`
- `message` is the message to publish, `Buffer` or `String`
- `options` is the options to publish with, including:
  - `qos` QoS level, `Number`, default `0`
  - `retain` retain flag, `Boolean`, default `false`
  - `dup` mark as duplicate flag, `Boolean`, default `false`
  - `properties`: MQTT 5.0 properties `object`
    - `payloadFormatIndicator`: Payload is UTF-8 Encoded Character Data or not `boolean`,
    - `messageExpiryInterval`: the lifetime of the Application Message in seconds `number`,
    - `topicAlias`: value that is used to identify the Topic instead of using the Topic Name `number`,
    - `responseTopic`: String which is used as the Topic Name for a response message `string`,
    - `correlationData`: used by the sender of the Request Message to identify which request the Response Message is for when it is received `binary`,
    - `userProperties`: The User Property is allowed to appear multiple times to represent multiple name, value pairs `object`,
    - `subscriptionIdentifier`: representing the identifier of the subscription `number`,
    - `contentType`: String describing the content of the Application Message `string`
  - `cbStorePut` - `function ()`, fired when message is put into `outgoingStore` if QoS is `1` or `2`.
- `callback` - `function (err)`, fired when the QoS handling completes,
  or at the next tick if QoS 0. An error occurs if client is disconnecting.

<a name="publish-async"></a>

### mqtt.Client#publishAsync(topic, message, [options])

Async [`publish`](#publish). Returns a `Promise<void>`.

---

<a name="subscribe"></a>

### mqtt.Client#subscribe(topic/topic array/topic object, [options], [callback])

Subscribe to a topic or topics

- `topic` is a `String` topic to subscribe to or an `Array` of
  topics to subscribe to. It can also be an object, it has as object
  keys the topic name and as value the QoS, like `{'test1': {qos: 0}, 'test2': {qos: 1}}`.
  MQTT `topic` wildcard characters are supported (`+` - for single level and `#` - for multi level)
- `options` is the options to subscribe with, including:
  - `qos` QoS subscription level, default 0
  - `nl` No Local MQTT 5.0 flag (If the value is true, Application Messages MUST NOT be forwarded to a connection with a ClientID equal to the ClientID of the publishing connection)
  - `rap` Retain as Published MQTT 5.0 flag (If true, Application Messages forwarded using this subscription keep the RETAIN flag they were published with. If false, Application Messages forwarded using this subscription have the RETAIN flag set to 0.)
  - `rh` Retain Handling MQTT 5.0 (This option specifies whether retained messages are sent when the subscription is established.)
  - `properties`: `object`
    - `subscriptionIdentifier`: representing the identifier of the subscription `number`,
    - `userProperties`: The User Property is allowed to appear multiple times to represent multiple name, value pairs `object`
- `callback` - `function (err, granted)`
  callback fired on suback where:
  - `err` a subscription error or an error that occurs when client is disconnecting
  - `granted` is an array of `{topic, qos}` where:
    - `topic` is a subscribed to topic
    - `qos` is the granted QoS level on it

<a name="subscribe-async"></a>

### mqtt.Client#subscribeAsync(topic/topic array/topic object, [options])

Async [`subscribe`](#subscribe). Returns a `Promise<granted[]>`.

---

<a name="unsubscribe"></a>

### mqtt.Client#unsubscribe(topic/topic array, [options], [callback])

Unsubscribe from a topic or topics

- `topic` is a `String` topic or an array of topics to unsubscribe from
- `options`: options of unsubscribe.
  - `properties`: `object`
    - `userProperties`: The User Property is allowed to appear multiple times to represent multiple name, value pairs `object`
- `callback` - `function (err)`, fired on unsuback. An error occurs if client is disconnecting.

<a name="unsubscribe-async"></a>

### mqtt.Client#unsubscribeAsync(topic/topic array, [options])

Async [`unsubscribe`](#unsubscribe). Returns a `Promise<void>`.

---

<a name="end"></a>

### mqtt.Client#end([force], [options], [callback])

Close the client, accepts the following options:

- `force`: passing it to true will close the client right away, without
  waiting for the in-flight messages to be acked. This parameter is
  optional.
- `options`: options of disconnect.
  - `reasonCode`: Disconnect Reason Code `number`
  - `properties`: `object`
    - `sessionExpiryInterval`: representing the Session Expiry Interval in seconds `number`,
    - `reasonString`: representing the reason for the disconnect `string`,
    - `userProperties`: The User Property is allowed to appear multiple times to represent multiple name, value pairs `object`,
    - `serverReference`: String which can be used by the Client to identify another Server to use `string`
- `callback`: will be called when the client is closed. This parameter is
  optional.

<a name="end-async"></a>

### mqtt.Client#endAsync([force], [options])

Async [`end`](#end). Returns a `Promise<void>`.

---

<a name="removeOutgoingMessage"></a>

### mqtt.Client#removeOutgoingMessage(mId)

Remove a message from the outgoingStore.
The outgoing callback will be called with Error('Message removed') if the message is removed.

After this function is called, the messageId is released and becomes reusable.

- `mId`: The messageId of the message in the outgoingStore.

---

<a name="reconnect"></a>

### mqtt.Client#reconnect()

Connect again using the same options as connect()

---

<a name="handleMessage"></a>

### mqtt.Client#handleMessage(packet, callback)

Handle messages with backpressure support, one at a time.
Override at will, but **always call `callback`**, or the client
will hang.

---

<a name="connected"></a>

### mqtt.Client#connected

Boolean : set to `true` if the client is connected. `false` otherwise.

---

<a name="getLastMessageId"></a>

### mqtt.Client#getLastMessageId()

Number : get last message id. This is for sent messages only.

---

<a name="reconnecting"></a>

### mqtt.Client#reconnecting

Boolean : set to `true` if the client is trying to reconnect to the server. `false` otherwise.

---

<a name="store"></a>

### mqtt.Store(options)

In-memory implementation of the message store.

- `options` is the store options:
  - `clean`: `true`, clean inflight messages when close is called (default `true`)

Other implementations of `mqtt.Store`:

- [mqtt-jsonl-store](https://github.com/robertsLando/mqtt-jsonl-store) which uses
  [jsonl-db](https://github.com/AlCalzone/jsonl-db) to store inflight data, it works only on Node.
- [mqtt-level-store](http://npm.im/mqtt-level-store) which uses
  [Level-browserify](http://npm.im/level-browserify) to store the inflight
  data, making it usable both in Node and the Browser.
- [mqtt-nedb-store](https://github.com/behrad/mqtt-nedb-store) which
  uses [nedb](https://www.npmjs.com/package/nedb) to store the inflight
  data.
- [mqtt-localforage-store](http://npm.im/mqtt-localforage-store) which uses
  [localForage](http://npm.im/localforage) to store the inflight
  data, making it usable in the Browser without browserify.

---

<a name="put"></a>

### mqtt.Store#put(packet, callback)

Adds a packet to the store, a packet is
anything that has a `messageId` property.
The callback is called when the packet has been stored.

---

<a name="createStream"></a>

### mqtt.Store#createStream()

Creates a stream with all the packets in the store.

---

<a name="del"></a>

### mqtt.Store#del(packet, cb)

Removes a packet from the store, a packet is
anything that has a `messageId` property.
The callback is called when the packet has been removed.

---

<a name="close"></a>

### mqtt.Store#close(cb)

Closes the Store.

<a name="browser"></a>
<a name="webpack"></a>
<a name="vite"></a>

## Browser

> [!IMPORTANT]
> The only protocol supported in browsers is MQTT over WebSockets, so you must use `ws://` or `wss://` protocols.

While the [ws](https://www.npmjs.com/package/ws) module is used in NodeJS, [WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) is used in browsers. This is totally transparent to users except for the following:

- The `wsOption` is not supported in browsers.
- Browsers doesn't allow to catch many WebSocket errors for [security reasons](https://stackoverflow.com/a/31003057) as:

  > Access to this information could allow a malicious Web page to gain information about your network, so they require browsers report all connection-time errors in an indistinguishable way.

  So listening for `client.on('error')` may not catch all the errors you would get in NodeJS env.

### Bundle

MQTT.js is bundled using [esbuild](https://esbuild.github.io/). It is tested working with all bundlers like Webpack, Vite and React.

You can find all mqtt bundles versions in `dist` folder:

- `mqtt.js` - iife format, not minified
- `mqtt.min.js` - iife format, minified
- `mqtt.esm.js` - esm format minified

Starting from MQTT.js > 5.2.0 you can import mqtt in your code like this:

```js
import mqtt from 'mqtt'
```

This will be automatically handled by your bundler.

Otherwise you can choose to use a specific bundle like:

```js
import * as mqtt from 'mqtt/dist/mqtt'
import * as mqtt from 'mqtt/dist/mqtt.min'
import mqtt from 'mqtt/dist/mqtt.esm'
```

<a name="cdn"></a>

### Via CDN

The MQTT.js bundle is available through <http://unpkg.com>, specifically
at <https://unpkg.com/mqtt/dist/mqtt.min.js>.
See <http://unpkg.com> for the full documentation on version ranges.

<a name="qos"></a>

## About QoS

Here is how QoS works:

- QoS 0 : received **at most once** : The packet is sent, and that's it. There is no validation about whether it has been received.
- QoS 1 : received **at least once** : The packet is sent and stored as long as the client has not received a confirmation from the server. MQTT ensures that it _will_ be received, but there can be duplicates.
- QoS 2 : received **exactly once** : Same as QoS 1 but there is no duplicates.

About data consumption, obviously, QoS 2 > QoS 1 > QoS 0, if that's a concern to you.

<a name="typescript"></a>

## Usage with TypeScript

Starting from v5 this project is written in TypeScript and the type definitions are included in the package.

Example:

```ts
import { connect } from "mqtt"
const client = connect('mqtt://test.mosquitto.org')
```

<a name="weapp-alipay"></a>

## WeChat and Ali Mini Program support

### WeChat Mini Program

Supports [WeChat Mini Program](https://mp.weixin.qq.com/). Use the `wxs` protocol. See [the WeChat docs](https://mp.weixin.qq.com/debug/wxadoc/dev/api/network-socket.html).

```js
import 'abortcontroller-polyfill/dist/abortcontroller-polyfill-only' // import before mqtt.
const mqtt = require("mqtt");
const client = mqtt.connect("wxs://test.mosquitto.org", {
  timerVariant: 'native' // more info ref issue: #1797
});
```

### Ali Mini Program

Supports [Ali Mini Program](https://open.alipay.com/channel/miniIndex.htm). Use the `alis` protocol. See [the Alipay docs](https://docs.alipay.com/mini/developer/getting-started).
<a name="example"></a>

```js
const mqtt = require("mqtt");
const client = mqtt.connect("alis://test.mosquitto.org");
```

<a name="contributing"></a>

## Contributing

MQTT.js is an **OPEN Open Source Project**. This means that:

> Individuals making significant and valuable contributions are given commit-access to the project to contribute as they see fit. This project is more like an open wiki than a standard guarded open source project.

See the [CONTRIBUTING.md](https://github.com/mqttjs/MQTT.js/blob/master/CONTRIBUTING.md) file for more details.

### Contributors

MQTT.js is only possible due to the excellent work of the following contributors:

| Name               | GitHub                                             | Twitter                                                    |
| ------------------ | -------------------------------------------------- | ---------------------------------------------------------- |
| Adam Rudd          | [GitHub/adamvr](https://github.com/adamvr)         | [Twitter/@adam_vr](http://twitter.com/adam_vr)             |
| Matteo Collina     | [GitHub/mcollina](https://github.com/mcollina)     | [Twitter/@matteocollina](http://twitter.com/matteocollina) |
| Maxime Agor        | [GitHub/4rzael](https://github.com/4rzael)         | [Twitter/@4rzael](http://twitter.com/4rzael)               |
| Siarhei Buntsevich | [GitHub/scarry1992](https://github.com/scarry1992) |                                                            |
| Daniel Lando    | [GitHub/robertsLando](https://github.com/robertsLando) |                                                           |

<a name="sponsor"></a>

## Sponsor

If you would like to support MQTT.js, please consider sponsoring the author and active maintainers:

- [Matteo Collina](https://github.com/sponsors/mcollina): author of MQTT.js
- [Daniel Lando](https://github.com/sponsors/robertsLando): active maintainer

<a name="license"></a>

## License

MIT
