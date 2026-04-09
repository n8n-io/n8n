[![npm](https://img.shields.io/npm/v/jsonpath-plus.svg)](https://www.npmjs.com/package/jsonpath-plus)

[![testing badge](https://raw.githubusercontent.com/s3u/JSONPath/master/badges/tests-badge.svg?sanitize=true)](badges/tests-badge.svg)
[![coverage badge](https://raw.githubusercontent.com/s3u/JSONPath/master/badges/coverage-badge.svg?sanitize=true)](badges/coverage-badge.svg)

[![Known Vulnerabilities](https://snyk.io/test/github/s3u/JSONPath/badge.svg)](https://snyk.io/test/github/s3u/JSONPath)

<!--[![License](https://img.shields.io/npm/l/JSONPath.svg)](LICENSE-MIT.txt)-->
[![Licenses badge](https://raw.githubusercontent.com/s3u/JSONPath/master/badges/licenses-badge.svg?sanitize=true)](badges/licenses-badge.svg)

[![Node.js CI status](https://github.com/JSONPath-Plus/JSONPath/actions/workflows/node.js.yml/badge.svg)](https://github.com/JSONPath-Plus/JSONPath/actions/workflows/node.js.yml)

<small>(see also [licenses for dev. deps.](https://raw.githubusercontent.com/s3u/JSONPath/master/badges/licenses-badge-dev.svg?sanitize=true))</small>

# JSONPath Plus

Analyse, transform, and selectively extract data from JSON
documents (and JavaScript objects).

`jsonpath-plus` expands on the original specification to add some
additional operators and makes explicit some behaviors the original
did not spell out.

Try the [browser demo](https://jsonpath-plus.github.io/JSONPath/demo/) or
[Runkit (Node)](https://npm.runkit.com/jsonpath-plus).

***Please note: This project is not currently being actively maintained. We
may accept well-documented PRs or some simple updates, but are not looking
to make fixes or add new features ourselves.***

## Features

* **Compliant** with the original jsonpath spec
* Convenient **additions or elaborations** not provided in the original spec:
    * `^` for grabbing the **parent** of a matching item
    * `~` for grabbing **property names** of matching items (as array)
    * **Type selectors** for obtaining:
        * Basic JSON types: `@null()`, `@boolean()`, `@number()`, `@string()`, `@array()`, `@object()`
        * `@integer()`
        * The compound type `@scalar()` (which also accepts `undefined` and
            non-finite numbers when querying JavaScript objects as well as all of the basic non-object/non-function types)
        * `@other()` usable in conjunction with a user-defined `otherTypeCallback`
        * Non-JSON types that can nevertheless be used when querying
            non-JSON JavaScript objects (`@undefined()`, `@function()`, `@nonFinite()`)
    * `@path`/`@parent`/`@property`/`@parentProperty`/`@root` **shorthand selectors** within filters
    * **Escaping**
        * `` ` `` for escaping remaining sequence
        * `@['...']`/`?@['...']` syntax for escaping special characters within
        property names in filters
    * Documents `$..` (**getting all parent components**)
* **ESM** and **UMD** export formats
* In addition to queried values, **can return various meta-information**
    including paths or pointers to the value, as well as the parent
    object and parent property name (to allow for modification).
* **Utilities for converting** between paths, arrays, and pointers
* Option to **prevent evaluations** permitted in the original spec or supply
    a **sandbox** for evaluated values.
* Option for **callback to handle results** as they are obtained.

## Benchmarking

`jsonpath-plus` is consistently performant with both large and small datasets compared to other json querying libraries per [json-querying-performance-testing](https://github.com/andykais/json-querying-performance-testing). You can verify these findings by [running the project yourself](https://github.com/andykais/json-querying-performance-testing#how-to-run) and adding more perf cases.

## Install

```shell
npm install jsonpath-plus
```

## Setup

### Node.js

```js
const {JSONPath} = require('jsonpath-plus');

const result = JSONPath({path: '...', json});
```

### Browser

For browser usage you can directly include `dist/index-browser-umd.cjs`; no
Browserify magic is necessary:

```html
<script src="node_modules/jsonpath-plus/dist/index-browser-umd.cjs"></script>

<script>

const result = JSONPath.JSONPath({path: '...', json: {}});

</script>
```

### ESM (Modern browsers)

You may also use ES6 Module imports (for modern browsers):

```html
<script type="module">

import {
    JSONPath
} from './node_modules/jsonpath-plus/dist/index-browser-esm.js';

const result = JSONPath({path: '...', json: {}});

</script>
```

### ESM (Bundlers)

Or if you are bundling your JavaScript (e.g., with Rollup), just use,
noting that [`mainFields`](https://github.com/rollup/plugins/tree/master/packages/node-resolve#mainfields)
should include `browser` for browser builds (for Node, the default, which
checks `module`, should be fine):

```js
import {JSONPath} from 'jsonpath-plus';

const result = JSONPath({path: '...', json});
```

## Usage

The full signature available is:

```
const result = JSONPath([options,] path, json, callback, otherTypeCallback);
```

The arguments `path`, `json`, `callback`, and `otherTypeCallback`
can alternatively be expressed (along with any other of the
available properties) on `options`.

Note that `result` will contain all items found (optionally
wrapped into an array) whereas `callback` can be used if you
wish to perform some operation as each item is discovered, with
the callback function being executed 0 to N times depending
on the number of independent items to be found in the result.
See the docs below for more on `JSONPath`'s available arguments.

See also the [API docs](https://jsonpath-plus.github.io/JSONPath/docs/ts/).

### Properties

The properties that can be supplied on the options object or
evaluate method (as the first argument) include:

- ***path*** (**required**) - The JSONPath expression as a (normalized
  or unnormalized) string or array
- ***json*** (**required**) - The JSON object to evaluate (whether of
  null, boolean, number, string, object, or array type).
- ***autostart*** (**default: true**) - If this is supplied as `false`,
  one may call the `evaluate` method manually.
- ***flatten*** (**default: false**) - Whether the returned array of results
  will be flattened to a single dimension array.
- ***resultType*** (**default: "value"**) - Can be case-insensitive form of
  "value", "path", "pointer", "parent", or "parentProperty" to determine
  respectively whether to return results as the values of the found items,
  as their absolute paths, as [JSON Pointers](https://tools.ietf.org/html/rfc6901)
  to the absolute paths, as their parent objects, or as their parent's
  property name. If set to "all", all of these types will be returned on
  an object with the type as key name.
- ***sandbox*** (**default: {}**) - Key-value map of variables to be
  available to code evaluations such as filtering expressions. (Note
  that the current path and value will also be available to those
  expressions; see the Syntax section for details.)
- ***wrap*** (**default: true**) - Whether or not to wrap the results
  in an array. If `wrap` is set to `false`, and no results are found,
  `undefined` will be returned (as opposed to an empty array when
  `wrap` is set to true). If `wrap` is set to `false` and a single
  non-array result is found, that result will be the only item returned
  (not within an array). An array will still be returned if multiple
  results are found, however. To avoid ambiguities (in the case where
  it is necessary to distinguish between a result which is a failure
  and one which is an empty array), it is recommended to switch the
  default to `false`.
- ***eval*** (**default: "safe"**) - Script evaluation method.
  `safe`: In browser, it will use a minimal scripting engine which doesn't
  use `eval` or `Function` and satisfies Content Security Policy. In NodeJS,
  it has no effect and is equivalent to native as scripting is safe there.
  `native`: uses the native scripting capabilities. i.e. unsafe `eval` or
  `Function` in browser and `vm.Script` in nodejs. `false`: Disable JavaScript
  evaluation expressions and throw exceptions when these expressions are attempted.
  `callback [ (code, context) => value]`: A custom implementation which is called
  with `code` and `context` as arguments to return the evaluated value.
  `class`: A class which is created with `code` as constructor argument and code
  is evaluated by calling `runInNewContext` with `context`.
  ``
- ***ignoreEvalErrors*** (**default: false**) - Ignore errors encountered during
  script evaluation.
- ***parent*** (**default: null**) - In the event that a query could be
  made to return the root node, this allows the parent of that root node
  to be returned within results.
- ***parentProperty*** (**default: null**) - In the event that a query
  could be made to return the root node, this allows the `parentProperty`
  of that root node to be returned within results.
- ***callback*** (**default: (none)**) - If supplied, a callback will be
  called immediately upon retrieval of an end point value. The three arguments
  supplied will be the value of the payload (according to `resultType`),
  the type of the payload (whether it is a normal "value" or a "property"
  name), and a full payload object (with all `resultType`s).
- ***otherTypeCallback*** (**default: \<A function that throws an error**
  **when @other() is encountered\>**) - In the current absence of JSON
  Schema support, one can determine types beyond the built-in types by
  adding the operator `@other()` at the end of one's query. If such a
  path is encountered, the `otherTypeCallback` will be invoked with the
  value of the item, its path, its parent, and its parent's property name,
  and it should return a boolean indicating whether the supplied value
  belongs to the "other" type or not (or it may handle transformations and
  return false).

### Instance methods

- ***evaluate(path, json, callback, otherTypeCallback)*** OR
  ***evaluate({path: \<path\>, json: \<json object\>, callback:***
  ***\<callback function\>, otherTypeCallback:***
  ***\<otherTypeCallback function\>})*** - This method is only
  necessary if the `autostart` property is set to `false`. It
  can be used for repeated evaluations using the same configuration.
  Besides the listed properties, the latter method pattern can
  accept any of the other allowed instance properties (except
  for `autostart` which would have no relevance here).

### Class properties and methods

- ***JSONPath.cache*** - Exposes the cache object for those who wish
  to preserve and reuse it for optimization purposes.
- ***JSONPath.toPathArray(pathAsString)*** - Accepts a normalized or
  unnormalized path as string and converts to an array: for
  example, `['$', 'aProperty', 'anotherProperty']`.
- ***JSONPath.toPathString(pathAsArray)*** - Accepts a path array and
  converts to a normalized path string. The string will be in a form
  like: `$['aProperty']['anotherProperty][0]`. The JSONPath terminal
  constructions `~` and `^` and type operators like `@string()` are
  silently stripped.
- ***JSONPath.toPointer(pathAsArray)*** - Accepts a path array and
  converts to a [JSON Pointer](https://tools.ietf.org/html/rfc6901).
  The string will be in a form like: `/aProperty/anotherProperty/0`
  (with any `~` and `/` internal characters escaped as per the JSON
  Pointer spec). The JSONPath terminal constructions `~` and `^` and
  type operators like `@string()` are silently stripped.

## Syntax through examples

Given the following JSON, taken from <http://goessner.net/articles/JsonPath/>:

```json
{
"store": {
  "book": [
    {
      "category": "reference",
      "author": "Nigel Rees",
      "title": "Sayings of the Century",
      "price": 8.95
    },
    {
      "category": "fiction",
      "author": "Evelyn Waugh",
      "title": "Sword of Honour",
      "price": 12.99
    },
    {
      "category": "fiction",
      "author": "Herman Melville",
      "title": "Moby Dick",
      "isbn": "0-553-21311-3",
      "price": 8.99
    },
    {
      "category": "fiction",
      "author": "J. R. R. Tolkien",
      "title": "The Lord of the Rings",
      "isbn": "0-395-19395-8",
      "price": 22.99
    }
  ],
  "bicycle": {
    "color": "red",
    "price": 19.95
  }
}
}
```

and the following XML representation:

```xml
<store>
    <book>
        <category>reference</category>
        <author>Nigel Rees</author>
        <title>Sayings of the Century</title>
        <price>8.95</price>
    </book>
    <book>
        <category>fiction</category>
        <author>Evelyn Waugh</author>
        <title>Sword of Honour</title>
        <price>12.99</price>
    </book>
    <book>
        <category>fiction</category>
        <author>Herman Melville</author>
        <title>Moby Dick</title>
        <isbn>0-553-21311-3</isbn>
        <price>8.99</price>
    </book>
    <book>
        <category>fiction</category>
        <author>J. R. R. Tolkien</author>
        <title>The Lord of the Rings</title>
        <isbn>0-395-19395-8</isbn>
        <price>22.99</price>
    </book>
    <bicycle>
        <color>red</color>
        <price>19.95</price>
    </bicycle>
</store>
```

Please note that the XPath examples below do not distinguish between
retrieving elements and their text content (except where useful for
comparisons or to prevent ambiguity). Note: to test the XPath examples
(including 2.0 ones), [this demo](http://videlibri.sourceforge.net/cgi-bin/xidelcgi)
may be helpful (set to `xml` or `xml-strict`).

| XPath             | JSONPath               | Result                                | Notes |
| ----------------- | ---------------------- | ------------------------------------- | ----- |
/store/book/author  | $.store.book\[*].author | The authors of all books in the store | Can also be represented without the `$.` as `store.book[*].author` (though this is not present in the original spec); note that some character literals (`$` and `@`) require escaping, however
//author            | $..author              | All authors                           |
/store/*            | $.store.*              | All things in store, which are its books (a book array) and a red bicycle (a bicycle object).|
/store//price       | $.store..price         | The price of everything in the store. |
//book\[3]           | $..book\[2]             | The third book (book object)          |
//book\[last()]      | $..book\[(@.length-1)]<br>$..book\[-1:]  | The last book in order.| To access a property with a special character, utilize `[(@['...'])]` for the filter (this particular feature is not present in the original spec)
//book\[position()<3]| $..book\[0,1]<br>$..book\[:2]| The first two books               |
//book/*\[self::category\|self::author] or //book/(category,author) in XPath 2.0 | $..book\[0]\[category,author]| The categories and authors of all books |
//book\[isbn]        | $..book\[?(@.isbn)]     | Filter all books with an ISBN number     | To access a property with a special character, utilize `[?@['...']]` for the filter (this particular feature is not present in the original spec)
//book\[price<10]    | $..book\[?(@.price<10)] | Filter all books cheaper than 10     |
| //\*\[name() = 'price' and . != 8.95] | $..\*\[?(@property === 'price' && @ !== 8.95)] | Obtain all property values of objects whose property is price and which does not equal 8.95 | With the bare `@` allowing filtering objects by property value (not necessarily within arrays), you can add `^` after the expression to get at the object possessing the filtered properties
/                   | $                      | The root of the JSON object (i.e., the whole object itself) | To get a literal `$` (by itself or anywhere in the path), you must use the backtick escape
//\*/\*\|//\*/\*/text()  | $..*                   | All Elements (and text) beneath root in an XML document. All members of a JSON structure beneath the root. |
//*                 | $..                    | All Elements in an XML document. All parent components of a JSON structure including root. | This behavior was not directly specified in the original spec
//*\[price>19]/..    | $..\[?(@.price>19)]^    | Parent of those specific items with a price greater than 19 (i.e., the store value as the parent of the bicycle and the book array as parent of an individual book) | Parent (caret) not present in the original spec
/store/*/name() (in XPath 2.0)  | $.store.*~ | The property names of the store sub-object ("book" and "bicycle"). Useful with wildcard properties. | Property name (tilde) is not present in the original spec
/store/book\[not(. is /store/book\[1\])\] (in XPath 2.0) | $.store.book\[?(@path !== "$\[\'store\']\[\'book\']\[0]")] | All books besides that at the path pointing to the first | @path not present in the original spec
//book\[parent::\*/bicycle/color = "red"]/category | $..book\[?(@parent.bicycle && @parent.bicycle.color === "red")].category | Grabs all categories of books where the parent object of the book has a bicycle child whose color is red (i.e., all the books) | @parent is not present in the original spec
//book/*\[name() != 'category']     | $..book.*\[?(@property !== "category")] | Grabs all children of "book" except for "category" ones  | @property is not present in the original spec
//book\[position() != 1]    | $..book\[?(@property !== 0)] | Grabs all books whose property (which, being that we are reaching inside an array, is the numeric index) is not 0 | @property is not present in the original spec
/store/\*/\*\[name(parent::*) != 'book'] | $.store.*\[?(@parentProperty !== "book")] | Grabs the grandchildren of store whose parent property is not book (i.e., bicycle's children, "color" and "price") | @parentProperty is not present in the original spec
//book\[count(preceding-sibling::\*) != 0]/\*/text() | $..book.*\[?(@parentProperty !== 0)]  | Get the property values of all book instances whereby the parent property of these values (i.e., the array index holding the book item parent object) is not 0 | @parentProperty is not present in the original spec
//book\[price = /store/book\[3]/price] | $..book\[?(@.price === @root.store.book\[2].price)] | Filter all books whose price equals the price of the third book | @root is not present in the original spec
//book/../\*\[. instance of element(\*, xs:decimal)\] (in XPath 2.0) | $..book..\*@number() | Get the numeric values within the book array | @number(), the other basic types (@boolean(), @string()), other low-level derived types (@null(), @object(), @array()), the JSONSchema-added type, @integer(), the compound type @scalar() (which also accepts `undefined` and non-finite numbers for JavaScript objects as well as all of the basic non-object/non-function types), the type, @other(), to be used in conjunction with a user-defined callback (see `otherTypeCallback`) and the following non-JSON types that can nevertheless be used with JSONPath when querying non-JSON JavaScript objects (@undefined(), @function(), @nonFinite()) are not present in the original spec
//book/*[name() = 'category' and matches(., 'tion$')] (XPath 2.0) | $..book.*\[?(@property === "category" && @.match(/TION$/i))] | All categories of books which match the regex (end in 'TION' case insensitive)  | @property is not present in the original spec.
//book/*[matches(name(), 'bn$')]/parent::* (XPath 2.0) | $..book.*\[?(@property.match(/bn$/i))]^ | All books which have a property matching the regex (end in 'TION' case insensitive)  | @property is not present in the original spec. Note: Uses the parent selector \^ at the end of the expression to return to the parent object; without the parent selector, it matches the two `isbn` key values.
| | `` ` `` (e.g., `` `$`` to match a property literally named `$`) | Escapes the entire sequence following (to be treated as a literal) | `` ` `` is not present in the original spec; to get a literal backtick, use an additional backtick to escape

Any additional variables supplied as properties on the optional "sandbox"
object option are also available to (parenthetical-based)
evaluations.

## Potential sources of confusion for XPath users

1. In JSONPath, a filter expression, in addition to its `@` being a
reference to its children, actually selects the immediate children
as well, whereas in XPath, filter conditions do not select the children
but delimit which of its parent nodes will be obtained in the result.
1. In JSONPath, array indexes are, as in JavaScript, 0-based (they begin
from 0), whereas in XPath, they are 1-based.
1. In JSONPath, equality tests utilize (as per JavaScript) multiple equal signs
whereas in XPath, they use a single equal sign.

## Command line interface

A basic command line interface (CLI) is provided. Access it using `npx jsonpath-plus <json-file> <jsonpath-query>`.

## Ideas

1. Support OR outside of filters (as in XPath `|`) and grouping.
1. Create syntax to work like XPath filters in not selecting children?
1. Allow option for parentNode equivalent (maintaining entire chain of
    parent-and-parentProperty objects up to root)

## Development

Running the tests on Node:

```shell
npm test
```

For in-browser tests:

- Serve the js/html files:

```shell
npm run browser-test
```

- Visit [http://localhost:8082/test/](http://localhost:8082/test/).

## License

[MIT License](https://opensource.org/license/mit/).
