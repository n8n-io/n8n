# Debug

Undici (and subsenquently `fetch` and `websocket`) exposes a debug statement that can be enabled by setting `NODE_DEBUG` within the environment.

The flags available are:

## `undici`

This flag enables debug statements for the core undici library.

```sh
NODE_DEBUG=undici node script.js

UNDICI 16241: connecting to nodejs.org using https:h1
UNDICI 16241: connecting to nodejs.org using https:h1
UNDICI 16241: connected to nodejs.org using https:h1
UNDICI 16241: sending request to GET https://nodejs.org/
UNDICI 16241: received response to GET https://nodejs.org/ - HTTP 307
UNDICI 16241: connecting to nodejs.org using https:h1
UNDICI 16241: trailers received from GET https://nodejs.org/
UNDICI 16241: connected to nodejs.org using https:h1
UNDICI 16241: sending request to GET https://nodejs.org/en
UNDICI 16241: received response to GET https://nodejs.org/en - HTTP 200
UNDICI 16241: trailers received from GET https://nodejs.org/en
```

## `fetch`

This flag enables debug statements for the `fetch` API.

> **Note**: statements are pretty similar to the ones in the `undici` flag, but scoped to `fetch`

```sh
NODE_DEBUG=fetch node script.js

FETCH 16241: connecting to nodejs.org using https:h1
FETCH 16241: connecting to nodejs.org using https:h1
FETCH 16241: connected to nodejs.org using https:h1
FETCH 16241: sending request to GET https://nodejs.org/
FETCH 16241: received response to GET https://nodejs.org/ - HTTP 307
FETCH 16241: connecting to nodejs.org using https:h1
FETCH 16241: trailers received from GET https://nodejs.org/
FETCH 16241: connected to nodejs.org using https:h1
FETCH 16241: sending request to GET https://nodejs.org/en
FETCH 16241: received response to GET https://nodejs.org/en - HTTP 200
FETCH 16241: trailers received from GET https://nodejs.org/en
```

## `websocket`

This flag enables debug statements for the `Websocket` API.

> **Note**: statements can overlap with `UNDICI` ones if `undici` or `fetch` flag has been enabled as well.

```sh
NODE_DEBUG=websocket node script.js

WEBSOCKET 18309: connecting to echo.websocket.org using https:h1
WEBSOCKET 18309: connected to echo.websocket.org using https:h1
WEBSOCKET 18309: sending request to GET https://echo.websocket.org/
WEBSOCKET 18309: connection opened <ip_address>
```
