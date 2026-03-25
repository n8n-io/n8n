Express Handlebars Change History
=================================

4.0.1 (2020-04-01)
------------------

* Update handlebars to fix mimist vulnerability.

4.0.0 (2020-03-25)
------------------

* Move to repo https://github.com/express-handlebars/express-handlebars/
* Update all deps.

3.1.0 (2019-05-14)
------------------

* `defaultLayout` defaults to main ([#249][])
* Upgrade Handlebars to v4.1.2 ([#250][])

[#249]: https://github.com/ericf/express-handlebars/issues/249
[#250]: https://github.com/ericf/express-handlebars/issues/250

3.0.2 (2019-02-24)
------------------

* Fix configuration `layoutsDir` & `partialsDir`. ([#244][])

[#244]: https://github.com/ericf/express-handlebars/issues/244

3.0.1 (2019-02-20)
------------------

* Updated dependencies that are long over due

3.0.0 (2016-01-26)
------------------

* Upgraded to Handlebars 4.0. ([#142][])

[#142]: https://github.com/ericf/express-handlebars/issues/142

2.0.1 (2015-04-23)
------------------

* Guarded against unexpected Handlebars API change that was released in a patch.
  ([#125][])


[#125]: https://github.com/ericf/express-handlebars/issues/125


2.0.0 (2015-03-22)
------------------

* __[!]__ Upgraded to Handlebars 3.0 by default, but still works with Handlebars
  2.x by using the `handlebars` config option. ([#105][])

* __[!]__ Removed using prototype properties for default config values. The
  default values are now embedded in the constructor. ([#105][])

* __[!]__ Removed `handlebarsVersion` instance property and
  `getHandlebarsSemver()` static function on the `ExpressHandlebars`
  constructor. ([#105][])

* __[!]__ Replaced undocumented `compileTemplate()` hook with the protected but
  supported `_compileTemplate()` and `_precompileTemplate()` hooks. ([#95][])

* Fixed layout path resolution on Windows. ([#113][] @Tineler)

* Added `compilerOptions` config property which is passed along to
  `Handlebars.compile()` and `Handlebars.precompile()`. ([#95][])

* Exposed Express Handlebars metadata to the data channel during render. This
  metadata is accessible via `{{@exphbs.*}}` ([#89][], [#101][])

* Added new "protected" hooks for AOP-ing template compilation and rendering,
  all of which can optionally return a Promise: ([#105][])

  * `_compileTemplate()`
  * `_precompileTemplate()`
  * `_renderTemplate()`


[#89]: https://github.com/ericf/express-handlebars/issues/89
[#95]: https://github.com/ericf/express-handlebars/issues/95
[#101]: https://github.com/ericf/express-handlebars/issues/101
[#105]: https://github.com/ericf/express-handlebars/issues/105
[#113]: https://github.com/ericf/express-handlebars/issues/113


1.2.2 (2015-03-06)
------------------

* Upgraded `glob` dependency to v5 which now officially supports symlinks via
  the new `follow` option. ([#98][])


1.2.1 (2015-02-17)
------------------

* Locked down `glob` dependency to a v4 version range that is known to work with
  this package _and_ support symlinks. The `glob` version can be updated when
  [isaacs/node-glob#139](https://github.com/isaacs/node-glob/issues/139) is
  resolved. ([#98][] @adgad)


[#98]: https://github.com/ericf/express-handlebars/issues/98


1.2.0 (2015-02-17)
------------------

* Added support for render-level `partials` to be specified when calling
  `renderView()` (which is the method Express calls). The `options.partials`
  value matches what Handlebars accepts during template rendering: it should
  have the shape `{partialName: fn}` or be a Promise for such an object.
  ([#82][])


[#82]: https://github.com/ericf/express-handlebars/issues/82


1.1.0 (2014-09-14)
------------------

* __[!]__ Upgraded Handlebars to 2.0.0 final, it was beta before.

* Added support for `partialsDir` to be configured with a collection (or promise
  for a collection) of templates, via the new `templates` prop in `partialDir`
  config objects. This allows developers to hand Express Handlebars the compiled
  partials templates to use for a specific partials dir.
  ([#81][] @joanniclaborde)

* Upgraded Promise dependency.


[#81]: https://github.com/ericf/express-handlebars/issues/81


1.0.3 (2014-09-05)
------------------

* Fixed issue with namespaced partials dirs not actually being namespaces.
  ([#76][] @inerte)


[#76]: https://github.com/ericf/express-handlebars/issues/76


1.0.2 (2014-09-05)
------------------

* Fixed `engines` entry in `package.json` to Node `>=0.10` to reflect this
  package's requirements. ([#78][])


[#78]: https://github.com/ericf/express-handlebars/issues/78


1.0.1 (2014-08-08)
------------------

* Fixed bug where rendered content was only be returned if a layout template was
  being used. Now a layout-less render will actually return content. ([#73][])


[#73]: https://github.com/ericf/express-handlebars/issues/73


1.0.0 (2014-08-07)
------------------

* __[!]__ Renamed to: `express-handlebars`. ([#65][])

* __[!]__ Rewritten to use Promises instead of `async` for asynchronous code.
  ([#68][]) This resulted in the following public API changes:

  * `loadPartials()` --> `getPartials()`, returns a Promise.
  * `loadTemplate()` --> `getTemplate()`, returns a Promise.
  * `loadTemplates()` --> `getTemplates()`, returns a Promise.
  * `render(file, context, [options])`, returns a Promise.


* `partialsDir` can now be set with an array of objects in the following form to
  support namespaced partials: ([#70][] @joanniclaborde)

      { dir: 'foo/bar/', namespace: 'bar' }

* Added support for Handlebars' `data` channel via `options.data`. ([#62][])

* Added `compileTemplate()` hook for the pre/post compile process, this also
  supports returning a Promise. ([#39][], [#41][])

* Added `_renderTemplate()` hook that supports returning a Promise.
  ([#39][], [#41][])

* Upgraded all dependencies, including Handlebars to 2.x. ([#59][])

* Added `graceful-fs` dependency to support large numbers of files to avoid
  EMFILE errors.

* Reduced complexity of cache code.

* Updated examples to each be self-contained and have `package.json` files.


[#39]: https://github.com/ericf/express-handlebars/issues/39
[#41]: https://github.com/ericf/express-handlebars/issues/41
[#59]: https://github.com/ericf/express-handlebars/issues/59
[#62]: https://github.com/ericf/express-handlebars/issues/62
[#65]: https://github.com/ericf/express-handlebars/issues/65
[#68]: https://github.com/ericf/express-handlebars/issues/68
[#70]: https://github.com/ericf/express-handlebars/issues/70


0.5.1 (2014-08-05)
------------------

* __[!]__ Last release before `v1.0` which will have breaking changes.

* Improved `extname` docs in README and added example. ([#30][] @Crashthatch)

* `extname` can now be specified _without_ the leading `"."`.
  ([#51][] @calvinmetcalf)


[#30]: https://github.com/ericf/express-handlebars/issues/30
[#51]: https://github.com/ericf/express-handlebars/issues/51


0.5.0 (2013-07-25)
------------------

* Added `loadTemplates()` method which will load all the templates in a
  specified directory. ([#21][])

* Added support for multiple partials directories. This enables the
  `partialsDir` configuration property to be specified as an *array* of
  directories, and loads all of the templates in each one.

  This feature allows an app's partials to be split up in multiple directories,
  which is common if an app has some shared partials which will also be exposed
  to the client, and some server-side-only partials. ([#20][])

* Added runnable code examples in this package's "examples/" directory.
  ([#22][])

* Improved optional argument handling in public methods to treat Express
  `locals` function objects as `options` and not `callback` params to the method
  being invoked. ([#27][])


[#20]: https://github.com/ericf/express-handlebars/issues/20
[#21]: https://github.com/ericf/express-handlebars/issues/21
[#22]: https://github.com/ericf/express-handlebars/issues/22
[#27]: https://github.com/ericf/express-handlebars/issues/27


0.4.1 (2013-04-06)
------------------

* Updated `async` dependency to the latest stable minor version: "~0.2".


0.4.0 (2013-03-24)
------------------

* __[!]__ Removed the following "get" -> "load" aliases which kept in v0.2.0 for
  back-compat:

    * `getPartials()` -> `loadPartials()`
    * `getTemplate()` -> `loadTemplate()`

  This is the future version where these aliases have been removed.

* __[!]__ Renamed `lib/express3-handlebars.js` -> `lib/express-handlebars.js`.

* Exposed `getHandlebarsSemver()` function as a static property on the
  `ExpressHandlebars` constructor.

* Rearranged module exports by moving the engine factory function to `index.js`,
  making the `lib/express3-handlebars.js` module only responsible for exporting
  the `ExpressHandlebars` constructor.


0.3.3 (2013-03-22)
------------------

* Updated internal `_resolveLayoutPath()` method to take the full
  `options`/locals objects which the view is rendered with. This makes it easier
  to override. ([#14][])


[#14]: https://github.com/ericf/express-handlebars/issues/14


0.3.2 (2013-02-20)
------------------

* Transfered ownership and copyright to Yahoo! Inc. This software is still free
  to use, and is now licensed under the Yahoo! Inc. BSD license.


0.3.1 (2013-02-18)
------------------

* Updated README with info about `options.helpers` for `render()` and
  `renderView()` docs. ([#7][])


[#7]: https://github.com/ericf/express-handlebars/issues/7


0.3.0 (2013-02-18)
------------------

* Added support for render-level helpers, via `options.helpers`, to the
  `render()` and `renderView()` methods. Handlebars' `registerHelper()` function
  now works as expected and does not have to be called before the
  `ExpressHandlebars` instance is created. Helpers are now merged from:
  `handlebars.helpers` (global), `helpers` (instance), and `options.helpers`
  (render-level) before a template is rendered; this provides flexibility at
  all levels. ([#3][], [#11][])

* Added `handlebarsVersion` property which is the version number of `handlebars`
  as a semver. This is used internally to branch on certain operations which
  differ between Handlebars releases.


[#3]: https://github.com/ericf/express-handlebars/issues/3
[#11]: https://github.com/ericf/express-handlebars/issues/11


0.2.3 (2013-02-13)
------------------

* Fixed issue with naming nested partials when using the latest version of
  Handlebars (1.0.rc.2). Previous versions require a hack to replace "/"s with
  "."s in partial names, and the latest version of Handlebars fixes that bug.
  This hack will only be applied to old versions of Handlebars. ([#9][])


[#9]: https://github.com/ericf/express-handlebars/issues/9


0.2.2 (2013-02-04)
------------------

* Updated README with the public method renames which happened v0.2.0.


0.2.1 (2013-02-04)
------------------

* `extname`, `layoutsDir`, and `partialsDir` property values will now reference
  the values on the prototype unless an `ExpressHandlebars` instance is
  constructed with config values for these properties.

* Improved clarity of method implementations, and exposed more override "hooks"
  via new private methods: `_getPartialName()`, `_renderTemplate()`, and
  `_resolveLayoutPath()`.


0.2.0 (2013-02-01)
------------------

* __[!]__ Renamed methods prefixed with "get" to "load" for clarity:

    * `getPartials()` -> `loadPartials()`
    * `getTemplate()` -> `loadTemplate()`

  Aliases for these methods have been created to maintain back-compat, but the
  old method names are now deprecated will be removed in the future. ([#5][])

* All paths are resolved before checking in or adding to caches. ([#1][])

* Force `{precompiled: false}` option within `render()` and `renderView()`
  methods to prevent trying to render with precompiled templates. ([#2][])


[#1]: https://github.com/ericf/express-handlebars/issues/1
[#2]: https://github.com/ericf/express-handlebars/issues/2
[#5]: https://github.com/ericf/express-handlebars/issues/5


0.1.2 (2013-01-10)
------------------

* Tweaked formatting of README documentation.


0.1.1 (2013-01-10)
------------------

* Added README documentation.


0.1.0 (2013-01-07)
------------------

* Initial release.
