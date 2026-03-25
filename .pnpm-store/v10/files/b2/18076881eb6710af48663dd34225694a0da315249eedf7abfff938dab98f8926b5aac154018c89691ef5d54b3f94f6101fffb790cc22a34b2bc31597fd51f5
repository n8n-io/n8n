[![Build Status](https://github.com/sergeyt/parse-diff/actions/workflows/ci.yml/badge.svg)](https://github.com/sergeyt/parse-diff/actions/workflows/ci.yml)
[![Total downloads](https://img.shields.io/npm/dt/parse-diff.svg)](https://www.npmjs.com/package/parse-diff)

[![NPM](https://nodei.co/npm/parse-diff.png?downloads=true&stars=true)](https://nodei.co/npm/parse-diff/)

# parse-diff

Simple unified diff parser for JavaScript

## JavaScript Usage Example

```javascript
var parse = require('parse-diff');
var diff = ''; // input diff string
var files = parse(diff);
console.log(files.length); // number of patched files
files.forEach(function(file) {
	console.log(file.chunks.length); // number of hunks
	console.log(file.chunks[0].changes.length) // hunk added/deleted/context lines
	// each item in changes is a string
	console.log(file.deletions); // number of deletions in the patch
	console.log(file.additions); // number of additions in the patch
});
```
