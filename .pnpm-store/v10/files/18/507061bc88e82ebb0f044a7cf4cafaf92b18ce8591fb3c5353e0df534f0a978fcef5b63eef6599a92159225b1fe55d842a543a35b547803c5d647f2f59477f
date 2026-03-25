# Changelog

#### Legend:

:japanese_ogre: — be afraid of this change because it breaks the way things
worked before.  
:star: — some new thing has been added.  
:green_apple: — some bad thing has been fixed.  

## 30.03.2020, version 4.3.0

:star: Added support for interpolation of custom properties in Sass.
:green_apple: Updated minimist version to 1.2.5.
:green_apple: Updated playground link to https.

## 22.03.2019, version 4.2.4

:star: Renamed `prepublish` script to `prepublishOnly`.  
:star: Updated link to playground.  
:green_apple: Fixed badges.  
:green_apple: Fixed `content` guard in `node.contains()`.  

## 28.09.2017, version 4.2.3

:green_apple: Fixed parsing of empty `url()` in Sass and SCSS.

## 30.08.2017, version 4.2.2

:green_apple: Fixed parsing of `/deep/` in CSS, LESS, Sass and SCSS.

## 29.08.2017, version 4.2.1

:green_apple: Fixed parsing of `pseudo-element` in CSS, LESS, Sass and SCSS.

## 29.08.2017, version 4.2.0

:star: Add support for custom property syntax in CSS, Sass and SCSS.  
:star: Add support for deep combinator syntax in CSS, LESS, Sass and SCSS.  
:star: Add support for alternative descendant `>>` syntax in CSS, LESS, Sass and SCSS.  
:star: Add support for `::slotted()` syntax in CSS, LESS, Sass and SCSS.  
:green_apple: Fixed parsing of non-lowercase keyframes at-rule in CSS, LESS, Sass and SCSS.  
:green_apple: Fixed parsing of multiline selectors within keyframes in  Sass.  
:green_apple: Fixed parsing of `!important` within maps in Sass and SCSS.  
:green_apple: Fixed parsing of `...` following a function in Sass and SCSS.  

## 23.08.2017, version 4.1.1

:star: Unified codebase style across syntaxes.  
:green_apple: Fixed parsing of URLs in Sass and SCSS.  
:green_apple: Fixed parsing of placeholders in Sass and SCSS.  
:green_apple: Fixed parsing of interpolated values within type selectors in Sass and SCSS.  
:green_apple: Fixed parsing of spacing within pseudo class arguments in all syntaxes.  
:green_apple: Fixed parsing of parent selectors within parentheses in Sass and SCSS.  
:star: Abstracted attribute tests for CSS, LESS, Sass and SCSS.  
:green_apple: Fixed parsing of pseudo classes within keyframes in Sass and SCSS.  
:green_apple: Fixed parsing of dimensions in LESS.

## 20.11.2016, version 4.0.3

:green_apple: Fixed parsing of interpolations inside URI nodes in SCSS and Sass.  

## 18.11.2016, version 4.0.2

:green_apple: Fixed parsing of trailing newlines.  

## 18.11.2016, version 4.0.1

:japanese_ogre: Removed `postinstall` script.  

## 17.11.2016, version 4.0.0

:japanese_ogre: Dropped support for Node < 4.  
:japanese_ogre: Brought back `postinstall` script that should allow installing
from GitHub.  
:japanese_ogre: Made multiline comments in Sass consistent with other syntaxes
by removing closing `*/` from node's content.  
:japanese_ogre: Implemented new node type, `universalSelector`, which represents
`*`. See [docs](https://github.com/tonyganch/gonzales-pe/blob/dev/docs/node-types.md#universalselector)
for more details.
:green_apple: Fixed parsing of comments in Sass.  
:green_apple: Fixed parsing of keyframes inside includes in Sass.  
:green_apple: Fixed parsing of flags in arguments in Sass and SCSS.  
:green_apple: Fixed parsing of multiple declarations within arguments in SCSS
and Sass.  
:green_apple: Improved parsing of interpolations in SCSS and Sass.  
:green_apple: Adjust parsing priority of declarations & atrule in Less.  

## 22.10.2016, version 3.4.7

:green_apple: Included forgotten test for #226.  
:green_apple: Fixed issue when `!important` was not parsed as function argument.  

## 22.10.2016, version 3.4.6

:green_apple: Changed parsing of `ident` nodes which fixed issue with asterisks
being parsed as idents instead of operators.  
:green_apple: Fixed capitalisation in Changelog.  

## 20.10.2016, version 3.4.5

:green_apple: Change parser to strip DOS newlines from comments.  
:star: Add links to README.md.  

## 12.08.2016, version 3.4.4

:green_apple: Fixed parsing of numbers following interpolation in class
selectors in Sass and SCSS.  

## 08.08.2016, version 3.4.3

:green_apple: Fixed parsing of unicode ranges.  

## 04.08.2016, version 3.4.2

:green_apple: Disable Google Closure Compiler due to some errors in parsing.  

## 27.07.2016, version 3.4.1

:star: Added publich script.  
:green_apple: Fixed post-refactor error in Node#last method.  

## 27.07.2016, version 3.4.0

:star: Added `unicode-range` and `urange` node types in CSS, Less, Sass and SCSS.  
:green_apple: Fixed parsing of trailing interpolation in compound selector in Sass and SCSS.  
:green_apple: Fix parsing of hyphens after interpolation with parentSelectors in Sass and SCSS.  
:green_apple: Added ESLint and moved linters to a separate script.  
:green_apple: Fixed incorrect dimension wrap of unicode-ranges in CSS, Sass and SCSS.  
:green_apple: Fixed parsing of hyphens in interpolated idents in Sass and SCSS.  
:green_apple: Added compilation of JS using Google Closure.  

## 01.07.2016, version 3.3.6

:green_apple: Fixed parsing of nth selector without numbers before `n`.  

## 21.06.2016, version 3.3.5

:green_apple: Fixed issue with content at-rule and keyframes in Sass and SCSS.  
:green_apple: Fixed namespace attribute selector in CSS, Sass and SCSS.  
:green_apple: Fixed issue with modulo operator in values in Sass.  
:green_apple: Fixed usage of @content with keyframes in Sass and SCSS.  
:green_apple: Fixed namespace attribute selector issue in CSS, Sass and SCSS.  
:green_apple: Fixed parsing of interpolations in pseudo-classes in Sass and SCSS.  
:green_apple: Fixed interpolated percentage keyframe selector issue in Sass and SCSS.  
:green_apple: Updated Travis config to not include environment variables.  

## 18.05.2016, version 3.3.4

:green_apple: Fixed mistake from `@3.3.2` version when parent selector was
"correctly" parsed as property instead of value.  

## 18.05.2016, version 3.3.3

:green_apple: Fixed prepublish script to build lib.  

## 18.05.2016, version 3.3.2

:star: Added AppVeyor badge.  
:green_apple: Fixed build file to glue multiple syntaxes into one file.  
:green_apple: Fixed parsing of functions inside urls in Sass.  
:green_apple: Fixed parsing of mulitple keyframe selectors in CSS, Sass and SCSS.  
:green_apple: Fixed parsing of parent selector as property in Sass and SCSS.  
:green_apple: Fixed parsing of parent selector inside interpolations in Sass and SCSS.  

## 29.04.2016, version 3.3.1

:star: Added config for AppVeyor to run automated tests on Windows.  
:green_apple: Fix installation for Windows.  

## 28.04.2016, version 3.3.0

:star: Added browser support. `build.sh` now build a script that can be used in
browsers.

## 28.04.2016, version 3.2.7

:green_apple: Fixed typos and example in documentation.  
:green_apple: Fixed parsing of functions inside urls in SCSS.  
:green_apple: Fixed parsing of selectors starting with combinators in Sass, SCSS
and Less.  
:green_apple: Fixed incorrect CRLF line numbers.  
:green_apple: Fixed parsing of extends that sometimes were incorrectly parsed
as atrules.  

## 07.02.2016, version 3.2.6

:green_apple: Fixed the issue with installation of the package with npm@3.  

## 07.02.2016, version 3.2.5

:green_apple: Fixed parsing of nested multiline selectors group.  

## 07.02.2016, version 3.2.4

:star: Added support for `!global` in Sass.  

## 07.02.2016, version 3.2.3

:star: Modified `npm test` to remove `.DS_Store` files before running tests.  
:star: Updated Travis config to use Node@5.0.  
:star: Updated Travis config to include compiler info.  
:star: Made it possible to build files if module is installed from github.  
:green_apple: Fixed parsing of interpolation content in Sass and SCSS.  
:green_apple: Fixed parsing of interpolation as part of parent selector
extension in Sass and SCSS.  
:green_apple: Fixed issue with keyframeSelector in includes in SCSS.  

## 17.01.2016, version 3.2.2

:green_apple: Made `ParsingError#message` property writeable.

## 19.10.2015, version 3.2.1

#### Parsing rules

:green_apple: Fixed the issue when selectors inside extends were not wrapped in
`selector` nodes in Sass and SCSS.  
:green_apple: Fixed parsing of multiple selectors in extends in Sass and SCSS.

## 19.10.2015, version 3.2.0

#### Node types

:star: Added new node type: `parentSelectorExtension`.

#### Parsing rules

:green_apple: Fixed parsing of parent selectors with extensions, like
`&__element` or `&--modifier`.

## 19.10.2015, version 3.1.1

#### Parsing rules

:green_apple: Fixed parsing of selectors starting or ending with a combinator
in Less, Sass and SCSS.

## 18.10.2015, version 3.1.0

#### CLI

:green_apple: Fixed passing a `--context` argument.  
:green_apple: Fixed printing of a simplified tree.  

#### Node types

:star: Added new node type: `keyframesSelector`.  

#### Parsing rules

:green_apple: Fixed parsing of keyframes in all syntaxes.  

## 18.10.2015, version 3.0.3

#### Parsing rules

:green_apple: Fixed parsing of spaces inside interpolations in Sass and SCSS.  

## 18.10.2015, version 3.0.2

#### Parsing rules

:green_apple: Fixed the issue when operators were parsed as idents inside
parentheses in Sass and SCSS.  

## 18.10.2015, version 3.0.1

#### Parsing rules
:green_apple: Fixed parsing of parent selectors in SCSS and Less.  
:green_apple: Fixed parsing of placeholders inside selectors in SCSS.  

## 18.10.2015, version 3.0.0

#### CLI

:japanese_ogre: Made cli process stdin only if `-` argument is passed.  
:star: Added help message.  

#### API

:japanese_ogre: Renamed `parseTree.remove` to `parseTree.removeChild()`.  
:japanese_ogre: Unwraped callback parameters for `traverse...` methods.  
:japanese_ogre: Made `first()`, `last()` and `get()` methods return `null` if no child nodes were found.  
:japanese_ogre: Made `node.length` return a number of child nodes.  
:japanese_ogre: Renamed `rule` to `context`.  
:star: Made `parseTree.removeChild()` return a removed node.  
:star: Added `traverseBy...` methods to all nodes, not only root ones.  
:star: Added support for specifying a tab size in spaces.  

#### Parsing rules

:green_apple: Fixed parsing of single-line comments after `url` token.  
:green_apple: Fixed parsing of interpolations inside id selectors in Less.  
:green_apple: Fixed parsing of selectors according to spec.  
:green_apple: Fixed parsing of placeholders as selectors in SCSS.  

#### Misc

:star: Added Travis badge to Readme page.  
:star: Added init script to build sources.  
:star: Added commit message template.  

## 05.10.2015, version 3.0.0-beta

#### CLI

:star: Added `--simple` flag for printing a simplified tree structure.  
:green_apple: CLI now prints parse tree to stdout.  

#### API

:japanese_ogre: Parse tree is now represented as objects, not arrays.  
:japanese_ogre: Renamed `gonzales.srcToAST()` to `gonzales.parse()`.
See [Readme](README.md#gonzalesparsecss-options).  
:japanese_ogre: Renamed `gonzales.astToSrc()` to `parseTree.toString()`.
See [Readme](README.md#parsetreetostring).  
:japanese_ogre: Renamed `gonzales.astToString()` to `parseTree.toJson()`.
See [Readme](README.md#parsetreetojson).  
:star: Added information about column number to nodes.  
:star: Added information about end position to nodes.  
:green_apple: Made empty strings to be parsed as empty nodes.  

#### Node types

:japanese_ogre: In Sass renamed `interpolatedVariable` to `interpolation`.  
:japanese_ogre: Separated `include` and `extend` nodes.  
:japanese_ogre: Replaced `filter` with `declaration`.  
:japanese_ogre: Replaced `braces` with `brackets` and `parentheses`.  
:japanese_ogre: Replaced `atrulers` with `block`.  
:japanese_ogre: Renamed `nthSelector` to `pseudoClass`.  
:japanese_ogre: Renamed `atrules`, `atruler` and `atruleb` to `atrule`.  
:japanese_ogre: Renamed `functionBody` to `arguments`.  
:japanese_ogre: Renamed `functionExpression` to `expression`.  
:japanese_ogre: Renamed `attrib` to `attributeSelector`.  
:japanese_ogre: Renamed `attrselector` to `attributeMatch`.  
:japanese_ogre: Renamed `commentSL` to `singlelineComment`.  
:japanese_ogre: Renamed `commentML` to `multilineComment`.  
:japanese_ogre: Renamed `declDelim` to `declarationDelimiter`.  
:japanese_ogre: Renamed `delim` to `delimiter`.  
:japanese_ogre: Renamed `propertyDelim` to `propertyDelimiter`.  
:japanese_ogre: Renamed `pseudoc` to `pseudoClass`.  
:japanese_ogre: Renamed `pseudoe` to `pseudoElement`.  
:japanese_ogre: Renamed `s` to `space`.  
:japanese_ogre: Renamed `shash` to `color`.  
:japanese_ogre: Renamed `vhash` to `id`.  
:japanese_ogre: Removed `atrulerq`, `unary` and `unknown`.  
:star: Added `attributeFlags`.  
:star: Added `attributeName`.  
:star: Added `attributeValue`.  
:star: Added `conditionalStatement`.  
:star: Added `namePrefix`.  
:star: Added `namespacePrefix`.  
:star: Added `namespaceSeparator`.  
:star: Added `typeSelector`.  

#### Parsing rules

:japanese_ogre: Spaces that separate two nodes are now put between those
nodes in parse tree.  
:star: Added support for `extend` nodes in Less.  
:star: Added support for equality and inequality signs in Sass and SCSS.  
:star: Added support for `/deep/` combinator.  
:star: Added support for `!optional` and `!global` in Sass and SCSS.  
:green_apple: Fixed parsing of interpolations in Sass and SCSS.  
:green_apple: Fixed parsing of arguments in Sass, SCSS and Less.  
:green_apple: Fixed parsing of declaration delimiters in Sass.  
:green_apple: Fixed the issue when pseudo-classes were parsed like declarations.  
:green_apple: Fixed parsing of selectors on multiple lines in Sass.  
:green_apple: Fixed parsing of percent sign as operator in SCSS.  
:green_apple: Fixed parsing of pseudo-elements as selectors in Sass.  

#### Misc

:star: Added Babel to build source files.  
:star: Used mocha for tests.  
:star: Added helper scripts.  
:star: Added Travis config.  
:rocket: Improved tests structure.  
:rocket: Separated log and test scripts.  
:rocket: Improved error messages.  
:rocket: Removed benchmark tests.  
:rocket: Moved source files from `lib` to `src` directory.  
:rocket: Made package availbale for install from GitHub.  

## 29.12.2013, version 2.0.2

- Sass includes can have both arguments list and content block,
  i.e. `@include nani() { color: tomato }` is valid syntax.

## 18.11.2013, version 2.0.1

- Bring back lost whitespaces and comments

## 11.11.2013, version 2.0.0

- Support preprocessors: Sass (both SCSS and indented syntax), LESS.
- New node types:
    - `arguments` (less and sass only)
    - `commentML`
    - `commentSL` (less and sass only)
    - `condition` (sass only)
    - `default` (sass only)
    - `escapedString` (less only)
    - `include` (less and sass only)
    - `loop` (sass only)
    - `mixin` (less and sass only)
    - `parentselector` (less and sass only)
    - `placeholder` (sass only)
    - `propertyDelim`
    - `variable` (less and sass only)
    - `varialeList` (less and sass only)
- Rename methods:
    - `srcToCSSP` -> `cssToAST`
    - `csspToSrc` -> `astToCSS`
    - `csspToTree` -> `astToTree`
- Pass all arguments as one object:
    - `gonzales.cssToAST({css: a, syntax: b, rule: c, needInfo: d})`
    - `gonzales.astToCSS({ast: ast, syntax: syntax})`
- Remove built files from VCS
- Move test command from `make` to `npm`
- Build files before running tests
- Divide tests into groups according to syntax
- Add script to test one specific css string
- Add token's index number to info object

## 11.02.2013, version 1.0.7

- Identifiers like `_0` are identifiers now.
- Throw error instead of console.error: https://github.com/css/csso/issues/109

## 25.11.2012, version 1.0.6

- Typo fix (global variable leak): https://github.com/css/csso/pull/110
- Attribute selectors extended by `|`.
- `not(..)` pseudo-class special support: https://github.com/css/csso/issues/111

## 28.10.2012, version 1.0.5

- Better error line numbering: https://github.com/css/gonzales/issues/2

## 11.10.2012, version 1.0.4

- CSSO issue (@page inside @media error): https://github.com/css/csso/issues/90

## 10.10.2012, version 1.0.3

- Both .t-1 and .t-01 should be idents: https://github.com/css/gonzales/issues/1

## 08.10.2012, version 1.0.2

- CSSO issue (filter + important breaks csso v1.3.1): https://github.com/css/csso/issues/87

## 08.10.2012, version 1.0.1

- CSSO issue ("filter" IE property breaks CSSO v1.3.0): https://github.com/css/csso/issues/86

## 03.10.2012, version 1.0.0

- First revision.
