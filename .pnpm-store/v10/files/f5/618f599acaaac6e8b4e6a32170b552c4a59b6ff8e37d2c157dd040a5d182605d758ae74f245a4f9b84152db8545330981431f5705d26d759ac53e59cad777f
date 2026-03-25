# eslint-plugin-unicorn [![Coverage Status](https://codecov.io/gh/sindresorhus/eslint-plugin-unicorn/branch/main/graph/badge.svg)](https://codecov.io/gh/sindresorhus/eslint-plugin-unicorn/branch/main) [![npm version](https://img.shields.io/npm/v/eslint-plugin-unicorn.svg?style=flat)](https://npmjs.com/package/eslint-plugin-unicorn)

<!-- markdownlint-disable-next-line no-inline-html -->
<img src="https://cloud.githubusercontent.com/assets/170270/18659176/1cc373d0-7f33-11e6-890f-0ba35362ee7e.jpg" width="180" align="right" alt="Unicorn">

> More than 100 powerful ESLint rules

You might want to check out [XO](https://github.com/xojs/xo), which includes this plugin.

[**Propose or contribute a new rule ➡**](.github/contributing.md)

## Install

```sh
npm install --save-dev eslint eslint-plugin-unicorn
```

**Requires ESLint `>=9.20.0`, [flat config](https://eslint.org/docs/latest/use/configure/configuration-files), and [ESM](https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c#how-can-i-make-my-typescript-project-output-esm).**

## Usage

Use a [preset config](#preset-configs) or configure each rule in `eslint.config.js`.

If you don't use the preset, ensure you use the same `languageOptions` config as below.

```js
import eslintPluginUnicorn from 'eslint-plugin-unicorn';
import globals from 'globals';

export default [
	{
		languageOptions: {
			globals: globals.builtin,
		},
		plugins: {
			unicorn: eslintPluginUnicorn,
		},
		rules: {
			'unicorn/better-regex': 'error',
			'unicorn/…': 'error',
		},
	},
	// …
];
```

## Rules

<!-- Do not manually modify this list. Run: `npm run fix:eslint-docs` -->
<!-- begin auto-generated rules list -->

💼 [Configurations](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config) enabled in.\
✅ Set in the `recommended` [configuration](https://github.com/sindresorhus/eslint-plugin-unicorn#recommended-config).\
🔧 Automatically fixable by the [`--fix` CLI option](https://eslint.org/docs/user-guide/command-line-interface#--fix).\
💡 Manually fixable by [editor suggestions](https://eslint.org/docs/latest/use/core-concepts#rule-suggestions).

| Name                                                                                             | Description                                                                                                                                                                                                       | 💼 | 🔧 | 💡 |
| :----------------------------------------------------------------------------------------------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :- | :- | :- |
| [better-regex](docs/rules/better-regex.md)                                                       | Improve regexes by making them shorter, consistent, and safer.                                                                                                                                                    |    | 🔧 |    |
| [catch-error-name](docs/rules/catch-error-name.md)                                               | Enforce a specific parameter name in catch clauses.                                                                                                                                                               | ✅  | 🔧 |    |
| [consistent-assert](docs/rules/consistent-assert.md)                                             | Enforce consistent assertion style with `node:assert`.                                                                                                                                                            | ✅  | 🔧 |    |
| [consistent-date-clone](docs/rules/consistent-date-clone.md)                                     | Prefer passing `Date` directly to the constructor when cloning.                                                                                                                                                   | ✅  | 🔧 |    |
| [consistent-destructuring](docs/rules/consistent-destructuring.md)                               | Use destructured variables over properties.                                                                                                                                                                       |    | 🔧 | 💡 |
| [consistent-empty-array-spread](docs/rules/consistent-empty-array-spread.md)                     | Prefer consistent types when spreading a ternary in an array literal.                                                                                                                                             | ✅  | 🔧 |    |
| [consistent-existence-index-check](docs/rules/consistent-existence-index-check.md)               | Enforce consistent style for element existence checks with `indexOf()`, `lastIndexOf()`, `findIndex()`, and `findLastIndex()`.                                                                                    | ✅  | 🔧 |    |
| [consistent-function-scoping](docs/rules/consistent-function-scoping.md)                         | Move function definitions to the highest possible scope.                                                                                                                                                          | ✅  |    |    |
| [custom-error-definition](docs/rules/custom-error-definition.md)                                 | Enforce correct `Error` subclassing.                                                                                                                                                                              |    | 🔧 |    |
| [empty-brace-spaces](docs/rules/empty-brace-spaces.md)                                           | Enforce no spaces between braces.                                                                                                                                                                                 | ✅  | 🔧 |    |
| [error-message](docs/rules/error-message.md)                                                     | Enforce passing a `message` value when creating a built-in error.                                                                                                                                                 | ✅  |    |    |
| [escape-case](docs/rules/escape-case.md)                                                         | Require escape sequences to use uppercase or lowercase values.                                                                                                                                                    | ✅  | 🔧 |    |
| [expiring-todo-comments](docs/rules/expiring-todo-comments.md)                                   | Add expiration conditions to TODO comments.                                                                                                                                                                       | ✅  |    |    |
| [explicit-length-check](docs/rules/explicit-length-check.md)                                     | Enforce explicitly comparing the `length` or `size` property of a value.                                                                                                                                          | ✅  | 🔧 | 💡 |
| [filename-case](docs/rules/filename-case.md)                                                     | Enforce a case style for filenames.                                                                                                                                                                               | ✅  |    |    |
| [import-style](docs/rules/import-style.md)                                                       | Enforce specific import styles per module.                                                                                                                                                                        | ✅  |    |    |
| [new-for-builtins](docs/rules/new-for-builtins.md)                                               | Enforce the use of `new` for all builtins, except `String`, `Number`, `Boolean`, `Symbol` and `BigInt`.                                                                                                           | ✅  | 🔧 | 💡 |
| [no-abusive-eslint-disable](docs/rules/no-abusive-eslint-disable.md)                             | Enforce specifying rules to disable in `eslint-disable` comments.                                                                                                                                                 | ✅  |    |    |
| [no-accessor-recursion](docs/rules/no-accessor-recursion.md)                                     | Disallow recursive access to `this` within getters and setters.                                                                                                                                                   | ✅  |    |    |
| [no-anonymous-default-export](docs/rules/no-anonymous-default-export.md)                         | Disallow anonymous functions and classes as the default export.                                                                                                                                                   | ✅  |    | 💡 |
| [no-array-callback-reference](docs/rules/no-array-callback-reference.md)                         | Prevent passing a function reference directly to iterator methods.                                                                                                                                                | ✅  |    | 💡 |
| [no-array-for-each](docs/rules/no-array-for-each.md)                                             | Prefer `for…of` over the `forEach` method.                                                                                                                                                                        | ✅  | 🔧 | 💡 |
| [no-array-method-this-argument](docs/rules/no-array-method-this-argument.md)                     | Disallow using the `this` argument in array methods.                                                                                                                                                              | ✅  | 🔧 | 💡 |
| [no-array-reduce](docs/rules/no-array-reduce.md)                                                 | Disallow `Array#reduce()` and `Array#reduceRight()`.                                                                                                                                                              | ✅  |    |    |
| [no-await-expression-member](docs/rules/no-await-expression-member.md)                           | Disallow member access from await expression.                                                                                                                                                                     | ✅  | 🔧 |    |
| [no-await-in-promise-methods](docs/rules/no-await-in-promise-methods.md)                         | Disallow using `await` in `Promise` method parameters.                                                                                                                                                            | ✅  |    | 💡 |
| [no-console-spaces](docs/rules/no-console-spaces.md)                                             | Do not use leading/trailing space between `console.log` parameters.                                                                                                                                               | ✅  | 🔧 |    |
| [no-document-cookie](docs/rules/no-document-cookie.md)                                           | Do not use `document.cookie` directly.                                                                                                                                                                            | ✅  |    |    |
| [no-empty-file](docs/rules/no-empty-file.md)                                                     | Disallow empty files.                                                                                                                                                                                             | ✅  |    |    |
| [no-for-loop](docs/rules/no-for-loop.md)                                                         | Do not use a `for` loop that can be replaced with a `for-of` loop.                                                                                                                                                | ✅  | 🔧 | 💡 |
| [no-hex-escape](docs/rules/no-hex-escape.md)                                                     | Enforce the use of Unicode escapes instead of hexadecimal escapes.                                                                                                                                                | ✅  | 🔧 |    |
| [no-instanceof-builtins](docs/rules/no-instanceof-builtins.md)                                   | Disallow `instanceof` with built-in objects                                                                                                                                                                       | ✅  | 🔧 | 💡 |
| [no-invalid-fetch-options](docs/rules/no-invalid-fetch-options.md)                               | Disallow invalid options in `fetch()` and `new Request()`.                                                                                                                                                        | ✅  |    |    |
| [no-invalid-remove-event-listener](docs/rules/no-invalid-remove-event-listener.md)               | Prevent calling `EventTarget#removeEventListener()` with the result of an expression.                                                                                                                             | ✅  |    |    |
| [no-keyword-prefix](docs/rules/no-keyword-prefix.md)                                             | Disallow identifiers starting with `new` or `class`.                                                                                                                                                              |    |    |    |
| [no-lonely-if](docs/rules/no-lonely-if.md)                                                       | Disallow `if` statements as the only statement in `if` blocks without `else`.                                                                                                                                     | ✅  | 🔧 |    |
| [no-magic-array-flat-depth](docs/rules/no-magic-array-flat-depth.md)                             | Disallow a magic number as the `depth` argument in `Array#flat(…).`                                                                                                                                               | ✅  |    |    |
| [no-named-default](docs/rules/no-named-default.md)                                               | Disallow named usage of default import and export.                                                                                                                                                                | ✅  | 🔧 |    |
| [no-negated-condition](docs/rules/no-negated-condition.md)                                       | Disallow negated conditions.                                                                                                                                                                                      | ✅  | 🔧 |    |
| [no-negation-in-equality-check](docs/rules/no-negation-in-equality-check.md)                     | Disallow negated expression in equality check.                                                                                                                                                                    | ✅  |    | 💡 |
| [no-nested-ternary](docs/rules/no-nested-ternary.md)                                             | Disallow nested ternary expressions.                                                                                                                                                                              | ✅  | 🔧 |    |
| [no-new-array](docs/rules/no-new-array.md)                                                       | Disallow `new Array()`.                                                                                                                                                                                           | ✅  | 🔧 | 💡 |
| [no-new-buffer](docs/rules/no-new-buffer.md)                                                     | Enforce the use of `Buffer.from()` and `Buffer.alloc()` instead of the deprecated `new Buffer()`.                                                                                                                 | ✅  | 🔧 | 💡 |
| [no-null](docs/rules/no-null.md)                                                                 | Disallow the use of the `null` literal.                                                                                                                                                                           | ✅  | 🔧 | 💡 |
| [no-object-as-default-parameter](docs/rules/no-object-as-default-parameter.md)                   | Disallow the use of objects as default parameters.                                                                                                                                                                | ✅  |    |    |
| [no-process-exit](docs/rules/no-process-exit.md)                                                 | Disallow `process.exit()`.                                                                                                                                                                                        | ✅  |    |    |
| [no-single-promise-in-promise-methods](docs/rules/no-single-promise-in-promise-methods.md)       | Disallow passing single-element arrays to `Promise` methods.                                                                                                                                                      | ✅  | 🔧 | 💡 |
| [no-static-only-class](docs/rules/no-static-only-class.md)                                       | Disallow classes that only have static members.                                                                                                                                                                   | ✅  | 🔧 |    |
| [no-thenable](docs/rules/no-thenable.md)                                                         | Disallow `then` property.                                                                                                                                                                                         | ✅  |    |    |
| [no-this-assignment](docs/rules/no-this-assignment.md)                                           | Disallow assigning `this` to a variable.                                                                                                                                                                          | ✅  |    |    |
| [no-typeof-undefined](docs/rules/no-typeof-undefined.md)                                         | Disallow comparing `undefined` using `typeof`.                                                                                                                                                                    | ✅  | 🔧 | 💡 |
| [no-unnecessary-array-flat-depth](docs/rules/no-unnecessary-array-flat-depth.md)                 | Disallow using `1` as the `depth` argument of `Array#flat()`.                                                                                                                                                     | ✅  | 🔧 |    |
| [no-unnecessary-array-splice-count](docs/rules/no-unnecessary-array-splice-count.md)             | Disallow using `.length` or `Infinity` as the `deleteCount` or `skipCount` argument of `Array#{splice,toSpliced}()`.                                                                                              | ✅  | 🔧 |    |
| [no-unnecessary-await](docs/rules/no-unnecessary-await.md)                                       | Disallow awaiting non-promise values.                                                                                                                                                                             | ✅  | 🔧 |    |
| [no-unnecessary-polyfills](docs/rules/no-unnecessary-polyfills.md)                               | Enforce the use of built-in methods instead of unnecessary polyfills.                                                                                                                                             | ✅  |    |    |
| [no-unnecessary-slice-end](docs/rules/no-unnecessary-slice-end.md)                               | Disallow using `.length` or `Infinity` as the `end` argument of `{Array,String,TypedArray}#slice()`.                                                                                                              | ✅  | 🔧 |    |
| [no-unreadable-array-destructuring](docs/rules/no-unreadable-array-destructuring.md)             | Disallow unreadable array destructuring.                                                                                                                                                                          | ✅  | 🔧 |    |
| [no-unreadable-iife](docs/rules/no-unreadable-iife.md)                                           | Disallow unreadable IIFEs.                                                                                                                                                                                        | ✅  |    |    |
| [no-unused-properties](docs/rules/no-unused-properties.md)                                       | Disallow unused object properties.                                                                                                                                                                                |    |    |    |
| [no-useless-fallback-in-spread](docs/rules/no-useless-fallback-in-spread.md)                     | Disallow useless fallback when spreading in object literals.                                                                                                                                                      | ✅  | 🔧 |    |
| [no-useless-length-check](docs/rules/no-useless-length-check.md)                                 | Disallow useless array length check.                                                                                                                                                                              | ✅  | 🔧 |    |
| [no-useless-promise-resolve-reject](docs/rules/no-useless-promise-resolve-reject.md)             | Disallow returning/yielding `Promise.resolve/reject()` in async functions or promise callbacks                                                                                                                    | ✅  | 🔧 |    |
| [no-useless-spread](docs/rules/no-useless-spread.md)                                             | Disallow unnecessary spread.                                                                                                                                                                                      | ✅  | 🔧 |    |
| [no-useless-switch-case](docs/rules/no-useless-switch-case.md)                                   | Disallow useless case in switch statements.                                                                                                                                                                       | ✅  |    | 💡 |
| [no-useless-undefined](docs/rules/no-useless-undefined.md)                                       | Disallow useless `undefined`.                                                                                                                                                                                     | ✅  | 🔧 |    |
| [no-zero-fractions](docs/rules/no-zero-fractions.md)                                             | Disallow number literals with zero fractions or dangling dots.                                                                                                                                                    | ✅  | 🔧 |    |
| [number-literal-case](docs/rules/number-literal-case.md)                                         | Enforce proper case for numeric literals.                                                                                                                                                                         | ✅  | 🔧 |    |
| [numeric-separators-style](docs/rules/numeric-separators-style.md)                               | Enforce the style of numeric separators by correctly grouping digits.                                                                                                                                             | ✅  | 🔧 |    |
| [prefer-add-event-listener](docs/rules/prefer-add-event-listener.md)                             | Prefer `.addEventListener()` and `.removeEventListener()` over `on`-functions.                                                                                                                                    | ✅  | 🔧 |    |
| [prefer-array-find](docs/rules/prefer-array-find.md)                                             | Prefer `.find(…)` and `.findLast(…)` over the first or last element from `.filter(…)`.                                                                                                                            | ✅  | 🔧 | 💡 |
| [prefer-array-flat](docs/rules/prefer-array-flat.md)                                             | Prefer `Array#flat()` over legacy techniques to flatten arrays.                                                                                                                                                   | ✅  | 🔧 |    |
| [prefer-array-flat-map](docs/rules/prefer-array-flat-map.md)                                     | Prefer `.flatMap(…)` over `.map(…).flat()`.                                                                                                                                                                       | ✅  | 🔧 |    |
| [prefer-array-index-of](docs/rules/prefer-array-index-of.md)                                     | Prefer `Array#{indexOf,lastIndexOf}()` over `Array#{findIndex,findLastIndex}()` when looking for the index of an item.                                                                                            | ✅  | 🔧 | 💡 |
| [prefer-array-some](docs/rules/prefer-array-some.md)                                             | Prefer `.some(…)` over `.filter(…).length` check and `.{find,findLast,findIndex,findLastIndex}(…)`.                                                                                                               | ✅  | 🔧 | 💡 |
| [prefer-at](docs/rules/prefer-at.md)                                                             | Prefer `.at()` method for index access and `String#charAt()`.                                                                                                                                                     | ✅  | 🔧 | 💡 |
| [prefer-blob-reading-methods](docs/rules/prefer-blob-reading-methods.md)                         | Prefer `Blob#arrayBuffer()` over `FileReader#readAsArrayBuffer(…)` and `Blob#text()` over `FileReader#readAsText(…)`.                                                                                             | ✅  |    |    |
| [prefer-code-point](docs/rules/prefer-code-point.md)                                             | Prefer `String#codePointAt(…)` over `String#charCodeAt(…)` and `String.fromCodePoint(…)` over `String.fromCharCode(…)`.                                                                                           | ✅  |    | 💡 |
| [prefer-date-now](docs/rules/prefer-date-now.md)                                                 | Prefer `Date.now()` to get the number of milliseconds since the Unix Epoch.                                                                                                                                       | ✅  | 🔧 |    |
| [prefer-default-parameters](docs/rules/prefer-default-parameters.md)                             | Prefer default parameters over reassignment.                                                                                                                                                                      | ✅  | 🔧 | 💡 |
| [prefer-dom-node-append](docs/rules/prefer-dom-node-append.md)                                   | Prefer `Node#append()` over `Node#appendChild()`.                                                                                                                                                                 | ✅  | 🔧 |    |
| [prefer-dom-node-dataset](docs/rules/prefer-dom-node-dataset.md)                                 | Prefer using `.dataset` on DOM elements over calling attribute methods.                                                                                                                                           | ✅  | 🔧 |    |
| [prefer-dom-node-remove](docs/rules/prefer-dom-node-remove.md)                                   | Prefer `childNode.remove()` over `parentNode.removeChild(childNode)`.                                                                                                                                             | ✅  | 🔧 | 💡 |
| [prefer-dom-node-text-content](docs/rules/prefer-dom-node-text-content.md)                       | Prefer `.textContent` over `.innerText`.                                                                                                                                                                          | ✅  |    | 💡 |
| [prefer-event-target](docs/rules/prefer-event-target.md)                                         | Prefer `EventTarget` over `EventEmitter`.                                                                                                                                                                         | ✅  |    |    |
| [prefer-export-from](docs/rules/prefer-export-from.md)                                           | Prefer `export…from` when re-exporting.                                                                                                                                                                           | ✅  | 🔧 | 💡 |
| [prefer-global-this](docs/rules/prefer-global-this.md)                                           | Prefer `globalThis` over `window`, `self`, and `global`.                                                                                                                                                          | ✅  | 🔧 |    |
| [prefer-import-meta-properties](docs/rules/prefer-import-meta-properties.md)                     | Prefer `import.meta.{dirname,filename}` over legacy techniques for getting file paths.                                                                                                                            |    | 🔧 |    |
| [prefer-includes](docs/rules/prefer-includes.md)                                                 | Prefer `.includes()` over `.indexOf()`, `.lastIndexOf()`, and `Array#some()` when checking for existence or non-existence.                                                                                        | ✅  | 🔧 | 💡 |
| [prefer-json-parse-buffer](docs/rules/prefer-json-parse-buffer.md)                               | Prefer reading a JSON file as a buffer.                                                                                                                                                                           |    | 🔧 |    |
| [prefer-keyboard-event-key](docs/rules/prefer-keyboard-event-key.md)                             | Prefer `KeyboardEvent#key` over `KeyboardEvent#keyCode`.                                                                                                                                                          | ✅  | 🔧 |    |
| [prefer-logical-operator-over-ternary](docs/rules/prefer-logical-operator-over-ternary.md)       | Prefer using a logical operator over a ternary.                                                                                                                                                                   | ✅  |    | 💡 |
| [prefer-math-min-max](docs/rules/prefer-math-min-max.md)                                         | Prefer `Math.min()` and `Math.max()` over ternaries for simple comparisons.                                                                                                                                       | ✅  | 🔧 |    |
| [prefer-math-trunc](docs/rules/prefer-math-trunc.md)                                             | Enforce the use of `Math.trunc` instead of bitwise operators.                                                                                                                                                     | ✅  | 🔧 | 💡 |
| [prefer-modern-dom-apis](docs/rules/prefer-modern-dom-apis.md)                                   | Prefer `.before()` over `.insertBefore()`, `.replaceWith()` over `.replaceChild()`, prefer one of `.before()`, `.after()`, `.append()` or `.prepend()` over `insertAdjacentText()` and `insertAdjacentElement()`. | ✅  | 🔧 |    |
| [prefer-modern-math-apis](docs/rules/prefer-modern-math-apis.md)                                 | Prefer modern `Math` APIs over legacy patterns.                                                                                                                                                                   | ✅  | 🔧 |    |
| [prefer-module](docs/rules/prefer-module.md)                                                     | Prefer JavaScript modules (ESM) over CommonJS.                                                                                                                                                                    | ✅  | 🔧 | 💡 |
| [prefer-native-coercion-functions](docs/rules/prefer-native-coercion-functions.md)               | Prefer using `String`, `Number`, `BigInt`, `Boolean`, and `Symbol` directly.                                                                                                                                      | ✅  | 🔧 |    |
| [prefer-negative-index](docs/rules/prefer-negative-index.md)                                     | Prefer negative index over `.length - index` when possible.                                                                                                                                                       | ✅  | 🔧 |    |
| [prefer-node-protocol](docs/rules/prefer-node-protocol.md)                                       | Prefer using the `node:` protocol when importing Node.js builtin modules.                                                                                                                                         | ✅  | 🔧 |    |
| [prefer-number-properties](docs/rules/prefer-number-properties.md)                               | Prefer `Number` static properties over global ones.                                                                                                                                                               | ✅  | 🔧 | 💡 |
| [prefer-object-from-entries](docs/rules/prefer-object-from-entries.md)                           | Prefer using `Object.fromEntries(…)` to transform a list of key-value pairs into an object.                                                                                                                       | ✅  | 🔧 |    |
| [prefer-optional-catch-binding](docs/rules/prefer-optional-catch-binding.md)                     | Prefer omitting the `catch` binding parameter.                                                                                                                                                                    | ✅  | 🔧 |    |
| [prefer-prototype-methods](docs/rules/prefer-prototype-methods.md)                               | Prefer borrowing methods from the prototype instead of the instance.                                                                                                                                              | ✅  | 🔧 |    |
| [prefer-query-selector](docs/rules/prefer-query-selector.md)                                     | Prefer `.querySelector()` over `.getElementById()`, `.querySelectorAll()` over `.getElementsByClassName()` and `.getElementsByTagName()` and `.getElementsByName()`.                                              | ✅  | 🔧 |    |
| [prefer-reflect-apply](docs/rules/prefer-reflect-apply.md)                                       | Prefer `Reflect.apply()` over `Function#apply()`.                                                                                                                                                                 | ✅  | 🔧 |    |
| [prefer-regexp-test](docs/rules/prefer-regexp-test.md)                                           | Prefer `RegExp#test()` over `String#match()` and `RegExp#exec()`.                                                                                                                                                 | ✅  | 🔧 | 💡 |
| [prefer-set-has](docs/rules/prefer-set-has.md)                                                   | Prefer `Set#has()` over `Array#includes()` when checking for existence or non-existence.                                                                                                                          | ✅  | 🔧 | 💡 |
| [prefer-set-size](docs/rules/prefer-set-size.md)                                                 | Prefer using `Set#size` instead of `Array#length`.                                                                                                                                                                | ✅  | 🔧 |    |
| [prefer-single-call](docs/rules/prefer-single-call.md)                                           | Enforce combining multiple `Array#push()`, `Element#classList.{add,remove}()`, and `importScripts()` into one call.                                                                                               | ✅  | 🔧 | 💡 |
| [prefer-spread](docs/rules/prefer-spread.md)                                                     | Prefer the spread operator over `Array.from(…)`, `Array#concat(…)`, `Array#{slice,toSpliced}()` and `String#split('')`.                                                                                           | ✅  | 🔧 | 💡 |
| [prefer-string-raw](docs/rules/prefer-string-raw.md)                                             | Prefer using the `String.raw` tag to avoid escaping `\`.                                                                                                                                                          | ✅  | 🔧 |    |
| [prefer-string-replace-all](docs/rules/prefer-string-replace-all.md)                             | Prefer `String#replaceAll()` over regex searches with the global flag.                                                                                                                                            | ✅  | 🔧 |    |
| [prefer-string-slice](docs/rules/prefer-string-slice.md)                                         | Prefer `String#slice()` over `String#substr()` and `String#substring()`.                                                                                                                                          | ✅  | 🔧 |    |
| [prefer-string-starts-ends-with](docs/rules/prefer-string-starts-ends-with.md)                   | Prefer `String#startsWith()` & `String#endsWith()` over `RegExp#test()`.                                                                                                                                          | ✅  | 🔧 | 💡 |
| [prefer-string-trim-start-end](docs/rules/prefer-string-trim-start-end.md)                       | Prefer `String#trimStart()` / `String#trimEnd()` over `String#trimLeft()` / `String#trimRight()`.                                                                                                                 | ✅  | 🔧 |    |
| [prefer-structured-clone](docs/rules/prefer-structured-clone.md)                                 | Prefer using `structuredClone` to create a deep clone.                                                                                                                                                            | ✅  |    | 💡 |
| [prefer-switch](docs/rules/prefer-switch.md)                                                     | Prefer `switch` over multiple `else-if`.                                                                                                                                                                          | ✅  | 🔧 |    |
| [prefer-ternary](docs/rules/prefer-ternary.md)                                                   | Prefer ternary expressions over simple `if-else` statements.                                                                                                                                                      | ✅  | 🔧 |    |
| [prefer-top-level-await](docs/rules/prefer-top-level-await.md)                                   | Prefer top-level await over top-level promises and async function calls.                                                                                                                                          | ✅  |    | 💡 |
| [prefer-type-error](docs/rules/prefer-type-error.md)                                             | Enforce throwing `TypeError` in type checking conditions.                                                                                                                                                         | ✅  | 🔧 |    |
| [prevent-abbreviations](docs/rules/prevent-abbreviations.md)                                     | Prevent abbreviations.                                                                                                                                                                                            | ✅  | 🔧 |    |
| [relative-url-style](docs/rules/relative-url-style.md)                                           | Enforce consistent relative URL style.                                                                                                                                                                            | ✅  | 🔧 | 💡 |
| [require-array-join-separator](docs/rules/require-array-join-separator.md)                       | Enforce using the separator argument with `Array#join()`.                                                                                                                                                         | ✅  | 🔧 |    |
| [require-number-to-fixed-digits-argument](docs/rules/require-number-to-fixed-digits-argument.md) | Enforce using the digits argument with `Number#toFixed()`.                                                                                                                                                        | ✅  | 🔧 |    |
| [require-post-message-target-origin](docs/rules/require-post-message-target-origin.md)           | Enforce using the `targetOrigin` argument with `window.postMessage()`.                                                                                                                                            |    |    | 💡 |
| [string-content](docs/rules/string-content.md)                                                   | Enforce better string content.                                                                                                                                                                                    |    | 🔧 | 💡 |
| [switch-case-braces](docs/rules/switch-case-braces.md)                                           | Enforce consistent brace style for `case` clauses.                                                                                                                                                                | ✅  | 🔧 |    |
| [template-indent](docs/rules/template-indent.md)                                                 | Fix whitespace-insensitive template indentation.                                                                                                                                                                  | ✅  | 🔧 |    |
| [text-encoding-identifier-case](docs/rules/text-encoding-identifier-case.md)                     | Enforce consistent case for text encoding identifiers.                                                                                                                                                            | ✅  | 🔧 | 💡 |
| [throw-new-error](docs/rules/throw-new-error.md)                                                 | Require `new` when creating an error.                                                                                                                                                                             | ✅  | 🔧 |    |

<!-- end auto-generated rules list -->

### Deleted and deprecated rules

See [the list](docs/deleted-and-deprecated-rules.md).

## Preset configs

See the [ESLint docs](https://eslint.org/docs/latest/use/configure/configuration-files) for more information about extending config files.

**Note**: Preset configs will also enable the correct [language options](https://eslint.org/docs/latest/use/configure/language-options).

### Recommended config

This plugin exports a `recommended` config that enforces good practices.

```js
import eslintPluginUnicorn from 'eslint-plugin-unicorn';

export default [
		// …
		eslintPluginUnicorn.configs.recommended,
		{
			rules: {
				'unicorn/better-regex': 'warn',
			},
		},
];
```

### All config

This plugin exports an `all` that makes use of all rules (except for deprecated ones).

```js
import eslintPluginUnicorn from 'eslint-plugin-unicorn';

export default [
		// …
		eslintPluginUnicorn.configs.all,
		{
			rules: {
				'unicorn/better-regex': 'warn',
			},
		},
];
```

## Maintainers

- [Sindre Sorhus](https://github.com/sindresorhus)
- [Fisker Cheung](https://github.com/fisker)
- [Bryan Mishkin](https://github.com/bmish)
- [futpib](https://github.com/futpib)

### Former

- [Jeroen Engels](https://github.com/jfmengels)
- [Sam Verschueren](https://github.com/SamVerschueren)
- [Adam Babcock](https://github.com/MrHen)
