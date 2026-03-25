RabbitMQ Stream Examples 
---
The [stream queues](https://www.rabbitmq.com/streams.html) are available starting from RabbitMQ 3.9

These examples show how to use stream queues with the lib.

Send a message to a stream queue
```
node send_stream.js
```

Receive all the messages from stream queue:
```
node receive_stream.js
```

Consumers can be configured to receive messages using an offset via the `x-stream-offset` argument. e.g.

```js
channel.consume(queue, onMessage, {
  noAck: false,
  arguments: {
    'x-stream-offset': 'first'
  }
});
```

RabbitMQ supports six different types of offset, however specifying them can be

| Offset Type | Example Value                                          | Notes |
|-----------|----------------------------------------------------------|-------|
| First     | `{'x-stream-offset':'first'}`                            | Start from the first message in the log |
| Last      | `{'x-stream-offset':'last'}`                             | Start from the last "chunk" of messages (could be multiple messages) |
| Next      | `{'x-stream-offset':'next'}`                             | Start from the next message (the default) |
| Offset    | `{'x-stream-offset':5}`                                  | a numerical value specifying an exact offset to attach to the log at |
| Timestamp | `{'x-stream-offset':{'!':'timestamp',value:1686519750}}` | a timestamp value specifying the point in time to attach to the log at. The timestamp must be the number of seconds since 00:00:00 UTC, 1970-01-01. Consumers can receive messages published a bit before the specified timestamp. |
| Interval  | `{'x-stream-offset':'1h'}`                               | the time interval relative to current time to attach the log at. Valid units are Y, M, D, h, m and s |


See https://www.rabbitmq.com/streams.html#consuming for more details
