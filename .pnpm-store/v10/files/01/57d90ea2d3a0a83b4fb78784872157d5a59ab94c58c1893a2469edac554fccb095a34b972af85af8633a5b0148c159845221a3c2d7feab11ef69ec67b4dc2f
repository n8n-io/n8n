# Interface: DispatchInterceptor

Extends: `Function`

A function that can be applied to the `Dispatcher.Dispatch` function before it is invoked with a dispatch request.

This allows one to write logic to intercept both the outgoing request, and the incoming response.

### Parameter: `Dispatcher.Dispatch`

The base dispatch function you are decorating.

### ReturnType: `Dispatcher.Dispatch`

A dispatch function that has been altered to provide additional logic

### Basic Example

Here is an example of an interceptor being used to provide a JWT bearer token

```js
'use strict'

const insertHeaderInterceptor = dispatch => {
  return function InterceptedDispatch(opts, handler){
    opts.headers.push('Authorization', 'Bearer [Some token]')
    return dispatch(opts, handler)
  }
}

const client = new Client('https://localhost:3000', {
  interceptors: { Client: [insertHeaderInterceptor] }
})

```

### Basic Example 2

Here is a contrived example of an interceptor stripping the headers from a response.

```js
'use strict'

const clearHeadersInterceptor = dispatch => {
  const { DecoratorHandler } = require('undici')
  class ResultInterceptor extends DecoratorHandler {
    onHeaders (statusCode, headers, resume) {
      return super.onHeaders(statusCode, [], resume)
    }
  }
  return function InterceptedDispatch(opts, handler){
    return dispatch(opts, new ResultInterceptor(handler))
  }
}

const client = new Client('https://localhost:3000', {
  interceptors: { Client: [clearHeadersInterceptor] }
})

```
