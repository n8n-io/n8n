# first-match [![Build Status](https://travis-ci.org/hughsk/first-match.png?branch=master)](https://travis-ci.org/hughsk/first-match?branch=master) #

Finds the first element in an array that passes a callback test.
Equivalent to [_.find()](http://underscorejs.org#find).

## Installation ##

``` bash
npm install first-match
```

## Usage ##

`first(array, [iterator], [context])`. If an iterator is not passed, the method
will just return the first truthy value in the array. The context defaults to
the array being evaluated.

``` javascript
var first = require('first-match')
  , array = [0, 1, 2, 3, 4, 5]

first(array)                               // 1
first(array, function(n) { return n > 3 }) // 4
first(array, function(n) { return n % 2 }) // 1
first(array, function(n) { return n + 2 > this.length }) // 5
```