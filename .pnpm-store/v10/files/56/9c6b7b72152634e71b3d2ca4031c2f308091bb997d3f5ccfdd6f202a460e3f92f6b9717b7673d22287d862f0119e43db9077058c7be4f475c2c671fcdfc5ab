# Lunr.js

[![Join the chat at https://gitter.im/olivernn/lunr.js](https://badges.gitter.im/Join%20Chat.svg)](https://gitter.im/olivernn/lunr.js?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge&utm_content=badge)

[![Build Status](https://travis-ci.org/olivernn/lunr.js.svg?branch=master)](https://travis-ci.org/olivernn/lunr.js)

A bit like Solr, but much smaller and not as bright.

## Example

A very simple search index can be created using the following:

```javascript
var idx = lunr(function () {
  this.field('title')
  this.field('body')

  this.add({
    "title": "Twelfth-Night",
    "body": "If music be the food of love, play on: Give me excess of it…",
    "author": "William Shakespeare",
    "id": "1"
  })
})
```

Then searching is as simple as:

```javascript
idx.search("love")
```

This returns a list of matching documents with a score of how closely they match the search query as well as any associated metadata about the match:

```javascript
[
  {
    "ref": "1",
    "score": 0.3535533905932737,
    "matchData": {
      "metadata": {
        "love": {
          "body": {}
        }
      }
    }
  }
]
```

[API documentation](https://lunrjs.com/docs/index.html) is available, as well as a [full working example](https://olivernn.github.io/moonwalkers/).

## Description

Lunr.js is a small, full-text search library for use in the browser.  It indexes JSON documents and provides a simple search interface for retrieving documents that best match text queries.

## Why

For web applications with all their data already sitting in the client, it makes sense to be able to search that data on the client too.  It saves adding extra, compacted services on the server.  A local search index will be quicker, there is no network overhead, and will remain available and usable even without a network connection.

## Installation

Simply include the lunr.js source file in the page that you want to use it.  Lunr.js is supported in all modern browsers.

Alternatively an npm package is also available `npm install lunr`.

Browsers that do not support ES5 will require a JavaScript shim for Lunr to work. You can either use [Augment.js](https://github.com/olivernn/augment.js), [ES5-Shim](https://github.com/kriskowal/es5-shim) or any library that patches old browsers to provide an ES5 compatible JavaScript environment.

## Features

* Full text search support for 14 languages
* Boost terms at query time or boost entire documents at index time
* Scope searches to specific fields
* Fuzzy term matching with wildcards or edit distance

## Contributing

See the [`CONTRIBUTING.md` file](CONTRIBUTING.md).
