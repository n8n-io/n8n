# XPathResult interface

Represents the result of an XPath expression. This interface is used for the parameters passed into custom functions 
used in [function resolvers](function resolvers.md) and can represent a number, a string, a boolean value, or a node set.

## Methods

```js
booleanValue() -> boolean
```

Returns the boolean value of the result in accordance with the XPath 1.0 spec.

```js
numberValue() -> number
```

Returns the numeric value of the result in accordance with the XPath 1.0 spec.

```js
stringValue() -> string
```

Returns the string value of the result in accordance with the XPath 1.0 spec.

## Methods and properties that are only present on `XPathResult`s representing node sets

```js
toArray() -> Array of nodes
```

Returns an array of the nodes in the node set, in document order.

```js
first() -> Node
```

Returns the first node in the node set, in document order.

```js
size -> number
```

Returns the number of nodes in this node set



