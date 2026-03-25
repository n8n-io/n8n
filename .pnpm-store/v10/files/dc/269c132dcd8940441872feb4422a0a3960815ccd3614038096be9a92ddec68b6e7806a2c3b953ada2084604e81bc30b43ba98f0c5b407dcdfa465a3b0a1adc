# Writing tests

Undici is tuned for a production use case and its default will keep
a socket open for a few seconds after an HTTP request is completed to
remove the overhead of opening up a new socket. These settings that makes
Undici shine in production are not a good fit for using Undici in automated
tests, as it will result in longer execution times.

The following are good defaults that will keep the socket open for only 10ms:

```js
import { request, setGlobalDispatcher, Agent } from 'undici'

const agent = new Agent({
  keepAliveTimeout: 10, // milliseconds
  keepAliveMaxTimeout: 10 // milliseconds
})

setGlobalDispatcher(agent)
```
