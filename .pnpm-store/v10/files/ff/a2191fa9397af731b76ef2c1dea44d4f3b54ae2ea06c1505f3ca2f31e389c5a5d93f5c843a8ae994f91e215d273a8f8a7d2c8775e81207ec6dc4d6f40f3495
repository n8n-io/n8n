# on-net-listen

Observe when something in your node app starts listening on a TCP port.

```
npm install on-net-listen
```

[![build status](https://travis-ci.org/mafintosh/on-net-listen.svg?branch=master)](https://travis-ci.org/mafintosh/on-net-listen)

Uses `async_hooks` behind the scenes and requires Node >=9

## Usage

``` js
var onnetlisten = require('on-net-listen')

onnetlisten(function (addr) {
  // addr is the same object as server.address()
  // for the port do addr.port
  console.log('Someone started listening:', addr)
})

var http = require('http')

var server = http.createServer(function () {
  // ...
})

server.listen(0) // will trigger the above listener
```

## API

#### `var emitter = onnetlisten(onlistening)`

Start listening for when TCP servers start listening.

The returned event emitter emits `listening` when that happens
with the address object for the tcp server that started listening.

To stop the listener do `emitter.destroy()`

## Acknowledgements

Credit to [@andreasmadsen](https://github.com/andreasmadsen) for writing most of this module and being an async_hooks wizard

This project was kindly sponsored by nearForm.

## License

MIT
