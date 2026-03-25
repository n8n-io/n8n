# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [8.0.1](https://github.com/npm/ssri/compare/v8.0.0...v8.0.1) (2021-01-27)


### Bug Fixes

* simplify regex for strict mode, add tests ([76e2233](https://github.com/npm/ssri/commit/76e223317d971f19e4db8191865bdad5edee40d2))

## [8.0.0](https://github.com/npm/ssri/compare/v7.1.0...v8.0.0) (2020-02-18)


### ⚠ BREAKING CHANGES

* SRI values with `../` in the algorithm name now throw
as invalid (which they always probably should have!)
* adds a new error that will be thrown.  Empty SRIs are
no longer considered valid for checking, only when using integrityStream
to calculate the SRI value.

PR-URL: https://github.com/npm/ssri/pull/12
Credit: @claudiahdz

### Features

* remove figgy-pudding ([0e78fd7](https://github.com/npm/ssri/commit/0e78fd7b754e2d098875eb4c57238709d96d7c27))


### Bug Fixes

* harden SRI parsing against ../ funny business ([4062735](https://github.com/npm/ssri/commit/4062735d1281941fd32ac4320b9f9965fcec278b))
* IntegrityStream responds to mutating opts object mid-stream ([4a963e5](https://github.com/npm/ssri/commit/4a963e5982478c6b07f86848cdb72d142c765195))
* throw null when sri is empty or bad ([a6811cb](https://github.com/npm/ssri/commit/a6811cba71e20ea1fdefa6e50c9ea3c67efc2500)), closes [#12](https://github.com/npm/ssri/issues/12)

## [7.1.0](https://github.com/npm/ssri/compare/v7.0.1...v7.1.0) (2019-10-24)


### Bug Fixes

* Do not blow up if the opts object is mutated ([806e8c8](https://github.com/npm/ssri/commit/806e8c8))


### Features

* Add Integrity#merge method ([0572c1d](https://github.com/npm/ssri/commit/0572c1d)), closes [#4](https://github.com/npm/ssri/issues/4)

### [7.0.1](https://github.com/npm/ssri/compare/v7.0.0...v7.0.1) (2019-09-30)

## [7.0.0](https://github.com/npm/ssri/compare/v6.0.1...v7.0.0) (2019-09-18)


### ⚠ BREAKING CHANGES

* ssri no longer accepts a Promise option, and does not
use, return, or rely on Bluebird promises.
* drop support for Node.js v6.

We knew this was coming, and the Stream changes are breaking anyway.
May as well do this now.
* **streams:** this replaces the Node.js stream with a Minipass
stream.  See http://npm.im/minipass for documentation.

### Bug Fixes

* return super.write() return value ([55b055d](https://github.com/npm/ssri/commit/55b055d))


* Use native promises only ([6d13165](https://github.com/npm/ssri/commit/6d13165))
* update tap, standard, standard-version, travis ([2e54956](https://github.com/npm/ssri/commit/2e54956))
* **streams:** replace transform streams with minipass ([363995e](https://github.com/npm/ssri/commit/363995e))

<a name="6.0.1"></a>
## [6.0.1](https://github.com/npm/ssri/compare/v6.0.0...v6.0.1) (2018-08-27)


### Bug Fixes

* **opts:** use figgy-pudding to specify consumed opts ([cf86553](https://github.com/npm/ssri/commit/cf86553))



<a name="6.0.0"></a>
# [6.0.0](https://github.com/npm/ssri/compare/v5.3.0...v6.0.0) (2018-04-09)


### Bug Fixes

* **docs:** minor typo ([b71ef17](https://github.com/npm/ssri/commit/b71ef17))


### meta

* drop support for node@4 ([d9bf359](https://github.com/npm/ssri/commit/d9bf359))


### BREAKING CHANGES

* node@4 is no longer supported



<a name="5.3.0"></a>
# [5.3.0](https://github.com/npm/ssri/compare/v5.2.4...v5.3.0) (2018-03-13)


### Features

* **checkData:** optionally throw when checkData fails ([bf26b84](https://github.com/npm/ssri/commit/bf26b84))



<a name="5.2.4"></a>
## [5.2.4](https://github.com/npm/ssri/compare/v5.2.3...v5.2.4) (2018-02-16)



<a name="5.2.3"></a>
## [5.2.3](https://github.com/npm/ssri/compare/v5.2.2...v5.2.3) (2018-02-16)


### Bug Fixes

* **hashes:** filter hash priority list by available hashes ([2fa30b8](https://github.com/npm/ssri/commit/2fa30b8))
* **integrityStream:** dedupe algorithms to generate ([d56c654](https://github.com/npm/ssri/commit/d56c654))



<a name="5.2.2"></a>
## [5.2.2](https://github.com/npm/ssri/compare/v5.2.1...v5.2.2) (2018-02-14)


### Bug Fixes

* **security:** tweak strict SRI regex ([#10](https://github.com/npm/ssri/issues/10)) ([d0ebcdc](https://github.com/npm/ssri/commit/d0ebcdc))



<a name="5.2.1"></a>
## [5.2.1](https://github.com/npm/ssri/compare/v5.2.0...v5.2.1) (2018-02-06)



<a name="5.2.0"></a>
# [5.2.0](https://github.com/npm/ssri/compare/v5.1.0...v5.2.0) (2018-02-06)


### Features

* **match:** add integrity.match() ([3c49cc4](https://github.com/npm/ssri/commit/3c49cc4))



<a name="5.1.0"></a>
# [5.1.0](https://github.com/npm/ssri/compare/v5.0.0...v5.1.0) (2018-01-18)


### Bug Fixes

* **checkStream:** integrityStream now takes opts.integrity algos into account ([d262910](https://github.com/npm/ssri/commit/d262910))


### Features

* **sha3:** do some guesswork about upcoming sha3 ([7fdd9df](https://github.com/npm/ssri/commit/7fdd9df))



<a name="5.0.0"></a>
# [5.0.0](https://github.com/npm/ssri/compare/v4.1.6...v5.0.0) (2017-10-23)


### Features

* **license:** relicense to ISC (#9) ([c82983a](https://github.com/npm/ssri/commit/c82983a))


### BREAKING CHANGES

* **license:** the license has been changed from CC0-1.0 to ISC.



<a name="4.1.6"></a>
## [4.1.6](https://github.com/npm/ssri/compare/v4.1.5...v4.1.6) (2017-06-07)


### Bug Fixes

* **checkStream:** make sure to pass all opts through ([0b1bcbe](https://github.com/npm/ssri/commit/0b1bcbe))



<a name="4.1.5"></a>
## [4.1.5](https://github.com/npm/ssri/compare/v4.1.4...v4.1.5) (2017-06-05)


### Bug Fixes

* **integrityStream:** stop crashing if opts.algorithms and opts.integrity have an algo mismatch ([fb1293e](https://github.com/npm/ssri/commit/fb1293e))



<a name="4.1.4"></a>
## [4.1.4](https://github.com/npm/ssri/compare/v4.1.3...v4.1.4) (2017-05-31)


### Bug Fixes

* **node:** older versions of node[@4](https://github.com/4) do not support base64buffer string parsing ([513df4e](https://github.com/npm/ssri/commit/513df4e))



<a name="4.1.3"></a>
## [4.1.3](https://github.com/npm/ssri/compare/v4.1.2...v4.1.3) (2017-05-24)


### Bug Fixes

* **check:** handle various bad hash corner cases better ([c2c262b](https://github.com/npm/ssri/commit/c2c262b))



<a name="4.1.2"></a>
## [4.1.2](https://github.com/npm/ssri/compare/v4.1.1...v4.1.2) (2017-04-18)


### Bug Fixes

* **stream:** _flush can be called multiple times. use on("end") ([b1c4805](https://github.com/npm/ssri/commit/b1c4805))



<a name="4.1.1"></a>
## [4.1.1](https://github.com/npm/ssri/compare/v4.1.0...v4.1.1) (2017-04-12)


### Bug Fixes

* **pickAlgorithm:** error if pickAlgorithm() is used in an empty Integrity ([fab470e](https://github.com/npm/ssri/commit/fab470e))



<a name="4.1.0"></a>
# [4.1.0](https://github.com/npm/ssri/compare/v4.0.0...v4.1.0) (2017-04-07)


### Features

* adding ssri.create for a crypto style interface (#2) ([96f52ad](https://github.com/npm/ssri/commit/96f52ad))



<a name="4.0.0"></a>
# [4.0.0](https://github.com/npm/ssri/compare/v3.0.2...v4.0.0) (2017-04-03)


### Bug Fixes

* **integrity:** should have changed the error code before. oops ([8381afa](https://github.com/npm/ssri/commit/8381afa))


### BREAKING CHANGES

* **integrity:** EBADCHECKSUM -> EINTEGRITY for verification errors



<a name="3.0.2"></a>
## [3.0.2](https://github.com/npm/ssri/compare/v3.0.1...v3.0.2) (2017-04-03)



<a name="3.0.1"></a>
## [3.0.1](https://github.com/npm/ssri/compare/v3.0.0...v3.0.1) (2017-04-03)


### Bug Fixes

* **package.json:** really should have these in the keywords because search ([a6ac6d0](https://github.com/npm/ssri/commit/a6ac6d0))



<a name="3.0.0"></a>
# [3.0.0](https://github.com/npm/ssri/compare/v2.0.0...v3.0.0) (2017-04-03)


### Bug Fixes

* **hashes:** IntegrityMetadata -> Hash ([d04aa1f](https://github.com/npm/ssri/commit/d04aa1f))


### Features

* **check:** return IntegrityMetadata on check success ([2301e74](https://github.com/npm/ssri/commit/2301e74))
* **fromHex:** ssri.fromHex to make it easier to generate them from hex valus ([049b89e](https://github.com/npm/ssri/commit/049b89e))
* **hex:** utility function for getting hex version of digest ([a9f021c](https://github.com/npm/ssri/commit/a9f021c))
* **hexDigest:** added hexDigest method to Integrity objects too ([85208ba](https://github.com/npm/ssri/commit/85208ba))
* **integrity:** add .isIntegrity and .isIntegrityMetadata ([1b29e6f](https://github.com/npm/ssri/commit/1b29e6f))
* **integrityStream:** new stream that can both generate and check streamed data ([fd23e1b](https://github.com/npm/ssri/commit/fd23e1b))
* **parse:** allow parsing straight into a single IntegrityMetadata object ([c8ddf48](https://github.com/npm/ssri/commit/c8ddf48))
* **pickAlgorithm:** Intergrity#pickAlgorithm() added ([b97a796](https://github.com/npm/ssri/commit/b97a796))
* **size:** calculate and update stream sizes ([02ed1ad](https://github.com/npm/ssri/commit/02ed1ad))


### BREAKING CHANGES

* **hashes:** `.isIntegrityMetadata` is now `.isHash`. Also, any references to `IntegrityMetadata` now refer to `Hash`.
* **integrityStream:** createCheckerStream has been removed and replaced with a general-purpose integrityStream.

To convert existing createCheckerStream code, move the `sri` argument into `opts.integrity` in integrityStream. All other options should be the same.
* **check:** `checkData`, `checkStream`, and `createCheckerStream` now yield a whole IntegrityMetadata instance representing the first successful hash match.



<a name="2.0.0"></a>
# [2.0.0](https://github.com/npm/ssri/compare/v1.0.0...v2.0.0) (2017-03-24)


### Bug Fixes

* **strict-mode:** make regexes more rigid ([122a32c](https://github.com/npm/ssri/commit/122a32c))


### Features

* **api:** added serialize alias for unparse ([999b421](https://github.com/npm/ssri/commit/999b421))
* **concat:** add Integrity#concat() ([cae12c7](https://github.com/npm/ssri/commit/cae12c7))
* **pickAlgo:** pick the strongest algorithm provided, by default ([58c18f7](https://github.com/npm/ssri/commit/58c18f7))
* **strict-mode:** strict SRI support ([3f0b64c](https://github.com/npm/ssri/commit/3f0b64c))
* **stringify:** replaced unparse/serialize with stringify ([4acad30](https://github.com/npm/ssri/commit/4acad30))
* **verification:** add opts.pickAlgorithm ([f72e658](https://github.com/npm/ssri/commit/f72e658))


### BREAKING CHANGES

* **pickAlgo:** ssri will prioritize specific hashes now
* **stringify:** serialize and unparse have been removed. Use ssri.stringify instead.
* **strict-mode:** functions that accepted an optional `sep` argument now expect `opts.sep`.



<a name="1.0.0"></a>
# 1.0.0 (2017-03-23)


### Features

* **api:** implemented initial api ([4fbb16b](https://github.com/npm/ssri/commit/4fbb16b))


### BREAKING CHANGES

* **api:** Initial API established.
