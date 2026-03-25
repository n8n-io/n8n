1.11.0 / 2015-06-12
==================

  * Added block code support ([@alephyud](https://github.com/alephyud))
  * Improved runtime performance of mixins significantly ([Andreas Lubbe](https://github.com/alubbe))
  * Improved runtime performance of pug's string escaping ([Andreas Lubbe](https://github.com/alubbe)) and ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Better line number counting for pipeless text ([@alephyud](https://github.com/alephyud))


1.10.0 / 2015-05-25
==================

  * Now supports jstransformers, which allows improved handling of embedded languages such as Coffee-Script, and deprecated Transformers support in filters - to be removed in 2.0.0 ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * CLI: added a flag to keep directory hierarchy when a directory is specified - this behavior will be the default in 2.0.0 ([@TimothyGu](https://github.com/TimothyGu))
  * disabled 'compileDebug' flag by default when used with express in production mode ([Andreas Lubbe](https://github.com/alubbe))
  * Fixed a memory leak on modern versions of Chrome as well as node 0.12 and iojs ([Andreas Lubbe](https://github.com/alubbe))
  * update website ([@GarthDB](https://github.com/GarthDB))

1.9.2 / 2015-01-18
==================

  * Do not ignore some parser errors for mismatched parenthesis ([@TimothyGu](https://github.com/TimothyGu))
  * Warn for `:` that is not followed by a space ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Fix #1794 (a bizzare bug with a certain combination of inheritance, mixins and &attributes) ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Add `compileClientWithDependenciesTracked` ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Support comments in `case` blocks ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Fix blocks in nested mixins ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Lots more documentation ([@enlore](https://github.com/enlore))
  * Fix watching in CLI ([@pavel](https://github.com/pavel))

1.9.1 / 2015-01-17
==================

  * Clean up path/fs functions in CLI as we no longer support node@0.6 ([@TimothyGu](https://github.com/TimothyGu))
  * Update commander ([@TimothyGu](https://github.com/TimothyGu))
  * Document `cache` and `parser` options ([@TimothyGu](https://github.com/TimothyGu))
  * Fix bug in 1.9.0 where we read the file if cache was enabled, even if a string was provided ([@TimothyGu](https://github.com/TimothyGu))
  * Fix year in changelog ([@tomByrer](https://github.com/tomByrer))

1.9.0 / 2015-01-13
==================

  * Fix `--watch` sometimes dying when there were file-system errors ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Fix `--watch` by using `fs.watchFile` correctly ([@TimothyGu](https://github.com/TimothyGu))
  * Fix errors with using the CLI to compile from stdin
  * Better looking badges ([@TimothyGu](https://github.com/TimothyGu))
  * Added `--extension` to CLI([@nicocedron](https://github.com/nicocedron) and [@TimothyGu](https://github.com/TimothyGu))
  * Refactor and improve internal cache handling ([@TimothyGu](https://github.com/TimothyGu))
  * Loads more tests ([@TimothyGu](https://github.com/TimothyGu))

1.8.2 / 2014-12-16
==================

  * Use `-` as the default filename when using stdin on CLI ([@TimothyGu](https://github.com/TimothyGu))
  * Prevent some compiler errors being silenced ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Remove use of non-standard `string.trimLeft()` ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Fix bug in CLI when no name was provided for child template ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Remove dependency on monocle (hopefully fixing installation on 0.8) ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Add gitter chat room ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))

1.8.1 / 2014-11-30
==================

  * Fix corner case when the pretty option was passed a non-string truthy value ([@TimothyGu](https://github.com/TimothyGu))
  * Warn when `lexer` is given as an option ([@TimothyGu](https://github.com/TimothyGu))
  * Update dependencies ([@TimothyGu](https://github.com/TimothyGu))

1.8.0 / 2014-11-28
==================

  * Fix empty text-only block ([@rlidwka](https://github.com/rlidwka))
  * Warn about future change to ISO 8601 style dates ([@TimothyGu](https://github.com/TimothyGu) and [@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Add warnings when data-attributes contain ampersands ([@TimothyGu](https://github.com/TimothyGu))
  * Allow custom pretty indentation ([@bfred-it](https://github.com/bfred-it))
  * Add support for an object in the style attribute ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Add support for an object in the class attribute ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Ignore fs module in browser builds ([@sokra](https://github.com/sokra))
  * Update dependencies ([@hildjj](https://github.com/hildjj))
  * Check mixin arguments are valid JavaScript expressions ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Remove symlink ([@slang800](https://github.com/slang800))

1.7.0 / 2014-09-17
==================

  * Add Doctype option on command line ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Support ES6 style rest args in mixins ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Fix support for unicode newlines (\u2028, \u2029) ([@rlidwka](https://github.com/rlidwka))
  * Expose `globals` option from the `with` module ([@sokra](https://github.com/sokra))
  * Lots of new documentation ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))

1.6.0 / 2014-08-31
==================

  * Allow optional white space after `+` when calling a mixin ([@char101](https://github.com/char101))
  * Use void-elements module to replace internal self-closing list ([@hemanth](https://github.com/hemanth))
  * Fix a warning that eroniously warned for un-used blocks if in an extending template from an include (Reported by [@Dissimulazione](https://github.com/Dissimulazione))
  * Fix mixins not working at end of file ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Fix error reporting when mixin block was followed by blank lines ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))


1.5.0 / 2014-07-23
==================

  * Added compileFile API ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Fix line number in un-used blocks warning ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Fix a warning that eroniously warned for un-used blocks if they were under another block (Reported by [@pesho](https://github.com/pesho))

1.4.2 / 2014-07-16
==================

  * Fix a warning that eroniously warned for un-used blocks if they were under a "Code" element (Reported by [@narirou](https://github.com/narirou))

1.4.1 / 2014-07-16
==================

  * Fix an error that sometimes resulted in 'unexpected token "pipless-text"' being erroniously thrown (Reported by [@Artazor](https://github.com/Artazor) and [@thenitai](https://github.com/thenitai))

1.4.0 / 2014-07-15
==================

  * Fix CLI so it keeps watching when errors occur ([@AndrewTsao](https://github.com/AndrewTsao))
  * Support custom names for client side templates ([@ForbesLindesay](http://www.forbeslindesay.co.uk/) and [@dscape](https://github.com/dscape))
  * Allow whitepsace other than "space" before attributes passed to mixins (N.B. there is a small chance this could be a breaking change for you) ([@regular](https://github.com/regular))
  * Track dependencies so file watchers can be more clever ([@ForbesLindesay](http://www.forbeslindesay.co.uk/) and [@sdether](https://github.com/sdether))
  * Allow passing options to filtered includes ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Fix bugs with indentation in filters ([@ForbesLindesay](http://www.forbeslindesay.co.uk/) and [@lackac](https://github.com/lackac))
  * Warn on block names that are never used ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))

1.3.1 / 2014-04-04
==================

  * Fix error with tags in xml that are self-closing in html ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Fix error message for inline tags with content ([@hiddentao](https://github.com/hiddentao))

1.3.0 / 2014-03-02
==================

  * Fix a bug where sometimes mixins were removed by an optimisation even though they were being called ([@ForbesLindesay](http://www.forbeslindesay.co.uk/), reported by [@leider](https://github.com/leider))
  * Updated with to support automatically detecting when a value is "global" and removed redundant `options.globals` option ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Improve warnings for tags with multiple attributes ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Deprecate (with a warning) `node.clone`, `block.replace`, `attrs.removeAttribute`, `attrs.getAttribute` - these are all internal APIs for the AST ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))

1.2.0 / 2014-02-26
==================

  * Use variables instead of properties of pug, improving performance and reliability with nested templates ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Support compiling templates from stdin via a user typing ([@yorkie](https://github.com/yorkie))
  * Lazily add mixins ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Fix case fall-through ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Earlier errors for `when` without `case` and `else` without `if` ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Allow `if`/`else` etc. to not have a block.
  * Remove lib-cov legacy to make browserify work better ([@silver83](https://github.com/silver83))
  * Add and improve test coverage using istanbul ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))

1.1.5 / 2014-01-19
==================

  * Add filename to and fix line numbers for missing space before text warning (@ijin82)
  * Fix filenames for some error reporting in extends/includes (@doublerebel)
  * Fix a corner case where a mixin was called with `&attributes` but no other attributes and a block that was supposed to be fixed in 1.1.4 ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))

1.1.4 / 2014-01-09
==================

  * Fix a corner case where a mixin was called with `&attributes` but no other attributes and a block ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))

1.1.3 / 2014-01-09
==================

  * Fix failure of npm prepublish not running

1.1.2 / 2014-01-09
==================

  * Fix same interaction of `&attributes` with `false` `null` or `undefined` but combined with dynamic attributes ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))

1.1.1 / 2014-01-09
==================

  * Fix a bug when `&attributes` is combined with static attributes that evaluate to `false` or `null` or `undefined` ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))

1.1.0 / 2014-01-07
==================

  * Fix class merging to work as documented ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Throw an error when the same attribute is duplicated multiple times ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Move more errors into the parser/lexer so they have more info about line numbers ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Support mixin blocks at the end of files ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))

1.0.2 / 2013-12-31
==================

  * Fix a bug when `&attributes` is combined with dynamic attributes ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))

1.0.1 / 2013-12-29
==================

  * Allow self closing tags to contian whitespace ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Allow tags to have a single white space after them ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Support text bodies of tags that begin with `//` rather than treating them as comments ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))

1.0.0 / 2013-12-22
==================

  * No longer support node@0.8 ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Fix error reporting in layouts & includes ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Allow a list of 'globals' to be passed as an array at compile time & don't automatically expose all globals ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Escape apostrophes in data attributes (@qualiabyte)
  * Fix mixin/block interaction ([@ForbesLindesay](http://www.forbeslindesay.co.uk/) & [@paulyoung](https://github.com/paulyoung))
  * Ignore trailing space after mixin declaration ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Make literal `.` work as expected ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Remove implicit text only for script/style ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Stop parsing comments and remove support for conditional comments ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Make filtering includes explicit ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Remove special assignment syntax ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Remove `!!!` shortcut for `doctype` ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Remove `5` shorcut for `html` doctype ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Remove `colons` option from the distant past ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Add a sepatate `compileClient` and `compileFileClient` to replace the `client` option ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Remove polyfills for supporting old browsers ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Allow interpolation for mixin names ([@jeromew](https://github.com/jeromew)
  * Use `node.type` instead of `node.constructor.name` so it can be minified ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Allow hyphens in filter names ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Throw an error if a self closing tag has content ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Support inline tags ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Replace `attributes` magic attribute with `&attributes(attributes)` ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Remove automatic tag wrapping for filters, you can just put the tags in yourself now ([@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Remove whitespace from tags nested inside pre tags ([@markdalgleish](http://markdalgleish.com))

0.35.0 / 2013-08-21
===================

  * Add support for space separated attributes (thanks to [@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Add earlier errors for invalid JavaScript expressions (thanks to [@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * Fix parsing files with UTF8 BOMs when they are includes or parent/layout templates (thanks to [@kiinoo](https://github.com/kiinoo))

0.34.1 / 2013-07-26
===================

  * fix render file not working when called with callback (reported by [@xieren58](https://github.com/xieren58))

0.34.0 / 2013-07-26
===================

  * callbacks only called once for async methods even if they throw (reported by [@davidcornu](https://github.com/davidcornu))
  * HTML comments are pretty printed better (thanks to [@eddiemonge](https://github.com/eddiemonge))
  * callbacks are optional and leaving them out results in synchronous operation (thanks to [@ForbesLindesay](http://www.forbeslindesay.co.uk/))
  * empty filter nodes are now permitted (thanks to [@coderanger](https://github.com/coderanger))
  * overhaul website and documentation (thanks to [@ForbesLindesay](http://www.forbeslindesay.co.uk/)), much more of this to come.

0.33.0 / 2013-07-12
===================

  * Hugely more powerful error reporting (especially with `compileDebug` set explicitly to `true`)
  * Add a warning for tags with multiple attributes
  * be strict about requiring newlines after tags to fix some odd corner cases
  * fix escaping of class to allow it to be unescaped (thanks to [@christiangenco](https://github.com/christiangenco))

0.32.0 / 2013-06-28
===================

  * remove `pug.version` and fix `pug --version`
  * add file name and line number to deprecation warnings
  * use constantinople for better constant detection
  * update `with` for a massive performance upgrade at compile time

0.31.2 / 2013-06-07
===================

  * fix overzealous deprecation warnings

0.31.1 / 2013-05-31
===================

  * fix line endings for executable command
  * fix `locals` variable being undefined
  * fix an obscure bug that could occur if multiple mixins interact badly (see [substack/lexical-scope#13](https://github.com/substack/lexical-scope/issues/13))

0.31.0 / 2013-05-30
==================

  * deprecate implicit text-only `script` and `style` tags
  * make `with` at compile time using `lexical-scope`
  * add `options.parser` that behaves exactly like `options.compiler`
  * add "component.json" for component (runtime) support
  * removed `hasOwnProperty` check in each loops
  * removed .min files from the repository (people can just generate these themselves)
  * use browserify to compile client side libraries
  * fix buggy block extending should now be fixed
  * fix preserve case of custom doctypes
  * fix regexps in attributes sometimes not being accepted
  * fix allow `$` sign in each loop variable names
  * fix mixins with buffered code on the same line
  * fix separate class names by ` ` rather than `,` (was sometimes incorrect)

0.30.0 / 2013-04-25
==================

  * add support for 'include' and 'extends' to use paths relative to basedir
  * fix accidental calling of functions in iteration block. Closes #986
  * fix: skip rethrow on client
  * fix each/else prefixed with `-`
  * fix multi-block prepend/append
  * swap -o and -O, set -o to --out

0.29.0 / 2013-04-16
==================

  * add "monocle" for watcher that actually works...
  * fix interpolation in blocks of text
  * fix attribute interpolation
  * move filters to an external library
  * fix JavaScript escaping corner cases

0.28.2 / 2013-03-04
==================

  * wtf coffeescript is not a dep

0.28.1 / 2013-01-10
==================

  * add passing of filename to include filters
  * fix wrong new lines for include filters

0.28.0 / 2013-01-08
==================

  * add .css and .js "filters". re #438
  * add include filters. Closes #283
  * fix "class:" within attribute escaping
  * removing ast filters
  * things I can't read:
  * 反馈地址
  * 样式
  * 联系
  * 初稿，翻译完
  * 接受大鸟的建议
  * 头晕，翻译一点点
  * 到过滤器翻译完毕
  * 翻译一部分
  * 中文翻译单独放
  * 特性部分
  * 再翻
  * 翻译一点点

0.27.7 / 2012-11-05
==================

  * fix each/else clause for enumerated objects
  * fix #764 (incorrect line number for error messages)
  * fix double-escaping of interpolated js slashes. Closes #784

0.27.6 / 2012-10-05
==================

  * Included templates can not override blocks of their parent. Closes #699

0.27.5 / 2012-09-24
==================

  * fix attr interpolation escaping. Closes #771

0.27.4 / 2012-09-18
==================

  * fix include yields. Closes #770

0.27.3 / 2012-09-18
==================

  * fix escaping of interpolation. Closes #769
  * loosen "mkdirp" version restriction [TooTallNate]

0.27.2 / 2012-08-07
==================

  * Revert "fixing string interpolation escaping #731", problems reported

0.27.1 / 2012-08-06
==================

  * fix attribute interpolation escaping #731
  * fix string interpolation escaping #731

0.27.0 / 2012-07-26
==================

  * added ability to pass in json file to `--obj`
  * add preliminary `each` `else` support. Closes #716
  * fix doctype bug overlooked in #712
  * fix stripping of utf-8 BOMs

0.26.3 / 2012-06-25
==================

  * Update version of commander that supports node v0.8.

0.26.2 / 2012-06-22
==================

  * Added --options alias of --obj
  * Added reserved word conflict prevention in Google's Closure Compiler
  * Added tag interpolation. Closes #657
  * Allow the compiled client to use it's own pug util functions [3rd-Eden]
  * Fixed `attrs()` escape bug [caseywebdev]

0.26.1 / 2012-05-27
==================

  * Changed default doctype to __html5__
  * Performance: statically compile attrs when possible [chowey]
  * Fixed some class attribute merging cases
  * Fixed so `block` doesn't consume `blockquotes` tag [chowey]
  * Fixed backslashes in text nodes [chowey]
  * Fixed / in text. Closes #638

0.26.0 / 2012-05-04
==================

  * Added package.json __component__ support
  * Added explicit self-closing tag support. Closes #605
  * Added `block` statement
  * Added mixin tag-like behaviour [chowey]
  * Fixed mixins with extends [chowey]

0.25.0 / 2012-04-18
==================

  * Added preliminary mixin block support. Closes #310
  * Fixed whitespace handling in various situations [chowey]
  * Fixed indentation in various situations [chowey]

0.24.0 / 2012-04-12
==================

  * Fixed unescaped attribute compilation
  * Fixed pretty-printing of text-only tags (__Warning__: this may affect rendering) [chowey]

0.23.0 / 2012-04-11
==================

  * Added data-attr json stringification support. Closes #572
  * Added unescaped attr support. Closes #198
  * Fixed #1070, reverted mixin function statements
  * Fixed pug.1 typo

0.22.1 / 2012-04-04
==================

  * Fixed source tags. now self-closing. Closes #308
  * Fixed: escape backslashes in coffeescript filter

0.22.0 / 2012-03-22
==================

  * Added pug manpage (`man pug` after installation for docs)
  * Added `-D, --no-debug` to pug(1)
  * Added `-p, --pretty` to pug(1)
  * Added `-c, --client` option to pug(1)
  * Fixed `-o { client: true }` with stdin
  * Fixed: skip blank lines in lexer (unless within pipeless text). Closes #399

0.21.0 / 2012-03-10
==================

  * Added new input/output test suite using Mocha's string diffing
  * Added alias `extend` -> `extends`. Closes #527 [guillermo]
  * Fixed include escapes. Closes #513
  * Fixed block-expansion with .foo and #foo short-hands. Closes #498

0.20.3 / 2012-02-16
==================

  * Changed: pass `.filename` to filters only

0.20.2 / 2012-02-16
==================

  * Fixed `:stylus` import capabilities, pass .filename

0.20.1 / 2012-02-02
==================

  * Fixed Block#includeBlock() with textOnly blocks

0.20.0 / 2011-12-28
==================

  * Added a browser example
  * Added `yield` for block `include`s
  * Changed: replaced internal `__` var with `__pug` [chrisleishman]
  * Fixed two globals. Closes #433

0.19.0 / 2011-12-02
==================

  * Added block `append` / `prepend` support. Closes #355
  * Added link in readme to pug-mode for Emacs
  * Added link to python implementation

0.18.0 / 2011-11-21
==================

  * Changed: only ['script', 'style'] are text-only. Closes #398'

0.17.0 / 2011-11-10
==================

  * pug.renderFile() is back! (for express 3.x)
  * Fixed `Object.keys()` failover bug

0.16.4 / 2011-10-24
==================

  * Fixed a test due to reserved keyword
  * Fixed: commander 0.1.x dep for 0.5.x

0.16.3 / 2011-10-24
==================

  * Added: allow leading space for conditional comments
  * Added quick implementation of a switch statement
  * Fixed parens in mixin args. Closes #380
  * Fixed: include files with a .pug extension as pug files

0.16.2 / 2011-09-30
==================

  * Fixed include regression. Closes #354

0.16.1 / 2011-09-29
==================

  * Fixed unexpected `else` bug when compileDebug: false
  * Fixed attr state issue for balancing pairs. Closes #353

0.16.0 / 2011-09-26
==================

  * Added `include` block support. Closes #303
  * Added template inheritance via `block` and `extends`. Closes #242
  * Added 'type="text/css"' to the style tags generated by filters.
  * Added 'uglifyjs' as an explicit devDependency.
  * Added  -p, --path <path> flag to pug(1)
  * Added support for any arbitrary doctype
  * Added `pug.render(str[,options], fn)` back
  * Added first-class `while` support
  * Added first-class assignment support
  * Fixed runtime.js `Array.isArray()` polyfill. Closes #345
  * Fixed: set .filename option in pug(1) when passing filenames
  * Fixed `Object.keys()` polyfill typo. Closes #331
  * Fixed `include` error context
  * Renamed magic "index" to "$index". Closes #350

0.15.4 / 2011-09-05
==================

  * Fixed script template html. Closes #316
  * Revert "Fixed script() tag with trailing ".". Closes #314"

0.15.3 / 2011-08-30
==================

  * Added Makefile example. Closes #312
  * Fixed script() tag with trailing ".". Closes #314

0.15.2 / 2011-08-26
==================

  * Fixed new conditional boundaries. Closes #307

0.15.1 / 2011-08-26
==================

  * Fixed pug(1) support due to `res.render()` removal
  * Removed --watch support (use a makefile + watch...)

0.15.0 / 2011-08-26
==================

  * Added `client` option to reference runtime helpers
  * Added `Array.isArray()` for runtime.js as well
  * Added `Object.keys()` for the client-side runtime
  * Added first-class `if`, `unless`, `else` and `else if` support
  * Added first-class `each` / `for` support
  * Added `make benchmark` for continuous-bench
  * Removed `inline` option, SS helpers are no longer inlined either
  * Removed `Parser#debug()`
  * Removed `pug.render()` and `pug.renderFile()`
  * Fixed runtime.js `escape()` bug causing window.escape to be used
  * Fixed a bunch of tests

0.14.2 / 2011-08-16
==================

  * Added `include` support for non-pug files
  * Fixed code indentation when followed by newline(s). Closes #295 [reported by masylum]

0.14.1 / 2011-08-14
==================

  * Added `colons` option for everyone stuck with ":". Closes #231
  * Optimization: consecutive lines are merged in compiled js

0.14.0 / 2011-08-08
==================

  * Added array iteration with index example. Closes #276
  * Added _runtime.js_
  * Added `compileDebug` option to enable lineno instrumentation
  * Added `inline` option to disable inlining of helpers (for client-side)

0.13.0 / 2011-07-13
==================

  * Added `mixin` support
  * Added `include` support
  * Added array support for the class attribute

0.12.4 / 2011-06-23
==================

  * Fixed filter indentation bug. Closes #243

0.12.3 / 2011-06-21
==================

  * Fixed empty strings support. Closes #223
  * Fixed conditional comments documentation. Closes #245

0.12.2 / 2011-06-16
==================

  * Fixed `make test`
  * Fixed block comments

0.12.1 / 2011-06-04
==================

  * Fixed attribute interpolation with double quotes. Fixes #232 [topaxi]

0.12.0 / 2011-06-03
==================

  * Added `doctype` as alias of `!!!`
  * Added; doctype value is now case-insensitive
  * Added attribute interpolation support
  * Fixed; retain original indentation spaces in text blocks

0.11.1 / 2011-06-01
==================

  * Fixed text block indentation [Laszlo Bacsi]
  * Changed; utilizing devDependencies
  * Fixed try/catch issue with renderFile(). Closes #227
  * Removed attribute ":" support, use "=" (option for ':' coming soon)

0.11.0 / 2011-05-14
==================

  * Added `self` object to avoid poor `with(){}` performance [masylum]
  * Added `doctype` option [Jeremy Larkin]

0.10.7 / 2011-05-04
==================

  * expose Parser

0.10.6 / 2011-04-29
==================

  * Fixed CS `Object.keys()` [reported by robholland]

0.10.5 / 2011-04-26
==================

  * Added error context after the lineno
  * Added; indicate failing lineno with ">"
  * Added `Object.keys()` for the client-side
  * Fixed attr strings when containing the opposite quote. Closes 207
  * Fixed attr issue with js expressions within strings
  * Fixed single-quote filter escape bug. Closes #196


0.10.4 / 2011-04-05
==================

  * Added `html` doctype, same as "5"
  * Fixed `pre`, no longer text-only

0.10.3 / 2011-03-30
==================

  * Fixed support for quoted attribute keys ex `rss("xmlns:atom"="atom")`

0.10.2 / 2011-03-30
==================

  * Fixed pipeless text bug with missing outdent

0.10.1 / 2011-03-28
==================

  * Fixed `support/compile.js` to exclude browser js in node
  * Fixes for IE [Patrick Pfeiffer]

0.10.0 / 2011-03-25
==================

  * Added AST-filter support back in the form of `<tag>[attrs]<:><block>`

0.9.3 / 2011-03-24
==================

  * Added `Block#unshift(node)`
  * Added `pug.js` for the client-side to the repo
  * Added `pug.min.js` for the client-side to the repo
  * Removed need for pipes in filters. Closes #185
    Note that this _will_ break filters used to
    manipulate the AST, until we have a different
    syntax for doing so.

0.9.2 / 2011-03-23
==================

  * Added pug `--version`
  * Removed `${}` interpolation support, use `#{}`

0.9.1 / 2011-03-16
==================

  * Fixed invalid `.map()` call due to recent changes

0.9.0 / 2011-03-16
==================

  * Added client-side browser support via `make pug.js` and `make pug.min.js`.

0.8.9 / 2011-03-15
==================

  * Fixed preservation of newlines in text blocks

0.8.8 / 2011-03-14
==================

  * Fixed pug(1) stdio

0.8.7  / 2011-03-14
==================

  * Added `mkdirs()` to pug(1)
  * Added pug(1) stdio support
  * Added new features to pug(1), `--watch`, recursive compilation etc [khingebjerg]
  * Fixed pipe-less text newlines
  * Removed pug(1) `--pipe` flag

0.8.6 / 2011-03-11
==================

  * Fixed parenthesized expressions in attrs. Closes #170
  * Changed; default interpolation values `== null` to ''. Closes #167

0.8.5 / 2011-03-09
==================

  * Added pipe-less text support with immediate ".". Closes #157
  * Fixed object support in attrs
  * Fixed array support for attrs

0.8.4 / 2011-03-08
==================

  * Fixed issue with expressions being evaluated several times. closes #162

0.8.2 / 2011-03-07
==================

  * Added markdown, discount, and markdown-js support to `:markdown`. Closes #160
  * Removed `:discount`

0.8.1 / 2011-03-04
==================

  * Added `pre` pipe-less text support (and auto-escaping)

0.8.0 / 2011-03-04
==================

  * Added block-expansion support. Closes #74
  * Added support for multi-line attrs without commas. Closes #65

0.7.1 / 2011-03-04
==================

  * Fixed `script()` etc pipe-less text with attrs

0.7.0 / 2011-03-04
==================

  * Removed `:javascript` filter (it doesn't really do anything special, use `script` tags)
  * Added pipe-less text support. Tags that only accept text nodes (`script`, `textarea`, etc) do not require `|`.
  * Added `:text` filter for ad-hoc pipe-less
  * Added flexible indentation. Tabs, arbitrary number of spaces etc
  * Added conditional-comment support. Closes #146
  * Added block comment support
  * Added rss example
  * Added `:stylus` filter
  * Added `:discount` filter
  * Fixed; auto-detect xml and do not self-close tags. Closes #147
  * Fixed whitespace issue. Closes #118
  * Fixed attrs. `,`, `=`, and `:` within attr value strings are valid  Closes #133
  * Fixed; only output "" when code == null. Ex: `span.name= user.name` when undefined or null will not output "undefined". Closes #130
  * Fixed; throw on unexpected token instead of hanging

0.6.3 / 2011-02-02
==================

  * Added `each` support for Array-like objects [guillermo]

0.6.2 / 2011-02-02
==================

  * Added CSRF example, showing how you can transparently add inputs to a form
  * Added link to vim-pug
  * Fixed self-closing col support [guillermo]
  * Fixed exception when getAttribute or removeAttribute run into removed attributes [Naitik Shah]

0.6.0 / 2010-12-19
==================

  * Added unescaped interpolation variant `!{code}`. Closes #124
  * Changed; escape interpolated code by default `#{code}`

0.5.7 / 2010-12-08
==================

  * Fixed; hyphen in get `tag()`

0.5.6 / 2010-11-24
==================

  * Added `exports.compile(str, options)`
  * Renamed internal `_` to `__`, since `_()` is commonly used for translation

0.5.5 / 2010-10-30
==================

  * Add _coffeescript_ filter [Michael Hampton]
  * Added link to _slim_; a ruby implementation
  * Fixed quoted attributes issue.

  * Fixed attribute issue with over greedy regexp.
    Previously "p(foo=(((('bar')))))= ((('baz')))"
    would __fail__ for example since the regexp
    would lookahead to far. Now we simply pair
    the delimiters.

0.5.4 / 2010-10-18
==================

  * Adding newline when using tag code when preceding text
  * Assume newline in tag text when preceding text
  * Changed; retain leading text whitespace
  * Fixed code block support to prevent multiple buffer openings [Jake Luer]
  * Fixed nested filter support

0.5.3 / 2010-10-06
==================

  * Fixed bug when tags with code also have a block [reported by chrisirhc]

0.5.2 / 2010-10-05
==================

  * Added; Text introduces newlines to mimic the grammar.
    Whitespace handling is a little tricky with this sort of grammar.
    Pug will now mimic the written grammar, meaning that text blocks
    using the "|" margin character will introduce a literal newline,
    where as immediate tag text (ex "a(href='#') Link") will not.

    This may not be ideal, but it makes more sense than what Pug was
    previously doing.

  * Added `Tag#text` to disambiguate between immediate / block text
  * Removed _pretty_ option (was kinda useless in the state it was in)
  * Reverted ignoring of newlines. Closes #92.
  * Fixed; `Parser#parse()` ignoring newlines

0.5.1 / 2010-10-04
==================

  * Added many examples
  * Added; compiler api is now public
  * Added; filters can accept / manipulate the parse tree
  * Added filter attribute support. Closes #79
  * Added LL(*) capabilities
  * Performance; wrapping code blocks in {} instead of `(function(){}).call(this)`
  * Performance; Optimized attribute buffering
  * Fixed trailing newlines in blocks

0.5.0 / 2010-09-11
==================

  * __Major__ refactor. Logic now separated into lexer/parser/compiler for future extensibility.
  * Added _pretty_ option
  * Added parse tree output for _debug_ option
  * Added new examples
  * Removed _context_ option, use _scope_

0.4.1 / 2010-09-09
==================

  * Added support for arbitrary indentation for single-line comments. Closes #71
  * Only strip first space in text (ex '|  foo' will buffer ' foo')

0.4.0 / 2010-08-30
==================

  * Added tab naive support (tabs are converted to a single indent, aka two spaces). Closes #24
  * Added unbuffered comment support. Closes #62
  * Added hyphen support for tag names, ex: "fb:foo-bar"
  * Fixed bug with single quotes in comments. Closes #61
  * Fixed comment whitespace issue, previously padding. Closes #55

0.3.0 / 2010-08-04
==================

  * Added single line comment support. Closes #25
  * Removed CDATA from _:javascript_ filter. Closes #47
  * Removed _sys_ local
  * Fixed code following tag

0.2.4 / 2010-08-02
==================

  * Added Buffer support to `render()`
  * Fixed filter text block exception reporting
  * Fixed tag exception reporting

0.2.3 / 2010-07-27
==================

  * Fixed newlines before block
  * Fixed; tag text allowing arbitrary trailing whitespace

0.2.2 / 2010-07-16
==================

  * Added support for `pug.renderFile()` to utilize primed cache
  * Added link to [textmate bundle](http://github.com/miksago/pug-tmbundle)
  * Fixed filter issue with single quotes
  * Fixed hyphenated attr bug
  * Fixed interpolation single quotes. Closes #28
  * Fixed issue with comma in attrs

0.2.1 / 2010-07-09
==================

  * Added support for node-discount and markdown-js
    depending on which is available.

  * Added support for tags to have blocks _and_ text.
    this kinda fucks with arbitrary whitespace unfortunately,
    but also fixes trailing spaces after tags _with_ blocks.

  * Caching generated functions. Closes #46

0.2.0 / 2010-07-08
==================

  * Added `- each` support for readable iteration
  * Added [markdown-js](http://github.com/evilstreak/markdown-js) support (no compilation required)
  * Removed node-discount support

0.1.0 / 2010-07-05
==================

  * Added `${}` support for interpolation. Closes #45
  * Added support for quoted attr keys: `label("for": 'something')` is allowed (_although not required_) [Guillermo]
  * Added `:less` filter [jakeluer]

0.0.2 / 2010-07-03
==================

  * Added `context` as synonym for `scope` option [Guillermo]
  * Fixed attr splitting: `div(style:"color: red")` is now allowed
  * Fixed issue with `(` and `)` within attrs: `a(class: (a ? 'a' : 'b'))` is now allowed
  * Fixed issue with leading / trailing spaces in attrs: `a( href="#" )` is now allowed [Guillermo]

