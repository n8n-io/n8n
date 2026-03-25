# rss-parser

[![Version][npm-image]][npm-link]
[![Build Status][build-image]][build-link]
[![Downloads][downloads-image]][npm-link]

[downloads-image]: https://img.shields.io/npm/dm/rss-parser.svg
[npm-image]: https://img.shields.io/npm/v/rss-parser.svg
[npm-link]: https://npmjs.org/package/rss-parser
[build-image]: https://github.com/rbren/rss-parser/workflows/tests/badge.svg
[build-link]: https://github.com/rbren/rss-parser/actions

A small library for turning RSS XML feeds into JavaScript objects.

## Installation
```bash
npm install --save rss-parser
```

## Usage
You can parse RSS from a URL (`parser.parseURL`) or an XML string (`parser.parseString`).

Both callbacks and Promises are supported.

### NodeJS
Here's an example in NodeJS using Promises with async/await:

```js
let Parser = require('rss-parser');
let parser = new Parser();

(async () => {

  let feed = await parser.parseURL('https://www.reddit.com/.rss');
  console.log(feed.title);

  feed.items.forEach(item => {
    console.log(item.title + ':' + item.link)
  });

})();
```

### TypeScript
When using TypeScript, you can set a type to control the custom fields:

```typescript
import Parser from 'rss-parser';

type CustomFeed = {foo: string};
type CustomItem = {bar: number};

const parser: Parser<CustomFeed, CustomItem> = new Parser({
  customFields: {
    feed: ['foo', 'baz'],
    //            ^ will error because `baz` is not a key of CustomFeed
    item: ['bar']
  }
});

(async () => {

  const feed = await parser.parseURL('https://www.reddit.com/.rss');
  console.log(feed.title); // feed will have a `foo` property, type as a string

  feed.items.forEach(item => {
    console.log(item.title + ':' + item.link) // item will have a `bar` property type as a number
  });
})();
```

### Web
> We recommend using a bundler like [webpack](https://webpack.js.org/), but we also provide
> pre-built browser distributions in the `dist/` folder. If you use the pre-built distribution,
> you'll need a [polyfill](https://github.com/taylorhakes/promise-polyfill) for Promise support.

Here's an example in the browser using callbacks:

```html
<script src="/node_modules/rss-parser/dist/rss-parser.min.js"></script>
<script>

// Note: some RSS feeds can't be loaded in the browser due to CORS security.
// To get around this, you can use a proxy.
const CORS_PROXY = "https://cors-anywhere.herokuapp.com/"

let parser = new RSSParser();
parser.parseURL(CORS_PROXY + 'https://www.reddit.com/.rss', function(err, feed) {
  if (err) throw err;
  console.log(feed.title);
  feed.items.forEach(function(entry) {
    console.log(entry.title + ':' + entry.link);
  })
})

</script>
```

### Upgrading from v2 to v3
A few minor breaking changes were made in v3. Here's what you need to know:

* You need to construct a `new Parser()` before calling `parseString` or `parseURL`
* `parseFile` is no longer available (for better browser support)
* `options` are now passed to the Parser constructor
* `parsed.feed` is now just `feed` (top-level object removed)
* `feed.entries` is now `feed.items` (to better match RSS XML)


## Output
Check out the full output format in [test/output/reddit.json](test/output/reddit.json)

```yaml
feedUrl: 'https://www.reddit.com/.rss'
title: 'reddit: the front page of the internet'
description: ""
link: 'https://www.reddit.com/'
items:
    - title: 'The water is too deep, so he improvises'
      link: 'https://www.reddit.com/r/funny/comments/3skxqc/the_water_is_too_deep_so_he_improvises/'
      pubDate: 'Thu, 12 Nov 2015 21:16:39 +0000'
      creator: "John Doe"
      content: '<a href="http://example.com">this is a link</a> &amp; <b>this is bold text</b>'
      contentSnippet: 'this is a link & this is bold text'
      guid: 'https://www.reddit.com/r/funny/comments/3skxqc/the_water_is_too_deep_so_he_improvises/'
      categories:
          - funny
      isoDate: '2015-11-12T21:16:39.000Z'
```

##### Notes:
* The `contentSnippet` field strips out HTML tags and unescapes HTML entities
* The `dc:` prefix will be removed from all fields
* Both `dc:date` and `pubDate` will be available in ISO 8601 format as `isoDate`
* If `author` is specified, but not `dc:creator`, `creator` will be set to `author` ([see article](http://www.lowter.com/blogs/2008/2/9/rss-dccreator-author))
* Atom's `updated` becomes `lastBuildDate` for consistency

## XML Options

### Custom Fields
If your RSS feed contains fields that aren't currently returned, you can access them using the `customFields` option.

```js
let parser = new Parser({
  customFields: {
    feed: ['otherTitle', 'extendedDescription'],
    item: ['coAuthor','subtitle'],
  }
});

parser.parseURL('https://www.reddit.com/.rss', function(err, feed) {
  console.log(feed.extendedDescription);

  feed.items.forEach(function(entry) {
    console.log(entry.coAuthor + ':' + entry.subtitle);
  })
})
```

To rename fields, you can pass in an array with two items, in the format `[fromField, toField]`:

```js
let parser = new Parser({
  customFields: {
    item: [
      ['dc:coAuthor', 'coAuthor'],
    ]
  }
})
```

To pass additional flags, provide an object as the third array item. Currently there is one such flag:

* `keepArray (false)` - set to `true` to return *all* values for fields that can have multiple entries.
* `includeSnippet (false)` - set to `true` to add an additional field, `${toField}Snippet`, with HTML stripped out

```js
let parser = new Parser({
  customFields: {
    item: [
      ['media:content', 'media:content', {keepArray: true}],
    ]
  }
})
```

### Default RSS version
If your RSS Feed doesn't contain a `<rss>` tag with a `version` attribute,
you can pass a `defaultRSS` option for the Parser to use:
```js
let parser = new Parser({
  defaultRSS: 2.0
});
```


### xml2js passthrough
`rss-parser` uses [xml2js](https://github.com/Leonidas-from-XIV/node-xml2js)
to parse XML. You can pass [these options](https://github.com/Leonidas-from-XIV/node-xml2js#options)
to `new xml2js.Parser()` by specifying `options.xml2js`:

```js
let parser = new Parser({
  xml2js: {
    emptyTag: '--EMPTY--',
  }
});
```

## HTTP Options

### Timeout
You can set the amount of time (in milliseconds) to wait before the HTTP request times out (default 60 seconds):

```js
let parser = new Parser({
  timeout: 1000,
});
```

### Headers
You can pass headers to the HTTP request:
```js
let parser = new Parser({
  headers: {'User-Agent': 'something different'},
});
```

### Redirects
By default, `parseURL` will follow up to five redirects. You can change this
with `options.maxRedirects`.

```js
let parser = new Parser({maxRedirects: 100});
```

### Request passthrough
`rss-parser` uses [http](https://nodejs.org/docs/latest/api/http.html#http_http_get_url_options_callback)/[https](https://nodejs.org/docs/latest/api/https.html#https_https_get_url_options_callback) module
to do requests. You can pass [these options](https://nodejs.org/docs/latest/api/https.html#https_https_request_options_callback)
to `http.get()`/`https.get()` by specifying `options.requestOptions`:

e.g. to allow unauthorized certificate
```js
let parser = new Parser({
  requestOptions: {
    rejectUnauthorized: false
  }
});
```

## Contributing
Contributions are welcome! If you are adding a feature or fixing a bug, please be sure to add a [test case](https://github.com/bobby-brennan/rss-parser/tree/master/test/input)

### Running Tests
The tests run the RSS parser for several sample RSS feeds in `test/input` and outputs the resulting JSON into `test/output`. If there are any changes to the output files the tests will fail.

To check if your changes affect the output of any test cases, run

`npm test`

To update the output files with your changes, run

`WRITE_GOLDEN=true npm test`

### Publishing Releases
```bash
npm run build
git commit -a -m "Build distribution"
npm version minor # or major/patch
npm publish
git push --follow-tags
```
