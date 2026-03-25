# Mocking Request

Undici has its own mocking [utility](../api/MockAgent.md). It allow us to intercept undici HTTP requests and return mocked values instead. It can be useful for testing purposes.

Example:

```js
// bank.mjs
import { request } from 'undici'

export async function bankTransfer(recipient, amount) {
  const { body } = await request('http://localhost:3000/bank-transfer',
    {
      method: 'POST',
      headers: {
        'X-TOKEN-SECRET': 'SuperSecretToken',
      },
      body: JSON.stringify({
        recipient,
        amount
      })
    }
  )
  return await body.json()
}
```

And this is what the test file looks like:

```js
// index.test.mjs
import { strict as assert } from 'assert'
import { MockAgent, setGlobalDispatcher, } from 'undici'
import { bankTransfer } from './bank.mjs'

const mockAgent = new MockAgent();

setGlobalDispatcher(mockAgent);

// Provide the base url to the request
const mockPool = mockAgent.get('http://localhost:3000');

// intercept the request
mockPool.intercept({
  path: '/bank-transfer',
  method: 'POST',
  headers: {
    'X-TOKEN-SECRET': 'SuperSecretToken',
  },
  body: JSON.stringify({
    recipient: '1234567890',
    amount: '100'
  })
}).reply(200, {
  message: 'transaction processed'
})

const success = await bankTransfer('1234567890', '100')

assert.deepEqual(success, { message: 'transaction processed' })

// if you dont want to check whether the body or the headers contain the same value
// just remove it from interceptor
mockPool.intercept({
  path: '/bank-transfer',
  method: 'POST',
}).reply(400, {
  message: 'bank account not found'
})

const badRequest = await bankTransfer('1234567890', '100')

assert.deepEqual(badRequest, { message: 'bank account not found' })
```

Explore other MockAgent functionality [here](../api/MockAgent.md)

## Debug Mock Value

When the interceptor and the request options are not the same, undici will automatically make a real HTTP request. To prevent real requests from being made, use `mockAgent.disableNetConnect()`:

```js
const mockAgent = new MockAgent();

setGlobalDispatcher(mockAgent);
mockAgent.disableNetConnect()

// Provide the base url to the request
const mockPool = mockAgent.get('http://localhost:3000');

mockPool.intercept({
  path: '/bank-transfer',
  method: 'POST',
}).reply(200, {
  message: 'transaction processed'
})

const badRequest = await bankTransfer('1234567890', '100')
// Will throw an error
// MockNotMatchedError: Mock dispatch not matched for path '/bank-transfer':
// subsequent request to origin http://localhost:3000 was not allowed (net.connect disabled)
```

## Reply with data based on request

If the mocked response needs to be dynamically derived from the request parameters, you can provide a function instead of an object to `reply`:

```js
mockPool.intercept({
  path: '/bank-transfer',
  method: 'POST',
  headers: {
    'X-TOKEN-SECRET': 'SuperSecretToken',
  },
  body: JSON.stringify({
    recipient: '1234567890',
    amount: '100'
  })
}).reply(200, (opts) => {
  // do something with opts

  return { message: 'transaction processed' }
})
```

in this case opts will be

```
{
  method: 'POST',
  headers: { 'X-TOKEN-SECRET': 'SuperSecretToken' },
  body: '{"recipient":"1234567890","amount":"100"}',
  origin: 'http://localhost:3000',
  path: '/bank-transfer'
}
```
