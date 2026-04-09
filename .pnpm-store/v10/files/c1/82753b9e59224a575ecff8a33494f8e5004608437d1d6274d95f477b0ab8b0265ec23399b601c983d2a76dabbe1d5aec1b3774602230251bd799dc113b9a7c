# isomorphic-ws

Isomorphic implementation of WebSocket.

It uses:
- [ws](https://github.com/websockets/ws) on Node
- [global.WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket) in browsers

## Limitations

Before using this module you should know that
[`ws`](https://github.com/websockets/ws/blob/master/doc/ws.md#class-websocket)
is not perfectly API compatible with
[WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket),
you should always test your code against both Node and browsers.

Some major differences:

- no `Server` implementation in browsers

## Usage

You need to install both this package and [ws](https://github.com/websockets/ws):

```
> npm i isomorphic-ws ws
```

Then just require this package:

```js
const WebSocket = require('isomorphic-ws')

const ws = new WebSocket('wss://echo.websocket.org/', {
  origin: 'https://websocket.org'
});

ws.onopen = function open() {
  console.log('connected');
  ws.send(Date.now());
});

ws.onclose = function close() {
  console.log('disconnected');
});

ws.onmessage = function incoming(data) {
  console.log(`Roundtrip time: ${Date.now() - data} ms`);

  setTimeout(function timeout() {
    ws.send(Date.now());
  }, 500);
});
```

## License

[MIT](LICENSE)