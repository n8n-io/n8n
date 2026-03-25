# Change Log

All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [4.2.0] / 28 March 2021

### Added

* [#773]: Add package.json `exports` field, by [@manzt].

## [4.1.0] / 6 December 2020

### Added

* [#764]: `render()` now recognizes a config object argument, by [@pineapplemachine].

### Fixed

* [#764]: Ask custom `escape` functions to escape all types of values (including `number`s), by [@pineapplemachine].

## [4.0.1] / 15 March 2020

### Fixed

 * [#739]: Fix custom delimiters in nested partials, by [@aielo].

## [4.0.0] / 16 January 2020

Majority of using projects don't have to worry by this being a new major version.

**TLDR;** if your project manipulates `Writer.prototype.parse | Writer.cache` directly or uses `.to_html()`, you probably have to change that code.

This release allows the internal template cache to be customised, either by disabling it completely
or provide a custom strategy deciding how the cache should behave when mustache.js parses templates.

```js
const mustache = require('mustache');

// disable caching
Mustache.templateCache = undefined;

// or use a built-in Map in modern environments
Mustache.templateCache = new Map();
```

Projects that wanted to customise the caching behaviour in earlier versions of mustache.js were forced to
override internal method responsible for parsing templates; `Writer.prototype.parse`. In short, that was unfortunate
because there is more than caching happening in that method.

We've improved that now by introducing a first class API that only affects template caching.

The default template cache behaves as before and is still compatible with older JavaScript environments.
For those who wants to provide a custom more sopisiticated caching strategy, one can do that with an object that adheres to the following requirements:

```ts
{
  set(cacheKey: string, value: string): void
  get(cacheKey: string): string | undefined
  clear(): void
}
```

### Added

* [#731]: Allow template caching to be customised, by [@AndrewLeedham].

### Removed

* [#735]: Remove `.to_html()`, by [@phillipj].

## [3.2.1] / 30 December 2019

### Fixed

 * [#733]: Allow the CLI to use JavaScript views when the project has ES6 modules enabled, by [@eobrain].

## [3.2.0] / 18 December 2019

### Added

* [#728]: Expose ECMAScript Module in addition to UMD (CommonJS, AMD & global scope), by [@phillipj] and [@zekth].

### Using mustache.js as an ES module

To stay backwards compatible with already using projects, the default exposed module format is still UMD.
That means projects using mustache.js as an CommonJS, AMD or global scope module, from npm or directly from github.com
can keep on doing that for now.

For those projects who would rather want to use mustache.js as an ES module, the `mustache/mustache.mjs` file has to
be `import`ed directly.

Below are some usage scenarios for different runtimes.

#### Modern browser with ES module support

```html
<!-- index.html -->
<script type="module">
  import mustache from "https://unpkg.com/mustache@3.2.0/mustache.mjs"

  console.log(mustache.render('Hello {{name}}!', { name: 'Santa' }))
  // Hello Santa!
</script>
```

#### [Node.js](https://nodejs.org) (>= v13.2.0 or using --experimental-modules flag)

```js
// index.mjs
import mustache from 'mustache/mustache.mjs'

console.log(mustache.render('Hello {{name}}!', { name: 'Santa' }))
// Hello Santa!
```

ES Module support for Node.js will be improved in the future when [Conditional Exports](https://nodejs.org/api/esm.html#esm_conditional_exports)
is enabled by default rather than being behind an experimental flag.

More info in [Node.js ECMAScript Modules docs](https://nodejs.org/api/esm.html).

#### [Deno](https://deno.land/)

```js
// index.ts
import mustache from 'https://unpkg.com/mustache@3.2.0/mustache.mjs'

console.log(mustache.render('Hello {{name}}!', { name: 'Santa' }))
// Hello Santa!
```

## [3.1.0] / 13 September 2019

### Added

 * [#717]: Added support .js files as views in command line tool, by [@JEStaubach].

### Fixed

 * [#716]: Bugfix for indentation of inline partials, by [@yotammadem].

## [3.0.3] / 27 August 2019

### Added

 * [#713]: Add test cases for custom functions in partials, by [@wol-soft].

### Fixed

 * [#714]: Bugfix for wrong function output in partials with indentation, by [@phillipj].

## [3.0.2] / 21 August 2019

### Fixed

 * [#705]: Fix indentation of partials, by [@kevindew] and [@yotammadem].

### Dev

 * [#701]: Fix test failure for Node 10 and above, by [@andersk].
 * [#704]: Lint all test files just like the source files, by [@phillipj].
 * Start experimenting & comparing GitHub Actions vs Travis CI, by [@phillipj].

## [3.0.1] / 11 November 2018

 * [#679]: Fix partials not rendering tokens when using custom tags, by [@stackchain].

## [3.0.0] / 16 September 2018

We are very happy to announce a new major version of mustache.js. We want to be very careful not to break projects
out in the wild, and adhering to [Semantic Versioning](http://semver.org/) we have therefore cut this new major version.

The changes introduced will likely not require any actions for most using projects. The things to look out for that
might cause unexpected rendering results are described in the migration guide below.

A big shout out and thanks to [@raymond-lam] for this release! Without his contributions with code and issue triaging,
this release would never have happened.

### Major

* [#618]: Allow rendering properties of primitive types that are not objects, by [@raymond-lam].
* [#643]: `Writer.prototype.parse` to cache by tags in addition to template string, by [@raymond-lam].
* [#664]: Fix `Writer.prototype.parse` cache, by [@seminaoki].

### Minor

* [#673]: Add `tags` parameter to `Mustache.render()`, by [@raymond-lam].

### Migrating from mustache.js v2.x to v3.x

#### Rendering properties of primitive types

We have ensured properties of primitive types can be rendered at all times. That means `Array.length`, `String.length`
and similar. A corner case where this could cause unexpected output follows:

View:
```
{
  stooges: [
    { name: "Moe" },
    { name: "Larry" },
    { name: "Curly" }
  ]
}
```

Template:
```
{{#stooges}}
  {{name}}: {{name.length}} characters
{{/stooges}}
```

Output with v3.0:
```
  Moe: 3 characters
  Larry: 5 characters
  Curly: 5 characters
```

Output with v2.x:
```
  Moe:  characters
  Larry:  characters
  Curly:  characters
```

#### Caching for templates with custom delimiters

We have improved the templates cache to ensure custom delimiters are taken into consideration for the cache.
This improvement might cause unexpected rendering behaviour for using projects actively using the custom delimiters functionality.

Previously it was possible to use `Mustache.parse()` as a means to set global custom delimiters. If custom
delimiters were provided as an argument, it would affect all following calls to `Mustache.render()`.
Consider the following:

```js
const template = "[[item.title]] [[item.value]]";
mustache.parse(template, ["[[", "]]"]);

console.log(
  mustache.render(template, {
    item: {
      title: "TEST",
      value: 1
    }
  })
);

>> TEST 1
```

The above illustrates the fact that `Mustache.parse()` made mustache.js cache the template without considering
the custom delimiters provided. This is no longer true.

We no longer encourage using `Mustache.parse()` for this purpose, but have rather added a fourth argument to
`Mustache.render()` letting you provide custom delimiters when rendering.

If you still need the pre-parse the template and use custom delimiters at the same time, ensure to provide
the custom delimiters as argument to `Mustache.render()` as well.

## [2.3.2] / 17 August 2018

This release is made to revert changes introduced in [2.3.1] that caused unexpected behaviour for several users.

### Minor

 * [#670]: Rollback template cache causing unexpected behaviour, by [@raymond-lam].

## [2.3.1] / 7 August 2018

### Minor

 * [#643]: `Writer.prototype.parse` to cache by tags in addition to template string, by [@raymond-lam].
 * [#664]: Fix `Writer.prototype.parse` cache, by [@seminaoki].

### Dev

 * [#666]: Install release tools with npm rather than pre-commit hook & `Rakefile`, by [@phillipj].
 * [#667], [#668]: Stabilize browser test suite, by [@phillipj].

### Docs

 * [#644]: Document global Mustache.escape overriding capacity, by [@paultopia].
 * [#657]: Correct `Mustache.parse()` return type documentation, by [@bbrooks].

## [2.3.0] / 8 November 2016

### Minor

 * [#540]: Add optional `output` argument to mustache CLI, by [@wizawu].
 * [#597]: Add compatibility with amdclean, by [@mightyplow].

### Dev

 * [#553]: Assert `null` lookup when rendering an unescaped value, by [@dasilvacontin].
 * [#580], [#610]: Ignore eslint for greenkeeper updates, by [@phillipj].
 * [#560]: Fix CLI tests for Windows, by [@kookookchoozeus].
 * Run browser tests w/node v4, by [@phillipj].

### Docs

 * [#542]: Add API documentation to README, by [@tomekwi].
 * [#546]: Add missing syntax highlighting to README code blocks, by [@pra85].
 * [#569]: Update Ctemplate links in README, by [@mortonfox].
 * [#592]: Change "loadUser" to "loadUser()" in README, by [@Flaque].
 * [#593]: Adding doctype to HTML code example in README, by [@calvinf].

### Dependencies

 * eslint -> 2.2.0. Breaking changes fix by [@phillipj]. [#548]
 * eslint -> 2.5.1.
 * mocha -> 3.0.2.
 * zuul -> 3.11.0.

## [2.2.1] / 13 December 2015

### Fixes

 * Improve HTML escaping, by [@phillipj].
 * Fix inconsistency in defining global mustache object, by [@simast].
 * Fix switch-case indent error, by [@norfish].
 * Unpin chai and eslint versions, by [@dasilvacontin].
 * Update README.md with proper grammar, by [@EvanLovely].
 * Update mjackson username in README, by [@mjackson].
 * Remove syntax highlighting in README code sample, by [@imagentleman].
 * Fix typo in README, by [@Xcrucifier].
 * Fix link typo in README, by [@keirog].

## [2.2.0] / 15 October 2015

### Added

 * Add Partials support to CLI, by [@palkan].

### Changed

 * Move install instructions to README's top, by [@mateusortiz]
 * Improved devhook install output, by [@ShashankaNataraj].
 * Clarifies and improves language in documentation, by [@jfmercer].
 * Linting CLI tool, by [@phillipj].
 * npm 2.x and node v4 on Travis, by [@phillipj].

### Fixes

 * Fix README spelling error to "aforementioned", by [@djchie].
 * Equal error message test in .render() for server and browser, by [@phillipj].

### Dependencies

 * chai -> 3.3.0
 * eslint -> 1.6.0

## [2.1.3] / 23 July 2015

### Added

 * Throw error when providing .render() with invalid template type, by [@phillipj].
 * Documents use of string literals containing double quotes, by [@jfmercer].

### Changed

 * Move mustache gif to githubusercontent, by [@Andersos].

### Fixed

 * Update UMD Shim to be resilient to HTMLElement global pollution, by [@mikesherov].

## [2.1.2] / 17 June 2015

### Added

 * Mustache global definition ([#466]) by [@yousefcisco].

## [2.1.1] / 11 June 2015

### Added

 * State that we use semver on the change log, by [@dasilvacontin].
 * Added version links to change log, by [@dasilvacontin].

### Fixed

 * Bugfix for using values from view's context prototype, by [@phillipj].
 * Improve test with undefined/null lookup hit using dot notation, by [@dasilvacontin].
 * Bugfix for null/undefined lookup hit when using dot notation, by [@phillipj].
 * Remove moot `version` property from bower.json, by [@kkirsche].
 * bower.json doesn't require a version bump via hook, by [@dasilvacontin].


## [2.1.0] / 5 June 2015

 * Added license attribute to package.json, by [@pgilad].
 * Minor changes to make mustache.js compatible with both WSH and ASP, by [@nagaozen].
 * Improve CLI view parsing error, by [@phillipj].
 * Bugfix for view context cache, by [@phillipj].

## [2.0.0] / 27 Mar 2015

 * Fixed lookup not stopping upon finding `undefined` or `null` values, by [@dasilvacontin].
 * Refactored pre-commit hook, by [@dasilvacontin].

## [1.2.0] / 24 Mar 2015

 * Added -v option to CLI, by [@phillipj].
 * Bugfix for rendering Number when it serves as the Context, by [@phillipj].
 * Specified files in package.json for a cleaner install, by [@phillipj].

## [1.1.0] / 18 Feb 2015

 * Refactor Writer.renderTokens() for better readability, by [@phillipj].
 * Cleanup tests section in readme, by [@phillipj].
 * Added JSHint to tests/CI, by [@phillipj].
 * Added node v0.12 on travis, by [@phillipj].
 * Created command line tool, by [@phillipj].
 * Added *falsy* to Inverted Sections description in README, by [@kristijanmatic].

## [1.0.0] / 20 Dec 2014

  * Inline tag compilation, by [@mjackson].
  * Fixed AMD registration, volo package.json entry, by [@jrburke].
  * Added spm support, by [@afc163].
  * Only access properties of objects on Context.lookup, by [@cmbuckley].

## [0.8.2] / 17 Mar 2014

  * Supporting Bower through a bower.json file.

## [0.8.1] / 3 Jan 2014

  * Fix usage of partial templates.

## [0.8.0] / 2 Dec 2013

  * Remove compile* writer functions, use mustache.parse instead. Smaller API.
  * Throw an error when rendering a template that contains higher-order sections and
    the original template is not provided.
  * Remove low-level Context.make function.
  * Better code readability and inline documentation.
  * Stop caching templates by name.

## [0.7.3] / 5 Nov 2013

  * Don't require the original template to be passed to the rendering function
    when using compiled templates. This is still required when using higher-order
    functions in order to be able to extract the portion of the template
    that was contained by that section. Fixes [#262].
  * Performance improvements.

## [0.7.2] / 27 Dec 2012

  * Fixed a rendering bug ([#274]) when using nested higher-order sections.
  * Better error reporting on failed parse.
  * Converted tests to use mocha instead of vows.

## [0.7.1] / 6 Dec 2012

  * Handle empty templates gracefully. Fixes [#265], [#267], and [#270].
  * Cache partials by template, not by name. Fixes [#257].
  * Added Mustache.compileTokens to compile the output of Mustache.parse. Fixes
    [#258].

## [0.7.0] / 10 Sep 2012

  * Rename Renderer => Writer.
  * Allow partials to be loaded dynamically using a callback (thanks
    [@TiddoLangerak] for the suggestion).
  * Fixed a bug with higher-order sections that prevented them from being
    passed the raw text of the section from the original template.
  * More concise token format. Tokens also include start/end indices in the
    original template.
  * High-level API is consistent with the Writer API.
  * Allow partials to be passed to the pre-compiled function (thanks
    [@fallenice]).
  * Don't use eval (thanks [@cweider]).

## [0.6.0] / 31 Aug 2012

  * Use JavaScript's definition of falsy when determining whether to render an
    inverted section or not. Issue [#186].
  * Use Mustache.escape to escape values inside {{}}. This function may be
    reassigned to alter the default escaping behavior. Issue [#244].
  * Fixed a bug that clashed with QUnit (thanks [@kannix]).
  * Added volo support (thanks [@guybedford]).

[4.1.0]: https://github.com/janl/mustache.js/compare/v4.0.1...v4.1.0
[4.0.1]: https://github.com/janl/mustache.js/compare/v4.0.0...v4.0.1
[4.0.0]: https://github.com/janl/mustache.js/compare/v3.2.1...v4.0.0
[3.2.1]: https://github.com/janl/mustache.js/compare/v3.2.0...v3.2.1
[3.2.0]: https://github.com/janl/mustache.js/compare/v3.1.0...v3.2.0
[3.1.0]: https://github.com/janl/mustache.js/compare/v3.0.3...v3.1.0
[3.0.3]: https://github.com/janl/mustache.js/compare/v3.0.2...v3.0.3
[3.0.2]: https://github.com/janl/mustache.js/compare/v3.0.1...v3.0.2
[3.0.1]: https://github.com/janl/mustache.js/compare/v3.0.0...v3.0.1
[3.0.0]: https://github.com/janl/mustache.js/compare/v2.3.2...v3.0.0
[2.3.2]: https://github.com/janl/mustache.js/compare/v2.3.1...v2.3.2
[2.3.1]: https://github.com/janl/mustache.js/compare/v2.3.0...v2.3.1
[2.3.0]: https://github.com/janl/mustache.js/compare/v2.2.1...v2.3.0
[2.2.1]: https://github.com/janl/mustache.js/compare/v2.2.0...v2.2.1
[2.2.0]: https://github.com/janl/mustache.js/compare/v2.1.3...v2.2.0
[2.1.3]: https://github.com/janl/mustache.js/compare/v2.1.2...v2.1.3
[2.1.2]: https://github.com/janl/mustache.js/compare/v2.1.1...v2.1.2
[2.1.1]: https://github.com/janl/mustache.js/compare/v2.1.0...v2.1.1
[2.1.0]: https://github.com/janl/mustache.js/compare/v2.0.0...v2.1.0
[2.0.0]: https://github.com/janl/mustache.js/compare/v1.2.0...v2.0.0
[1.2.0]: https://github.com/janl/mustache.js/compare/v1.1.0...v1.2.0
[1.1.0]: https://github.com/janl/mustache.js/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/janl/mustache.js/compare/0.8.2...v1.0.0
[0.8.2]: https://github.com/janl/mustache.js/compare/0.8.1...0.8.2
[0.8.1]: https://github.com/janl/mustache.js/compare/0.8.0...0.8.1
[0.8.0]: https://github.com/janl/mustache.js/compare/0.7.3...0.8.0
[0.7.3]: https://github.com/janl/mustache.js/compare/0.7.2...0.7.3
[0.7.2]: https://github.com/janl/mustache.js/compare/0.7.1...0.7.2
[0.7.1]: https://github.com/janl/mustache.js/compare/0.7.0...0.7.1
[0.7.0]: https://github.com/janl/mustache.js/compare/0.6.0...0.7.0
[0.6.0]: https://github.com/janl/mustache.js/compare/0.5.2...0.6.0

[#186]: https://github.com/janl/mustache.js/issues/186
[#244]: https://github.com/janl/mustache.js/issues/244
[#257]: https://github.com/janl/mustache.js/issues/257
[#258]: https://github.com/janl/mustache.js/issues/258
[#262]: https://github.com/janl/mustache.js/issues/262
[#265]: https://github.com/janl/mustache.js/issues/265
[#267]: https://github.com/janl/mustache.js/issues/267
[#270]: https://github.com/janl/mustache.js/issues/270
[#274]: https://github.com/janl/mustache.js/issues/274
[#466]: https://github.com/janl/mustache.js/issues/466
[#540]: https://github.com/janl/mustache.js/issues/540
[#542]: https://github.com/janl/mustache.js/issues/542
[#546]: https://github.com/janl/mustache.js/issues/546
[#548]: https://github.com/janl/mustache.js/issues/548
[#553]: https://github.com/janl/mustache.js/issues/553
[#560]: https://github.com/janl/mustache.js/issues/560
[#569]: https://github.com/janl/mustache.js/issues/569
[#580]: https://github.com/janl/mustache.js/issues/580
[#592]: https://github.com/janl/mustache.js/issues/592
[#593]: https://github.com/janl/mustache.js/issues/593
[#597]: https://github.com/janl/mustache.js/issues/597
[#610]: https://github.com/janl/mustache.js/issues/610
[#643]: https://github.com/janl/mustache.js/issues/643
[#644]: https://github.com/janl/mustache.js/issues/644
[#657]: https://github.com/janl/mustache.js/issues/657
[#664]: https://github.com/janl/mustache.js/issues/664
[#666]: https://github.com/janl/mustache.js/issues/666
[#667]: https://github.com/janl/mustache.js/issues/667
[#668]: https://github.com/janl/mustache.js/issues/668
[#670]: https://github.com/janl/mustache.js/issues/670
[#618]: https://github.com/janl/mustache.js/issues/618
[#673]: https://github.com/janl/mustache.js/issues/673
[#679]: https://github.com/janl/mustache.js/issues/679
[#701]: https://github.com/janl/mustache.js/issues/701
[#704]: https://github.com/janl/mustache.js/issues/704
[#705]: https://github.com/janl/mustache.js/issues/705
[#713]: https://github.com/janl/mustache.js/issues/713
[#714]: https://github.com/janl/mustache.js/issues/714
[#716]: https://github.com/janl/mustache.js/issues/716
[#717]: https://github.com/janl/mustache.js/issues/717
[#728]: https://github.com/janl/mustache.js/issues/728
[#733]: https://github.com/janl/mustache.js/issues/733
[#731]: https://github.com/janl/mustache.js/issues/731
[#735]: https://github.com/janl/mustache.js/issues/735
[#739]: https://github.com/janl/mustache.js/issues/739
[#764]: https://github.com/janl/mustache.js/issues/764
[#773]: https://github.com/janl/mustache.js/issues/773

[@afc163]: https://github.com/afc163
[@aielo]: https://github.com/aielo
[@andersk]: https://github.com/andersk
[@Andersos]: https://github.com/Andersos
[@AndrewLeedham]: https://github.com/AndrewLeedham
[@bbrooks]: https://github.com/bbrooks
[@calvinf]: https://github.com/calvinf
[@cmbuckley]: https://github.com/cmbuckley
[@cweider]: https://github.com/cweider
[@dasilvacontin]: https://github.com/dasilvacontin
[@djchie]: https://github.com/djchie
[@eobrain]: https://github.com/eobrain
[@EvanLovely]: https://github.com/EvanLovely
[@fallenice]: https://github.com/fallenice
[@Flaque]: https://github.com/Flaque
[@guybedford]: https://github.com/guybedford
[@imagentleman]: https://github.com/imagentleman
[@JEStaubach]: https://github.com/JEStaubach
[@jfmercer]: https://github.com/jfmercer
[@jrburke]: https://github.com/jrburke
[@kannix]: https://github.com/kannix
[@keirog]: https://github.com/keirog
[@kkirsche]: https://github.com/kkirsche
[@kookookchoozeus]: https://github.com/kookookchoozeus
[@kristijanmatic]: https://github.com/kristijanmatic
[@kevindew]: https://github.com/kevindew
[@manzt]: https://github.com/manzt
[@mateusortiz]: https://github.com/mateusortiz
[@mightyplow]: https://github.com/mightyplow
[@mikesherov]: https://github.com/mikesherov
[@mjackson]: https://github.com/mjackson
[@mortonfox]: https://github.com/mortonfox
[@nagaozen]: https://github.com/nagaozen
[@norfish]: https://github.com/norfish
[@palkan]: https://github.com/palkan
[@paultopia]: https://github.com/paultopia
[@pgilad]: https://github.com/pgilad
[@phillipj]: https://github.com/phillipj
[@pineapplemachine]: https://github.com/pineapplemachine
[@pra85]: https://github.com/pra85
[@raymond-lam]: https://github.com/raymond-lam
[@seminaoki]: https://github.com/seminaoki
[@ShashankaNataraj]: https://github.com/ShashankaNataraj
[@simast]: https://github.com/simast
[@stackchain]: https://github.com/stackchain
[@TiddoLangerak]: https://github.com/TiddoLangerak
[@tomekwi]: https://github.com/tomekwi
[@wizawu]: https://github.com/wizawu
[@wol-soft]: https://github.com/wol-soft
[@Xcrucifier]: https://github.com/Xcrucifier
[@yotammadem]: https://github.com/yotammadem
[@yousefcisco]: https://github.com/yousefcisco
[@zekth]: https://github.com/zekth
