[![version(scoped)](https://img.shields.io/npm/v/@qdrant/openapi-typescript-fetch.svg)](https://www.npmjs.com/package/@qdrant/openapi-typescript-fetch)

# 📘️ openapi-typescript-fetch

A typed fetch client for [openapi-typescript](https://github.com/drwpow/openapi-typescript)

### Install

```bash
npm install openapi-typescript-fetch
```

Or

```bash
yarn add openapi-typescript-fetch
```

**Features**

Supports JSON request and responses

- ✅ [OpenAPI 3.0](https://swagger.io/specification)
- ✅ [Swagger 2.0](https://swagger.io/specification/v2/)

### Usage

**Generate typescript definition from schema**

```bash
npx openapi-typescript https://petstore.swagger.io/v2/swagger.json --output petstore.ts

# 🔭 Loading spec from https://petstore.swagger.io/v2/swagger.json…
# 🚀 https://petstore.swagger.io/v2/swagger.json -> petstore.ts [650ms]
```

**Typed fetch client**

```ts
import 'whatwg-fetch'

import { Fetcher } from 'openapi-typescript-fetch'

import { paths } from './petstore'

// declare fetcher for paths
const fetcher = Fetcher.for<paths>()

// global configuration
fetcher.configure({
  baseUrl: 'https://petstore.swagger.io/v2',
  init: {
    headers: {
      ...
    },
  },
  use: [...] // middlewares
})

// create fetch operations
const findPetsByStatus = fetcher.path('/pet/findByStatus').method('get').create()
const addPet = fetcher.path('/pet').method('post').create()

// fetch
const { status, data: pets } = await findPetsByStatus({
  status: ['available', 'pending'],
})

console.log(pets[0])
```

### Typed Error Handling

A non-ok fetch response throws a generic `ApiError`

But an Openapi document can declare a different response type for each status code, or a default error response type

These can be accessed via a `discriminated union` on status, as in code snippet below

```ts
const findPetsByStatus = fetcher.path('/pet/findByStatus').method('get').create()
const addPet = fetcher.path('/pet').method('post').create()

try {
  await findPetsByStatus({ ... })
  await addPet({ ... })
} catch(e) {
  // check which operation threw the exception
  if (e instanceof addPet.Error) {
    // get discriminated union { status, data }
    const error = e.getActualType()
    if (error.status === 400) {
      error.data.validationErrors // only available for a 400 response
    } else if (error.status === 500) {
      error.data.errorMessage // only available for a 500 response
    } else {
      ...
    }
  }
}
```

### Middleware

Middlewares can be used to pre and post process fetch operations (log api calls, add auth headers etc)

```ts

import { Middleware } from 'openapi-typescript-fetch'

const logger: Middleware = async (url, init, next) => {
  console.log(`fetching ${url}`)
  const response = await next(url, init)
  console.log(`fetched ${url}`)
  return response
}

fetcher.configure({
  baseUrl: 'https://petstore.swagger.io/v2',
  init: { ... },
  use: [logger],
})

// or

fetcher.use(logger)
```

### Server Side Usage

This library can be used server side with [node-fetch](https://www.npmjs.com/package/node-fetch)

Node CommonJS setup

```ts
// install node-fetch v2
npm install node-fetch@2
npm install @types/node-fetch@2

// fetch-polyfill.ts
import fetch, { Headers, Request, Response } from 'node-fetch'

if (!globalThis.fetch) {
    globalThis.fetch = fetch as any
    globalThis.Headers = Headers as any
    globalThis.Request = Request as any
    globalThis.Response = Response as any
}

// index.ts
import './fetch-polyfill'
```

### Utility Types

- `OpArgType` - Infer argument type of an operation
- `OpReturnType` - Infer return type of an operation
- `OpErrorType` - Infer error type of an operation
- `FetchArgType` - Argument type of a typed fetch operation
- `FetchReturnType` - Return type of a typed fetch operation
- `FetchErrorType` - Error type of a typed fetch operation
- `TypedFetch` - Fetch operation type

```ts
import { paths, operations } from './petstore'

type Arg = OpArgType<operations['findPetsByStatus']>
type Ret = OpReturnType<operations['findPetsByStatus']>
type Err = OpErrorType<operations['findPetsByStatus']>

type Arg = OpArgType<paths['/pet/findByStatus']['get']>
type Ret = OpReturnType<paths['/pet/findByStatus']['get']>
type Err = OpErrorType<paths['/pet/findByStatus']['get']>

type FindPetsByStatus = TypedFetch<operations['findPetsByStatus']>

const findPetsByStatus = fetcher
  .path('/pet/findByStatus')
  .method('get')
  .create()

type Arg = FetchArgType<typeof findPetsByStatus>
type Ret = FetchReturnType<typeof findPetsByStatus>
type Err = FetchErrorType<typeof findPetsByStatus>
```

### Utility Methods

- `arrayRequestBody` - Helper to merge params when request body is an array [see issue](https://github.com/ajaishankar/openapi-typescript-fetch/issues/3#issuecomment-952963986)

```ts
const body = arrayRequestBody([{ item: 1 }], { param: 2 })

// body type is { item: number }[] & { param: number }
```

### Long numeric values (de)serialization: BigInt

Stringifying and parsing big numeric values could be problematic. JSON.parse will coerce large numeric values and JSON.stringify will throw an error: `Uncaught TypeError: Do not know how to serialize a BigInt` in such cases.

To circumvent this issue, this library will serialize big numeric values to `BigInt` using `JSON.rawJSON`, and equally parse big numeric values from responses via `JSON.parse` [source text access](https://github.com/tc39/proposal-json-parse-with-source) transforming them to `BigInt` for you.

> If you rely on the precision of big number in responses, or are sending big numeric values, make sure your JavaScript environment supports it. Read below...

#### JavaScript engine/environment support

##### TL;DR

- Node 21
- Chrome 112

Support is conditional; the TC39 proposal has reached staged 3 and has even shipped with Chrome by default already, with the rest of modern browsers [soon to follow](https://github.com/tc39/proposal-json-parse-with-source/issues/15#issue-664090651) with their corresponding releases.

Regarding Node.js support; at **least Node 20 is required** to be run with the next harmony flag `node --harmony-json-parse-with-source` (or Node 21 without flag 🎉), until it is switched by default in future versions.

---

Happy fetching! 👍
