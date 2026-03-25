[![Build Status](https://travis-ci.org/tandrewnichols/indefinite.png)](https://travis-ci.org/tandrewnichols/indefinite) [![downloads](http://img.shields.io/npm/dm/indefinite.svg)](https://npmjs.org/package/indefinite) [![npm](http://img.shields.io/npm/v/indefinite.svg)](https://npmjs.org/package/indefinite) [![Code Climate](https://codeclimate.com/github/tandrewnichols/indefinite/badges/gpa.svg)](https://codeclimate.com/github/tandrewnichols/indefinite) [![Test Coverage](https://codeclimate.com/github/tandrewnichols/indefinite/badges/coverage.svg)](https://codeclimate.com/github/tandrewnichols/indefinite) [![dependencies](https://david-dm.org/tandrewnichols/indefinite.png)](https://david-dm.org/tandrewnichols/indefinite) ![Size](https://img.shields.io/badge/size-2kb-brightgreen.svg)

# indefinite

Prefix a noun with an indefinite article - a or an - based on whether it begins with a vowel.

## Installation

`npm install --save indefinite`

## Summary

It's not hard to check whether a noun begins with a vowel and decide whether to prefix with "a" or "an," but I got tired of doing it manually every time. So now there's this. Just pass in the word, and `indefinite` will return the word prefixed with either "a " or "an " depending on the first letter of the word.

As of version 2.0.0, `indefinite` will attempt to detect when an acronym is passed in and treat the response differently. E.g. it should be "a UFO" not "an UFO" because of how we pronounce a long U. This isn't a perfect science, so you might have false positives.

As of version 2.0.2, `indefinite` will also consult a list of irregular words to determine the appropriate article. For example, it should be "an hour" not "a hour." It also _attempts_ to do this with various forms of the words (checking for singular, plural, and even past tense, since past tense verbs can be used as adjectives, as in "an honored man"). This is not an exact science either, and the list of irregulars is not exhaustive (and probably won't ever be), but if you find a word that's not in the list that's returning the wrong thing, please open an issue so it can be corrected.

## Usage

```js
var a = require('indefinite');

console.log(a('apple')); // "an apple"
console.log(a('banana')); // "a banana"
console.log(a('UFO')); // 'a UFO'
console.log(a('hour')); // 'an hour'
console.log(a('ukelele')); // 'a ukelele'
```

Indefinite also accepts an options object as the second parameter. The following options are supported:

- `articleOnly` - Return only the article.
- `capitalize` - Capitalize the article.
- `caseInsensitive` - Ignore the casing of the word passed in (i.e. bypassing the acronym checking). This is useful if, for some reason, you're yelling on the internet and want to make sure "UGLY GARDEN GNOME" doesn't become "a UGLY GARDEN GNOME."
- `numbers` - When numbers are passed in, they are prefixed with "a" except for 8, 11, 18, and higher numbers starting with 8. _However_, numbers like 1100 are ambiguous. Should it be "a one thousand one hundred" or "an eleven hundred"? There's not really any programmatic way to know this for sure, but if _you_ know for sure, you can use the `numbers` option to tell `indefinite` how to handle these cases. The default is "formal" in which numbers are read literally (the way you'd say them if they were written out), but if you pass `numbers: 'colloquial'`, the "eleven hundred"/"eighteen hundred" readings will be used.

```js
console.log(a('apple', { articleOnly: true })); // 'an'
console.log(a('banana', { articleOnly: true })); // 'a'
console.log(a('apple', { capitalize: true })); // 'An apple'
console.log(a('banana', { capitalize: true })); // 'A banana'
console.log(a('UGLY SWEATER', { caseInsensitive: true })); // 'an UGLY SWEATER'
console.log(a('2')); // 'a 2'
console.log(a('8')); // 'an 8'
console.log(a('1892')); // 'a 1892' -> read "a one thousand eight hundred ninety-two"
console.log(a('1892', { numbers: 'colloquial' })); // 'an 1892' -> read "an eighteen ninety-two"
```

### Browser

Files in `dist` are UMD format, and `package.json` contains a `browser` field pointing to `dist/indefinite.js`, so you should be able to bundle this via webpack, rollup, browserify, etc. or serve it in ye olde javascript fashion and access it via window.

## Detecting the need for an indefinite article

It's worth mentioning that `indefintite` currently only differentiates between `a` and `an` for you. It doesn't do anything to decide if an indefinite article is required, so if you pass a plural to `indefinite`, you'll get something like "a shoes" back, which is obviously wrong. You can look at [this issue](https://github.com/tandrewnichols/indefinite/issues/23) for more context on why this isn't supported at the moment. It _could_ be in the future, but there are some prohibitive issues to work through first. For now, it is up to you (the consumer) to either call or not call `indefinite` depending on the plurality of the word. You can do something like the suggestion in that issue:

```javascript
const indefinite = require('indefinite');
const pluralize = require('pluralize');

module.exports = (subject) => {
  if (pluralize(subject) === subject) {
    return subject;
  }

  return indefinite(subject);
};
```

Or you can try [is-singular](https://www.npmjs.com/package/is-singular) or [is-plural](https://www.npmjs.com/package/is-plural).

## Contributing

Please see [the contribution guidelines](contributing.md).
