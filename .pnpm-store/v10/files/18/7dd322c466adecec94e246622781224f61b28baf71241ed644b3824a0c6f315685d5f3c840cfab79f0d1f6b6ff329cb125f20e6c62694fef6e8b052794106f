# Class: MockCallHistory

Access to an instance with :

```js
const mockAgent = new MockAgent({ enableCallHistory: true })
mockAgent.getCallHistory()

// or
const mockAgent = new MockAgent()
mockAgent.enableMockHistory()
mockAgent.getCallHistory()

```

a MockCallHistory instance implements a **Symbol.iterator** letting you iterate on registered logs :

```ts
for (const log of mockAgent.getCallHistory()) {
  //...
}

const array: Array<MockCallHistoryLog> = [...mockAgent.getCallHistory()]
const set: Set<MockCallHistoryLog> = new Set(mockAgent.getCallHistory())
```

## class methods

### clear

Clear all MockCallHistoryLog registered. This is automatically done when calling `mockAgent.close()`

```js
mockAgent.clearCallHistory()
// same as
mockAgent.getCallHistory()?.clear()
```

### calls

Get all MockCallHistoryLog registered as an array

```js
mockAgent.getCallHistory()?.calls()
```

### firstCall

Get the first MockCallHistoryLog registered or undefined

```js
mockAgent.getCallHistory()?.firstCall()
```

### lastCall

Get the last MockCallHistoryLog registered or undefined

```js
mockAgent.getCallHistory()?.lastCall()
```

### nthCall

Get the nth MockCallHistoryLog registered or undefined

```js
mockAgent.getCallHistory()?.nthCall(3) // the third MockCallHistoryLog registered
```

### filterCallsByProtocol

Filter MockCallHistoryLog by protocol.

> more details for the first parameter can be found [here](/docs/docs/api/MockCallHistory.md#filter-parameter)

```js
mockAgent.getCallHistory()?.filterCallsByProtocol(/https/)
mockAgent.getCallHistory()?.filterCallsByProtocol('https:')
```

### filterCallsByHost

Filter MockCallHistoryLog by host.

> more details for the first parameter can be found [here](/docs/docs/api/MockCallHistory.md#filter-parameter)

```js
mockAgent.getCallHistory()?.filterCallsByHost(/localhost/)
mockAgent.getCallHistory()?.filterCallsByHost('localhost:3000')
```

### filterCallsByPort

Filter MockCallHistoryLog by port.

> more details for the first parameter can be found [here](/docs/docs/api/MockCallHistory.md#filter-parameter)

```js
mockAgent.getCallHistory()?.filterCallsByPort(/3000/)
mockAgent.getCallHistory()?.filterCallsByPort('3000')
mockAgent.getCallHistory()?.filterCallsByPort('')
```

### filterCallsByOrigin

Filter MockCallHistoryLog by origin.

> more details for the first parameter can be found [here](/docs/docs/api/MockCallHistory.md#filter-parameter)

```js
mockAgent.getCallHistory()?.filterCallsByOrigin(/http:\/\/localhost:3000/)
mockAgent.getCallHistory()?.filterCallsByOrigin('http://localhost:3000')
```

### filterCallsByPath

Filter MockCallHistoryLog by path.

> more details for the first parameter can be found [here](/docs/docs/api/MockCallHistory.md#filter-parameter)

```js
mockAgent.getCallHistory()?.filterCallsByPath(/api\/v1\/graphql/)
mockAgent.getCallHistory()?.filterCallsByPath('/api/v1/graphql')
```

### filterCallsByHash

Filter MockCallHistoryLog by hash.

> more details for the first parameter can be found [here](/docs/docs/api/MockCallHistory.md#filter-parameter)

```js
mockAgent.getCallHistory()?.filterCallsByPath(/hash/)
mockAgent.getCallHistory()?.filterCallsByPath('#hash')
```

### filterCallsByFullUrl

Filter MockCallHistoryLog by fullUrl. fullUrl contains protocol, host, port, path, hash, and query params

> more details for the first parameter can be found [here](/docs/docs/api/MockCallHistory.md#filter-parameter)

```js
mockAgent.getCallHistory()?.filterCallsByFullUrl(/https:\/\/localhost:3000\/\?query=value#hash/)
mockAgent.getCallHistory()?.filterCallsByFullUrl('https://localhost:3000/?query=value#hash')
```

### filterCallsByMethod

Filter MockCallHistoryLog by method.

> more details for the first parameter can be found [here](/docs/docs/api/MockCallHistory.md#filter-parameter)

```js
mockAgent.getCallHistory()?.filterCallsByMethod(/POST/)
mockAgent.getCallHistory()?.filterCallsByMethod('POST')
```

### filterCalls

This class method is a meta function / alias to apply complex filtering in a single way.

Parameters :

- criteria : the first parameter. a function, regexp or object.
  - function : filter MockCallHistoryLog when the function returns false
  - regexp : filter MockCallHistoryLog when the regexp does not match on MockCallHistoryLog.toString() ([see](./MockCallHistoryLog.md#to-string))
  - object : an object with MockCallHistoryLog properties as keys to apply multiple filters. each values are a [filter parameter](/docs/docs/api/MockCallHistory.md#filter-parameter)
- options : the second parameter. an object.
  - options.operator : `'AND'` or `'OR'` (default `'OR'`). Used only if criteria is an object. see below

```js
mockAgent.getCallHistory()?.filterCalls((log) => log.hash === value && log.headers?.['authorization'] !== undefined)
mockAgent.getCallHistory()?.filterCalls(/"data": "{ "errors": "wrong body" }"/)

// returns an Array of MockCallHistoryLog which all have
// - a hash containing my-hash
// - OR
// - a path equal to /endpoint
mockAgent.getCallHistory()?.filterCalls({ hash: /my-hash/, path: '/endpoint' })

// returns an Array of MockCallHistoryLog which all have
// - a hash containing my-hash
// - AND
// - a path equal to /endpoint
mockAgent.getCallHistory()?.filterCalls({ hash: /my-hash/, path: '/endpoint' }, { operator: 'AND' })
```

## filter parameter

Can be :

- string. MockCallHistoryLog filtered if `value !== parameterValue`
- null. MockCallHistoryLog filtered if `value !== parameterValue`
- undefined. MockCallHistoryLog filtered if `value !== parameterValue`
- regexp. MockCallHistoryLog filtered if `!parameterValue.test(value)`
