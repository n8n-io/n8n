# Browser Request: The easiest HTTP library you'll ever see

Browser Request is a port of Mikeal Rogers's ubiquitous and excellent [request][req] package to the browser.

Jealous of Node.js? Pining for clever callbacks? Request is for you.

Don't care about Node.js? Looking for less tedium and a no-nonsense API? Request is for you too.

[![browser support](https://ci.testling.com/iriscouch/browser-request.png)](https://ci.testling.com/maxogden/browser-request)

# Examples

Fetch a resource:

```javascript
request('/some/resource.txt', function(er, response, body) {
  if(er)
    throw er;
  console.log("I got: " + body);
})
```

Send a resource:

```javascript
request.put({uri:'/some/resource.xml', body:'<foo><bar/></foo>'}, function(er, response) {
  if(er)
    throw new Error("XML PUT failed (" + er + "): HTTP status was " + response.status);
  console.log("Stored the XML");
})
```

To work with JSON, set `options.json` to `true`. Request will set the `Content-Type` and `Accept` headers, and handle parsing and serialization.

```javascript
request({method:'POST', url:'/db', body:'{"relaxed":true}', json:true}, on_response)

function on_response(er, response, body) {
  if(er)
    throw er
  if(result.ok)
    console.log('Server ok, id = ' + result.id)
}
```

Or, use this shorthand version (pass data into the `json` option directly):

```javascript
request({method:'POST', url:'/db', json:{relaxed:true}}, on_response)
```

## Convenient CouchDB

Browser Request provides a CouchDB wrapper. It is the same as the JSON wrapper, however it will indicate an error if the HTTP query was fine, but there was a problem at the database level. The most common example is `409 Conflict`.

```javascript
request.couch({method:'PUT', url:'/db/existing_doc', body:{"will_conflict":"you bet!"}}, function(er, resp, result) {
  if(er.error === 'conflict')
    return console.error("Couch said no: " + er.reason); // Output: Couch said no: Document update conflict.

  if(er)
    throw er;

  console.log("Existing doc stored. This must have been the first run.");
})
```

See the [Node.js Request README][req] for several more examples. Request intends to maintain feature parity with Node request (except what the browser disallows). If you find a discrepancy, please submit a bug report. Thanks!

# Usage

## Browserify

Browser Request is a [browserify][browserify]-enabled package.

First, add `browser-request` to your Node project

    $ npm install browser-request

Next, make a module that uses the package.

```javascript
// example.js - Example front-end (client-side) code using browser-request via browserify
//
var request = require('browser-request')
request('/', function(er, res) {
  if(!er)
    return console.log('browser-request got your root path:\n' + res.body)

  console.log('There was an error, but at least browser-request loaded and ran!')
  throw er
})
```

To build this for the browser, run it through browserify.

    $ browserify --entry example.js --outfile example-built.js

Deploy `example-built.js` to your web site and use it from your page.

```html
  <script src="example-built.js"></script> <!-- Runs the request, outputs the result to the console -->
```

## UMD

`browser-request` is [UMD](https://github.com/umdjs/umd) wrapped, allowing you to serve it directly to the browser from wherever you store the module.

```html
  <script src="/node_modules/browser-request/index.js"></script> <!-- Assigns the module to window.request -->
```

You may also use an [AMD loader](http://requirejs.org/docs/whyamd.html) by referencing the same file in your loader [config](http://requirejs.org/docs/api.html#config).
    
## License

Browser Request is licensed under the Apache 2.0 license.

