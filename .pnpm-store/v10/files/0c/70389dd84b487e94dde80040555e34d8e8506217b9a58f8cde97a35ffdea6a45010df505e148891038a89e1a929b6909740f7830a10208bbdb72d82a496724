treeify ![](https://img.shields.io/npm/v/treeify.svg) ![](https://img.shields.io/npm/dt/treeify.svg)
=======

[![Build Status](https://travis-ci.org/notatestuser/treeify.png?branch=master)](https://travis-ci.org/notatestuser/treeify)

_treeify_ converts a JS object into a nice, visible depth-indented tree for console printing. The structure
generated is similar to what you get by running the ```tree``` command on Unixy platforms.

```
{
    oranges: {
        'mandarin': {                                          ├─ oranges
            clementine: null,                                  │  └─ mandarin
            tangerine: 'so cheap and juicy!'        -=>        │     ├─ clementine
        }                                                      │     └─ tangerine: so cheap and juicy!
    },                                                         └─ apples
    apples: {                                                     ├─ gala
        'gala': null,                                             └─ pink lady
        'pink lady': null
    }
}
```

It also works well with larger nested hierarchies such as file system directory trees.
In fact, the ```fs_tree``` example does a pretty good job of imitating ```tree```. Try it out!

See the other included examples or the test suite for usage scenarios.

Getting it
----------

### For use with node.js

First you'll want to run this command in your project's root folder:
```
$ npm install treeify
```

Then proceed to use it in your project:
```js
var treeify = require('treeify');
console.log(
   treeify.asTree({
      apples: 'gala',      //  ├─ apples: gala
      oranges: 'mandarin'  //  └─ oranges: mandarin
   }, true)
);
```

### For use in a browser

Treeify cooperates with Node, AMD or browser globals to create a module. This means it'll work
in a browser regardless of whether you have an AMD-compliant module loader or not. If such
a loader isn't found when the script is executed, you may access Treeify at ```window.treeify```.

Usage
-----

The methods exposed to you are as follows, in a strange kind of signature notation:

### asLines()
```js
treeify.asLines(obj, showValues (boolean), [hideFunctions (boolean),] lineCallback (function))
// NOTE: hideFunctions is optional and may be safely omitted - this was done to ensure we don't break uses of the previous form
```
### asTree()
```js
treeify.asTree(obj, showValues (boolean), hideFunctions (boolean)): String
```

Running the tests
-----------------

There's a pretty extensive suite of Vows tests included.
```
$ npm test
```
