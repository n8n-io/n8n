Thrift Node.js Library
=========================

License
-------
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements. See the NOTICE file
distributed with this work for additional information
regarding copyright ownership. The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License. You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied. See the License for the
specific language governing permissions and limitations
under the License.

## Compatibility

node version 6 or later is required

## Install

    npm install thrift 

## Thrift Compiler

You can compile IDL sources for Node.js with the following command:

    thrift --gen js:node thrift_file

## Cassandra Client Example:

Here is a Cassandra example:

```js
var thrift = require('thrift'),
    Cassandra = require('./gen-nodejs/Cassandra')
    ttypes = require('./gen-nodejs/cassandra_types');

var connection = thrift.createConnection("localhost", 9160),
    client = thrift.createClient(Cassandra, connection);

connection.on('error', function(err) {
  console.error(err);
});

client.get_slice("Keyspace", "key", new ttypes.ColumnParent({column_family: "ExampleCF"}), new ttypes.SlicePredicate({slice_range: new ttypes.SliceRange({start: '', finish: ''})}), ttypes.ConsistencyLevel.ONE, function(err, data) {
  if (err) {
    // handle err
  } else {
    // data == [ttypes.ColumnOrSuperColumn, ...]
  }
  connection.end();
});
```

<a name="int64"></a>
## Int64

Since JavaScript represents all numbers as doubles, int64 values cannot be accurately represented naturally. To solve this, int64 values in responses will be wrapped with Thrift.Int64 objects. The Int64 implementation used is [broofa/node-int64](https://github.com/broofa/node-int64).

## Client and server examples

Several example clients and servers are included in the thrift/lib/nodejs/examples folder and the cross language tutorial thrift/tutorial/nodejs folder.

## Use on browsers

You can use code generated with js:node on browsers with Webpack. Here is an example.

thrift --gen js:node,ts,es6,with_ns

```javascript
import * as thrift from 'thrift';
import { MyServiceClient } from '../gen-nodejs/MyService';

let host = window.location.hostname;
let port = 443;
let opts = {
  transport: thrift.TBufferedTransport,
  protocol: thrift.TJSONProtocol, 
    headers: {
     'Content-Type': 'application/vnd.apache.thrift.json',
    },
    https: true,
    path: '/url/path',
    useCORS: true,
};

let connection = thrift.createXHRConnection(host, port, opts);
let thriftClient = thrift.createXHRClient(MyServiceClient, connection);

connection.on('error', (err) => {
  console.error(err);
});

thriftClient.myService(param)
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    ....
  });
```

Bundlers, like webpack, will use thrift/browser.js by default because of the 
`"browser": "./lib/nodejs/lib/thrift/browser.js"` field in package.json.

### Browser example with WebSocket, BufferedTransport and BinaryProtocol
```javascript
import thrift from 'thrift';
import { MyServiceClient } from '../gen-nodejs/MyService';

const host = window.location.hostname;
const port = 9090;
const opts = {
  transport: thrift.TBufferedTransport,
  protocol: thrift.TBinaryProtocol
}
const connection = thrift.createWSConnection(host, port, opts);
connection.open();
const thriftClient = thrift.createWSClient(MyServiceClient, connection);

connection.on('error', (err) => {
  console.error(err);
});

thriftClient.myService(param)
  .then((result) => {
    console.log(result);
  })
  .catch((err) => {
    ....
  });
```


