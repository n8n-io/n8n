# JavaScript Qdrant REST Client

This repository contains the REST client for the [Qdrant](https://github.com/qdrant/qdrant) vector search engine.

## Installation

```shell
npm install @qdrant/js-client-rest
# or
yarn add @qdrant/js-client-rest
# or
pnpm i @qdrant/js-client-rest
```

## Usage

Run the Qdrant Docker container:

```shell
docker run -p 6333:6333 qdrant/qdrant
```

### Instantiate a client

```ts
import {QdrantClient} from '@qdrant/js-client-rest';

const client = new QdrantClient({host: '127.0.0.1', port: 6333});
// or
const client = new QdrantClient({url: 'http://127.0.0.1:6333'});
```

### Make requests

Using one of the available facade methods:

```ts
try {
    const result = await client.getCollections();
    console.log('List of collections:', result.collections);
} catch (err) {
    console.error('Could not get collections:', err);
}
```

Or directly using an endpoint from the API:

```ts
await client.api('collections').getCollections();
```

### Typed Error Handling

A non-ok fetch response throws a generic `ApiError`

But an Openapi document can declare a different response type for each status code, or a default error response type.

These can be accessed via a discriminated union on status, as in code snippet below:

```ts
const findPetsByStatus = fetcher.path('/pet/findByStatus').method('get').create();
const addPet = fetcher.path('/pet').method('post').create();

try {
    const collection = await client.getCollection('bom-ada-002');
    // ...
} catch (e) {
    // check which operation threw the exception
    if (e instanceof client.getCollection.Error) {
        // get discriminated union error { status, data }
        const error = e.getActualType();
        // sort case's logic
        if (error.status === 400) {
            error.data.status.error; // only available for a 4xx responses
        } else if (error.status === 500) {
            error.data.status.error; // only available for a 500 response
        } else {
            error.data.result;
            // ...
        }
    }
}
```

## Support

The REST implementation relies on the native [fetch API](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API), which is available in Deno and Node.js (starting on v18.0.0 without experimental flag). The Deno implementation [supports HTTP/2](https://deno.com/blog/every-web-api-in-deno#fetch-request-response-and-headers) whereas Node.js is still lagging on the spec and provide only HTTP 1.1 support (this is due to the fact that under the hood Node.js still relies on [undici](https://github.com/nodejs/undici)).

## Releases

Major and minor versions align with Qdrant's engine releases, whilst patch are reserved for fixes regarding the current minor release. Check out [RELEASE.md](../../RELEASE.md) for more info on release guidelines.

## Contributing

These are the most relevant scripts for development:

-   `pnpm build`: builds and bundles from TypeScript sources
-   `pnpm pre-check`: type-checks sources
-   `pnpm pre-commit`: same as pre-check, but for git hooks (husky)
-   `pnpm test`: run unit tests
-   `pnpm test:integration`: runs integration tests against a locally running Qdrant docker container
-   `pnpm codegen:openapi-typescript`: updates generated TS schema from the latest openapi.json remote
