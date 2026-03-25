# Changelog

## [5.3.7](https://github.com/nodemailer/libmime/compare/v5.3.6...v5.3.7) (2025-06-26)


### Bug Fixes

* performance issue on large inputs to decodeFlowed() ([#25](https://github.com/nodemailer/libmime/issues/25)) ([c893811](https://github.com/nodemailer/libmime/commit/c8938111e212996f0809253eb195ef56778fc4dd))
* replace .npmignore with files=[] in package.json ([#22](https://github.com/nodemailer/libmime/issues/22)) ([0ae2a1f](https://github.com/nodemailer/libmime/commit/0ae2a1fd830a73a1cdcee295bca94ebfe4a3c051))

## [5.3.6](https://github.com/nodemailer/libmime/compare/v5.3.5...v5.3.6) (2024-11-29)


### Bug Fixes

* **deps:** Bumped libqp to fix issue with missing whitespace ([1137a9f](https://github.com/nodemailer/libmime/commit/1137a9f2222ed21926e69ba8855e93e5a421fecc))

## [5.3.5](https://github.com/nodemailer/libmime/compare/v5.3.4...v5.3.5) (2024-04-12)


### Bug Fixes

* **deps:** Bumped deps ([0477e98](https://github.com/nodemailer/libmime/commit/0477e98d02d5af84f8be4b8e0856288175e913f9))

## [5.3.4](https://github.com/nodemailer/libmime/compare/v5.3.3...v5.3.4) (2024-02-23)


### Bug Fixes

* **deploy:** fixed git repo url ([0f3e5f4](https://github.com/nodemailer/libmime/commit/0f3e5f4b3f5fabe91967cd9842ebe00622181796))
* **deploy:** fixed git repo url ([4d584ad](https://github.com/nodemailer/libmime/commit/4d584ad7dd51cf0ad60f756a5d7c9470cca30319))

## [5.3.3](https://github.com/nodemailer/libmime/compare/v5.3.2...v5.3.3) (2024-02-23)


### Bug Fixes

* **deploy:** fixed git repo url ([f8f788f](https://github.com/nodemailer/libmime/commit/f8f788fd5d3f1148fb2e880e37c76cec6741a852))

## [5.3.2](https://github.com/nodemailer/libmime/compare/v5.3.1...v5.3.2) (2024-02-23)


### Bug Fixes

* **deploy:** fixed git repo url ([2161a43](https://github.com/nodemailer/libmime/commit/2161a43a87083ff99125b5335d3a2e1dee4c5663))

## [5.3.1](https://github.com/nodemailer/libmime/compare/v5.3.0...v5.3.1) (2024-02-23)


### Bug Fixes

* **deploy:** include package-lock.json ([8363bf4](https://github.com/nodemailer/libmime/commit/8363bf42c889e95fccf1c3f017db759434481bc1))

## [5.3.0](https://github.com/nodemailer/libmime/compare/v5.2.1...v5.3.0) (2024-02-23)


### Features

* **deploy:** added autopublish ([3e8109f](https://github.com/nodemailer/libmime/commit/3e8109f19bc7b9fb313467f61177ab08459ecf21))

## v5.2.1 2023-01-27

-   Fix base64 encoding for emoji bytes in encoded words

## v5.2.0 2022-12-08

-   Bumped libqp to get rid of `new Buffer` warnings

## v5.1.0 2022-04-28

-   Bumped deps
-   Removed Travis config
-   Added Github actions file to run tests

## v5.0.0 2020-07-22

-   Removed optional node-iconv support
-   Bumped dependencies
-   Updated Travis test matrix, dropped Node 8

## v4.2.1 2019-10-28

-   Replace jconv with more recent encoding-japanese

## v4.2.0 2019-10-28

-   Use jconv module to parse ISO-2022-JP by default

## v4.1.4 2019-10-28

-   decodeWords should also decode empty content part [WeiAnAn](9bbcfd2)
-   fix decode base64 ending with = [WeiAnAn](6e656e2)

## v4.1.0 2019-05-01

-   Experimental support for node-iconv

## v4.0.1 2018-07-24

-   Maintenance release. Bumped deps

## v4.0.0 2018-06-11

-   Refactored decoding of mime encoded words and parameter continuation strings

## v3.0.0 2016-12-08

-   Updated encoded-word generation. Previously a minimal value was encoded, so it was possible to have multiple encoded words in a string separated by non encoded-words. This was an issue with some webmail clients that stripped out the non-encoded parts between encoded-words so the updated method uses wide match by encoding from the first word with unicode characters to the last word. "a =?b?= c =?d?= e" -> "a =?bcd?= e"

## v2.1.3 2016-12-08

-   Revert dot as a special symbol

## v2.1.2 2016-11-21

-   Quote special symbols as defined in RFC (surajwy)

## v2.1.1 2016-11-15

-   Fixed issue with special symbols in attachment filenames

## v2.1.0 2016-07-24

-   Changed handling of base64 encoded mime words where multiple words are joined together if possible. This fixes issues with multi byte characters getting split into different mime words (against the RFC but occurs)

## v2.0.3 2016-02-29

-   Fixed an issue with rfc2231 filenames

## v2.0.2 2016-02-11

-   Fixed an issue with base64 mime words encoding

## v2.0.1 2016-02-11

-   Fix base64 mime-word encoding. Final string length was calculated invalidly

## v2.0.0 2016-01-04

-   Replaced jshint with eslint
-   Refactored file structure

## v1.2.1 2015-10-05

Added support for emojis in header params (eg. filenames)

## v1.2.0 2015-10-05

Added support for emojis in header params (eg. filenames)

## v1.1.0 2015-09-24

Updated encoded word encoding with quoted printable, should be more like required in https://tools.ietf.org/html/rfc2047#section-5

## v1.0.0 2015-04-15

Changed versioning scheme to use 1.x instead of 0.x versions. Bumped dependency versions, no actual code changes.

## v0.1.7 2015-01-19

Updated unicode filename handling – only revert to parameter continuation if the value actually includes
non-ascii characters or is too long. Previously filenames were encoded if they included anything
besides letters, numbers, dot or space.

## v0.1.6 2014-10-25

Fixed an issue with `encodeWords` where a trailing space was invalidly included in a word if the word
ended with an non-ascii character.

## v0.1.5 2014-09-12

Do not use quotes for continuation encoded filename parts. Fixes an issue with Gmail where the Gmail webmail keeps the charset as part of the filename.
