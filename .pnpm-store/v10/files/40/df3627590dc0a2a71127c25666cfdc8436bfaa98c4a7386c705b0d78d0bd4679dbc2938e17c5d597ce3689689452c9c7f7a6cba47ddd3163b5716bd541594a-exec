equal
=====

[![Build Status](https://travis-ci.org/shouldjs/equal.svg?branch=master)](https://travis-ci.org/shouldjs/equal)

Deep equality comparison implementation for should.js. **Not supported outside of should.js**

Function returns an array of failed equality checks if array is empty it means objects are equal:

```js
> var eq = require('.');
undefined
> var a = {a:1,b:2,c:3,d:4,e:5,f:6,g:7,h:8,i:9,j:10},
... b = {a:1,b:2,c:3,d:4,e:5,f:6,g:7,h:7,i:9,j:10};
undefined
> eq(a, b)
[ EqualityFail {
    a: 8,
    b: 7,
    reason: 'A is not equal to B',
    path: [ 'h' ],
    showReason: false } ]
>  
```
