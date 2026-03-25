# vm-browserify

emulate node's vm module for the browser

[![Build Status](https://travis-ci.org/browserify/vm-browserify.svg?branch=master)](https://travis-ci.org/browserify/vm-browserify)

# example

Just write some client-side javascript:

``` js
var vm = require('vm');

window.addEventListener('load', function () {
    var res = vm.runInNewContext('a + 5', { a : 100 });
    document.querySelector('#res').textContent = res;
});
```

compile it with [browserify](http://github.com/substack/node-browserify):

```
browserify entry.js -o bundle.js
```

then whip up some html:

``` html
<html>
  <head>
    <script src="/bundle.js"></script>
  </head>
  <body>
    result = <span id="res"></span>
  </body>
</html>
```

and when you load the page you should see:

```
result = 105
```

# methods

## vm.runInNewContext(code, context={})

Evaluate some `code` in a new iframe with a `context`.

Contexts are like wrapping your code in a `with()` except slightly less terrible
because the code is sandboxed into a new iframe.

# install

This module is depended upon by browserify, so you should just be able to
`require('vm')` and it will just work. However if you want to use this module
directly you can install it with [npm](http://npmjs.org):

```
npm install vm-browserify
```

# license

MIT
