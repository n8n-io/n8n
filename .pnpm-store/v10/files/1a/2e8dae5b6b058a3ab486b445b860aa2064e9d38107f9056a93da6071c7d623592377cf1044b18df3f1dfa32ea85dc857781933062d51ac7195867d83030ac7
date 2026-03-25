# stylelint-scss

[![npm version](https://img.shields.io/npm/v/stylelint-scss?logo=npm&logoColor=fff)](https://www.npmjs.com/package/stylelint-scss)
[![Build Status](https://img.shields.io/github/actions/workflow/status/stylelint-scss/stylelint-scss/test.yml?branch=master&label=tests&logo=github)](https://github.com/stylelint-scss/stylelint-scss/actions/workflows/test.yml?query=workflow%3ATests)
[![Coverage Status](https://img.shields.io/coveralls/github/stylelint-scss/stylelint-scss/master?logo=coveralls&logoColor=fff)](https://coveralls.io/github/stylelint-scss/stylelint-scss?branch=master)
[![contributions welcome](https://img.shields.io/badge/contributions-welcome-brightgreen)](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github)
[![Downloads per month](https://img.shields.io/npm/dm/stylelint-scss)](https://npmcharts.com/compare/stylelint-scss)

A collection of SCSS-specific linting rules for [Stylelint](https://github.com/stylelint/stylelint) (in a form of a plugin).

## Purpose

Stylelint by itself supports [SCSS syntax](https://stylelint.io/user-guide/get-started) very well (as well as other preprocessors' syntaxes). Moreover, it introduces some specific rules that can be used to lint SCSS, e.g. to limit [`nesting`](https://stylelint.io/user-guide/rules/max-nesting-depth), control the way [`@-rules`](https://stylelint.io/user-guide/rules#at-rule) are written. Yet Stylelint is in general focused on standard CSS.

stylelint-scss introduces rules specific to SCSS syntax. That said, the rules from this plugin can be used with other syntaxes, like Less or some PostCSS syntaxes. That's why the rules' names are not tied to SCSS only (`at-function-pattern` instead of `scss-function-pattern`).

The plugin follows Stylelint's guidelines (about [rule names](https://stylelint.io/user-guide/rules), testing and [so on](https://github.com/stylelint/stylelint/tree/main/docs/developer-guide)).

## Installation and usage

This plugin is used in the [stylelint-config-standard-scss shared config](https://github.com/stylelint-scss/stylelint-config-standard-scss). We recommend using that shared config, rather than installing this plugin directly.

However, the plugin can still be used in you're crafting a config from the ground up. First, install `stylelint-scss` (and `stylelint`, if you haven't done so yet) via npm:

```sh
npm install stylelint stylelint-scss
```

Create the `.stylelintrc.json` config file (or open the existing one), add `stylelint-scss` to the plugins array and the rules you need to the rules list. All rules from stylelint-scss need to be namespaced with `scss`.

```jsonc
{
  "plugins": ["stylelint-scss"],
  "rules": {
    // recommended rules
    "at-rule-no-unknown": null,
    "scss/at-rule-no-unknown": true,
    // ...
    // any other rules you'd want to change e.g.
    "scss/dollar-variable-pattern": "^foo",
    "scss/selector-no-redundant-nesting-selector": true
  }
}
```

Please refer to [Stylelint docs](https://stylelint.io/user-guide/get-started) for detailed info on using this linter.

## List of rules

Here are stylelint-scss' rules, grouped by the _thing_ they apply to (just like in [Stylelint](https://stylelint.io/user-guide/rules)).

Please also see the [example configs](./docs/examples/) for special cases.

### `@`-each

- [`at-each-key-value-single-line`](./src/rules/at-each-key-value-single-line/README.md): This is a rule that checks for situations where users have done a loop using map-keys or map.keys and grabbed the value for that key inside of the loop.

### `@`-else

- [`at-else-closing-brace-newline-after`](./src/rules/at-else-closing-brace-newline-after/README.md): Require or disallow a newline after the closing brace of `@else` statements (Autofixable).
- [`at-else-closing-brace-space-after`](./src/rules/at-else-closing-brace-space-after/README.md): Require a single space or disallow whitespace after the closing brace of `@else` statements (Autofixable).
- [`at-else-empty-line-before`](./src/rules/at-else-empty-line-before/README.md): Require an empty line or disallow empty lines before `@`-else (Autofixable).
- [`at-else-if-parentheses-space-before`](./src/rules/at-else-if-parentheses-space-before/README.md): Require or disallow a space before `@else if` parentheses (Autofixable).

### `@`-extend

- [`at-extend-no-missing-placeholder`](./src/rules/at-extend-no-missing-placeholder/README.md): Disallow at-extends (`@extend`) with missing placeholders.

### `@`-function

- [`at-function-named-arguments`](./src/rules/at-function-named-arguments/README.md): Require named parameters in SCSS function call rule.
- [`at-function-parentheses-space-before`](./src/rules/at-function-parentheses-space-before/README.md): Require or disallow a space before `@function` parentheses (Autofixable).
- [`at-function-pattern`](./src/rules/at-function-pattern/README.md): Specify a pattern for Sass/SCSS-like function names.

### `@`-if

- [`at-if-closing-brace-newline-after`](./src/rules/at-if-closing-brace-newline-after/README.md): Require or disallow a newline after the closing brace of `@if` statements (Autofixable).
- [`at-if-closing-brace-space-after`](./src/rules/at-if-closing-brace-space-after/README.md): Require a single space or disallow whitespace after the closing brace of `@if` statements (Autofixable).
- [`at-if-no-null`](./src/rules/at-if-no-null/README.md): Disallow `null` in `@if` statements.

### `@`-import

- [`at-import-partial-extension-allowed-list`](./src/rules/at-import-partial-extension-allowed-list/README.md): Specify a list of allowed file extensions for partial names in `@import` commands.
- [`at-import-partial-extension-disallowed-list`](./src/rules/at-import-partial-extension-disallowed-list/README.md): Specify a list of disallowed file extensions for partial names in `@import` commands.

### `@`-mixin

- [`at-mixin-argumentless-call-parentheses`](./src/rules/at-mixin-argumentless-call-parentheses/README.md): Require or disallow parentheses in argumentless `@mixin` calls (Autofixable).
- [`at-mixin-named-arguments`](./src/rules/at-mixin-named-arguments/README.md): Require named parameters in at-mixin call rule.
- [`at-mixin-no-risky-nesting-selector`](./src/rules/at-mixin-no-risky-nesting-selector/README.md): Disallow risky nesting selectors within a mixin.
- [`at-mixin-parentheses-space-before`](./src/rules/at-mixin-parentheses-space-before/README.md): Require or disallow a space before `@mixin` parentheses (Autofixable).
- [`at-mixin-pattern`](./src/rules/at-mixin-pattern/README.md): Specify a pattern for Sass/SCSS-like mixin names.

### `@`-rule

- [`at-rule-conditional-no-parentheses`](./src/rules/at-rule-conditional-no-parentheses/README.md): Disallow parentheses in conditional @ rules (if, elsif, while) (Autofixable).
- [`at-rule-no-unknown`](./src/rules/at-rule-no-unknown/README.md): Disallow unknown at-rules. Should be used **instead of** Stylelint's [at-rule-no-unknown](https://stylelint.io/user-guide/rules/at-rule-no-unknown).

### `@`-use

- [`at-use-no-unnamespaced`](./src/rules/at-use-no-unnamespaced/README.md): Disallow `@use` without a namespace (i.e. `@use "..." as *`).
- [`at-use-no-redundant-alias`](./src/rules/at-use-no-redundant-alias/README.md): Disallow redundant namespace aliases (i.e. `@use "foo" as foo`).

### `$`-variable

- [`dollar-variable-colon-newline-after`](./src/rules/dollar-variable-colon-newline-after/README.md): Require a newline after the colon in `$`-variable declarations (Autofixable).
- [`dollar-variable-colon-space-after`](./src/rules/dollar-variable-colon-space-after/README.md): Require or disallow whitespace after the colon in `$`-variable declarations (Autofixable).
- [`dollar-variable-colon-space-before`](./src/rules/dollar-variable-colon-space-before/README.md): Require a single space or disallow whitespace before the colon in `$`-variable declarations (Autofixable).
- [`dollar-variable-default`](./src/rules/dollar-variable-default/README.md): Require `!default` flag for `$`-variable declarations.
- [`dollar-variable-empty-line-after`](./src/rules/dollar-variable-empty-line-after/README.md): Require a single empty line or disallow empty lines after `$`-variable declarations (Autofixable).
- [`dollar-variable-empty-line-before`](./src/rules/dollar-variable-empty-line-before/README.md): Require a single empty line or disallow empty lines before `$`-variable declarations (Autofixable).
- [`dollar-variable-first-in-block`](./src/rules/dollar-variable-first-in-block/README.md): Require for variables to be put first in a block (a rule or in root).
- [`dollar-variable-no-missing-interpolation`](./src/rules/dollar-variable-no-missing-interpolation/README.md): Disallow Sass variables that are used without interpolation with CSS features that use custom identifiers.
- [`dollar-variable-no-namespaced-assignment`](./src/rules/dollar-variable-no-namespaced-assignment/README.md): Disallow assignment to namespaced Sass variables.
- [`dollar-variable-pattern`](./src/rules/dollar-variable-pattern/README.md): Specify a pattern for Sass-like variables.

### `%`-placeholder

- [`percent-placeholder-pattern`](./src/rules/percent-placeholder-pattern/README.md): Specify a pattern for `%`-placeholders.

### `//`-comment

- [`double-slash-comment-empty-line-before`](./src/rules/double-slash-comment-empty-line-before/README.md): Require or disallow an empty line before `//`-comments (Autofixable).
- [`double-slash-comment-inline`](./src/rules/double-slash-comment-inline/README.md): Require or disallow `//`-comments to be inline comments.
- [`double-slash-comment-whitespace-inside`](./src/rules/double-slash-comment-whitespace-inside/README.md): Require or disallow whitespace after the `//` in `//`-comments (Autofixable).

### Block

- [`block-no-redundant-nesting`](./src/rules/block-no-redundant-nesting/README.md): Disallow nesting a single block if it could be merged with its parent block.

### Comment

- [`comment-no-empty`](./src/rules/comment-no-empty/README.md): Disallow empty comments.
- [`comment-no-loud`](./src/rules/comment-no-loud/README.md): Disallow `/*`-comments.

### Declaration

- [`declaration-nested-properties`](./src/rules/declaration-nested-properties/README.md): Require or disallow properties with `-` in their names to be in a form of a nested group.
- [`declaration-nested-properties-no-divided-groups`](./src/rules/declaration-nested-properties-no-divided-groups/README.md): Disallow nested properties of the same "namespace" to be divided into multiple groups.
- [`declaration-property-value-no-unknown`](./src/rules/declaration-property-value-no-unknown/README.md): Disallow unknown values for properties within declarations.

### Dimension

- [`dimension-no-non-numeric-values`](./src/rules/dimension-no-non-numeric-values/README.md): Disallow non-numeric values when interpolating a value with a unit.

### Function

- [`function-calculation-no-interpolation`](./src/rules/function-calculation-no-interpolation/README.md): Disallow interpolation in `calc()`, `clamp()`, `min()`, and `max()` functions.
- [`function-color-channel`](./src/rules/function-color-channel/README.md): Encourage the use of the [color.channel](https://sass-lang.com/documentation/modules/color#channel) function over related deprecated color functions.
- [`function-color-relative`](./src/rules/function-color-relative/README.md): Encourage the use of the [scale-color](https://sass-lang.com/documentation/modules/color#scale-color) function over regular color functions.
- [`function-disallowed-list`](./src/rules/function-disallowed-list/README.md): Specify a list of disallowed functions. Should be used **instead of** Stylelint's [function-disallowed-list](https://stylelint.io/user-guide/rules/function-disallowed-list).
- [`function-no-unknown`](./src/rules/function-no-unknown/README.md): Disallow unknown functions. Should be used **instead of** Stylelint's [function-no-unknown](https://stylelint.io/user-guide/rules/function-no-unknown).
- [`function-quote-no-quoted-strings-inside`](./src/rules/function-quote-no-quoted-strings-inside/README.md): Disallow quoted strings inside the [quote function](https://sass-lang.com/documentation/modules/string#quote) (Autofixable).
- [`function-unquote-no-unquoted-strings-inside`](./src/rules/function-unquote-no-unquoted-strings-inside/README.md): Disallow unquoted strings inside the [unquote function](https://sass-lang.com/documentation/modules/string#unquote) (Autofixable).

### Map

- [`map-keys-quotes`](./src/rules/map-keys-quotes/README.md): Require quoted keys in Sass maps.

### Media feature

- [`media-feature-value-dollar-variable`](./src/rules/media-feature-value-dollar-variable/README.md): Require a media feature value be a `$`-variable or disallow `$`-variables in media feature values.

### Operator

- [`operator-no-newline-after`](./src/rules/operator-no-newline-after/README.md): Disallow linebreaks after Sass operators.
- [`operator-no-newline-before`](./src/rules/operator-no-newline-before/README.md): Disallow linebreaks before Sass operators.
- [`operator-no-unspaced`](./src/rules/operator-no-unspaced/README.md): Disallow unspaced operators in Sass operations.

### Partial

- [`partial-no-import`](./src/rules/partial-no-import/README.md): Disallow non-CSS `@import`s in partial files.

### Property

- [`property-no-unknown`](./src/rules/property-no-unknown/README.md): Disallow unknown properties, including [nested properties](https://sass-lang.com/documentation/style-rules/declarations/#nesting). Should be used instead of Stylelint's [property-no-unknown](https://stylelint.io/user-guide/rules/property-no-unknown).

### Selector

- [`selector-nest-combinators`](./src/rules/selector-nest-combinators/README.md): Require or disallow nesting of combinators in selectors.
- [`selector-no-redundant-nesting-selector`](./src/rules/selector-no-redundant-nesting-selector/README.md): Disallow redundant nesting selectors (`&`).
- [`selector-no-union-class-name`](./src/rules/selector-no-union-class-name/README.md): Disallow union class names with the parent selector (`&`).

### Load

- [`load-no-partial-leading-underscore`](./src/rules/load-no-partial-leading-underscore/README.md): Disallow leading underscore in partial names in `@import`, `@use`, `@forward`, and [`meta.load-css`](https://sass-lang.com/documentation/modules/meta/#load-css) `$url` parameter.
- [`load-partial-extension`](./src/rules/load-partial-extension/README.md): Require or disallow extension in `@import`, `@use`, `@forward`, and [`meta.load-css`] commands (Autofixable).

### General / Sheet

- [`no-dollar-variables`](./src/rules/no-dollar-variables/README.md): Disallow dollar variables within a stylesheet.
- [`no-duplicate-dollar-variables`](./src/rules/no-duplicate-dollar-variables/README.md): Disallow duplicate dollar variables within a stylesheet.
- [`no-duplicate-load-rules`](./src/rules/no-duplicate-load-rules/README.md): Disallow duplicate `@import`, `@use` and `@forward` rules.
- [`no-duplicate-mixins`](./src/rules/no-duplicate-mixins/README.md): Disallow duplicate mixins within a stylesheet.
- [`no-global-function-names`](./src/rules/no-global-function-names/README.md): Disallows the use of global function names, as these global functions are now located inside built-in Sass modules.
- [`no-unused-private-members`](./src/rules/no-unused-private-members/README.md): Disallow unused private members such as functions, mixins, variables or placeholder selectors.

## Deprecated

These rules are deprecated — we won't fix bugs nor add options, and we will remove them in the next major release. We recommend you use a pretty printer (like Prettier) alongside Stylelint rather than these rules.

- [`at-import-no-partial-leading-underscore`](https://github.com/stylelint-scss/stylelint-scss/blob/v5.2.1/src/rules/at-import-no-partial-leading-underscore/README.md): Disallow leading underscore in partial names in `@import`.
- [`at-import-partial-extension`](https://github.com/stylelint-scss/stylelint-scss/blob/v6.3.0/src/rules/at-import-partial-extension/README.md): Require or disallow extension in `@import` commands.
- [`at-import-partial-extension-blacklist`](https://github.com/stylelint-scss/stylelint-scss/blob/v6.1.0/src/rules/at-import-partial-extension-blacklist/README.md): Specify a blacklist of disallowed file extensions for partial names in `@import` commands.
- [`at-import-partial-extension-whitelist`](https://github.com/stylelint-scss/stylelint-scss/blob/v6.1.0/src/rules/at-import-partial-extension-whitelist/README.md): Specify a whitelist of allowed file extensions for partial names in `@import` commands.

## Help out

The work on the plugin's rules is still in progress, so if you feel like it, you're welcome to help out with any of these (the plugin follows Stylelint guidelines so most of this is based on its docs):

- Create, enhance, and debug rules (see Stylelint's guide to "[Working on rules](https://github.com/stylelint/stylelint/blob/main/docs/developer-guide/rules.md)").
- Improve documentation.
- Chime in on any open issue or pull request.
- Open new issues about your ideas on new rules, or for how to improve the existing ones, and pull requests to show us how your idea works.
- Add new tests to absolutely anything.
- Work on improving performance of rules.
- Contribute to [Stylelint](https://github.com/stylelint/stylelint)
- Spread the word.

We communicate via [issues](https://github.com/stylelint-scss/stylelint-scss/issues) and [pull requests](https://github.com/stylelint-scss/stylelint-scss/pulls).

There is also [StackOverflow](https://stackoverflow.com/questions/tagged/stylelint), which would be the preferred QA forum.

## Contributors

Thanks goes to these wonderful people:

<table>
<thead>
<tr>
<th align="center"><a href="https://github.com/kristerkari"><img alt="kristerkari" src="https://avatars.githubusercontent.com/u/993108?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/dryoma"><img alt="dryoma" src="https://avatars.githubusercontent.com/u/11942776?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/rambleraptor"><img alt="rambleraptor" src="https://avatars.githubusercontent.com/u/1325798?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/XhmikosR"><img alt="XhmikosR" src="https://avatars.githubusercontent.com/u/349621?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/ybiquitous"><img alt="ybiquitous" src="https://avatars.githubusercontent.com/u/473530?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/pamelalozano16"><img alt="pamelalozano16" src="https://avatars.githubusercontent.com/u/30474787?v=4&s=80" width="80"></a></th>
</tr>
</thead>
<tbody><tr>
<td align="center"><a href="https://github.com/kristerkari">kristerkari</a></td>
<td align="center"><a href="https://github.com/dryoma">dryoma</a></td>
<td align="center"><a href="https://github.com/rambleraptor">rambleraptor</a></td>
<td align="center"><a href="https://github.com/XhmikosR">XhmikosR</a></td>
<td align="center"><a href="https://github.com/ybiquitous">ybiquitous</a></td>
<td align="center"><a href="https://github.com/pamelalozano16">pamelalozano16</a></td>
</tr>
</tbody></table>
<table>
<thead>
<tr>
<th align="center"><a href="https://github.com/Eugeno"><img alt="Eugeno" src="https://avatars.githubusercontent.com/u/23382920?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/joseph118"><img alt="joseph118" src="https://avatars.githubusercontent.com/u/6863655?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/stof"><img alt="stof" src="https://avatars.githubusercontent.com/u/439401?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/niksy"><img alt="niksy" src="https://avatars.githubusercontent.com/u/389286?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/kaysonwu"><img alt="kaysonwu" src="https://avatars.githubusercontent.com/u/14865584?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/srawlins"><img alt="srawlins" src="https://avatars.githubusercontent.com/u/103167?v=4&s=80" width="80"></a></th>
</tr>
</thead>
<tbody><tr>
<td align="center"><a href="https://github.com/Eugeno">Eugeno</a></td>
<td align="center"><a href="https://github.com/joseph118">joseph118</a></td>
<td align="center"><a href="https://github.com/stof">stof</a></td>
<td align="center"><a href="https://github.com/niksy">niksy</a></td>
<td align="center"><a href="https://github.com/kaysonwu">kaysonwu</a></td>
<td align="center"><a href="https://github.com/srawlins">srawlins</a></td>
</tr>
</tbody></table>
<table>
<thead>
<tr>
<th align="center"><a href="https://github.com/jhae-de"><img alt="jhae-de" src="https://avatars.githubusercontent.com/u/28291021?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/FloEdelmann"><img alt="FloEdelmann" src="https://avatars.githubusercontent.com/u/202916?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/pipopotamasu"><img alt="pipopotamasu" src="https://avatars.githubusercontent.com/u/14048211?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/OriR"><img alt="OriR" src="https://avatars.githubusercontent.com/u/2384068?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/ntwb"><img alt="ntwb" src="https://avatars.githubusercontent.com/u/1016458?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/ricardogobbosouza"><img alt="ricardogobbosouza" src="https://avatars.githubusercontent.com/u/13064722?v=4&s=80" width="80"></a></th>
</tr>
</thead>
<tbody><tr>
<td align="center"><a href="https://github.com/jhae-de">jhae-de</a></td>
<td align="center"><a href="https://github.com/FloEdelmann">FloEdelmann</a></td>
<td align="center"><a href="https://github.com/pipopotamasu">pipopotamasu</a></td>
<td align="center"><a href="https://github.com/OriR">OriR</a></td>
<td align="center"><a href="https://github.com/ntwb">ntwb</a></td>
<td align="center"><a href="https://github.com/ricardogobbosouza">ricardogobbosouza</a></td>
</tr>
</tbody></table>
<table>
<thead>
<tr>
<th align="center"><a href="https://github.com/jeddy3"><img alt="jeddy3" src="https://avatars.githubusercontent.com/u/808227?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/evilebottnawi"><img alt="evilebottnawi" src="https://avatars.githubusercontent.com/u/23334705?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/kevindew"><img alt="kevindew" src="https://avatars.githubusercontent.com/u/282717?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/thibaudcolas"><img alt="thibaudcolas" src="https://avatars.githubusercontent.com/u/877585?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/chimurai"><img alt="chimurai" src="https://avatars.githubusercontent.com/u/655241?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/vseventer"><img alt="vseventer" src="https://avatars.githubusercontent.com/u/638323?v=4&s=80" width="80"></a></th>
</tr>
</thead>
<tbody><tr>
<td align="center"><a href="https://github.com/jeddy3">jeddy3</a></td>
<td align="center"><a href="https://github.com/evilebottnawi">evilebottnawi</a></td>
<td align="center"><a href="https://github.com/kevindew">kevindew</a></td>
<td align="center"><a href="https://github.com/thibaudcolas">thibaudcolas</a></td>
<td align="center"><a href="https://github.com/chimurai">chimurai</a></td>
<td align="center"><a href="https://github.com/vseventer">vseventer</a></td>
</tr>
</tbody></table>
<table>
<thead>
<tr>
<th align="center"><a href="https://github.com/xboy2012"><img alt="xboy2012" src="https://avatars.githubusercontent.com/u/7540144?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/chalkygames123"><img alt="chalkygames123" src="https://avatars.githubusercontent.com/u/5608239?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/bjankord"><img alt="bjankord" src="https://avatars.githubusercontent.com/u/633148?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/AndyOGo"><img alt="AndyOGo" src="https://avatars.githubusercontent.com/u/914443?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/qmhc"><img alt="qmhc" src="https://avatars.githubusercontent.com/u/40221744?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/freezy-sk"><img alt="freezy-sk" src="https://avatars.githubusercontent.com/u/661637?v=4&s=80" width="80"></a></th>
</tr>
</thead>
<tbody><tr>
<td align="center"><a href="https://github.com/xboy2012">xboy2012</a></td>
<td align="center"><a href="https://github.com/chalkygames123">chalkygames123</a></td>
<td align="center"><a href="https://github.com/bjankord">bjankord</a></td>
<td align="center"><a href="https://github.com/AndyOGo">AndyOGo</a></td>
<td align="center"><a href="https://github.com/qmhc">qmhc</a></td>
<td align="center"><a href="https://github.com/freezy-sk">freezy-sk</a></td>
</tr>
</tbody></table>
<table>
<thead>
<tr>
<th align="center"><a href="https://github.com/YodaDaCoda"><img alt="YodaDaCoda" src="https://avatars.githubusercontent.com/u/365349?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/wlewis-formative"><img alt="wlewis-formative" src="https://avatars.githubusercontent.com/u/91909230?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/kersh"><img alt="kersh" src="https://avatars.githubusercontent.com/u/621330?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/AM-77"><img alt="AM-77" src="https://avatars.githubusercontent.com/u/18232579?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/YozhikM"><img alt="YozhikM" src="https://avatars.githubusercontent.com/u/27273025?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/sajadtorkamani"><img alt="sajadtorkamani" src="https://avatars.githubusercontent.com/u/9380313?v=4&s=80" width="80"></a></th>
</tr>
</thead>
<tbody><tr>
<td align="center"><a href="https://github.com/YodaDaCoda">YodaDaCoda</a></td>
<td align="center"><a href="https://github.com/wlewis-formative">wlewis-formative</a></td>
<td align="center"><a href="https://github.com/kersh">kersh</a></td>
<td align="center"><a href="https://github.com/AM-77">AM-77</a></td>
<td align="center"><a href="https://github.com/YozhikM">YozhikM</a></td>
<td align="center"><a href="https://github.com/sajadtorkamani">sajadtorkamani</a></td>
</tr>
</tbody></table>
<table>
<thead>
<tr>
<th align="center"><a href="https://github.com/paulgv"><img alt="paulgv" src="https://avatars.githubusercontent.com/u/4895885?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/01taylop"><img alt="01taylop" src="https://avatars.githubusercontent.com/u/727360?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/nlydv"><img alt="nlydv" src="https://avatars.githubusercontent.com/u/39429628?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/manovotny"><img alt="manovotny" src="https://avatars.githubusercontent.com/u/446260?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/keegan-lillo"><img alt="keegan-lillo" src="https://avatars.githubusercontent.com/u/3537963?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/stormwarning"><img alt="stormwarning" src="https://avatars.githubusercontent.com/u/999825?v=4&s=80" width="80"></a></th>
</tr>
</thead>
<tbody><tr>
<td align="center"><a href="https://github.com/paulgv">paulgv</a></td>
<td align="center"><a href="https://github.com/01taylop">01taylop</a></td>
<td align="center"><a href="https://github.com/nlydv">nlydv</a></td>
<td align="center"><a href="https://github.com/manovotny">manovotny</a></td>
<td align="center"><a href="https://github.com/keegan-lillo">keegan-lillo</a></td>
<td align="center"><a href="https://github.com/stormwarning">stormwarning</a></td>
</tr>
</tbody></table>
<table>
<thead>
<tr>
<th align="center"><a href="https://github.com/CvX"><img alt="CvX" src="https://avatars.githubusercontent.com/u/66961?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/jantimon"><img alt="jantimon" src="https://avatars.githubusercontent.com/u/4113649?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/guoyunhe"><img alt="guoyunhe" src="https://avatars.githubusercontent.com/u/5836790?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/G-Rath"><img alt="G-Rath" src="https://avatars.githubusercontent.com/u/3151613?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/EvanHahn"><img alt="EvanHahn" src="https://avatars.githubusercontent.com/u/777712?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/lithiumlron"><img alt="lithiumlron" src="https://avatars.githubusercontent.com/u/101921280?v=4&s=80" width="80"></a></th>
</tr>
</thead>
<tbody><tr>
<td align="center"><a href="https://github.com/CvX">CvX</a></td>
<td align="center"><a href="https://github.com/jantimon">jantimon</a></td>
<td align="center"><a href="https://github.com/guoyunhe">guoyunhe</a></td>
<td align="center"><a href="https://github.com/G-Rath">G-Rath</a></td>
<td align="center"><a href="https://github.com/EvanHahn">EvanHahn</a></td>
<td align="center"><a href="https://github.com/lithiumlron">lithiumlron</a></td>
</tr>
</tbody></table>
<table>
<thead>
<tr>
<th align="center"><a href="https://github.com/diego-codes"><img alt="diego-codes" src="https://avatars.githubusercontent.com/u/5973294?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/davidwarrington"><img alt="davidwarrington" src="https://avatars.githubusercontent.com/u/9138568?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/Deimos"><img alt="Deimos" src="https://avatars.githubusercontent.com/u/9033?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/Calme1709"><img alt="Calme1709" src="https://avatars.githubusercontent.com/u/30140939?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/AsfalothDE"><img alt="AsfalothDE" src="https://avatars.githubusercontent.com/u/13568189?v=4&s=80" width="80"></a></th>
<th align="center"><a href="https://github.com/SterlingVix"><img alt="SterlingVix" src="https://avatars.githubusercontent.com/u/7531113?v=4&s=80" width="80"></a></th>
</tr>
</thead>
<tbody><tr>
<td align="center"><a href="https://github.com/diego-codes">diego-codes</a></td>
<td align="center"><a href="https://github.com/davidwarrington">davidwarrington</a></td>
<td align="center"><a href="https://github.com/Deimos">Deimos</a></td>
<td align="center"><a href="https://github.com/Calme1709">Calme1709</a></td>
<td align="center"><a href="https://github.com/AsfalothDE">AsfalothDE</a></td>
<td align="center"><a href="https://github.com/SterlingVix">SterlingVix</a></td>
</tr>
</tbody></table>

## Important documents

- [Changelog](./CHANGELOG.md)
- [Contributing](./CONTRIBUTING.md)
- [License](./LICENSE)
