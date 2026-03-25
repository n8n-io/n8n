# Class: MockCallHistoryLog

Access to an instance with :

```js
const mockAgent = new MockAgent({ enableCallHistory: true })
mockAgent.getCallHistory()?.firstCall()
```

## class properties

- body `mockAgent.getCallHistory()?.firstCall()?.body`
- headers `mockAgent.getCallHistory()?.firstCall()?.headers` an object
- method `mockAgent.getCallHistory()?.firstCall()?.method` a string
- fullUrl `mockAgent.getCallHistory()?.firstCall()?.fullUrl` a string containing the protocol, origin, path, query and hash
- origin `mockAgent.getCallHistory()?.firstCall()?.origin` a string containing the protocol and the host
- headers `mockAgent.getCallHistory()?.firstCall()?.headers` an object
- path `mockAgent.getCallHistory()?.firstCall()?.path` a string always starting with `/`
- searchParams `mockAgent.getCallHistory()?.firstCall()?.searchParams` an object
- protocol `mockAgent.getCallHistory()?.firstCall()?.protocol` a string (`https:`)
- host `mockAgent.getCallHistory()?.firstCall()?.host` a string
- port `mockAgent.getCallHistory()?.firstCall()?.port` an empty string or a string containing numbers
- hash `mockAgent.getCallHistory()?.firstCall()?.hash` an empty string or a string starting with `#`

## class methods

### toMap

Returns a Map instance

```js
mockAgent.getCallHistory()?.firstCall()?.toMap()?.get('hash')
// #hash
```

### toString

Returns a string computed with any class property name and value pair

```js
mockAgent.getCallHistory()?.firstCall()?.toString()
// protocol->https:|host->localhost:4000|port->4000|origin->https://localhost:4000|path->/endpoint|hash->#here|searchParams->{"query":"value"}|fullUrl->https://localhost:4000/endpoint?query=value#here|method->PUT|body->"{ "data": "hello" }"|headers->{"content-type":"application/json"}
```
