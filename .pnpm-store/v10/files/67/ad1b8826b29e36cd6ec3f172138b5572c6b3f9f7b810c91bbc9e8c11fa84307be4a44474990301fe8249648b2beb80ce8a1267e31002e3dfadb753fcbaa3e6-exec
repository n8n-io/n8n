<br />
<p align="center">
  <a href="https://supabase.io">
        <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://raw.githubusercontent.com/supabase/supabase/master/packages/common/assets/images/supabase-logo-wordmark--dark.svg">
      <source media="(prefers-color-scheme: light)" srcset="https://raw.githubusercontent.com/supabase/supabase/master/packages/common/assets/images/supabase-logo-wordmark--light.svg">
      <img alt="Supabase Logo" width="300" src="https://raw.githubusercontent.com/supabase/supabase/master/packages/common/assets/images/logo-preview.jpg">
    </picture>
  </a>

  <h1 align="center">Supabase Realtime Client</h1>

  <h3 align="center">Send ephemeral messages with <b>Broadcast</b>, track and synchronize state with <b>Presence</b>, and listen to database changes with <b>Postgres Change Data Capture (CDC)</b>.</h3>

  <p align="center">
    <a href="https://supabase.com/docs/guides/realtime">Guides</a>
    ·
    <a href="https://supabase.com/docs/reference/javascript">Reference Docs</a>
    ·
    <a href="https://multiplayer.dev">Multiplayer Demo</a>
  </p>
</p>

# Overview

This client enables you to use the following Supabase Realtime's features:

- **Broadcast**: send ephemeral messages from client to clients with minimal latency. Use cases include sharing cursor positions between users.
- **Presence**: track and synchronize shared state across clients with the help of CRDTs. Use cases include tracking which users are currently viewing a specific webpage.
- **Postgres Change Data Capture (CDC)**: listen for changes in your PostgreSQL database and send them to clients.

# Usage

## Installing the Package

```bash
npm install @supabase/realtime-js
```

## Creating a Channel

```js
import { RealtimeClient } from '@supabase/realtime-js'

const client = new RealtimeClient(REALTIME_URL, {
  params: {
    apikey: API_KEY
  },
})

const channel = client.channel('test-channel', {})

channel.subscribe((status, err) => {
  if (status === 'SUBSCRIBED') {
    console.log('Connected!')
  }

  if (status === 'CHANNEL_ERROR') {
    console.log(`There was an error subscribing to channel: ${err.message}`)
  }

  if (status === 'TIMED_OUT') {
    console.log('Realtime server did not respond in time.')
  }

  if (status === 'CLOSED') {
    console.log('Realtime channel was unexpectedly closed.')
  }
})
```

### Notes:

- `REALTIME_URL` is `'ws://localhost:4000/socket'` when developing locally and `'wss://<project_ref>.supabase.co/realtime/v1'` when connecting to your Supabase project.
- `API_KEY` is a JWT whose claims must contain `exp` and `role` (existing database role).
- Channel name can be any `string`.

## Broadcast

Your client can send and receive messages based on the `event`.

```js
// Setup...

const channel = client.channel('broadcast-test', { broadcast: { ack: false, self: false } })

channel.on('broadcast', { event: 'some-event' }, (payload) =>
  console.log(payload)
)

channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    // Send message to other clients listening to 'broadcast-test' channel
    await channel.send({
      type: 'broadcast',
      event: 'some-event',
      payload: { hello: 'world' },
    })
  }
})
```

### Notes:

- Setting `ack` to `true` means that the `channel.send` promise will resolve once server replies with acknowledgement that it received the broadcast message request.
- Setting `self` to `true` means that the client will receive the broadcast message it sent out.
- Setting `private` to `true` means that the client will use RLS to determine if the user can connect or not to a given channel.

## Presence

Your client can track and sync state that's stored in the channel.

```js
// Setup...

const channel = client.channel(
  'presence-test',
  {
    config: {
      presence: {
        key: ''
      }
    }
  }
)

channel.on('presence', { event: 'sync' }, () => {
  console.log('Online users: ', channel.presenceState())
})

channel.on('presence', { event: 'join' }, ({ newPresences }) => {
  console.log('New users have joined: ', newPresences)
})

channel.on('presence', { event: 'leave' }, ({ leftPresences }) => {
  console.log('Users have left: ', leftPresences)
})

channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    const status = await channel.track({ 'user_id': 1 })
    console.log(status)
  }
})
```

## Postgres CDC

Receive database changes on the client.

```js
// Setup...

const channel = client.channel('db-changes')

channel.on('postgres_changes', { event: '*', schema: 'public' }, (payload) => {
  console.log('All changes in public schema: ', payload)
})

channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
  console.log('All inserts in messages table: ', payload)
})

channel.on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'users', filter: 'username=eq.Realtime' }, (payload) => {
  console.log('All updates on users table when username is Realtime: ', payload)
})

channel.subscribe(async (status) => {
  if (status === 'SUBSCRIBED') {
    console.log('Ready to receive database changes!')
  }
})
```

## Get All Channels

You can see all the channels that your client has instantiatied.

```js
// Setup...

client.getChannels()
```

## Cleanup

It is highly recommended that you clean up your channels after you're done with them.

- Remove a single channel

```js
// Setup...

const channel = client.channel('some-channel-to-remove')

channel.subscribe()

client.removeChannel(channel)
```

- Remove all channels

```js
// Setup...

const channel1 = client.channel('a-channel-to-remove')
const channel2 = client.channel('another-channel-to-remove')

channel1.subscribe()
channel2.subscribe()

client.removeAllChannels()
```

## Credits

This repo draws heavily from [phoenix-js](https://github.com/phoenixframework/phoenix/tree/master/assets/js/phoenix).

## License

MIT.
