# Changelog

## 2.3.9

* Fix bug [#469](https://github.com/olivernn/lunr.js/issues/469) where a union with a complete set returned a non-complete set. Thanks [Bertrand Le Roy](https://github.com/bleroy) for reporting and fixing.

## 2.3.8

* Fix bug [#422](https://github.com/olivernn/lunr.js/issues/422) where a pipline function that returned null was not skipping the token as described in the documentation. Thanks [Stephen Cleary](https://github.com/StephenCleary) and [Rob Hoelz](https://github.com/hoelzro) for reporting and investigating.

## 2.3.7

* Fix bug [#417](https://github.com/olivernn/lunr.js/issues/417) where leading white space would cause token position metadata to be reported incorrectly. Thanks [Rob Hoelz](https://github.com/hoelzro) for the fix.

## 2.3.6

* Fix bug [#390](https://github.com/olivernn/lunr.js/issues/390) with fuzzy matching that meant deletions at the end of a word would not match. Thanks [Luca Ongaro](https://github.com/lucaong) for reporting.

## 2.3.5

* Fix bug [#375](https://github.com/olivernn/lunr.js/issues/375) with fuzzy matching that meant insertions at the end of a word would not match. Thanks [Luca Ongaro](https://github.com/lucaong) for reporting and to [Rob Hoelz](https://github.com/hoelzro) for providing a fix.
* Switch to using `Array.isArray` when checking for results from pipeline functions to support `vm.runInContext`, [#381](https://github.com/olivernn/lunr.js/pull/381) thanks [Rob Hoelz](https://github.com/hoelzro).

## 2.3.4

* Ensure that [inverted index is prototype-less](https://github.com/olivernn/lunr.js/pull/378) after serialization, thanks [Rob Hoelz](https://github.com/hoelzro).

## 2.3.3

* Fig bugs [#270](https://github.com/olivernn/lunr.js/issues/270) and [#368](https://github.com/olivernn/lunr.js/issues/368), some wildcard searches over long tokens could be extremely slow, potentially pinning the current thread indefinitely. Thanks [Kyle Spearrin](https://github.com/kspearrin) and [Mohamed Eltuhamy](https://github.com/meltuhamy) for reporting.

## 2.3.2

* Fix bug [#369](https://github.com/olivernn/lunr.js/issues/369) in parsing queries that include either a boost or edit distance modifier followed by a presence modifier on a subsequent term. Thanks [mtdjr](https://github.com/mtdjr) for reporting.

## 2.3.1

* Add workaround for inconsistent browser behaviour [#279](https://github.com/olivernn/lunr.js/issues/279), thanks [Luca Ongaro](https://github.com/lucaong).
* Fix bug in intersect/union of `lunr.Set` [#360](https://github.com/olivernn/lunr.js/issues/360), thanks [Brandon Bethke](https://github.com/brandon-bethke-neudesic) for reporting.

## 2.3.0

* Add support for build time field and document boosts.
* Add support for indexing nested document fields using field extractors.
* Prevent usage of problematic characters in field names, thanks [Stephane Mankowski](https://github.com/miraks31).
* Fix bug when using an array of tokens in a single query term, thanks [Michael Manukyan](https://github.com/mike1808).

## 2.2.1

* Fix bug [#344](https://github.com/olivernn/lunr.js/issues/344) in logic for required terms in multiple fields, thanks [Stephane Mankowski](https://github.com/miraks31).
* Upgrade mocha and fix some test snafus.

## 2.2.0

* Add support for queries with term presence, e.g. required terms and prohibited terms.
* Add support for using the output of `lunr.tokenizer` directly with `lunr.Query#term`.
* Add field name metadata to tokens in build and search pipelines.
* Fix documentation for `lunr.Index` constructor, thanks [Michael Manukyan](https://github.com/mike1808).

## 2.1.6

* Improve pipeline performance for large fields [#329](https://github.com/olivernn/lunr.js/pull/329), thanks [andymcm](https://github.com/andymcm).

## 2.1.5

* Fix bug [#320](https://github.com/olivernn/lunr.js/issues/320) which caused result metadata to be nested under search term instead of field name. Thanks [Jonny Gerig Meyer](https://github.com/jgerigmeyer) for reporting and fixing.

## 2.1.4

* Cache inverse document calculation during build to improve build performance.
* Introduce new method for combining term metadata at search time.
* Improve performance of searches with duplicate search terms.
* Tweaks to build process.

## 2.1.3

* Remove private tag from `lunr.Builder#build`, it should be public, thanks [Sean Tan](https://github.com/seantanly).

## 2.1.2

* Fix bug [#282](https://github.com/olivernn/lunr.js/issues/282) which caused metadata stored in the index to be mutated during search, thanks [Andrew Aldridge](https://github.com/i80and).

## 2.1.1

* Fix bug [#280](https://github.com/olivernn/lunr.js/issues/280) in builder where an object with prototype was being used as a Map, thanks [Pete Bacon Darwin](https://github.com/petebacondarwin).

## 2.1.0

* Improve handling of term boosts across multiple fields [#263](https://github.com/olivernn/lunr.js/issues/263)
* Enable escaping of special characters when performing a search [#271](https://github.com/olivernn/lunr.js/issues/271)
* Add ability to programatically include leading and trailing wildcards when performing a query.

## 2.0.4

* Fix bug in IDF calculation that meant the weight for common words was not correctly calculated.

## 2.0.3

* Fix bug [#256](https://github.com/olivernn/lunr.js/issues/256) where duplicate query terms could cause a 'duplicate index' error when building the query vector. Thanks [Bjorn Svensson](https://github.com/bsvensson), [Jason Feng](https://github.com/IYCI), and [et1421](https://github.com/et1421) for reporting and confirming the issue.

## 2.0.2

* Fix bug [#255](https://github.com/olivernn/lunr.js/issues/255) where search queries used a different separator than the tokeniser causing some terms to not be searchable. Thanks [Wes Cossick](https://github.com/WesCossick) for reporting.
* Reduce precision of term scores stored in document vectors to reduce the size of serialised indexes by ~15%, thanks [Qvatra](https://github.com/Qvatra) for the idea.

## 2.0.1

* Fix regression [#254](https://github.com/olivernn/lunr.js/issues/254) where documents containing terms that match properties from Object.prototype cause errors during indexing. Thanks [VonFry](https://github.com/VonFry) for reporting.

## 2.0.0

* Indexes are now immutable, this allows for more space efficient indexes, more advanced searching and better performance.
* Text processing can now attach metadata to tokens the enter the index, this opens up the possibility of highlighting search terms in results.
* More advanced searching including search time field boosts, search by field, fuzzy matching and leading and trailing wildcards.

## 1.0.0

* Deprecate incorrectly spelled lunr.tokenizer.separator.
* No other changes, but bumping to 1.0.0 because it's overdue, and the interfaces are pretty stable now. It also paves the way for 2.0.0...

## 0.7.2

* Fix bug when loading a serialised tokeniser [#226](https://github.com/olivernn/lunr.js/issues/226), thanks [Alex Turpin](https://github.com/alexturpin) for reporting the issue.
* Learn how to spell separator [#223](https://github.com/olivernn/lunr.js/pull/223), thanks [peterennis](https://github.com/peterennis) for helping me learn to spell.

## 0.7.1

* Correctly set the license using the @license doc tag [#217](https://github.com/olivernn/lunr.js/issues/217), thanks [Carlos Araya](https://github.com/caraya).

## 0.7.0

* Make tokenizer a property of the index, allowing for different indexes to use different tokenizers [#205](https://github.com/olivernn/lunr.js/pull/205) and [#21](https://github.com/olivernn/lunr.js/issues/21).
* Fix bug that prevented very large documents from being indexed [#203](https://github.com/olivernn/lunr.js/pull/203), thanks [Daniel Grießhaber](https://github.com/dangrie158).
* Performance improvements when adding documents to the index [#208](https://github.com/olivernn/lunr.js/pull/208), thanks [Dougal Matthews](https://github.com/d0ugal).

## 0.6.0

* Ensure document ref property type is preserved when returning results [#117](https://github.com/olivernn/lunr.js/issues/117), thanks [Kyle Kirby](https://github.com/kkirby).
* Introduce `lunr.generateStopWordFilter` for generating a stop word filter from a provided list of stop words.
* Replace array-like string access with ES3 compatible `String.prototype.charAt` [#186](https://github.com/olivernn/lunr.js/pull/186), thanks [jkellerer](https://github.com/jkellerer).
* Move empty string filtering from `lunr.trimmer` to `lunr.Pipeline.prototype.run` so that empty tokens do not enter the index, regardless of the trimmer being used [#178](https://github.com/olivernn/lunr.js/issues/178), [#177](https://github.com/olivernn/lunr.js/issues/177) and [#174](https://github.com/olivernn/lunr.js/issues/174)
* Allow tokenization of arrays with null and non string elements [#172](https://github.com/olivernn/lunr.js/issues/172).
* Parameterize the seperator used by `lunr.tokenizer`, fixes [#102](https://github.com/olivernn/lunr.js/issues/102).

## 0.5.12

* Implement `lunr.stopWordFilter` with an object instead of using `lunr.SortedSet` [#170](https://github.com/olivernn/lunr.js/pull/170), resulting in a performance boost for the text processing pipeline, thanks to [Brian Vaughn](https://github.com/bvaughn).
* Ensure that `lunr.trimmer` does not introduce empty tokens into the index, [#166](https://github.com/olivernn/lunr.js/pull/166), thanks to [janeisklar](https://github.com/janeisklar)

## 0.5.11

* Fix [bug](https://github.com/olivernn/lunr.js/issues/162) when using the unminified build of lunr in some project builds, thanks [Alessio Michelini](https://github.com/darkmavis1980)

## 0.5.10

* Fix bug in IDF calculation, thanks to [weixsong](https://github.com/weixsong) for discovering the issue.
* Documentation fixes [#111](https://github.com/olivernn/lunr.js/pull/111) thanks [Chris Van](https://github.com/cvan).
* Remove version from bower.json as it is not needed [#160](https://github.com/olivernn/lunr.js/pull/160), thanks [Kevin Kirsche](https://github.com/kkirsche)
* Fix link to augment.js on the home page [#159](https://github.com/olivernn/lunr.js/issues/159), thanks [Gábor Nádai](https://github.com/mefiblogger)

## 0.5.9

* Remove recursion from SortedSet#indexOf and SortedSet#locationFor to gain small performance gains in Index#search and Index#add
* Fix incorrect handling of non existant functions when adding/removing from a Pipeline [#146](https://github.com/olivernn/lunr.js/issues/146) thanks to [weixsong](https://github.com/weixsong)

## 0.5.8

* Fix typo when referencing Martin Porter's home page http://tartarus.org/~martin/ [#132](https://github.com/olivernn/lunr.js/pull/132) thanks [James Aylett](https://github.com/jaylett)
* Performance improvement for tokenizer [#139](https://github.com/olivernn/lunr.js/pull/139) thanks [Arun Srinivasan](https://github.com/satchmorun)
* Fix vector magnitude caching bug :flushed: [#142](https://github.com/olivernn/lunr.js/pull/142) thanks [Richard Poole](https://github.com/richardpoole)
* Fix vector insertion bug that prevented lesser ordered nodes to be inserted into a vector [#143](https://github.com/olivernn/lunr.js/pull/143) thanks [Richard Poole](https://github.com/richardpoole)
* Fix inefficient use of arguments in SortedSet add method, thanks to [Max Nordlund](https://github.com/maxnordlund).
* Fix deprecated use of path.exists in test server [#141](https://github.com/olivernn/lunr.js/pull/141) thanks [wei song](https://github.com/weixsong)

## 0.5.7

* Performance improvement for stemmer [#124](https://github.com/olivernn/lunr.js/pull/124) thanks [Tony Jacobs](https://github.com/tony-jacobs)

## 0.5.6

* Performance improvement when add documents to the index [#114](https://github.com/olivernn/lunr.js/pull/114) thanks [Alex Holmes](https://github.com/alex2)

## 0.5.5

* Fix bug in tokenizer introduced in 0.5.4 [#101](https://github.com/olivernn/lunr.js/pull/101) thanks [Nolan Lawson](https://github.com/nolanlawson)

## 0.5.4

* Tokenizer also splits on hyphens [#98](https://github.com/olivernn/lunr.js/pull/98/files) thanks [Nolan Lawson](https://github.com/nolanlawson)

## 0.5.3

* Correctly stem words ending with the letter 'y' [#84](https://github.com/olivernn/lunr.js/pull/84) thanks [Mihai Valentin](https://github.com/MihaiValentin)
* Improve build tools and dev dependency installation [#78](https://github.com/olivernn/lunr.js/pull/78) thanks [Ben Pickles](https://github.com/benpickles)

## 0.5.2

* Use npm they said, it'll be easy they said.

## 0.5.1

* Because [npm issues](https://github.com/olivernn/lunr.js/issues/77) :(

## 0.5.0

* Add plugin support to enable i18n and other extensions to lunr.
* Add AMD support [#72](https://github.com/olivernn/lunr.js/issues/72) thanks [lnwdr](https://github.com/lnwdr).
* lunr.Vector now implemented using linked lists for better performance especially in indexes with large numbers of unique tokens.
* Build system clean up.

## 0.4.5

* Fix performance regression introduced in 0.4.4 by fixing #64.

## 0.4.4

* Fix bug [#64](https://github.com/olivernn/lunr.js/issues/64) idf cache should handle tokens with the same name as object properties, thanks [gitgrimbo](https://github.com/gitgrimbo).
* Intersperse source files with a semicolon as part of the build process, fixes [#61](https://github.com/olivernn/lunr.js/issues/61), thanks [shyndman](https://github.com/shyndman).

## 0.4.3

* Fix bug [#49](https://github.com/olivernn/lunr.js/issues/49) tokenizer should handle null and undefined as arguments, thanks [jona](https://github.com/jona).

## 0.4.2

* Fix bug [#47](https://github.com/olivernn/lunr.js/issues/47) tokenizer converts its input to a string before trying to split it into tokens, thanks [mikhailkozlov](https://github.com/mikhailkozlov).

## 0.4.1

* Fix bug [#41](https://github.com/olivernn/lunr.js/issues/41) that caused issues when indexing mixed case tags, thanks [Aptary](https://github.com/Aptary)

## 0.4.0

* Add index mutation events ('add', 'update' and 'remove').
* Performance improvements to searching.
* Penalise non-exact matches so exact matches are better ranked than expanded matches.

## 0.3.3

* Fix bug [#32](https://github.com/olivernn/lunr.js/pull/32) which prevented lunr being used where a `console` object is not present, thanks [Tony Marklove](https://github.com/jjbananas) and [wyuenho](https://github.com/wyuenho)

## 0.3.2

* Fix bug [#27](https://github.com/olivernn/lunr.js/pull/27) when trying to calculate tf with empty fields, thanks [Gambhiro](https://github.com/gambhiro)

## 0.3.1

* Fix bug [#24](https://github.com/olivernn/lunr.js/pull/24) that caused an error when trying to remove a non-existant document from the index, thanks [Jesús Leganés Combarro](https://github.com/piranna)

## 0.3.0

* Implement [JSON serialisation](https://github.com/olivernn/lunr.js/pull/14), allows indexes to be loaded and dumped, thanks [ssured](https://github.com/ssured).
* Performance improvements to searching and indexing.
* Fix bug [#15](https://github.com/olivernn/lunr.js/pull/15) with tokeniser that added stray empty white space to the index, thanks [ssured](https://github.com/ssured).

## 0.2.3

* Fix issue with searching for a term not in the index [#12](https://github.com/olivernn/lunr.js/issues/12), thanks [mcnerthney](https://github.com/mcnerthney) and [makoto](https://github.com/makoto)

## 0.2.2

* Boost exact term matches so they are better ranked than expanded term matches, fixes [#10](https://github.com/olivernn/lunr.js/issues/10), thanks [ssured](https://github.com/ssured)

## 0.2.1

* Changes to the build process.
* Add component.json and package.json
* Add phantomjs test runner
* Remove redundant attributes
* Many [spelling corrections](https://github.com/olivernn/lunr.js/pull/8), thanks [Pascal Borreli](https://github.com/pborreli)
