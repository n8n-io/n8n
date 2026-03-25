# Changelog

## Version 0.12.1

* Runtime check for input of `parse` and `parse1` to be a string.

## Version 0.12.0

* Support for escape sequences according to specifications ([#97](https://github.com/mxxii/parseley/issues/97)).

    Now follows <https://www.w3.org/TR/selectors-3/#lex> for parsing and <https://w3c.github.io/csswg-drafts/cssom/#common-serializing-idioms> for serializing.

Possibly breaking changes:

* parsed strings (attribute values) retained escape sequences previously, now they are unescaped;
* strings with `"` character were serialized as single-quoted previously, now all strings serialized as double-quoted, per spec suggestion.

## Version 0.11.0

* Targeting Node.js version 14 and ES2020;
* Now should be discoverable with [denoify](https://github.com/garronej/denoify).

## Version 0.10.0

* Bump dependencies - fix "./core module cannot be found" issue.

## Version 0.9.1

* Fix namespace parsing;
* Remove terser, use only `rollup-plugin-cleanup` to condition published files.

## Version 0.9.0

* Replaced `moo` and `nearley` with my [leac](https://github.com/mxxii/leac) and [peberminta](https://github.com/mxxii/peberminta) packages. Now `parseley` with all dependencies are TypeScript, dual CommonJS/ES module packages;
* Package is marked as free of side effects and tersed;
* Deno version is provided, with the help of `denoify`.

## Version 0.8.0

* Drop Node.js version 10 support. 12.22.x is required;
* Fix typos in type definitions.

## Version 0.7.0

* Switched to TypeScript;
* Added type definitions for AST;
* Hybrid package (ESM, CommonJS);
* Renamed `sort()` to `normalize()` in order to better reflect what it does;
* Replaced `compareArrays()` with `compareSpecificity()` and `compareSelectors()` - more sensible API;
* Generated [documentation](https://github.com/mxxii/parseley/tree/main/docs).

## Version 0.6.0

Added `sort()` and `compareArrays()` functions.

## Version 0.5.0

Initial release.

Aiming at Node.js version 10 and up.
