This repository is only intended to be used as a reference implementation of Turndown's reference HTML parser.
It is not intended to be used as a general-purpose DOM implementation. No contributions other than bugfixes to
supported Turndown use case will be accepted.


# Server-side DOM implementation based on Mozilla's dom.js

This is a fork of [Angular Domino](https://github.com/angular/domino), which is fork of the original [Domino](https://github.com/fgnass/domino).

As the name might suggest, domino's goal is to provide a <b>DOM in No</b>de.

In contrast to the original [dom.js](https://github.com/andreasgal/dom.js) project, domino was not designed to run untrusted code. Hence it doesn't have to hide its internals behind a proxy facade which makes the code not only simpler, but also [more performant](https://github.com/fgnass/dombench).

Domino currently doesn't use any harmony/ES6 features like proxies or WeakMaps and therefore also runs in older Node versions.

## Speed over Compliance

Domino is intended for _building_ pages rather than scraping them. Hence Domino doesn't execute scripts nor does it download external resources.

Also Domino doesn't generally implement properties which have been deprecated in HTML5.

Domino sticks to [DOM level 4](http://dvcs.w3.org/hg/domcore/raw-file/tip/Overview.html#interface-attr), which means that Attributes do not inherit the Node interface.

<b>Note that</b> because domino does not use proxies,
`Element.attributes` is not a true JavaScript array; it is an object
with a `length` property and an `item(n)` accessor method.  See
[github issue #27](https://github.com/fgnass/domino/issues/27) for
further discussion.  It does however implement direct indexed accessors
(`element.attributes[i]`) and is live.



## CSS Selector Support

Domino provides support for `querySelector()`, `querySelectorAll()`, and `matches()` backed by the [Zest](https://github.com/chjj/zest) selector engine.

## Optimization

Domino represents the DOM tree structure in the same way Webkit and
other browser-based implementations do: as a linked list of children
which is converted to an array-based representation iff the
`Node#childNodes` accessor is used.  You will get the best performance
from tree modification code (inserting and removing children) if you
avoid the use of `Node#childNodes` and traverse the tree using
`Node#firstChild`/`Node#nextSibling` (or
`Node#lastChild`/`Node#previousSibling`) or `querySelector()`/etc.

## Usage

Domino supports the DOM level 4 API, and thus API documentation can be
found on standard reference sites.  For example, you could start from
MDN's documentation for
[Document](https://developer.mozilla.org/en-US/docs/Web/API/Document) and
[Node](https://developer.mozilla.org/en-US/docs/Web/API/Node).

The only exception is the initial creation of a document:
```javascript
var domino = require('domino');
var Element = domino.impl.Element; // etc

// alternatively: document = domino.createDocument(htmlString, true)

var h1 = document.querySelector('h1');
console.log(h1.innerHTML);
console.log(h1 instanceof Element);
```

There is also an incremental parser available, if you need to interleave
parsing with other processing:
```javascript
var domino = require('domino');

var pauseAfter = function(ms) {
  var start = Date.now();
  return function() { return (Date.now() - start) >= ms; };
};

var incrParser = domino.createIncrementalHTMLParser();
incrParser.write('<p>hello<');
incrParser.write('b>&am');
incrParser.process(pauseAfter(1/*ms*/)); // can interleave processing
incrParser.write('p;');
// ...etc...
incrParser.end(); // when done writing the document

while (incrParser.process(pauseAfter(10/*ms*/))) {
  // ...do other housekeeping...
}

console.log(incrParser.document().outerHTML);
```

If you want a more standards-compliant way to create a `Document`, you can
also use [DOMImplementation](https://developer.mozilla.org/en-US/docs/Web/API/DOMImplementation):
```javascript
var domino = require('domino');
var domimpl = domino.createDOMImplementation();
var doc = domimpl.createHTMLDocument();
```

By default many domino methods will be stored in writable properties, to
allow polyfills (as browsers do).  You can lock down the implementation
if desired as follows:
```javascript
global.__domino_frozen__ = true; // Must precede any `require('domino')`
var domino = require('domino');
```

## Tests

Domino includes test from the [W3C DOM Conformance Suites](http://www.w3.org/DOM/Test/)
as well as tests from [HTML Working Group](http://www.w3.org/html/wg/wiki/Testing).

When you checkout this repository for the first time, run the following command to also check out code for the mentioned tests:

```
git submodule update --init --recursive
```

The tests can be run via `npm test` or directly though the [Mocha](http://mochajs.org/) command line:

![Screenshot](http://fgnass.github.com/images/domino.png)

## License and Credits

The majority of the code was originally written by [Andreas Gal](https://github.com/andreasgal/) and [David Flanagan](https://github.com/davidflanagan) as part of the [dom.js](https://github.com/andreasgal/dom.js) project. Please refer to the included LICENSE file for the original copyright notice and disclaimer.

[Felix Gnass](https://github.com/fgnass/) extracted the code and turned
it into a stand-alone npm package.

The code has been maintained since 2013 by [C. Scott Ananian](https://github.com/cscott/) on behalf of the Wikimedia Foundation, which uses it in its
[Parsoid](https://www.mediawiki.org/wiki/Parsoid) project.  A large number
of improvements have been made, mostly focusing on correctness,
performance, and (to a lesser extent) completeness of the implementation.

[1]: https://travis-ci.org/fgnass/domino.svg
[2]: https://travis-ci.org/fgnass/domino
[3]: https://david-dm.org/fgnass/domino.svg
[4]: https://david-dm.org/fgnass/domino
[5]: https://david-dm.org/fgnass/domino/dev-status.svg
[6]: https://david-dm.org/fgnass/domino#info=devDependencies
