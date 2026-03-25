# jsSHA - ChangeLog

## 3.3.1 (2023-08-04)

- Support latest method of defining type imports (#103, thanks @faljse!).

## 3.3.0 (2022-10-10)

- `.update()` method now returns a reference to the jsSHA object to allow for
  method chaining (#100, thanks @ADTC!).
- Correct bad URL in README (#99, thanks @jbjulia!).

## 3.2.0 (2020-12-07)

- Added ESM versions of all variants (thanks wKovacs64!).

## 3.1.2 (2020-08-08)

- Added explicit package.json export to support React (thanks canpoyrazoglu!).

## 3.1.1 (2020-07-22)

- Added dist subpath exports to provide forward compatibility with newer node
  versions (thanks aravinth2094!).

## 3.1.0 - Still-At-Home Edition (2020-04-15)

- Added support for cSHAKE128/256 and KMAC128/256 (thanks paulg446 for the
  ticket and mrecachinas for the test vector help!).
- Added TypeScript declarations for all variant files (thanks wKovacs64!).
- Deprecated `setHMACKey` and `getHMAC` in order to unify MAC API. See the
  [jsSHA Wiki] for more information.

[jssha wiki]: https://github.com/Caligatio/jsSHA/wiki

## 3.0.0 - Stay-At-Home Order Edition (2020-04-09)

- Transitioned codebase to [TypeScript] while still maintaining v2 backwards
  compatible output files (thanks for the solid start oberondelafay!).
- v2 backwards compatible files now use the [Universal Module Definition
  (UMD)][umd] format which should support all well-known loaders.
- Added a oft-requested ECMAScript 2015 (ES6) ECMAScript Module (ESM) version of
  the library (dist/sha.mjs).
- Reworked package exports to allow Node.js and other tools to smartly choose
  between ES6 ESM module and ES3 UMD versions of the library.
- TypeScript declarations are now included with the library for the default
  entry points (dist/sha.js and dist/sha.mjs).
- Source maps are now included with the library for the default entry points.
- Limited hash variant files (sha1.js, sha256.js, sha512.js, and sha3.js) are
  now accessed via exports rather than file path (e.g. using
  `require("jssha/sha1")` rather than the previous
  `require("jssha/src/sha1.js"`).
- Changed build system from [Google Closure Compiler][gcc] to [Rollup] with
  [terser] as the minifier/uglifer (thanks blikblum!). This resulted in slightly
  larger output files but infinitely better maintainability.
- Optimized 64-bit functions by removing unneeded logical/arithmetic/bit
  operations.
- Completely overhauled testing due to transition to TypeScript. This resulted
  in the ability to get true 100% unit test coverage and identification of a few
  lurking/obscure bugs (see v2.4.2 and v2.4.1).

[typescript]: https://www.typescriptlang.org/
[rollup]: https://rollupjs.org/
[terser]: https://github.com/terser/terser
[umd]: https://github.com/umdjs/umd

## 2.4.2 (2020-04-08)

This marks the last v2.X feature release. The codebase is transitioning to
TypeScript and, while the API is intended to be fully backwards-compatible, the
version will be bumped to v3 as a safety precaution.

- Fixed incorrect SHAKE128 results when output length was greater than 1344-bits
  and SHAKE256 results when output length was greater than 1088-bits (1344 and
  1088 being internal state size for each variant).

## 2.4.1 (2020-04-04)

- Fixed incorrect HMAC results when using SHA-3 if the key was 1-4 bytes shorter
  than the internal block size of the chosen SHA-3 variant.

## 2.4.0 (2020-03-26)

- Reduced ECMAScript dependency to v3 (thanks TitusInfo!)
- Added support for Uint8Array input/output as UINT8ARRAY (thanks nazar-pc!)

## 1.6.3 (2020-03-26)

- Reduced ECMAScript dependency to v3 (thanks TitusInfo!)

## 2.3.1 (2017-06-10)

- Fix issue with SHA-3 and using a combination of TEXT/UTF-16 input (thanks
  frostschutz!)

## 2.3.0 (2017-05-13)

- Sped up SHA-3 implementation by adding little-endian capability to conversion
  functions
- Further sped up SHA-3 implementation by decomposing xor_64 function (thanks
  frostschutz!)
- Fixed incorrect results when using ArrayBuffers (thanks conref!)
- Added externs/sha.js for [Google Closure Compiler][gcc] users (thanks IvanRF!)

## 2.2.0 (2016-07-10)

- Added support for the SHA-3 family of hashes (SHA3-224, SHA3-256, SHA3-384,
  SHA3-512, SHAKE128, and SHAKE256)
- Fixed bug with using ARRAYBUFFER as a HMAC key type
- Switched testing framework to Mocha and Chai

## 2.1.0 (2016-05-13)

- Added ability to call `update` on hashes between `getHash` and `getHMAC` calls
- Added new input and output type, "ARRAYBUFFER" which is a JavaScript
  ArrayBuffer
- Now keeping smaller build files in NPM (thanks vogievetsky!)
- Fixed problem with hashing strings over 4 billion bits (thanks Eicar!)

## 2.0.2 (2015-10-31)

- Fixed inability to have a blank "b64Pad" (thanks xlc!)
- Added file hashing test (thanks kofalt!)

## 2.0.1 (2015-06-25)

- Fixed major issue with all hashes failing if raw input was a particular size
  (thanks treus!)

## 2.0.0 (2015-06-13)

- Completely reworked API to support streaming inputs
- Exceptions now throw Errors instead of strings (thanks jclem!)

## 1.6.1 (2015-06-25)

- Fixed issue with SHA-512 family of hashes failing if raw input was a
  particular size

## 1.6.0 (2015-03-08)

This marks the last v1.X new feature release. The API is changing significantly
with upcoming v2.0 to support streaming and it will be too difficult to support
the older API style with new features.

- Added a BYTES input and output format that is a raw byte string
- Fixed broken AMD support (thanks drewcovi!)
- Fixed broken UTF-8 parsing on non-BMP Unicode characters
- Changed array references to remove warnings on Icedove
- Replaced "UTF16" encoding with "UTF16BE" (big endian) and "UTF16LE" (little
  endian) to remove confusion

## 1.5.1 (2013-12-15)

- Changed [Google Closure Compiler][gcc] options to produce "strict" compatible
  code

## 1.5 (2013-12-15)

- Added optional numRounds argument to getHash
  - Note: this necessitated removing the hash result caching functionality
- Reduced file size by optimizing internal constants
- Removed charSize input and replaced with encoding to handle Unicode. NOTE:
  Only Code points up to 0xFFFF are supported.
  - charSize = 16 is effectively replaced by encoding = "UTF16"
  - charSize = 8 was wrong in terms of handling UTF-8 and has been replaced by
    encoding = "UTF8"
- Changed method of referencing "window" to be compatible with WebWorkers,
  Node.js, and AMD (thanks piranna!)

## 1.42 (2012-12-28)

- Readded v1.4 Safari patch to support older versions

## 1.41 (2012-12-23)

- Fixed incorrect hash issue with Chrome x64 v25 (Dev channel), also provides
  stable patch to v1.4 Safari issue.

## 1.4 (2012-12-08)

- Added new input type, TEXT, that is functionally identical to ASCII\*
- Added new input type, B64, for base-64 encoded strings
- Added new input and output formatting parameters
  - `getHash` and `getHMAC` take an optional parameter, outputFormatOpts, that
    is a hash list containing the keys "outputUpper" (boolean, only applicable
    to HEX output) and "b64Pad" (string, only applicable to Base-64 output) that
    have default values of false and "=", respectively
  - jsSHA constructor takes an optional parameter, charSize (8 or 16) that
    specifies the character width of the input (TEXT and ASCII input only)
- Modified comments to be [Google Closure Compiler][gcc] compliant
- Added a SUPPORTED_ALGS flag that, when used with the Google Closure Compiler,
  will remove unused functions/function portions
  - Removed all src/\*\_nice.js files as the SUPPORTED_ALGS flag renders them
    obsolete
- All production-ready files are now produced using the Google Closure Compiler
  with ADVANCED_OPTIMIZATIONS resulting in further reduced filesizes
- The SHA-1 only implementation now requires that that "SHA-1" be specified as
  the variant when using getHash and getHMAC
- Removed test/HMAC.py as new NIST tests made the need for it obsolete
- Significantly changed the test/test.html to make it easier to understand and
  to allow for easier adding of test cases
- Replaced previous error returning code with thrown exceptions
- Fix for 64-bit Safari issue (thanks Ron Garret and Chris Warren-Smith!)
  - NOTE: While this fix works, it is merely a workaround for a WebKit
    JavaScript optimizer bug, see https://bugs.webkit.org/show_bug.cgi?id=88673
    for more detail

\* This library misused the term ASCII so input type of TEXT was added with the
intention of deprecating ASCII

[gcc]: https://developers.google.com/closure/compiler/

## 1.31 (2012-07-21)

- Updated project URL to point to new GitHub repository
- Added a compressed version of sha.js

## 1.3 (2010-09-01)

- Changed method of declaring objects/classes
- Moved non-instance specific variables and methods to class scope
- Removed logically correct but unneeded conditionals

## 1.2 (2009-07-22)

- Added the HMAC algorithm for all supported hashes (using both ASCII and hex
  keys)
- As a result of adding HMAC, added support for hash input text to be hex (ASCII
  representation of hex)
- Added multiple variants of safeAdd functions, resulting in a significant
  performance gain
- Removed wrapper.js file
- Used a different JavaScript compressor resulting in smaller file sizes

## 1.11 (2008-12-07)

- Fixed a base-64 encoding issue resulting from a missing capital 'X'

## 1.1 (2008-09-25)

- Fixed an issue with incorrect hashes being generated when jsSHA ojbects were
  used to generate multiple hashes

## 1.0 (2008-09-25)

- Made all functions/variables follow an object-orientated methodology
- Removed support for string hash output as the hash is rarely ASCII friendly
- Changed the interface to calculate hashes (see README)
- Made sha.js validate against [JSLint] using "Recommended" settings

[jslint]: http://www.jslint.com

## 0.1 (2008-02-21)

- Initial public release
