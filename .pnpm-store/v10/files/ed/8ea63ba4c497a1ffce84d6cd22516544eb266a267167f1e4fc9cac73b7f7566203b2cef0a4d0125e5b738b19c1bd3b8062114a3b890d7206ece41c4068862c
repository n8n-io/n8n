# Yjs Protocols
> Binary encoding protocols for *syncing*, *awareness*, and *history information*

This API is unstable and subject to change.

## API

### Awareness Protocol

```js
import * as awarenessProtocol from 'y-protocols/awareness.js'
```

The Awareness protocol implements a simple network agnostic algorithm that
manages user status (who is online?) and propagate awareness information like
cursor location, username, or email address. Each client can update its own
local state and listen to state changes of remote clients.

Each client has an awareness state. Remote awareness are stored in a Map that
maps from remote client id to remote awareness state. An *awareness state* is an
increasing clock attached to a schemaless json object.

Whenever the client changes its local state, it increases the clock and
propagates its own awareness state to all peers. When a client receives a remote
awareness state, and overwrites the clients state if the received state is newer
than the local awareness state for that client. If the state is `null`, the
client is marked as offline. If a client doesn't receive updates from a remote
peer for 30 seconds, it marks the remote client as offline. Hence each client
must broadcast its own awareness state in a regular interval to make sure that
remote clients don't mark it as offline.

#### awarenessProtocol.Awareness Class

```js
const ydoc = new Y.Doc()
const awareness = new awarenessProtocol.Awareness(ydoc)
```

<dl>
  <b><code>clientID:number</code></b>
  <dd>A unique identifier that identifies this client.</dd>
  <b><code>getLocalState():Object&lt;string,any&gt;|null</code></b>
  <dd>Get the local awareness state.</dd>
  <b><code>setLocalState(Object&lt;string,any&gt;|null)</code></b>
  <dd>
Set/Update the local awareness state. Set `null` to mark the local client as
offline.
  </dd>
  <b><code>setLocalStateField(string, any)</code></b>
  <dd>
Only update a single field on the local awareness object. Does not do
anything if the local state is not set.
  </dd>
  <b><code>getStates():Map&lt;number,Object&lt;string,any&gt;&gt;</code></b>
  <dd>
Get all client awareness states (remote and local). Maps from clientID to
awareness state.
  </dd>
  <b><code>
on('change', ({ added: Array&lt;number&gt;, updated: Array&lt;number&gt;
removed: Array&lt;number&gt; }, [transactionOrigin:any]) => ..)
  </code></b>
  <dd>
Listen to remote and local state changes on the awareness instance.
  </dd>
  <b><code>
on('update', ({ added: Array&lt;number&gt;, updated: Array&lt;number&gt;
removed: Array&lt;number&gt; }, [transactionOrigin:any]) => ..)
  </code></b>
  <dd>
Listen to remote and local awareness changes on the awareness instance.
This event is called even when the awarenes state does not change.
  </dd>
</dl>

### License

[The MIT License](./LICENSE) © Kevin Jahns
