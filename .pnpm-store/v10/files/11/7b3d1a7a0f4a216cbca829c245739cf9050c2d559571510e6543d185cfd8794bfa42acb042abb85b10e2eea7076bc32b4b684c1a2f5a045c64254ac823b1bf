Binary Trees [![Build Status](https://secure.travis-ci.org/vadimg/js_bintrees.png?branch=master)](http://travis-ci.org/vadimg/js_bintrees)
============

This package provides Binary and Red-Black Search Trees written in Javascript. It is released under the MIT License.

Binary Search Trees are a good way to store data in sorted order. A Red-Black tree is a variation of a Binary Tree that balances itself.

Algorithms were taken from Julienne Walker: http://eternallyconfuzzled.com/jsw_home.aspx

Trees
------------

* BinTree - Binary Search Tree
* RBTree - Red-Black Tree

Quickstart
------------
node.js:

```
npm install bintrees
```

```javascript
var RBTree = require('bintrees').RBTree;

var tree = new RBTree(function(a, b) { return a - b; });

tree.insert(2);
tree.insert(-3);
```

see examples/node.js for more info

In the browser:

```html
<script src="/path/to/rbtree.js"></script>
<script>
    var tree = new RBTree(function(a, b) { return a - b; });
    tree.insert(0);
    tree.insert(1);
</script>
```

see examples/client.html for more info

Constructor
------------

Requires 1 argument: a comparator function f(a,b) which returns:
* 0 if a == b
* >0 if a > b
* <0 if a < b

Methods
------------

### insert(item)
> Inserts the item into the tree. Returns true if inserted, false if duplicate.

### remove(item)
> Removes the item from the tree. Returns true if removed, false if not found.

### size
> Number of nodes in the tree.

### clear()
> Removes all nodes from the tree.

### find(item)
> Returns node data if found, null otherwise.

### findIter(item)
> Returns an iterator to the node if found, null otherwise.

### lowerBound(item)
> Returns an iterator to the tree node at or immediately after the item. Returns null-iterator if tree is empty.
>> __NOTE: Changed in version 1.0.0 to match C++ lower_bound__

### upperBound(item)
> Returns an iterator to the tree node immediately after the item. Returns null-iterator if tree is empty.
>> __NOTE: Changed in version 1.0.0 to match C++ upper_bound__

### min()
> Returns the min node data in the tree, or null if the tree is empty.

### max()
> Returns the max node data in the tree, or null if the tree is empty.

### each(f)
> Calls f on each node's data, in order.

### reach(f)
> Calls f on each node's data, in reverse order.

### iterator()
> Returns a null-iterator. See __Iterators__ section below.

Iterators
------------

tree.iterator() will return a null-iterator. On a null iterator,
* next() will return the first element in the tree
* prev() will return the last element in the tree

Otherwise,
* next() will return the next element
* prev() will return the previous element
* data() will return the node the iterator is pointing to

When iteration reaches the end, the iterator becomes a null-iterator again.

Forward iteration example:

```javascript
var it=tree.iterator(), item;
while((item = it.next()) !== null) {
    // do stuff with item
}
```

If you are iterating forward through the tree, you can always call prev() to go back, and vice versa.

__NOTE:__ iterators become invalid when you add or remove elements from the tree.

## Production Usage

* [Coinbase Exchange](https://exchange.coinbase.com/), since Jan 26, 2015.
* If you are using this in production, please let me know! (add your company to this README in a pull request)
