var sortedIndex = require('./sortedIndex.js');
var findIndex = require('./findIndex.js');
var _createIndexFinder = require('./_createIndexFinder.js');

// Return the position of the first occurrence of an item in an array,
// or -1 if the item is not included in the array.
// If the array is large and already in sort order, pass `true`
// for **isSorted** to use binary search.
var indexOf = _createIndexFinder(1, findIndex, sortedIndex);

module.exports = indexOf;
