## Typed Event Emitter

**NOTE: REQUIRES TYPESCRIPT 3.0**

A TypeScript library for strongly typed event emitters in 0 kB. Declare events using a simple interface mapping event names to their payloads to get stricter versions of `emit`, `on`, and other common EventEmitter APIs. Works with any kind of EventEmitter.

### Installation

```
npm i strict-event-emitter-types
```

### Example

```ts
import StrictEventEmitter from 'strict-event-emitter-types';

// define your events
interface Events {
  request: (request: Request, response: Response) => void;
  done: void;
}

// grab an event emitter
import { EventEmitter } from 'events';

// Create strict event emitter types
let ee: StrictEventEmitter<EventEmitter, Events> = new EventEmitter;

// now enjoy your strongly typed EventEmitter API!🎉

ee.on('request', (r, resp) => ... );
// r and resp are contextually typed to Request and Response

ee.on('somethingElse');
// Error: unknown event

ee.on('done', x => x);
// Error: The 'done' event does not have a payload

ee.emit('request', new Request());
// Error: missing event payload (the response)

ee.emit('request', new Request(), false);
// Error: incorrect payload type
```

### Usage

#### Event Records

Event records are interfaces or object types that map event names to the event's payload types. In the following example, three events are declared:

```ts
interface Events {
  req: (request: Request, response: Response) => void;
  done: void;
  conn: Connection;
}
```

Each event shows one of three ways to type the event payloads:

1.  **Function type:** Parameters are the event payload. The return type is ignored.
1.  **`void`:** A shortcut for an event with no payload, i.e. `() => void`
1.  **Anything else:** A shortcut for an event with one payload, for example `(p: number) => void` can be written as just `number`.

#### StrictEventEmitter&lt;TEmitterType, TEventRecord, TEmitRecord>

The default export. A generic type that takes three type parameters:

1.  _TEmitterType_: Your EventEmitter type (e.g. node's EventEmitter or socket.io socket)
2.  _TEventRecord_: A type mapping event names to event payloads
3.  _TEmitRecord_: Optionally, a similar type mapping things you can emit.

The third parameter is handy when typing web sockets where client and server can listen to and emit different events. For example, if you are using socket.io:

```ts
// create types representing the server side and client
// side sockets
export type ServerSocket =
  StrictEventEmitter<SocketIO.Socket, EventsFromServer, EventsFromClient>;
export type ClientSocket =
  StrictEventEmitter<SocketIOClient.Socket, EventsFromClient, EventsFromServer>;

// elsewhere on server
let serverSocket: ServerSocket = new SocketIO.Socket();
serverSocket.on(/* only events that are sent from the client are allowed */, ...)
serverSocket.emit(/* only events that are emitted from the server are allowed */, ...)

// elsewhere on client
let clientSocket: ClientSocket = new SocketIOClient.Socket();
clientSocket.on(/* only events that are sent from the server are allowed */, ...)
clientSocket.emit(/* only events that are emitted from the client are allowed */, ...)
```

##### Usage with Subclasses

To subclass an EventEmitter you need to cast the base EventEmitter to the strict EventEmitter before extending:

```ts
type MyEmitter = StrictEventEmitter<EventEmitter, Events>;

class MyEventEmitter extends (EventEmitter as { new(): MyEmitter }) {
  doEmit() {
    this.emit(...); // strict
  }
}
```

### StrictBroadcast&lt;TStrictEventEmitter>

A type for a function which takes (and strictly checks) an emit event and a payload. _TStrictEventEmitter_ is the event emitter type instantiated from StrictEventEmitter.

Useful for broadcast abstractions. It is not possible to contextually type assigments to this type, so your declarations will look something like this:

```ts
import { StrictBroadcast } from 'strict-event-emitter-types';

const broadcast: StrictBroadcast<ServerSocket> = function(
  event: string,
  payload?: any
) {
  // ...
};
```

Note that the loose types for event and payload only apply inside the broadcast function (consumers will see a much stricter signature). Declaring more precise parameter types or narrowing using type guards would allow strongly-typed dispatching to emitters.
