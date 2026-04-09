# `@libsql/isomorphic-ws`

This package provides `WebSocket` on Node (using `ws`) and in Deno and Cloudflare Workers (using the native `WebSocket`). Supports both CommonJS and ES modules.

```javascript
import { WebSocket } from "@libsql/isomorphic-ws";

const ws = new WebSocket("ws://localhost:8080");
ws.onopen = (event) => {
    ws.send("Hello");
};
ws.onmessage = (event) => {
    console.log(event.data);
    ws.close();
};
```
