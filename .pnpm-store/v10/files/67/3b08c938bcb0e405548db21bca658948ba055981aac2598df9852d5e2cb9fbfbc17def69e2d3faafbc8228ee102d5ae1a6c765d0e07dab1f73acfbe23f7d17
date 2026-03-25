# js-md4
[![Build Status](https://travis-ci.org/emn178/js-md4.svg?branch=master)](https://travis-ci.org/emn178/js-md4)
[![Coverage Status](https://coveralls.io/repos/emn178/js-md4/badge.svg?branch=master)](https://coveralls.io/r/emn178/js-md4?branch=master)  
[![NPM](https://nodei.co/npm/js-md4.png?stars&downloads)](https://nodei.co/npm/js-md4/)  
A simple MD4 hash function for JavaScript supports UTF-8 encoding.

## Demo
[MD4 Online](http://emn178.github.io/online-tools/md4.html)  

## Download
[Compress](https://raw.github.com/emn178/js-md4/master/build/md4.min.js)  
[Uncompress](https://raw.github.com/emn178/js-md4/master/src/md4.js)

## Installation
You can also install js-md4 by using Bower.

    bower install js-md4

For node.js, you can use this command to install:

    npm install js-md4

## Notice
`buffer` method is deprecated. This maybe confuse with Buffer in node.js. Please use `arrayBuffer` instead.

## Usage
You could use like this:
```JavaScript
md4('Message to hash');

var hash = md4.create();
hash.update('Message to hash');
hash.hex();

var hash2 = md4.update('Message to hash');
hash2.update('Message2 to hash');
hash2.array();
```
If you use node.js, you should require the module first:
```JavaScript
var md4 = require('js-md4');
```
It supports AMD:
```JavaScript
require(['your/path/md4.js'], function (md4) {
// ...
});
```
[See document](https://emn178.github.com/js-md4/doc/)

## Example
```JavaScript
md4(''); // 31d6cfe0d16ae931b73c59d7e0c089c0
md4('The quick brown fox jumps over the lazy dog'); // 1bee69a46ba811185c194762abaeae90
md4('The quick brown fox jumps over the lazy dog.'); // 2812c6c7136898c51f6f6739ad08750e

// It also supports UTF-8 encoding
md4('中文'); // 223088bf7bd45a16436b15360c5fc5a0

// It also supports byte `Array`, `Uint8Array`, `ArrayBuffer`
md4([]); // 31d6cfe0d16ae931b73c59d7e0c089c0
md4(new Uint8Array([])); // 31d6cfe0d16ae931b73c59d7e0c089c0

// Different output
md4(''); // 31d6cfe0d16ae931b73c59d7e0c089c0
md4.hex(''); // 31d6cfe0d16ae931b73c59d7e0c089c0
md4.array(''); // [49, 214, 207, 224, 209, 106, 233, 49, 183, 60, 89, 215, 224, 192, 137, 192]
md4.digest(''); // [49, 214, 207, 224, 209, 106, 233, 49, 183, 60, 89, 215, 224, 192, 137, 192]
md4.arrayBuffer(''); // ArrayBuffer
```

## License
The project is released under the [MIT license](http://www.opensource.org/licenses/MIT).

## Contact
The project's website is located at https://github.com/emn178/js-md4  
Author: Chen, Yi-Cyuan (emn178@gmail.com)
