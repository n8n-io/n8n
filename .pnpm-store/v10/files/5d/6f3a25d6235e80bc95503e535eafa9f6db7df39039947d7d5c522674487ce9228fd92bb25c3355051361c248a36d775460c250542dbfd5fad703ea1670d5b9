# acorn-globals

Detect global variables in JavaScript using acorn

[Get supported acorn-globals with the Tidelift Subscription](https://tidelift.com/subscription/pkg/npm-acorn_globals?utm_source=npm-acorn-globals&utm_medium=referral&utm_campaign=readme)

[![Build Status](https://img.shields.io/github/workflow/status/ForbesLindesay/acorn-globals/Publish%20Canary/master?style=for-the-badge)](https://github.com/ForbesLindesay/acorn-globals/actions?query=workflow%3APublish%20Canary+branch%3Amaster)
[![Rolling Versions](https://img.shields.io/badge/Rolling%20Versions-Enabled-brightgreen?style=for-the-badge)](https://rollingversions.com/ForbesLindesay/acorn-globals)
[![NPM version](https://img.shields.io/npm/v/acorn-globals?style=for-the-badge)](https://www.npmjs.com/package/acorn-globals)

## Installation

    npm install acorn-globals

## Usage

detect.js

```js
var fs = require('fs');
var detect = require('acorn-globals');

var src = fs.readFileSync(__dirname + '/input.js', 'utf8');

var scope = detect(src);
console.dir(scope);
```

input.js

```js
var x = 5;
var y = 3, z = 2;

w.foo();
w = 2;

RAWR=444;
RAWR.foo();

BLARG=3;

foo(function () {
    var BAR = 3;
    process.nextTick(function (ZZZZZZZZZZZZ) {
        console.log('beep boop');
        var xyz = 4;
        x += 10;
        x.zzzzzz;
        ZZZ=6;
    });
    function doom () {
    }
    ZZZ.foo();

});

console.log(xyz);
```

output:

```
$ node example/detect.js
[ { name: 'BLARG', nodes: [ [Object] ] },
  { name: 'RAWR', nodes: [ [Object], [Object] ] },
  { name: 'ZZZ', nodes: [ [Object], [Object] ] },
  { name: 'console', nodes: [ [Object], [Object] ] },
  { name: 'foo', nodes: [ [Object] ] },
  { name: 'process', nodes: [ [Object] ] },
  { name: 'w', nodes: [ [Object], [Object] ] },
  { name: 'xyz', nodes: [ [Object] ] } ]
```

## Security contact information

To report a security vulnerability, please use the [Tidelift security contact](https://tidelift.com/security). Tidelift will coordinate the fix and disclosure.

## License

  MIT
