# split-ca

Simple node.js module to split a single certificate authority chain file (bundle, ca-bundle, ca-chain, etc.) into an array, as expected by the node.js tls api

## Installation

`npm install split-ca`

## Usage

Usage will depend on your server module of choice, but most https modules require an options hash with `ca`, `key`, and `cert`.  Simply give split-ca the filepath of your bundle file.

```js
var https = require('https');
var fs = require('fs');

var splitca = require('split-ca');

var options = {
  ca: splitca("path/to/ca_bundle_file"),
  key:fs.readFileSync("path/to/server_key_file"),
  cert:fs.readFileSync("path/to/server_cert_file"),
  requestCert: true,
  rejectUnauthorized: true
};

https.createServer(options, function (req, res) {
  res.writeHead(200);
  res.end("hello world\n");
}).listen(8000);
```

## Args

`split-ca('filepath','split-string','encoding')`

#### `filepath`

A standard node path to your object.  An error is thrown if the file cannot be parsed, is not formatted properly.

#### `split-string`

Optional.  Defaults to `"\n"`, can be replaced with anything.

#### `encoding`

Optional.  Defaults to `"utf-8"`, can be replaced with anything accepted by node's `fs` module.

## Credits

Thanks to [Benjie Gillam](https://twitter.com/Benjie) for the [blog post and sample code](http://www.benjiegillam.com/2012/06/node-dot-js-ssl-certificate-chain/) that was unashamedly ripped for this module.
