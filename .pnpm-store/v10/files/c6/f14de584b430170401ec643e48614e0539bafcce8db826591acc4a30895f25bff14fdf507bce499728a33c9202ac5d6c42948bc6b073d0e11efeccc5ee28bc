### `0.5.48` _2025-03-23_
* Updated data to IANA TZDB `2025b`.

### `0.5.47` _2025-01-28_
* Updated data to IANA TZDB `2025a`.

### `0.5.46` _2024-10-06_
* Updated data to IANA TZDB `2024b`. This only affects historical timestamps; no future timestamps have changed.

### `0.5.45` _2024-02-04_
* Updated data to IANA TZDB `2024a`.

### `0.5.44` _2023-12-29_
* Updated data to IANA TZDB `2023d`.
* Fixed `.valueOf()` to return `NaN` for invalid zoned objects (matching default `moment`) [#1082](https://github.com/moment/moment-timezone/pull/1082).
* Performance improvements:
  * Use binary search when looking up zone information [#720](https://github.com/moment/moment-timezone/pull/720).
  * Avoid redundant checks in `tz.guess()`.
  * Avoid redundant `getZone()` calls in `.tz()`.

### `0.5.43` _2023-03-31_
* Updated data to IANA TZDB `2023c`

### `0.5.42` _2023-03-24_
* Updated data to IANA TZDB `2023b`

### `0.5.41` _2023-02-25_
* Updated `moment` npm dependency to `2.29.4` to remove automated warnings about insecure dependencies.
  Moment Timezone still works with core Moment `2.9.0` and higher.
* Updated all dev dependencies including UglifyJS, which produces the minified builds.
* Added deprecation warning to the pre-built `moment-timezone-with-data-2012-2022` bundles [#1035](https://github.com/moment/moment-timezone/issues/1035).
  Use the rolling `moment-timezone-with-data-10-year-range` files instead.

### `0.5.40` _2022-12-11_
* Updated data to IANA TZDB `2022g`

### `0.5.39` _2022-11-13_
* Updated data to IANA TZDB `2022f`

### `0.5.38` _2022-10-15_
* Updated data to IANA TZDB `2022e`
* Added `moment.tz.dataVersion` property to TypeScript definitions [#930](https://github.com/moment/moment-timezone/issues/930)
* Removed temporary `.tar.gz` files from npm releases [#1000](https://github.com/moment/moment-timezone/pull/1000)

### `0.5.37` _2022-08-25_
* Re-publish npm package, because of extra folder present in 0.5.36, check
  https://github.com/moment/moment-timezone/issues/999

### `0.5.36` _2022-08-25_
* IANA TZDB 2022c
* improvements/fixes to data pipeline

### `0.5.35` _2022-08-23_
* Fix command injection in data pipeline https://github.com/moment/moment-timezone/security/advisories/GHSA-56x4-j7p9-fcf9
* Fix cleartext transmission of sensitive information https://github.com/moment/moment-timezone/security/advisories/GHSA-v78c-4p63-2j6c

Thanks to the OpenSSF Alpha-Omega project for reporting these!

### `0.5.34` _2021-11-10_
* Updated data to IANA TZDB `2021e`

### `0.5.33` _2021-02-06_
* Updated data to IANA TZDB `2021a`

### `0.5.32` _2020-11-14_
* Updated data to IANA TZDB `2020d`

### `0.5.31` _2020-05-16_
* Fixed Travis builds for Node.js 4 and 6

### `0.5.30` _2020-05-16_
* Updated data to IANA TZDB `2020a`
* Fixed typescript definitions

NOTE: You might need to un-install @types/moment-timezone. Check
https://github.com/moment/moment-timezone/issues/858 for more info

### `0.5.29` _2020-05-16_
* Merged fix of es6 module loading issue https://github.com/moment/moment-timezone/commit/1fd42349189b24e15c60f162dc8c40b42db79dfe
* Merged PR with typescript declarations https://github.com/moment/moment-timezone/commit/ed529ea6fbcc70315c0c3f6d7c7cb70eadf56b03
* Merged fixes to changelog https://github.com/moment/moment-timezone/commit/adb7d7b43c7328d814311ac1355bfeef88eab6e8

### `0.5.28` _2020-02-21_
Merged pull request #410 from @adgrace:
* Added a method `moment.tz.zonesForCountry(country_code)` which returns all timezones for the country
* Added a method `moment.tz(timezone_id).countries()` to get countries for some time zone
* Added a method `moment.tz.countries()` to get all country codes
* And as you know `moment.tz.zones()` already exists

### `0.5.27` _2019-10-14_
* Updated data to IANA TZDB `2019c`

### `0.5.26` _2019-06-06_
* Updated data to IANA TZDB `2019b`
* Fix: stabilize Array.sort [#762](https://github.com/moment/moment-timezone/pull/762)

### `0.5.25` _2019-04-17_
* Fix `moment.tz.dataVersion` to return `2019a` [#742](https://github.com/moment/moment-timezone/issues/742)
* Update path in bower.json

### `0.5.24` _2019-04-17_
* Updated data to IANA TZDB `2019a` [#737](https://github.com/moment/moment-timezone/issues/737)
* Start shipping both a 1970-1930 file and a rolling 10-year file [#614](https://github.com/moment/moment-timezone/issues/614) [#697](https://github.com/moment/moment-timezone/issues/697)
* Fixed bug where `_z` time zone name was not cleared with `.local()` or `.utcOffset(offset)` [#738](https://github.com/moment/moment-timezone/issues/738)

### `0.5.23` _2018-10-28_
* Fix minor issue with tz guessing in Russia [#691](https://github.com/moment/moment-timezone/pull/691)

### `0.5.22` _2018-10-28_
* Updated data to IANA TZDB `2018g` [#689](https://github.com/moment/moment-timezone/pull/689)
* Fix issue with missing LMT entries for some zones, and fix data builds on Linux and Windows [#308](https://github.com/moment/moment-timezone/issues/308)

### `0.5.21` _2018-06-23_
* Bugfix: revert breaking change introduced in 0.5.18

### `0.5.20` _2018-06-18_
* Bugfix: accidentally commented code

### `0.5.19` _2018-06-18_
* Revert: moved moment to peerDependencies

### `0.5.18` _2018-06-18_
* Return error when timezone name is not a string.
* Moved moment to peerDependencies [#628](https://github.com/moment/moment-timezone/pull/628)
* Prefer nodejs to amd declaration [#573](https://github.com/moment/moment-timezone/pull/573)

### `0.5.17` _2018-05-12_
* Updated data to IANA TZDB `2018d`. [#616](https://github.com/moment/moment-timezone/pull/616)

### `0.5.16` _2018-04-18_
* Fixed Etc/UTC timezone recognition, updated tests. [#599](https://github.com/moment/moment-timezone/pull/599)
* Updated minified files to contain IANA TZDB `2018d` data

### `0.5.15` _2018-04-17_
* Updated data to IANA TZDB `2018d`. [#596](https://github.com/moment/moment-timezone/pull/596)

### `0.5.14` _2017-10-30_
* Ensure Intl response is valid when guessing time zone. [#553](https://github.com/moment/moment-timezone/pull/553)
* Updated data to IANA TZDB `2017c`. [#552](https://github.com/moment/moment-timezone/pull/552)
* Convert to tz keeping wall time [#505](https://github.com/moment/moment-timezone/pull/505)
* Make all time zones available for guessing. [#483](https://github.com/moment/moment-timezone/pull/483)
* zone.offset has been deprecated in favor of zone.utcOffset [#398](https://github.com/moment/moment-timezone/pull/398)
* Check for timestamp formats when parsing [#348](https://github.com/moment/moment-timezone/pull/348)

### `0.5.13` _2017-04-04_
* Bumped version to address Bower cache issues with last release.  [#474](https://github.com/moment/moment-timezone/issues/474)
* (No actual changes otherwise)

### `0.5.12` _2017-04-02_
* Updated data to IANA TZDB `2017b`. [#422](https://github.com/moment/moment-timezone/pull/460)
* Build the truncated data file as 2012-2022 (+/- 5 years).

### `0.5.11` _2016-12-23_
* Remove log statement when data is loaded twice. [#352](https://github.com/moment/moment-timezone/pull/352)

### `0.5.10` _2016-11-27_
* Updated data to IANA TZDB `2016j`. [#422](https://github.com/moment/moment-timezone/pull/422)

### `0.5.9` _2016-11-03_
* Fixed the output of `moment.tz.version`. [#413](https://github.com/moment/moment-timezone/issues/413)

### `0.5.8` _2016-11-03_
* Updated data to IANA TZDB `2016i`. [#411](https://github.com/moment/moment-timezone/pull/411)

### `0.5.7` _2016-10-21_
* Updated data to IANA TZDB `2016h`. [#403](https://github.com/moment/moment-timezone/pull/403)

### `0.5.6` _2016-10-08_
* Updated data to IANA TZDB `2016g`. [#394](https://github.com/moment/moment-timezone/pull/394)

### `0.5.5` _2016-07-24_
* Updated data to IANA TZDB `2016f`. [#360](https://github.com/moment/moment-timezone/pull/360)

### `0.5.4` _2016-05-03_
* Updated data to IANA TZDB `2016d`. [#336](https://github.com/moment/moment-timezone/pull/336)
* Ignore the results from `Intl.DateTimeFormat().resolvedOptions().timeZone` if it is undefined. [#322](https://github.com/moment/moment-timezone/pull/322)

### `0.5.3` _2016-03-24_
* Updated data to IANA TZDB `2016c`. [#321](https://github.com/moment/moment-timezone/pull/321)

### `0.5.2` _2016-03-15_
* Updated data to IANA TZDB `2016b`. [#315](https://github.com/moment/moment-timezone/pull/315)

### `0.5.1` _2016-03-01_
* Updated data to IANA TZDB `2016a`. [#299](https://github.com/moment/moment-timezone/pull/299)
* Fixed bug when `Date#toTimeString` did not return a known format. [#302](https://github.com/moment/moment-timezone/pull/302)  [#303](https://github.com/moment/moment-timezone/pull/303)
* Added lookup on `Intl.DateTimeFormat().resolvedOptions().timeZone` to `moment.tz.guess()`. [#304](https://github.com/moment/moment-timezone/pull/304) [#291](https://github.com/moment/moment-timezone/pull/291)

### `0.5.0` _2015-12-28_
* Added support for guessing the user's timezone via `moment.tz.guess()`. [#285](https://github.com/moment/moment-timezone/pull/285)
* Fixed UMD export issue when there was an html element with `id=exports`. [#275](https://github.com/moment/moment-timezone/pull/275)
* Removed jspm specific dependencies from `package.json`. [#284](https://github.com/moment/moment-timezone/pull/284)

### `0.4.1` _2015-10-07_
* Updated data to IANA TZDB `2015e`. [#253](https://github.com/moment/moment-timezone/pull/253)
* Updated data to IANA TZDB `2015f`. [#253](https://github.com/moment/moment-timezone/pull/253)
* Updated data to IANA TZDB `2015g`. [#255](https://github.com/moment/moment-timezone/pull/255)
* Added jspm dependencies for moment. [#234](https://github.com/moment/moment-timezone/pull/234)
* Included builds directory in npm. [#237](https://github.com/moment/moment-timezone/pull/237)
* Removed version field from bower.json. [#230](https://github.com/moment/moment-timezone/pull/230)

### `0.4.0` _2015-05-30_
* Updated data to IANA TZDB `2015b`. [#201](https://github.com/moment/moment-timezone/pull/201)
* Updated data to IANA TZDB `2015c`. [#214](https://github.com/moment/moment-timezone/pull/214)
* Updated data to IANA TZDB `2015d`. [#214](https://github.com/moment/moment-timezone/pull/214)
* Updated zone getter to allow lazy unpacking to improve initial page load times. [#216](https://github.com/moment/moment-timezone/pull/216)
* Added a `package.json` `jspm:main` entry point. [#194](https://github.com/moment/moment-timezone/pull/194)
* Added `composer.json`. [#222](https://github.com/moment/moment-timezone/pull/222)
* Added an error message when trying to load moment-timezone twice. [#212](https://github.com/moment/moment-timezone/pull/212)

### `0.3.1` _2015-03-16_
* Updated data to IANA TZDB `2015a`. [#183](https://github.com/moment/moment-timezone/pull/183)

### `0.3.0` _2015-01-13_

* *Breaking:* Added country data to the `meta/*.json` files. Restructured the data to support multiple countries per zone. [#162](https://github.com/moment/moment-timezone/pull/162)
* Added the ability to set a default timezone for all new moments. [#152](https://github.com/moment/moment-timezone/pull/152)
* Fixed a bug when passing a moment with an offset to `moment.tz`. [#169](https://github.com/moment/moment-timezone/pull/169)
* Fixed a deprecation in moment core, changing `moment#zone` to `moment#utcOffset`. [#168](https://github.com/moment/moment-timezone/pull/168)

### `0.2.5` _2014-11-12_
* Updated data to IANA TZDB `2014j`. [#151](https://github.com/moment/moment-timezone/pull/151)

### `0.2.4` _2014-10-20_
* Updated data to IANA TZDB `2014i`. [#142](https://github.com/moment/moment-timezone/pull/142)

### `0.2.3` _2014-10-20_
* Updated data to IANA TZDB `2014h`. [#141](https://github.com/moment/moment-timezone/pull/141)

### `0.2.2` _2014-09-04_
* Updated data to IANA TZDB `2014g`. [#126](https://github.com/moment/moment-timezone/pull/126)
* Added a warning when using `moment-timezone` with `moment<2.6.0`.

### `0.2.1` _2014-08-02_
* Fixed support for `moment@2.8.1+`.

### `0.2.0` _2014-07-21_
* Added the ability to configure whether ambiguous or invalid input is rolled forward or backward. [#101](https://github.com/moment/moment-timezone/pull/101)
* Added `moment>=2.6.0` as a dependency in `bower.json`. [#107](https://github.com/moment/moment-timezone/issues/107)
* Fixed getting the name of a zone that was added as a linked zone. [#104](https://github.com/moment/moment-timezone/pull/104)
* Added an error message when a zone was not loaded. [#106](https://github.com/moment/moment-timezone/issues/106)

### `0.1.0` _2014-06-23_
* *Breaking:* Changed data format from Zones+Rules to just Zones. [#82](https://github.com/moment/moment-timezone/pull/82)
* *Breaking:* Removed `moment.tz.{addRule,addZone,zoneExists,zones}` as they are no longer relevant with the new data format.
* Made library 20x faster. [JSPerf results](http://jsperf.com/moment-timezone-0-1-0/2)
* Completely rewrote internals to support new data format.
* Updated the data collection process to get data directly from http://www.iana.org/time-zones.
* Updated data to IANA TZDB `2014e`.
* Updated `bower.json` to use a browser specific `main:` entry point.
* Added built files with included data.
* Added support for accurately parsing input around DST changes. [#93](https://github.com/moment/moment-timezone/pull/93)
* Added comprehensive documentation at [momentjs.com/timezone/docs/](http://momentjs.com/timezone/docs/).
* Added `moment.tz.link` for linking two identical zones.
* Added `moment.tz.zone` for getting a loaded zone.
* Added `moment.tz.load` for loading a bundled version of data from the IANA TZDB.
* Added `moment.tz.names` for getting the names of all the loaded timezones.
* Added `moment.tz.unpack` and `moment.tz.unpackBase60` for unpacking data.
* Added `moment-timezone-utils.js` for working with the packed and unpacked data.
* Fixed major memory leak. [#79](https://github.com/moment/moment-timezone/issues/79)
* Fixed global export to allow use in web workers. [#78](https://github.com/moment/moment-timezone/pull/78)
* Fixed global export in browser environments that define `window.module`. [#76](https://github.com/moment/moment-timezone/pull/76)

### `0.0.6` _2014-04-20_
* Fixed issue with preventing loading moment-timezone more than once. [#75](https://github.com/moment/moment-timezone/pull/75)

### `0.0.5` _2014-04-17_
* Improved performance with memoization. [#39](https://github.com/moment/moment-timezone/issues/39)
* Published only necessary files to npm. [#46](https://github.com/moment/moment-timezone/issues/46)
* Added better handling of timezones around DST. [#53](https://github.com/moment/moment-timezone/issues/53) [#61](https://github.com/moment/moment-timezone/issues/61) [#70](https://github.com/moment/moment-timezone/issues/70)
* Added Browserify support. [#41](https://github.com/moment/moment-timezone/issues/41)
* Added `moment.tz.zoneExists` [#73](https://github.com/moment/moment-timezone/issues/73)
* Fixed cloning moments with a timezone. [#71](https://github.com/moment/moment-timezone/issues/71)
* Prevent loading moment-timezone more than once. [#74](https://github.com/moment/moment-timezone/issues/74)

### `0.0.3` _2013-10-10_
* Added Bower support.
* Added support for newer versions of moment.
* Added support for constructing a moment with a string and zone.
* Added more links and timezone names in moment-timezone.json

### `0.0.1` _2013-07-17_
* Initial version.
