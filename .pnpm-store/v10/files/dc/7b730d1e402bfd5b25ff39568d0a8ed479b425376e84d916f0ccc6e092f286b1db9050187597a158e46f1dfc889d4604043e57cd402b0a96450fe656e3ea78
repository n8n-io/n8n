<div align="center">
<h1>Vue Testing Library</h1>

<br />

<a href="https://www.joypixels.com/emoji/1F98E">
  <img
    height="80"
    width="80"
    alt="lizard"
    src="https://raw.githubusercontent.com/testing-library/vue-testing-library/main/lizard.png"
  />
</a>

<p>Simple and complete Vue.js testing utilities that encourage good testing practices.</p>

<p>Vue Testing Library is a lightweight adapter built on top of <a href="https://github.com/testing-library/dom-testing-library/">DOM Testing Library</a> and <a href="https://github.com/vuejs/vue-test-utils">@vue/test-utils</a>.</p>

<br />

[**Read the docs**][docs] | [Edit the docs][docs-edit]

<br />

</div>

<hr />

<!-- prettier-ignore-start -->
[![Coverage Status][coverage-badge]][coverage]
[![GitHub version][github-badge]][github]
[![npm version][npm-badge]][npm]
[![Discord][discord-badge]][discord]
[![MIT License][license-badge]][license]
<!-- prettier-ignore-end -->

<h2>Table of Contents</h2>

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->

- [Installation](#installation)
- [A basic example](#a-basic-example)
  - [More examples](#more-examples)
- [Guiding Principles](#guiding-principles)
- [Docs](#docs)
- [Typings](#typings)
- [ESLint support](#eslint-support)
- [Issues](#issues)
  - [🐛 Bugs](#-bugs)
  - [💡 Feature Requests](#-feature-requests)
  - [❓ Questions](#-questions)
- [License](#license)
- [Contributors](#contributors)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Installation

This module is distributed via `npm` and should be installed as one of your
project's `devDependencies`:

```
npm install --save-dev @testing-library/vue
```

This library has `peerDependencies` listings for `Vue 3` and
`@vue/compiler-sfc`.

You may also be interested in installing `jest-dom` so you can use [the custom
Jest matchers][jest-dom].

If you're using Vue 2, please install version 5 of the library:

```
npm install --save-dev @testing-library/vue@^5
```


## A basic example

```html
<template>
  <p>Times clicked: {{ count }}</p>
  <button @click="increment">increment</button>
</template>

<script>
  export default {
    name: 'Button',
    data: () => ({
      count: 0,
    }),
    methods: {
      increment() {
        this.count++
      },
    },
  }
</script>
```

```js
import {render, screen, fireEvent} from '@testing-library/vue'
import Button from './Button'

test('increments value on click', async () => {
  // The `render` method renders the component into the document.
  // It also binds to `screen` all the available queries to interact with
  // the component.
  render(Button)

  // queryByText returns the first matching node for the provided text
  // or returns null.
  expect(screen.queryByText('Times clicked: 0')).toBeTruthy()

  // getByText returns the first matching node for the provided text
  // or throws an error.
  const button = screen.getByText('increment')

  // Click a couple of times.
  await fireEvent.click(button)
  await fireEvent.click(button)

  expect(screen.queryByText('Times clicked: 2')).toBeTruthy()
})
```

> You might want to install [`jest-dom`][jest-dom] to add handy assertions such
> as `.toBeInTheDocument()`. In the example above, you could write
> `expect(screen.getByText('Times clicked: 0')).toBeInTheDocument()`.

> Using `byText` queries it's not the only nor the best way to query for
> elements. Read [Which query should I use?][which-query] to discover
> alternatives. In the example above, `getByRole('button', {name: 'increment'})`
> is possibly the best option to get the button element.

### More examples

You'll find examples of testing with different situations and popular libraries
in [the test directory][test-directory].

Some included are:

- [`vuex`][vuex-example]
- [`vue-router`][vue-router-example]
- [`vee-validate`][vee-validate-example]
- [`vue-i18n`][vue-i18n-example]
- [`vuetify`][vuetify-example]

Feel free to contribute with more examples!

## Guiding Principles

> [The more your tests resemble the way your software is used, the more
> confidence they can give you.][guiding-principle]

We try to only expose methods and utilities that encourage you to write tests
that closely resemble how your Vue components are used.

Utilities are included in this project based on the following guiding
principles:

1.  If it relates to rendering components, it deals with DOM nodes rather than
    component instances, nor should it encourage dealing with component
    instances.
2.  It should be generally useful for testing individual Vue components or full
    Vue applications.
3.  Utility implementations and APIs should be simple and flexible.

At the end of the day, what we want is for this library to be pretty
light-weight, simple, and understandable.

## Docs

[**Read the docs**][docs] | [Edit the docs][docs-edit]

## Typings

_Please note that TypeScript 4.X is required._

The TypeScript type definitions are in the [types][types-directory] directory.

## ESLint support

If you want to lint test files that use Vue Testing Library, you can use the
official plugin: [eslint-plugin-testing-library][eslint-plugin-testing-library].

## Issues

_Looking to contribute? Look for the [Good First Issue][good-first-issue]
label._

### 🐛 Bugs

Please [file an issue][add-issue-bug] for bugs, missing documentation, or
unexpected behavior.

[**See Bugs**][bugs]

### 💡 Feature Requests

Please [file an issue][add-issue] to suggest new features. Vote on feature
requests by adding a 👍. This helps maintainers prioritize what to work on.

### ❓ Questions

For questions related to using the library, please visit a support community
instead of filing an issue on GitHub.

- [Discord][discord]

## License

[MIT][license]

## Contributors

[![dfcook](https://avatars0.githubusercontent.com/u/10348212?v=3&s=120)](https://github.com/dfcook)
[![afontcu](https://avatars3.githubusercontent.com/u/9197791?v=3&s=120)](https://github.com/afontcu)
[![eunjae-lee](https://avatars0.githubusercontent.com/u/499898?v=3&s=120)](https://github.com/eunjae-lee)
[![tim-maguire](https://avatars0.githubusercontent.com/u/29452317?v=3&s=120)](https://github.com/tim-maguire)
[![samdelacruz](https://avatars0.githubusercontent.com/u/2040007?v=3&s=120)](https://github.com/samdelacruz)
[![ankitsinghaniyaz](https://avatars0.githubusercontent.com/u/11331989?v=3&s=120)](https://github.com/ankitsinghaniyaz)
[![lindgr3n](https://avatars0.githubusercontent.com/u/24882614?v=3&s=120)](https://github.com/lindgr3n)
[![kentcdodds](https://avatars0.githubusercontent.com/u/1500684?v=3&s=120)](https://github.com/kentcdodds)
[![brennj](https://avatars2.githubusercontent.com/u/29227924?v=3&s=120)](https://github.com/brennj)
[![makeupsomething](https://avatars2.githubusercontent.com/u/7676733?v=3&s=120)](https://github.com/makeupsomething)
[![mb200](https://avatars2.githubusercontent.com/u/22549525?v=3&s=120)](https://github.com/mb200)
[![Oluwasetemi](https://avatars2.githubusercontent.com/u/10030028?v=3&s=120)](https://github.com/Oluwasetemi)
[![cimbul](https://avatars2.githubusercontent.com/u/927923?v=3&s=120)](https://github.com/cimbul)
[![alexkrolick](https://avatars2.githubusercontent.com/u/1571667?v=3&s=120)](https://github.com/alexkrolick)
[![edufarre](https://avatars2.githubusercontent.com/u/25011566?v=3&s=120)](https://github.com/edufarre)
[![SandraDml](https://avatars2.githubusercontent.com/u/5694169?v=3&s=120)](https://github.com/SandraDml)
[![arnaublanche](https://avatars2.githubusercontent.com/u/24812315?v=3&s=120)](https://github.com/arnaublanche)
[![NoelDeMartin](https://avatars2.githubusercontent.com/u/1517677?v=3&s=120)](https://github.com/NoelDeMartin)
[![chiptus](https://avatars2.githubusercontent.com/u/1381655?v=3&s=120)](https://github.com/chiptus)
[![bennettdams](https://avatars2.githubusercontent.com/u/29319414?v=3&s=120)](https://github.com/bennettdams)
[![mediafreakch](https://avatars2.githubusercontent.com/u/777093?v=3&s=120)](https://github.com/mediafreakch)
[![afenton90](https://avatars2.githubusercontent.com/u/8963736?v=3&s=120)](https://github.com/afenton90)
[![cilice](https://avatars2.githubusercontent.com/u/835588?v=3&s=120)](https://github.com/cilice)
[![ITenthusiasm](https://avatars2.githubusercontent.com/u/47364027?v3&s=120)](https://github.com/ITenthusiasm)

<!-- prettier-ignore-start -->
[coverage-badge]: https://img.shields.io/codecov/c/github/testing-library/vue-testing-library.svg
[coverage]: https://codecov.io/github/testing-library/vue-testing-library
[github-badge]: https://badge.fury.io/gh/testing-library%2Fvue-testing-library.svg
[github]: https://badge.fury.io/gh/testing-library%2Fvue-testing-library
[npm-badge]: https://badge.fury.io/js/%40testing-library%2Fvue.svg
[npm]: https://badge.fury.io/js/%40testing-library%2Fvue
[license-badge]: https://img.shields.io/github/license/testing-library/vue-testing-library.svg
[license]: https://github.com/testing-library/vue-testing-library/blob/master/LICENSE
[discord]: https://testing-library.com/discord
[discord-badge]: https://img.shields.io/discord/723559267868737556.svg?label=&logo=discord&logoColor=ffffff&color=7389D8&labelColor=6A7EC2&style=flat-square
[jest-dom]: https://github.com/testing-library/jest-dom
[which-query]: https://testing-library.com/docs/guide-which-query
[guiding-principle]: https://twitter.com/kentcdodds/status/977018512689455106
[good-first-issue]: https://github.com/testing-library/vue-testing-library/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22

[docs]: https://testing-library.com/vue
[docs-edit]: https://github.com/testing-library/testing-library-docs
[eslint-plugin-testing-library]: https://github.com/testing-library/eslint-plugin-testing-library

[bugs]: https://github.com/testing-library/vue-testing-library/issues?q=is%3Aissue+is%3Aopen+label%3Abug+sort%3Acreated-desc
[add-issue-bug]: https://github.com/testing-library/vue-testing-library/issues/new?assignees=&labels=bug&template=bug_report.md&title=
[add-issue]: (https://github.com/testing-library/vue-testing-library/issues/new)

[types-directory]: https://github.com/testing-library/vue-testing-library/blob/main/types
[test-directory]: https://github.com/testing-library/vue-testing-library/blob/main/src/__tests__
[vuex-example]: https://github.com/testing-library/vue-testing-library/blob/main/src/__tests__/vuex.js
[vue-router-example]: https://github.com/testing-library/vue-testing-library/blob/main/src/__tests__/vue-router.js
[vee-validate-example]: https://github.com/testing-library/vue-testing-library/blob/main/src/__tests__/validate-plugin.js
[vue-i18n-example]: https://github.com/testing-library/vue-testing-library/blob/main/src/__tests__/translations-vue-i18n.js
[vuetify-example]: https://github.com/testing-library/vue-testing-library/blob/main/src/__tests__/vuetify.js
<!-- prettier-ignore-end -->
