# `@mdx-js/react`

[![Build][build-badge]][build]
[![Coverage][coverage-badge]][coverage]
[![Downloads][downloads-badge]][downloads]
[![Size][size-badge]][size]
[![Sponsors][sponsors-badge]][collective]
[![Backers][backers-badge]][collective]
[![Chat][chat-badge]][chat]

React context for MDX.

<!-- more -->

## Contents

* [What is this?](#what-is-this)
* [When should I use this?](#when-should-i-use-this)
* [Install](#install)
* [Use](#use)
* [API](#api)
  * [`MDXProvider(properties?)`](#mdxproviderproperties)
  * [`useMDXComponents(components?)`](#usemdxcomponentscomponents)
  * [`MergeComponents`](#mergecomponents)
  * [`Props`](#props)
* [Types](#types)
* [Compatibility](#compatibility)
* [Security](#security)
* [Contribute](#contribute)
* [License](#license)

## What is this?

This package is a *context* based components provider for combining React with
MDX.

## When should I use this?

This package is **not needed** for MDX to work with React.
See [¶ MDX provider in § Using MDX][use-provider] for when and how to use an MDX
provider.

If you use Next.js, **do not use this**.
Add an `mdx-components.tsx` (in `src/` or `/`) file instead.
See [Configuring MDX on `nextjs.org`][next-configuring-mdx] for more info.

## Install

This package is [ESM only][esm].
In Node.js (version 16+), install with [npm][]:

```sh
npm install @mdx-js/react
```

In Deno with [`esm.sh`][esmsh]:

```tsx
import {MDXProvider} from 'https://esm.sh/@mdx-js/react@3'
```

In browsers with [`esm.sh`][esmsh]:

```html
<script type="module">
  import {MDXProvider} from 'https://esm.sh/@mdx-js/react@3?bundle'
</script>
```

## Use

```tsx
/**
 * @import {MDXComponents} from 'mdx/types.js'
 */

import {MDXProvider} from '@mdx-js/react'
import Post from './post.mdx'
// ^-- Assumes an integration is used to compile MDX to JS, such as
// `@mdx-js/esbuild`, `@mdx-js/loader`, `@mdx-js/node-loader`, or
// `@mdx-js/rollup`, and that it is configured with
// `options.providerImportSource: '@mdx-js/react'`.

/** @type {MDXComponents} */
const components = {
  em(properties) {
    return <i {...properties} />
  }
}

console.log(
  <MDXProvider components={components}>
    <Post />
  </MDXProvider>
)
```

> 👉 **Note**: you don’t have to use `MDXProvider` and can pass components
> directly:
>
> ```diff
> -<MDXProvider components={components}>
> -  <Post />
> -</MDXProvider>
> +<Post components={components} />
> ```

See [¶ React in § Getting started][start-react] for how to get started with MDX
and React.
See [¶ MDX provider in § Using MDX][use-provider] for how to use an MDX
provider.

## API

This package exports the identifiers [`MDXProvider`][api-mdx-provider] and
[`useMDXComponents`][api-use-mdx-components].
There is no default export.

### `MDXProvider(properties?)`

Provider for MDX context.

###### Parameters

* `properties` ([`Props`][api-props])
  — configuration

##### Returns

Element (`ReactElement`).

### `useMDXComponents(components?)`

Get current components from the MDX Context.

###### Parameters

* `components` ([`MDXComponents` from `mdx/types.js`][mdx-types-components]
  or [`MergeComponents`][api-merge-components], optional)
  — additional components to use or a function that creates them

###### Returns

Current components ([`MDXComponents` from
`mdx/types.js`][mdx-types-components]).

### `MergeComponents`

Custom merge function (TypeScript type).

###### Parameters

* `components` ([`MDXComponents` from `mdx/types.js`][mdx-types-components])
  — current components from the context

###### Returns

Additional components ([`MDXComponents` from
`mdx/types.js`][mdx-types-components]).

### `Props`

Configuration for `MDXProvider` (TypeScript type).

###### Fields

* `children` ([`ReactNode` from `react`][react-node],
  optional)
  — children
* `components` ([`MDXComponents` from `mdx/types.js`][mdx-types-components]
  or [`MergeComponents`][api-merge-components], optional)
  — additional components to use or a function that creates them
* `disableParentContext` (`boolean`, default: `false`)
  — turn off outer component context

## Types

This package is fully typed with [TypeScript][].
It exports the additional types [`MergeComponents`][api-merge-components] and
[`Props`][api-props].

For types to work, make sure the TypeScript `JSX` namespace is typed.
This is done by installing and using the types of your framework, as in
[`@types/react`](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/HEAD/types/react).

## Compatibility

Projects maintained by the unified collective are compatible with maintained
versions of Node.js.

When we cut a new major release, we drop support for unmaintained versions of
Node.
This means we try to keep the current release line, `@mdx-js/react@^3`,
compatible with Node.js 16.

## Security

See [§ Security][security] on our website for information.

## Contribute

See [§ Contribute][contribute] on our website for ways to get started.
See [§ Support][support] for ways to get help.

This project has a [code of conduct][coc].
By interacting with this repository, organization, or community you agree to
abide by its terms.

## License

[MIT][] © Compositor and [Vercel][]

[api-mdx-provider]: #mdxproviderproperties

[api-merge-components]: #mergecomponents

[api-props]: #props

[api-use-mdx-components]: #usemdxcomponentscomponents

[backers-badge]: https://opencollective.com/unified/backers/badge.svg

[build]: https://github.com/mdx-js/mdx/actions

[build-badge]: https://github.com/mdx-js/mdx/workflows/main/badge.svg

[chat]: https://github.com/mdx-js/mdx/discussions

[chat-badge]: https://img.shields.io/badge/chat-discussions-success.svg

[coc]: https://github.com/mdx-js/.github/blob/main/code-of-conduct.md

[collective]: https://opencollective.com/unified

[contribute]: https://mdxjs.com/community/contribute/

[coverage]: https://codecov.io/github/mdx-js/mdx

[coverage-badge]: https://img.shields.io/codecov/c/github/mdx-js/mdx/main.svg

[downloads]: https://www.npmjs.com/package/@mdx-js/react

[downloads-badge]: https://img.shields.io/npm/dm/@mdx-js/react.svg

[esm]: https://gist.github.com/sindresorhus/a39789f98801d908bbc7ff3ecc99d99c

[esmsh]: https://esm.sh

[mdx-types-components]: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/HEAD/types/mdx/types.d.ts#L65

[mit]: https://github.com/mdx-js/mdx/blob/main/packages/react/license

[next-configuring-mdx]: https://nextjs.org/docs/pages/building-your-application/configuring/mdx

[npm]: https://docs.npmjs.com/cli/install

[react-node]: https://github.com/DefinitelyTyped/DefinitelyTyped/blob/HEAD/types/react/index.d.ts#L244

[security]: https://mdxjs.com/getting-started/#security

[size]: https://bundlejs.com/?q=@mdx-js/react

[size-badge]: https://img.shields.io/bundlejs/size/@mdx-js/react

[sponsors-badge]: https://opencollective.com/unified/sponsors/badge.svg

[start-react]: https://mdxjs.com/getting-started/#react

[support]: https://mdxjs.com/community/support/

[typescript]: https://www.typescriptlang.org

[use-provider]: https://mdxjs.com/docs/using-mdx/#mdx-provider

[vercel]: https://vercel.com
