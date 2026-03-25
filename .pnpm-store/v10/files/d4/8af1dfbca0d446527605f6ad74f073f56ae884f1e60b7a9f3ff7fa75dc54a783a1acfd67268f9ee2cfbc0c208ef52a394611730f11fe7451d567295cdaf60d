# Milvus2-sdk-node

[![typescript](https://badges.aleen42.com/src/typescript.svg)](https://badges.aleen42.com/src/typescript.svg)
[![version](https://img.shields.io/npm/v/@zilliz/milvus2-sdk-node?color=bright-green)](https://github.com/zilliztech/attu/releases)
[![downloads](https://img.shields.io/npm/dw/@zilliz/milvus2-sdk-node?color=bright-green)](https://www.npmjs.com/package/@zilliz/milvus2-sdk-node)
[![codecov](https://codecov.io/gh/milvus-io/milvus-sdk-node/branch/main/graph/badge.svg?token=Zu5FwWstwI)](https://codecov.io/gh/milvus-io/milvus-sdk-node)

The official [Milvus](https://github.com/milvus-io/milvus) client for Node.js.

## Compatibility

The following table shows the recommended `@zilliz/milvus2-sdk-node` versions for different Milvus versions:

| Milvus version | Node sdk version | Installation                               |
| :------------: | :--------------: | :----------------------------------------- |
|    v2.5.0+     |    **latest**    | `yarn add @zilliz/milvus2-sdk-node@latest` |
|    v2.4.0+     |      v2.4.9      | `yarn add @zilliz/milvus2-sdk-node@2.4.9`  |
|    v2.3.0+     |      v2.3.5      | `yarn add @zilliz/milvus2-sdk-node@2.3.5`  |
|    v2.2.0+     |      v2.3.5      | `yarn add @zilliz/milvus2-sdk-node@2.3.5`  |

## Dependencies

- [Milvus](https://milvus.io/)
- [Zilliz Cloud](https://cloud.zilliz.com/signup)
- Node: v18+

## Examples

### Real world examples

Repo: [zilliz-cloud-typescript-example](https://github.com/zilliztech/zilliz-cloud-typescript-example)

| Name                                                                                                                                   | Demo                                                   | Model                 |
| -------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------- |
| [semantic-search-example](https://github.com/zilliztech/zilliz-cloud-typescript-example/tree/master/semantic-search-example)           | https://zilliz-semantic-search-example.vercel.app      | all-MiniLM-L6-v2      |
| [semantic-image-search](https://github.com/zilliztech/zilliz-cloud-typescript-example/tree/master/semantic-image-search)               |                                                        | clip-vit-base-patch16 |
| [semantic-image-search-client](https://github.com/zilliztech/zilliz-cloud-typescript-example/tree/master/semantic-image-search-client) | https://zilliz-semantic-image-search-client.vercel.app | clip-vit-base-patch16 |

## Installation

You can use npm (Node package manager) or Yarn to install the `@zilliz/milvus2-sdk-node` dependency in your project:

```shell
npm install @zilliz/milvus2-sdk-node
# or ...
yarn add @zilliz/milvus2-sdk-node
```

## Milvus TLS Guide

Please refer to [this doc](https://github.com/milvus-io/milvus-sdk-node/tree/main/test/cert).

## What's new in v2.4.4

### API renamed:

- `loadCollectionSync` -> `loadCollection`
- `loadCollection` -> `loadCollectionAsync`
- `loadCollectionSync` = `loadCollectionSync`

So now you can just call `loadCollection` other than `loadCollectionSync` to load your collection like other language SDK.

### Support passing certificate file buffer for the TLS connection:

```javascript
new MilvusClient({
  address: 'localhost:19530',
  tls: {
    rootCert: readFileSync(`test/cert/ca.pem`),
    privateKey: readFileSync(`test/cert/client.key`),
    certChain: readFileSync(`test/cert/client.pem`),
    serverName: 'localhost',
  },
});
```

## What's new in v2.4.2

Query iterator is supported, now you can use queryIterator to pass the 16384 limit of milvus.

```javascript
const batchSize = 5000;
const total = 30000;
const iterator = await milvusClient.queryIterator({
  collection_name: COLLECTION,
  batchSize: batchSize, // how much data to fetch one time
  expr: 'id > 0', // optional,
  output_fields: ['id'],
  limit: total, // optional, how much data do you want to fetch,  if not set, fetch all the data, be careful if you have large data set
});

const results: any = [];
let page = 0;
for await (const value of iterator) {
  results.push(...value);
  page += 1;
}
console.log(reults.length); // 30000
```

## What's new in v2.4.1

### New vector data types: float16 and bfloat16

Machine learning and neural networks often use half-precision data types, such as Float16 and BFloat16, [Milvus 2.4](https://milvus.io/docs/release_notes.md#Float16-and-BFloat16-Vector-DataType) supports inserting vectors in the BF16 and FP16 formats as bytes.

> However, these data types are not natively available in the Node.js environment, To enable users to utilize these formats, the Node SDK provides support for transformers during insert, query, and search operations.
>
> There are four default transformers for performing a float32 to bytes transformation for BF16 and Float16 types: f32ArrayToF16Bytes, f16BytesToF32Array, f32ArrayToBf16Bytes, and bf16BytesToF32Array. If you wish to use your own transformers for Float16 and BFloat16, you can specify them.
>
> ```javascript
> import {
>   f32ArrayToF16Bytes,
>   f16BytesToF32Array,
>   f32ArrayToBf16Bytes,
>   bf16BytesToF32Array,
> } from '@zilliz/milvus2-sdk-node';
>
> //Insert float32 array for the float16 field. Node SDK will transform it to bytes using `f32ArrayToF16Bytes`. You can use your own transformer.
> const insert = await milvusClient.insert({
>   collection_name: COLLECTION_NAME,
>   data: data,
>   // transformers: {
>   //  [DataType.BFloat16Vector]: f32ArrayToF16Bytes, // use your own transformer
>   // },
> });
> // query: output float32 array other than bytes,
> const query = await milvusClient.query({
>   collection_name: COLLECTION_NAME,
>   filter: 'id > 0',
>   output_fields: ['vector', 'id'],
>   // transformers: {
>   // [DataType.BFloat16Vector]: bf16BytesToF32Array, // use your own transformer
>   // },
> });
> // search: use bytes to search, output float32 array
> const search = await milvusClient.search({
>   vector: data[0].vector,
>   collection_name: COLLECTION_NAME,
>   output_fields: ['id', 'vector'],
>   limit: 5,
>   // transformers: {
>   //   [DataType.BFloat16Vector]: bf16BytesToF32Array, // use your own transformer
>   // },
> });
> ```

### New vector data types: sparse vector(beta)

Sparse vectors in the Node SDK support four formats: `dict`, `coo`, `csr`, and `array`, However, query and search operations currently only output in the dict format.

```javascript
// dict
const sparseObject = {
  3: 1.5,
  6: 2.0,
  9: -3.5,
};
// coo
const sparseCOO = [
  { index: 2, value: 5 },
  { index: 5, value: 3 },
  { index: 8, value: 7 },
];
// csr
const sparseCSR = {
  indices: [2, 5, 8],
  values: [5, 3, 7],
};
// array
const sparseArray = [undefined, 0.0, 0.5, 0.3, undefined, 0.2];
```

### Multi-vector and Hybrid Search

Starting from Milvus 2.4, it supports [Multi-Vector Search](https://milvus.io/docs/multi-vector-search.md#API-overview), you can continue to utilize the search API with similar parameters to perform multi-vector searches, and the format of the results remains unchanged.

```javascript
import { RRFRanker, WeightedRanker } from '@zilliz/milvus2-sdk-node';
// single-vector search on a collection with multiple vector fields
const search = await milvusClient.search({
  collection_name: collection_name,
  data: [1, 2, 3, 4, 5, 6, 7, 8],
  anns_field: 'vector', // required if you have multiple vector fields in the collection
  params: { nprobe: 2 },
  filter: 'id > 100',
  limit: 5,
});

// multi-vector search on a collection with multiple vector fields
const search = await milvusClient.search({
  collection_name: collection_name,
  data: [
    {
      data: [1, 2, 3, 4, 5, 6, 7, 8],
      anns_field: 'vector',
      params: { nprobe: 2 },
    },
    {
      data: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16],
      anns_field: 'vector1',
    },
  ],
  limit: 5,
  rerank: RRFRanker(),
  filter: 'id > 100',
});
```

### New Typescript client

Starting from v2.4.0, we introduced a TypeScript client to provide better support for the [Milvus RESTful API V2](https://milvus.io/api-reference/restful/v2.3.x/About.md), take a look at our [test file](https://github.com/milvus-io/milvus-sdk-node/blob/main/test/http/test.ts).

```javascript
import { HttpClient } from '@zilliz/milvus2-sdk-node';
const client = new HttpClient(config);
await client.createCollection(params);
await client.describeCollection(params);
await client.listCollections(params);
await client.insert(params);
await client.upsert(params);
await client.query(params);
await client.search(params);
```

## Code Examples

This table organizes the examples by technology, providing a brief description and the directory where each example can be found.
| Technology | Example | Directory |
|------------------|--------------------------------------------|-----------------------------------|
| Next.js | Next.js app example | [examples/nextjs](./examples/nextjs) |
| Node.js | Basic Node.js examples for Milvus | [examples/milvus](./examples/milvus) |
| Langchain.js | Basic Langchain.js example | [examples/langchain](./examples/LangChain) |

## Basic usages

This guide will show you how to set up a simple application using Node.js and Milvus. Its scope is only how to set up the node.js client and perform the simple CRUD operations. For more in-depth coverage, see the [Milvus official website](https://milvus.io/).

### Start a Milvus server

```shell
# Start Milvus with script
wget https://raw.githubusercontent.com/milvus-io/milvus/master/scripts/standalone_embed.sh
bash standalone_embed.sh start
```

### Connect to Milvus

Create a new app.js file and add the following code to try out some basic vector operations using the Milvus node.js client. More details on the [API reference](https://milvus.io/api-reference/node/v2.3.x/Client/MilvusClient.md).

```javascript
import { MilvusClient, DataType } from '@zilliz/milvus2-sdk-node';

const address = 'your-milvus-ip-with-port';
const username = 'your-milvus-username'; // optional username
const password = 'your-milvus-password'; // optional password

// connect to milvus
const client = new MilvusClient({ address, username, password });
// wait until connecting finished
await client.connectPromise;
```

### Create a collection

In Milvus, the concept of the collection is like the table in traditional RDBMS, eg: mysql or postgres. Before creating a collection, you need to define a schema, then just call the `createCollection` method.

#### Define schema for collection

A schema defines the fields of a collection, such as the names and data types of the fields that make up the vectors. More details of how to define schema and advanced usage can be found in [API reference](https://milvus.io/api-reference/node/v2.3.x/Collection/createCollection.md).

```javascript
// define schema
const collection_name = `hello_milvus`;
const dim = 128;
const schema = [
  {
    name: 'age',
    description: 'ID field',
    data_type: DataType.Int64,
    is_primary_key: true,
    autoID: true,
  },
  {
    name: 'vector',
    description: 'Vector field',
    data_type: DataType.FloatVector,
    dim: 8,
  },
  { name: 'height', description: 'int64 field', data_type: DataType.Int64 },
  {
    name: 'name',
    description: 'VarChar field',
    data_type: DataType.VarChar,
    max_length: 128,
  },
],
```

#### Create the collection

```javascript
await client.createCollection({
  collection_name,
  fields: schema,
});
```

### Prepare data

The data format utilized by the Milvus Node SDK comprises an array of objects. In each object, the key should correspond to the field `name` defined in the schema. The value type for the key should match the `data_type` specified in the field of the schema.

```javascript
const fields_data = [
  {
    name: 'zlnmh',
    vector: [
      0.11878310581111173, 0.9694947902934701, 0.16443679307243175,
      0.5484226189097237, 0.9839246709011924, 0.5178387104937776,
      0.8716926129208069, 0.5616972243831446,
    ],
    height: 20405,
  },
  {
    name: '5lr9y',
    vector: [
      0.9992090731236536, 0.8248790611809487, 0.8660083940881405,
      0.09946359318481224, 0.6790698063908669, 0.5013786801063624,
      0.795311915725105, 0.9183033261617566,
    ],
    height: 93773,
  },
  {
    name: 'nes0j',
    vector: [
      0.8761291569818763, 0.07127366044153227, 0.775648976160332,
      0.5619757601304878, 0.6076543120476996, 0.8373907516027586,
      0.8556140171597648, 0.4043893119391049,
    ],
    height: 85122,
  },
];
```

### Insert data into collection

Once we have the data, you can insert data into the collection by calling the `insert` method.

```javascript
await client.insert({
  collection_name,
  data,
});
```

### Create index

By creating an index and loading the collection into memory, you can improve the performance of search and retrieval operations in Milvus, making it faster and more efficient to work with large-scale datasets.

```javascript
// create index
await client.createIndex({
  collection_name, // required
  field_name: 'vector', // optional if you are using milvus v2.2.9+
  index_name: 'myindex', // optional
  index_type: 'HNSW', // optional if you are using milvus v2.2.9+
  params: { efConstruction: 10, M: 4 }, // optional if you are using milvus v2.2.9+
  metric_type: 'L2', // optional if you are using milvus v2.2.9+
});
```

Milvus supports [several different types of indexes](https://milvus.io/docs/index.md), each of which is optimized for different use cases and data distributions. Some of the most commonly used index types in Milvus include HNSW, IVF_FLAT, IVF_SQ8, IVF_PQ. When creating an index in Milvus, you must choose an appropriate index type based on your specific use case and data distribution.

### Load collection

When you create a collection in Milvus, the collection data is initially stored on disk, and it is not immediately available for search and retrieval. In order to search or retrieve data from the collection, you must first load the collection into memory using the `loadCollectionSync` method.

```javascript
// load collection
await client.loadCollectionSync({
  collection_name,
});
```

### vector search

Now you can perform vector search on your collection.

```javascript
// get the search vector
const searchVector = fields_data[0].vector;

// Perform a vector search on the collection
const res = await client.search({
  // required
  collection_name, // required, the collection name
  data: searchVector, // required, vector used to compare other vectors in milvus
  // optionals
  filter: 'height > 0', // optional, filter expression
  params: { nprobe: 64 }, // optional, specify the search parameters
  limit: 10, // optional, specify the number of nearest neighbors to return
  output_fields: ['height', 'name'], // optional, specify the fields to return in the search results,
});
```

## Next Steps

- [Attu, Using GUI to manage Milvus](https://github.com/zilliztech/attu)
  ![<img src="[./.github/images/screenshot.png](https://github.com/zilliztech/attu/raw/main/.github/images/screenshot.png)" width="800" alt="attu home view" />
](https://github.com/zilliztech/attu/raw/main/.github/images/screenshot.png)

## other useful links

- [What is Milvus](https://milvus.io/)
- [Milvus Node SDK API reference](https://milvus.io/api-reference/node/v2.3.x/About.md)
- [Feder, anns index visualization tool](https://github.com/zilliztech/feder)

## How to contribute

1. yarn install
2. Fetch milvus proto
   1. `git submodule init` (if this is your first time)
   2. `git submodule update --remote`
3. Add feature in milvus folder.
4. Run test `yarn test -- test/Your-test-for-your-feature.spec.ts`
