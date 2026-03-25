# Readability.js

A standalone version of the readability library used for [Firefox Reader View](https://support.mozilla.org/kb/firefox-reader-view-clutter-free-web-pages).

## Installation

Readability is available on npm:

```bash
npm install @mozilla/readability
```

You can then `require()` it, or for web-based projects, load the `Readability.js` script from your webpage.

## Basic usage

To parse a document, you must create a new `Readability` object from a DOM document object, and then call the [`parse()`](#parse) method. Here's an example:

```javascript
var article = new Readability(document).parse();
```

If you use Readability in a web browser, you will likely be able to use a `document` reference from elsewhere (e.g. fetched via XMLHttpRequest, in a same-origin `<iframe>` you have access to, etc.). In Node.js, you can [use an external DOM library](#nodejs-usage).

## API Reference

### `new Readability(document, options)`

The `options` object accepts a number of properties, all optional:

* `debug` (boolean, default `false`): whether to enable logging.
* `maxElemsToParse` (number, default `0` i.e. no limit): the maximum number of elements to parse.
* `nbTopCandidates` (number, default `5`): the number of top candidates to consider when analysing how tight the competition is among candidates.
* `charThreshold` (number, default `500`): the number of characters an article must have in order to return a result.
* `classesToPreserve` (array): a set of classes to preserve on HTML elements when the `keepClasses` options is set to `false`.
* `keepClasses` (boolean, default `false`): whether to preserve all classes on HTML elements. When set to `false` only classes specified in the `classesToPreserve` array are kept.
* `disableJSONLD` (boolean, default `false`): when extracting page metadata, Readability gives precedence to Schema.org fields specified in the JSON-LD format. Set this option to `true` to skip JSON-LD parsing.
* `serializer` (function, default `el => el.innerHTML`) controls how the `content` property returned by the `parse()` method is produced from the root DOM element. It may be useful to specify the `serializer` as the identity function (`el => el`) to obtain a DOM element instead of a string for `content` if you plan to process it further.
* `allowedVideoRegex` (RegExp, default `undefined` ): a regular expression that matches video URLs that should be allowed to be included in the article content. If `undefined`, the [default regex](https://github.com/mozilla/readability/blob/8e8ec27cd2013940bc6f3cc609de10e35a1d9d86/Readability.js#L133) is applied.
* `linkDensityModifier` (number, default `0`): a number that is added to the base link density threshold during the shadiness checks. This can be used to penalize nodes with a high link density or vice versa.

### `parse()`

Returns an object containing the following properties:

* `title`: article title;
* `content`: HTML string of processed article content;
* `textContent`: text content of the article, with all the HTML tags removed;
* `length`: length of an article, in characters;
* `excerpt`: article description, or short excerpt from the content;
* `byline`: author metadata;
* `dir`: content direction;
* `siteName`: name of the site;
* `lang`: content language;
* `publishedTime`: published time;

The `parse()` method works by modifying the DOM. This removes some elements in the web page, which may be undesirable. You can avoid this by passing the clone of the `document` object to the `Readability` constructor:

```js
var documentClone = document.cloneNode(true);
var article = new Readability(documentClone).parse();
```

### `isProbablyReaderable(document, options)`

A quick-and-dirty way of figuring out if it's plausible that the contents of a given document are suitable for processing with Readability. It is likely to produce both false positives and false negatives. The reason it exists is to avoid bogging down a time-sensitive process (like loading and showing the user a webpage) with the complex logic in the core of Readability. Improvements to its logic (while not deteriorating its performance) are very welcome.

The `options` object accepts a number of properties, all optional:

* `minContentLength` (number, default `140`): the minimum node content length used to decide if the document is readerable;
* `minScore` (number, default `20`): the minimum cumulated 'score' used to determine if the document is readerable;
* `visibilityChecker` (function, default `isNodeVisible`): the function used to determine if a node is visible;

The function returns a boolean corresponding to whether or not we suspect `Readability.parse()` will succeed at returning an article object. Here's an example:

```js
/*
    Only instantiate Readability  if we suspect
    the `parse()` method will produce a meaningful result.
*/
if (isProbablyReaderable(document)) {
    let article = new Readability(document).parse();
}
```

## Node.js usage

Since Node.js does not come with its own DOM implementation, we rely on external libraries like [jsdom](https://github.com/jsdom/jsdom). Here's an example using `jsdom` to obtain a DOM document object:

```js
var { Readability } = require('@mozilla/readability');
var { JSDOM } = require('jsdom');
var doc = new JSDOM("<body>Look at this cat: <img src='./cat.jpg'></body>", {
  url: "https://www.example.com/the-page-i-got-the-source-from"
});
let reader = new Readability(doc.window.document);
let article = reader.parse();
```

Remember to pass the page's URI as the `url` option in the `JSDOM` constructor (as shown in the example above), so that Readability can convert relative URLs for images, hyperlinks, etc. to their absolute counterparts.

`jsdom` has the ability to run the scripts included in the HTML and fetch remote resources. For security reasons these are [disabled by default](https://github.com/jsdom/jsdom#executing-scripts), and we **strongly** recommend you keep them that way.

## Security

If you're going to use Readability with untrusted input (whether in HTML or DOM form), we **strongly** recommend you use a sanitizer library like [DOMPurify](https://github.com/cure53/DOMPurify) to avoid script injection when you use
the output of Readability. We would also recommend using [CSP](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP) to add further defense-in-depth
restrictions to what you allow the resulting content to do. The Firefox integration of
reader mode uses both of these techniques itself. Sanitizing unsafe content out of the input is explicitly not something we aim to do as part of Readability itself - there are other good sanitizer libraries out there, use them!

## Contributing

Please see our [Contributing](CONTRIBUTING.md) document.

## License

    Copyright (c) 2010 Arc90 Inc

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
