# eslint-plugin-vue

[![NPM version](https://img.shields.io/npm/v/eslint-plugin-vue.svg?style=flat)](https://npmjs.org/package/eslint-plugin-vue)
[![NPM downloads](https://img.shields.io/npm/dm/eslint-plugin-vue.svg?style=flat)](https://npmjs.org/package/eslint-plugin-vue)
[![CI](https://img.shields.io/github/actions/workflow/status/vuejs/eslint-plugin-vue/CI.yml?style=flat&label=CI)](https://github.com/vuejs/eslint-plugin-vue/actions/workflows/CI.yml)
[![License](https://img.shields.io/github/license/vuejs/eslint-plugin-vue.svg?style=flat)](https://github.com/vuejs/eslint-plugin-vue/blob/master/LICENSE)

> Official ESLint plugin for Vue.js

## :book: Documentation

Please refer to the [official website](https://eslint.vuejs.org).

## :anchor: Versioning Policy

This plugin follows [Semantic Versioning].
However, please note that we do not follow [ESLint's Semantic Versioning Policy].
In minor version releases, this plugin may change the sharable configs provided by the plugin or the default behavior of the plugin's rules in order to add features to the plugin. Because we want to add many features to the plugin soon, so that users can easily take advantage of new features in Vue and Nuxt.

According to our policy, any minor update may report more linting errors than the previous release. As such, we recommend using the [tilde (`~`)](https://semver.npmjs.com/#syntax-examples) in `package.json` to guarantee the results of your builds.

[Semantic Versioning]: https://semver.org/
[ESLint's Semantic Versioning Policy]: https://github.com/eslint/eslint#semantic-versioning-policy

## :newspaper: Releases

This project uses [GitHub Releases](https://github.com/vuejs/eslint-plugin-vue/releases).

## :beers: Contribution Guide

Contributing is welcome! See the [ESLint Vue Plugin Developer Guide](https://eslint.vuejs.org/developer-guide).

### Working With Rules

Be sure to read the [official ESLint guide](https://eslint.org/docs/developer-guide/working-with-rules) before you start writing a new rule.

To see what an abstract syntax tree (AST) of your code looks like, you may use [AST Explorer](https://astexplorer.net). After opening [AST Explorer](https://astexplorer.net), select `Vue` as the syntax and `vue-eslint-parser` as the parser.

The default JavaScript parser must be replaced because [Vue.js single file components](https://vuejs.org/guide/scaling-up/sfc.html) are not plain JavaScript, but a custom file format. [`vue-eslint-parser`](https://github.com/vuejs/vue-eslint-parser) is a replacement parser that generates an enhanced AST with nodes that represent specific parts of the template syntax, as well as the contents of the `<script>` tag.

To learn more about certain nodes in a produced AST, see the [ESTree project page](https://github.com/estree/estree) and the [vue-eslint-parser AST documentation](https://github.com/vuejs/vue-eslint-parser/blob/master/docs/ast.md).

`vue-eslint-parser` provides a few useful parser services to help traverse the produced AST and access template tokens:

- `context.parserServices.defineTemplateBodyVisitor(visitor, scriptVisitor)`
- `context.parserServices.getTemplateBodyTokenStore()`

Check out an [example rule](https://github.com/vuejs/eslint-plugin-vue/blob/master/lib/rules/mustache-interpolation-spacing.js) to see usage of these services.

Be aware that depending on the code samples you write in tests, the `RuleTester` parser property must be set accordingly (this can be done on a test by test basis). See an [example here](https://github.com/vuejs/eslint-plugin-vue/blob/master/tests/lib/rules/attribute-hyphenation.js#L19).

If you're stuck, remember there are many rules available for reference. If you can't find the right solution, don't hesitate to reach out in [issues](https://github.com/vuejs/eslint-plugin-vue/issues) – we're happy to help!

## :lock: License

See the [LICENSE](LICENSE) file for license rights and limitations (MIT).
