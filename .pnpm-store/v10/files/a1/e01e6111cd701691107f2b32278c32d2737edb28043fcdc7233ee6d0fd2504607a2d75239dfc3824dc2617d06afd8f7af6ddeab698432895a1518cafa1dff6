[![Build Status](https://travis-ci.org/googleapis/teeny-request.svg?branch=master)](https://travis-ci.org/googleapis/teeny-request)

# teeny-request 

Like `request`, but much smaller - and with less options. Uses `node-fetch` under the hood. 
Pop it in where you would use `request`. Improves load and parse time of modules. 

```js
const request = require('teeny-request').teenyRequest;

request({uri: 'http://ip.jsontest.com/'}, function (error, response, body) {
  console.log('error:', error); // Print the error if one occurred
  console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
  console.log('body:', body); // Print the JSON.
});
```

For TypeScript, you can use `@types/request`. 

```ts
import {teenyRequest as request} from 'teeny-request';
import * as r from 'request'; // Only for type declarations

request({uri: 'http://ip.jsontest.com/'}, (error: any, response: r.Response, body: any) => {
  console.log('error:', error); // Print the error if one occurred
  console.log('statusCode:', response && response.statusCode); // Print the response status code if a response was received
  console.log('body:', body); // Print the JSON.
});
```



## teenyRequest(options, callback)

Options are limited to the following 

* uri
* method, default GET
* headers
* json
* qs
* useQuerystring
* timeout in ms
* gzip
* proxy

```ts
request({uri:'http://service.com/upload', method:'POST', json: {key:'value'}}, function(err,httpResponse,body){ /* ... */ })
```

The callback argument gets 3 arguments:

 * An error when applicable (usually from http.ClientRequest object)
 * A response object with statusCode, a statusMessage, and a body
 * The third is the response body (JSON object)

## defaults(options)

Set default options for every `teenyRequest` call.

```ts
let defaultRequest = teenyRequest.defaults({timeout: 60000});
      defaultRequest({uri: 'http://ip.jsontest.com/'}, function (error, response, body) {
            assert.ifError(error);
            assert.strictEqual(response.statusCode, 200);
            console.log(body.ip);
            assert.notEqual(body.ip, null);
            
            done();
        });
```        

## Proxy environment variables
If environment variables `HTTP_PROXY`, `HTTPS_PROXY`, or `NO_PROXY` are set, they are respected.

## Building with Webpack 4+
Since 4.0.0, Webpack uses `javascript/esm` for `.mjs` files which handles ESM more strictly compared to `javascript/auto`. If you get the error `Can't import the named export 'PassThrough' from non EcmaScript module`, please add the following to your Webpack config:

```js
{
    test: /\.mjs$/,
    type: 'javascript/auto',
},
```

## Motivation
`request` has a ton of options and features and is accordingly large. Requiring a module incurs load and parse time. For
`request`, that is around 600ms.

![Load time of request measured with require-so-slow](https://user-images.githubusercontent.com/101553/44694187-20357700-aa3a-11e8-9116-b8ae794cbc27.png)

`teeny-request` doesn't have any of the bells and whistles that `request` has, but is so much faster to load. If startup time is an issue and you don't need much beyond a basic GET and POST, you can use `teeny-request`.

## Thanks
Special thanks to [billyjacobson](https://github.com/billyjacobson) for suggesting the name. Please report all bugs to them. Just kidding. Please open issues.
