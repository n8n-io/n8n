Starting with 1.0.0-rc.4, release notes are exclusively tracked in
[Github Releases](https://github.com/cheeriojs/cheerio/releases).

# 1.0.0-rc.3 / 2019-04-06

This release corrects a test expectation that was fixed by one of the project's
dependencies.

# 1.0.0-rc.2 / 2017-07-02

This release changes Cheerio's default parser to [the Parse5 HTML
parser](https://github.com/inikulin/parse5). Parse5 is an excellent project
that rigorously conforms to the HTML standard. It does not support XML, so
Cheerio continues to use [`htmlparser2`](https://github.com/fb55/htmlparser2/)
when working with XML documents.

This switch addresses many long-standing bugs in Cheerio, but some users may
experience slower behavior in performance-critical applications. In addition,
`htmlparser2` is more forgiving of invalid markup which can be useful when
input sourced from a third party and cannot be corrected. For these reasons,
the `load` method also accepts a DOM structure as produced by the `htmlparser2`
library. See the project's "readme" file for more details on this usage
pattern.

### Migrating from version 0.x

`cheerio.load( html[, options ] )` This method continues to act as a "factory"
function. It produces functions that define an API that is similar to the
global `jQuery` function provided by the jQuery library. The generated function
operates on a DOM structure based on the provided HTML.

In releases prior to version 1.0, the provided HTML was interpreted as a
document fragment. Following version 1.0, strings provided to the `load` method
are interpreted as documents. The same example will produce a `$` function that
operates on a full HTML document, including an `<html>` document element with
nested `<head>` and `<body>` tags. This mimics web browser behavior much more
closely, but may require alterations to existing code.

For example, the following code will produce different results between 0.x and
1.0 releases:

    var $ = cheerio.load('<p>Hello, <b>world</b>!</p>');

    $.root().html();

    //=> In version 0.x: '<p>Hello, <b>world</b>!</p>'
    //=> In version 1.0: '<html><head></head><body><p>Hello, <b>world</b>!</p></body></html>'

Users wishing to parse, manipulate, and render full documents should not need
to modify their code. Likewise, code that does not interact with the "root"
element should not be effected by this change. (In the above example, the
expression `$('p')` returns the same result across Cheerio versions--a Cheerio
collection whose only member is a paragraph element.)

However, users wishing to render document fragments should now explicitly
create a "wrapper" element to contain their input.

    // First, create a Cheerio function "bound" to an empty document (this is
    // similar to loading an empty page in a web browser)
    var $ = cheerio.load('');
    // Next, create a "wrapper" element for the input fragment:
    var $wrapper = $('<div/>');
    // Finally, supply the input markup as the content for the wrapper:
    $wrapper.append('<p>Hello, <b>world</b>!</p>');

    $wrapper.html();
    //=> '<p>Hello, <b>world</b>!</p>'

---

Change log:

- Update History.md (and include migration guide) (Mike Pennisi)
- Rename `useHtmlParser2` option (Mike Pennisi)
- Remove documentation for `xmlMode` option (Mike Pennisi)
- Document advanced usage with htmlparser2 (Mike Pennisi)
- Correct errors in Readme.md (Mike Pennisi)
- Improve release process (Mike Pennisi)
- 1.0.0-rc.1 (Mike Pennisi)
- Update unit test (Mike Pennisi)
- Normalize code style (Mike Pennisi)
- Added support for nested wrapping. (Diane Looney)
- Add nested wrapping test (Toni Helenius)
- Added $.merge following the specification at https://api.jquery.com/jquery.merge/ Added test cases for $.merge (Diane Looney)
- Clarify project scope in README file (Mike Pennisi)
- .text() ignores script and style tags (#1018) (Haleem Assal)
- Test suite housekeeping (#1016) (DianeLooney)
- experiment with a job board (Matthew)
- Change options format (inikulin)
- Add test for #997 (inikulin)
- Update .filter function docs. (Konstantin)
- Standardise readme on ES6 variable declarations (Dekatron)
- Use documents via \$.load (inikulin)
- Use parse5 as a default parser (closes #863) (inikulin)
- Fix small typo in Readme (Darren Scerri)
- Report test failures in CI (Mike Pennisi)
- serializeArray should not ignore input elements without value attributes (Ricardo Gladwell)
- Disallow variable shadowing (Mike Pennisi)
- Update hasClass method (sufisaid)
- Added MIT License fixes #902 (Prasanth Vaaheeswaran)
- chore(package): update dependencies (greenkeeper[bot])
- Use modular lodash package (#913) (Billy Janitsch)

# 0.22.0 / 2016-08-23

- Return undefined in .prop if given an invalid element or tag (#880)
- Merge pull request #884 from cheeriojs/readme-cleanup
- readme updates
- Merge pull request #881 from piamancini/patch-1
- Added backers and sponsors from OpenCollective
- Use jQuery from the jquery module in benchmarks (#871)
- Document, test, and extend static `$.text` method (#855)
- Fix typo on calling \_.extend (#861)
- Update versions (#870)
- Use individual lodash functions (#864)
- Added `.serialize()` support. Fixes #69 (#827)
- Update Readme.md (#857)
- add extension for JSON require call
- remove gittask badge
- Merge pull request #672 from underdogio/dev/checkbox.radio.values.sqwished
- Added default value for checkboxes/radios

# 0.20.0 / 2016-02-01

- Add coveralls badge, remove link to old report (Felix Böhm)
- Update lodash dependeny to 4.1.0 (leif.hanack)
- Fix PR #726 adding 'appendTo()' and 'prependTo()' (Delgan)
- Added appendTo and prependTo with tests #641 (digihaven)
- Fix #780 by changing options context in '.find()' (Felix Böhm)
- Add an unit test checking the query of child (Delgan)
- fix #667: attr({foo: null}) removes attribute foo, like attr('foo', null) (Ray Waldin)
- Include reference to dedicated "Loading" section (Mike Pennisi)
- Added load method to \$ (alanev)
- update css-select to 1.2.0 (Felix Böhm)
- Fixing Grammatical Error (Dan Corman)
- Test against node v0.12 --> v4.2 (Jason Kurian)
- Correct output in example (Felix Böhm)
- Fix npm files filter (Bogdan Chadkin)
- Enable setting data on all elements in selection (Mike Pennisi)
- Reinstate `$.fn.toArray` (Mike Pennisi)
- update css-select to 1.1.0 (Thomas Shafer)
- Complete implementation of `wrap` (Mike Pennisi)
- Correct name of unit test (Mike Pennisi)
- Correct grammar in test titles (Mike Pennisi)
- Normalize whitespace (Mike Pennisi)
- Insert omitted assertion (Mike Pennisi)
- Update invocation of `children` (Mike Pennisi)
- Begin implementation of `wrap` method (Dandlezzz)
- Update Readme.md (Sven Slootweg)
- fix document's mistake in Readme.md (exoticknight)
- Add tests for setting text and html as non-strings (Ryc O'Chet)
- Fix for passing non-string values to .html or .text (Ryc O'Chet)
- use a selector to filter form elements (fb55)
- fix README.md typo (Yutian Li)
- README: fix spelling (Chris Rebert)
- Added support for options without a `value` attribute. Fixes #633 (Todd Wolfson)
- responding to pull request feedback - remove item() method and related tests (Ray Waldin)
- add length property and item method to object returned by prop('style'), plus tests (Ray Waldin)
- Added .prop method to readme (Artem Burtsev)
- Added .prop method (Artem Burtsev)
- Added Gitter badge (The Gitter Badger)

# 0.19.0 / 2015-03-21

- fixed allignment (fb55)
- added test case for malformed json in data attributes (fb55)
- fix: handle some extreme cases like `data-custom="{{templatevar}}"`. There is possibility error while parsing json . (Harish.K)
- Add missing optional selector doc for {prev,next}{All,Until} (Jérémie Astori)
- update to dom-serializer@0.1.0 (Felix Böhm)
- Document `Cheerio#serialzeArray` (Mike Pennisi)
- Fixed up `serializeArray()` and added multiple support (Todd Wolfson)
- Implement serializeArray() (Jarno Leppänen)
- recognize options in \$.xml() (fb55)
- lib/static.js: text(): rm errant space before ++ (Chris Rebert)
- Do not expose internal `children` array (Mike Pennisi)
- Change lodash dependencies to ^3.1.0 (Samy Pessé)
- Update lodash@3.1.0 (Samy Pessé)
- Updates Readme.md: .not(function (index, elem)) (Patrick Ward)
- update to css-select@1.0.0 (fb55)
- Allow failures in Node.js v0.11 (Mike Pennisi)
- Added: Gittask badge (Matthew Mueller)
- Isolate prototypes of functions created via `load` (Mike Pennisi)
- Updates Readme.md: adds JS syntax highlighting (frankcash)
- #608 -- Add support for insertBefore/insertAfter syntax. Supports target types of: $, [$], selector (both single and multiple results) (Ben Cochran)
- Clone input nodes when inserting over a set (Mike Pennisi)
- Move unit test files (Mike Pennisi)
- remove unnecessarily tricky code (David Chambers)
- pass options to \$.html in toString (fb55)
- add license info to package.json (Chris Rebert)
- xyz@~0.5.0 (David Chambers)
- Remove unofficial signature of `children` (Mike Pennisi)
- Fix bug in `css` method (Mike Pennisi)
- Correct bug in implementation of `Cheerio#val` (Mike Pennisi)

# 0.18.0 / 2014-11-06

- bump htmlparser2 dependency to ~3.8.1 (Chris Rebert)
- Correct unit test titles (Mike Pennisi)
- Correct behavior of `after` and `before` (Mike Pennisi)
- implement jQuery's .has() (Chris Rebert)
- Update repository url (haqii)
- attr() should return undefined or name for booleans (Raoul Millais)
- Update Readme.md (Ryan Breen)
- Implement `Cheerio#not` (Mike Pennisi)
- Clone nodes according to original parsing options (Mike Pennisi)
- fix lint error (David Chambers)
- Add explicit tests for DOM level 1 API (Mike Pennisi)
- Expose DOM level 1 API for Node-like objects (Mike Pennisi)
- Correct error in documentation (Mike Pennisi)
- Return a fully-qualified Function from `$.load` (Mike Pennisi)
- Update tests to avoid duck typing (Mike Pennisi)
- Alter "loaded" functions to produce true instances (Mike Pennisi)
- Organize tests for `cheerio.load` (Mike Pennisi)
- Complete `$.prototype.find` (Mike Pennisi)
- Use JSHint's `extends` option (Mike Pennisi)
- Remove aliases for exported methods (Mike Pennisi)
- Disallow unused variables (Mike Pennisi)
- Remove unused internal variables (Mike Pennisi)
- Remove unused variables from unit tests (Mike Pennisi)
- Remove unused API method references (Mike Pennisi)
- Move tests for `contains` method (Mike Pennisi)
- xyz@0.4.0 (David Chambers)
- Created a wiki for companies using cheerio in production (Matthew Mueller)
- Implement `$.prototype.index` (Mike Pennisi)
- Implement `$.prototype.addBack` (Mike Pennisi)
- Added double quotes to radio attribute name to account for characters such as brackets (akant10)
- Update History.md (Gabriel Falkenberg)
- add 0.17.0 changelog (David Chambers)
- exit prepublish script if tag not found (David Chambers)
- alphabetize devDependencies (fb55)
- ignore coverage dir (fb55)
- submit coverage to coveralls (fb55)
- replace jscoverage with istanbul (fb55)

# 0.17.0 / 2014-06-10

- Fix bug in internal `uniqueSplice` function (Mike Pennisi)
- accept buffer argument to cheerio.load (David Chambers)
- Respect options on the element level (Alex Indigo)
- Change state definition to more readable (Artem Burtsev)
- added test (0xBADC0FFEE)
- add class only if doesn't exist (Artem Burtsev)
- Made it less insane. (Alex Indigo)
- Implement `Cheerio#add` (Mike Pennisi)
- Use "loaded" instance of Cheerio in unit tests (Mike Pennisi)
- Be more strict with object check. (Alex Indigo)
- Added options argument to .html() static method. (Alex Indigo)
- Fixed encoding mishaps. Adjusted tests. (Alex Indigo)
- use dom-serializer module (fb55)
- don't test on 0.8, don't ignore 0.11 (Felix Böhm)
- parse: rm unused variables (coderaiser)
- cheerio: rm unused variable (coderaiser)
- Fixed test (Avi Kohn)
- Added test (Avi Kohn)
- Changed == to === (Avi Kohn)
- Fixed a bug in removing type="hidden" attr (Avi Kohn)
- sorted (Alexey Raspopov)
- add `muted` attr to booleanAttributes (Alexey Raspopov)
- fixed context of `this` in .html (Felix Böhm)
- append new elements for each element in selection (fb55)

# 0.16.0 / 2014-05-08

- fix `make bench` (David Chambers)
- makefile: add release-\* targets (David Chambers)
- alphabetize dependencies (David Chambers)
- Rewrite `data` internals with caching behavior (Mike Pennisi)
- Fence .val example as js (Kevin Sawicki)
- Fixed typos. Deleted trailing whitespace from test/render.js (Nattaphoom Ch)
- Fix manipulation APIs with removed elements (kpdecker)
- Perform manual string parsing for hasClass (kpdecker)
- Fix existing element removal (kpdecker)
- update render tests (Felix Böhm)
- fixed cheerio path (Felix Böhm)
- use `entities.escape` for attribute values (Felix Böhm)
- bump entities version (Felix Böhm)
- remove lowerCaseTags option from readme (Felix Böhm)
- added test case for .html in xmlMode (fb55)
- render xml in `html()` when `xmlMode: true` (fb55)
- use a map for booleanAttributes (fb55)
- update singleTags, use utils.isTag (fb55)
- update travis badge URL (Felix Böhm)
- use typeof instead of _.isString and _.isNumber (fb55)
- use Array.isArray instead of \_.isArray (fb55)
- replace \_.isFunction with typeof (fb55)
- removed unnecessary error message (fb55)
- decode entities in htmlparser2 (fb55)
- pass options object to CSSselect (fb55)

# 0.15.0 / 2014-04-08

- Update callbacks to pass element per docs (@kpdecker)
- preserve options (@fb55)
- Use SVG travis badge (@t3chnoboy)
- only use static requires (@fb55)
- Optimize manipulation methods (@kpdecker)
- Optimize add and remove class cases (@kpdecker)
- accept dom of DomHandler to cheerio.load (@nleush)
- added parentsUntil method (@finspin)
- Add performance optimization and bug fix `empty` method (@kpdecker)

# 0.14.0 / 2014-04-01

- call encodeXML and directly expose decodeHTML (@fb55)
- use latest htmlparser2 and entities versions (@fb55)
- Deprecate `$.fn.toArray` (@jugglinmike)
- Implement `$.fn.get` (@jugglinmike)
- .replaceWith now replaces all selected elements. (@xavi-)
- Correct arguments for 'replaceWith' callback (@jugglinmike)
- switch to lodash (@fb55)
- update to entities@0.5.0 (@fb55)
- Fix attr when \$ collection contains text modules (@kpdecker)
- Update to latest version of expect.js (@jugglinmike)
- Remove nodes from their previous structures (@jugglinmike)
- Update render.js (@stevenvachon)
- CDATA test (@stevenvachon)
- only ever one child index for cdata (@stevenvachon)
- don't loop through cdata children array (@stevenvachon)
- proper rendering of CDATA (@stevenvachon)
- Add cheerio-only bench option (@kpdecker)
- Avoid delete operations (@kpdecker)
- Add independent html benchmark (@kpdecker)
- Cache tag check in render (@kpdecker)
- Simplify attribute rendering step (@kpdecker)
- Add html rendering bench case (@kpdecker)
- Remove unnecessary check from removeAttr (@kpdecker)
- Remove unnecessary encoding step for attrs (@kpdecker)
- Add test for removeAttr+attr on boolean attributes (@kpdecker)
- Add single element benchmark case (@kpdecker)
- Optimize filter with selector (@kpdecker)
- Fix passing context as dom node (@alfred-nsh)
- Fix bug in `nextUntil` (@jugglinmike)
- Fix bug in `nextAll` (@jugglinmike)
- Implement `selector` argument of `next` method (@jugglinmike)
- Fix bug in `prevUntil` (@jugglinmike)
- Implement `selector` argument of `prev` method (@jugglinmike)
- Fix bug in `prevAll` (@jugglinmike)
- Fix bug in `siblings` (@jugglinmike)
- Avoid unnecessary indexOf from toggleClass (@kpdecker)
- Use strict equality rather than falsy check in eq (@kpdecker)
- Add benchmark coverage for all \$ APIs (@kpdecker)
- Optimize filter Cheerio intermediate creation (@kpdecker)
- Optimize siblings cheerio instance creation (@kpdecker)
- Optimize identity cases for first/last/eq (@kpdecker)
- Use domEach for traversal (@kpdecker)
- Inline children lookup in find (@kpdecker)
- Use domEach in data accessor (@kpdecker)
- Avoid cheerio creation in add/remove/toggleClass (@kpdecker)
- Implement getAttr local helper (@kpdecker)

# 0.13.1 / 2014-01-07

- Fix select with context in Cheerio function (@jugglinmike)
- Remove unnecessary DOM maintenance logic (@jugglinmike)
- Deprecate support for node 0.6

# 0.13.0 / 2013-12-30

- Remove "root" node (@jugglinmike)
- Fix bug in `prevAll`, `prev`, `nextAll`, `next`, `prevUntil`, `nextUntil` (@jugglinmike)
- Fix `replaceWith` method (@jugglinmike)
- added nextUntil() and prevUntil() (@finspin)
- Remove internal `connect` function (@jugglinmike)
- Rename `Cheerio#make` to document private status (@jugginmike)
- Remove extraneous call to `_.uniq` (@jugglinmike)
- Use CSSselect library directly (@jugglinmike)
- Run CI against Node v0.11 as an allowed failure (@jugginmike)
- Correct bug in `Cheerio#parents` (@jugglinmike)
- Implement `$.fn.end` (@jugginmike)
- Ignore colons inside of url(.\*) when parsing css (@Meekohi)
- Introduce rudimentary benchmark suite (@jugglinmike)
- Update HtmlParser2 version (@jugglinmike)
- Correct inconsistency in `$.fn.map` (@jugglinmike)
- fixed traversing tests (@finspin)
- Simplify `make` method (@jugglinmike)
- Avoid shadowing instance methods from arrays (@jugglinmike)

# 0.12.4 / 2013-11-12

- Coerce JSON values returned by `data` (@jugglinmike)
- issue #284: when rendering HTML, use original data attributes (@Trott)
- Introduce JSHint for automated code linting (@jugglinmike)
- Prevent `find` from returning duplicate elements (@jugglinmike)
- Implement function signature of `replaceWith` (@jugglinmike)
- Implement function signature of `before` (@jugglinmike)
- Implement function signature of `after` (@jugglinmike)
- Implement function signature of `append`/`prepend` (@jugglinmike)
- Extend iteration methods to accept nodes (@jugglinmike)
- Improve `removeClass` (@jugglinmike)
- Complete function signature of `addClass` (@jugglinmike)
- Fix bug in `removeClass` (@jugglinmike)
- Improve contributing.md (@jugglinmike)
- Fix and document .css() (@jugglinmike)

# 0.12.3 / 2013-10-04

- Add .toggleClass() function (@cyberthom)
- Add contributing guidelines (@jugglinmike)
- Fix bug in `siblings` (@jugglinmike)
- Correct the implementation `filter` and `is` (@jugglinmike)
- add .data() function (@andi-neck)
- add .css() (@yields)
- Implements contents() (@jlep)

# 0.12.2 / 2013-09-04

- Correct implementation of `$.fn.text` (@jugglinmike)
- Refactor Cheerio array creation (@jugglinmike)
- Extend manipulation methods to accept Arrays (@jugglinmike)
- support .attr(attributeName, function(index, attr)) (@xiaohwan)

# 0.12.1 / 2013-07-30

- Correct behavior of `Cheerio#parents` (@jugglinmike)
- Double quotes inside attributes kills HTML (@khoomeister)
- Making next({}) and prev({}) return empty object (@absentTelegraph)
- Implement \$.parseHTML (@jugglinmike)
- Correct bug in jQuery.fn.closest (@jugglinmike)
- Correct behavior of \$.fn.val on 'option' elements (@jugglinmike)

# 0.12.0 / 2013-06-09

- Breaking Change: Changed context from parent to the actual passed one (@swissmanu)
- Fixed: jquery checkbox val behavior (@jhubble)
- Added: output xml with \$.xml() (@Maciek416)
- Bumped: htmlparser2 to 3.1.1
- Fixed: bug in attr(key, val) on empty objects (@farhadi)
- Added: prevAll, nextAll (@lessmind)
- Fixed: Safety check in parents and closest (@zero21xxx)
- Added: .is(sel) (@zero21xxx)

# 0.11.0 / 2013-04-22

- Added: .closest() (@jeremy-dentel)
- Added: .parents() (@zero21xxx)
- Added: .val() (@rschmukler & @leahciMic)
- Added: Travis support for node 0.10.0 (@jeremy-dentel)
- Fixed: .find() if no selector (@davidchambers)
- Fixed: Propagate syntax errors caused by invalid selectors (@davidchambers)

  # 0.10.8 / 2013-03-11

- Add slice method (SBoudrias)

  # 0.10.7 / 2013-02-10

- Code & doc cleanup (davidchambers)
- Fixed bug in filter (jugglinmike)

  # 0.10.6 / 2013-01-29

- Added `$.contains(...)` (jugglinmike)
- formatting cleanup (davidchambers)
- Bug fix for `.children()` (jugglinmike & davidchambers)
- Remove global `render` bug (wvl)

  # 0.10.5 / 2012-12-18

- Fixed botched publish from 0.10.4 - changes should now be present

  # 0.10.4 / 2012-12-16

- \$.find should query descendants only (@jugglinmike)
- Tighter underscore dependency

  # 0.10.3 / 2012-11-18

- fixed outer html bug
- Updated documentation for $(...).html() and $.html()

  # 0.10.2 / 2012-11-17

- Added a toString() method (@bensheldon)
- use `_.each` and `_.map` to simplify cheerio namesakes (@davidchambers)
- Added filter() with tests and updated readme (@bensheldon & @davidchambers)
- Added spaces between attributes rewritten by removeClass (@jos3000)
- updated docs to remove reference to size method (@ironchefpython)
- removed HTML tidy/pretty print from cheerio

  # 0.10.1 / 2012-10-04

- Fixed regression, filtering with a context (#106)

  # 0.10.0 / 2012-09-24

- Greatly simplified and reorganized the library, reducing the loc by 30%
- Now supports mocha's test-coverage
- Deprecated self-closing tags (HTML5 doesn't require them)
- Fixed error thrown in removeClass(...) @robashton

  # 0.9.2 / 2012-08-10

- added \$(...).map(fn)
- manipulation: refactor `makeCheerioArray`
- make .removeClass() remove _all_ occurrences (#64)

  # 0.9.1 / 2012-08-03

- fixed bug causing options not to make it to the parser

  # 0.9.0 / 2012-07-24

- Added node 8.x support
- Removed node 4.x support
- Add html(dom) support (@wvl)
- fixed xss vulnerabilities on .attr(), .text(), & .html() (@benatkin, @FB55)
- Rewrote tests into javascript, removing coffeescript dependency (@davidchambers)
- Tons of cleanup (@davidchambers)

  # 0.8.3 / 2012-06-12

- Fixed minor package regression (closes #60)

  # 0.8.2 / 2012-06-11

- Now fails gracefully in cases that involve special chars, which is inline with jQuery (closes #59)
- text() now decode special entities (closes #52)
- updated travis.yml to test node 4.x

  # 0.8.1 / 2012-06-02

- fixed regression where if you created an element, it would update the root
- compatible with node 4.x (again)

  # 0.8.0 / 2012-05-27

- Updated CSS parser to use FB55/CSSselect. Cheerio now supports most CSS3 pseudo selectors thanks to @FB55.
- ignoreWhitespace now on by default again. See #55 for context.
- Changed $(':root') to $.root(), cleaned up \$.clone()
- Support for .eq(i) thanks to @alexbardas
- Removed support for node 0.4.x
- Fixed memory leak where package.json was continually loaded
- Tons more tests

  # 0.7.0 / 2012-04-08

- Now testing with node v0.7.7
- Added travis-ci integration
- Replaced should.js with expect.js. Browser testing to come
- Fixed spacing between attributes and their values
- Added HTML tidy/pretty print
- Exposed node-htmlparser2 parsing options
- Revert .replaceWith(...) to be consistent with jQuery

  # 0.6.2 / 2012-02-12

- Fixed .replaceWith(...) regression

  # 0.6.1 / 2012-02-12

- Added .first(), .last(), and .clone() commands.
- Option to parse using whitespace added to `.load`.
- Many bug fixes to make cheerio more aligned with jQuery.
- Added \$(':root') to select the highest level element.

Many thanks to the contributors that made this release happen: @ironchefpython and @siddMahen

# 0.6.0 / 2012-02-07

- _Important:_ `$(...).html()` now returns inner HTML, which is in line with the jQuery spec
- `$.html()` returns the full HTML string. `$.html([cheerioObject])` will return the outer(selected element's tag) and inner HTML of that object
- Fixed bug that prevented HTML strings with depth (eg. `append('<ul><li><li></ul>')`) from getting `parent`, `next`, `prev` attributes.
- Halted [htmlparser2](https://github.com/FB55/node-htmlparser) at v2.2.2 until single attributes bug gets fixed.

  # 0.5.1 / 2012-02-05

- Fixed minor regression: \$(...).text(fn) would fail

  # 0.5.1 / 2012-02-05

- Fixed regression: HTML pages with comments would fail

  # 0.5.0 / 2012-02-04

- Transitioned from Coffeescript back to Javascript
- Parser now ignores whitespace
- Fixed issue with double slashes on self-enclosing tags
- Added boolean attributes to html rendering

  # 0.4.2 / 2012-01-16

- Multiple selectors support: \$('.apple, .orange'). Thanks @siddMahen!
- Update package.json to always use latest cheerio-soupselect
- Fix memory leak in index.js

  # 0.4.1 / 2011-12-19

- Minor packaging changes to allow `make test` to work from npm installation

  # 0.4.0 / 2011-12-19

- Rewrote all unit tests as cheerio transitioned from vows -> mocha
- Internally, renderer.render -> render(...), parser.parse -> parse(...)
- Append, prepend, html, before, after all work with only text (no tags)
- Bugfix: Attributes can now be removed from script and style tags
- Added yield as a single tag
- Cheerio now compatible with node >=0.4.7

  # 0.3.2 / 2011-12-1

- Fixed \$(...).text(...) to work with "root" element

  # 0.3.1 / 2011-11-25

- Now relying on cheerio-soupselect instead of node-soupselect
- Removed all lingering htmlparser dependencies
- parser now returns parent "root" element. Root now never needs to be updated when there is multiple roots. This fixes ongoing issues with before(...), after(...) and other manipulation functions
- Added jQuery's \$(...).replaceWith(...)

  # 0.3.0 / 2011-11-19

- Now using htmlparser2 for parsing (2x speed increase, cleaner, actively developed)
- Added benchmark directory for future speed tests
- $('...').dom() was funky, so it was removed in favor of $('...').get(). \$.dom() still works the same.
- $.root now correctly static across all instances of $
- Added a screencast

  # 0.2.2 / 2011-11-9

- Traversing will select `<script>` and `<style>` tags (Closes Issue: #8)
- .text(string) now working with empty elements (Closes Issue: #7)
- Fixed before(...) & after(...) again if there is no parent (Closes Issue: #2)

  # 0.2.1 / 2011-11-5

- Fixed before(...) & after(...) if there is no parent (Closes Issue: #2)
- Comments now rendered correctly (Closes Issue: #5)

# < 0.2.0 / 2011-10-31

- Initial release (untracked development)
