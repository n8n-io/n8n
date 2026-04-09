# unplugin-icons

[![NPM version](https://img.shields.io/npm/v/unplugin-icons?color=a1b858&label=)](https://www.npmjs.com/package/unplugin-icons)

Access thousands of icons as components **on-demand** universally.

### Features

- 🌏 Universal
  - 🤹 **Any** icon sets - ~150 popular sets with over 200,000 icons, logos, emojis, etc. Powered by [Iconify](https://github.com/iconify/iconify).
  - 📦 **Major** build tools - Vite, Webpack, Rollup, Nuxt, etc. Powered by [unplugin](https://github.com/unjs/unplugin).
  - 🚀 **Major** frameworks - Vanilla, Web Components, React, Vue 3, Vue 2, Solid, Svelte, and more. [Contribute](./src/core/compilers).
  - 🍱 **Any** combinations of them!
- ☁️ On-demand - Only bundle the icons you really use, while having all the options.
- 🖨 SSR / SSG friendly - Ship the icons with your page, no more FOUC.
- 🌈 Stylable - Change size, color, or even add animations as you would with styles and classes.
- 📥 [Custom icons](#custom-icons) - load your custom icons to get universal integrations at ease.
- 📲 [Auto Importing](#auto-importing) - Use icons as components directly in your template.
- 🦾 TypeScript support.
- 🔍 [Browse Icons](https://icones.js.org/)

<table><tr><td><br>

&nbsp;&nbsp;&nbsp;💡 **Story behind this tool**: [Journey with Icons Continues](https://antfu.me/posts/journey-with-icons-continues) - a blog post by Anthony&nbsp;&nbsp;&nbsp;

</td></tr></table>

> **`vite-plugin-icons` has been renamed to `unplugin-icons`**, see the [migration guide](#migrate-from-vite-plugin-icons)

## Usage

Import icons names with the convention `~icons/{collection}/{icon}` and use them directly as components. [Auto importing is also possible](#auto-importing).

###### React

```jsx
import IconAccessibility from '~icons/carbon/accessibility'
import IconAccountBox from '~icons/mdi/account-box'

function App() {
  return (
    <div>
      <IconAccessibility />
      <IconAccountBox style={{ fontSize: '2em', color: 'red' }} />
    </div>
  )
}
```

###### Vue

```html
<script setup>
import IconAccessibility from '~icons/carbon/accessibility'
import IconAccountBox from '~icons/mdi/account-box'
</script>

<template>
  <icon-accessibility/>
  <icon-account-box style="font-size: 2em; color: red"/>
</template>
```

## Install

### Plugin

```bash
npm i -D unplugin-icons
```

### Icons Data

We use [Iconify](https://iconify.design/) as the icons data source (supports 100+ iconsets).

You have two ways to install them:

###### Install Full Collection

```bash
npm i -D @iconify/json
```

`@iconify/json` (~120MB) includes all the iconsets from Iconify so you can install once and use any of them as you want (only the icons you actually use will be bundle into the production build).

###### Install by Icon Set

If you only want to use a few of the icon sets and don't want to download the entire collection, you can also install them individually with `@iconify-json/[collection-id]`.
For example, to install [Material Design Icons](https://icon-sets.iconify.design/mdi/), you can do:

```bash
npm i -D @iconify-json/mdi
```

To boost your workflow, it's also possible to let `unplugin-icons` handle that installation by enabling the `autoInstall` option.

```ts
Icons({
  // experimental
  autoInstall: true,
})
```

It will install the icon set when you import them. The right package manager will be auto-detected (`npm`, `yarn` or `pnpm`).

## Examples

You can play online with the examples in this repo in StackBlitz, see [playgrounds page](./examples/README.md).

Fork any of the online examples and reproduce the issue you're facing, then share the link with us.

## Configuration

###### Build Tools

<details>
<summary>Vite</summary><br>

```ts
// vite.config.ts
import Icons from 'unplugin-icons/vite'

export default defineConfig({
  plugins: [
    Icons({ /* options */ }),
  ],
})
```

<br></details>

<details>
<summary>Rollup</summary><br>

```ts
// rollup.config.js
import Icons from 'unplugin-icons/rollup'

export default {
  plugins: [
    Icons({ /* options */ }),
  ],
}
```

<br></details>

<details>
<summary>Webpack</summary><br>

```ts
// webpack.config.js
module.exports = {
  /* ... */
  plugins: [
    require('unplugin-icons/webpack').default({ /* options */ }),
  ],
}
```

<br></details>

<details>
<summary>Nuxt</summary><br>

Nuxt 2 and [Nuxt Bridge](https://github.com/nuxt/bridge)

```ts
// nuxt.config.js
export default {
  buildModules: [
    ['unplugin-icons/nuxt', { /* options */ }],
  ],
}
```

Nuxt 3

```ts
// nuxt.config.js
export default defineNuxtConfig({
  modules: [
    ['unplugin-icons/nuxt', { /* options */ }]
  ],
})
```

Or work with [unplugin-vue-components](https://github.com/unplugin/unplugin-vue-components) resolvers

```ts
import ViteComponents from 'unplugin-vue-components/vite'
import IconsResolver from 'unplugin-icons/resolver'

// nuxt.config.ts
export default defineNuxtConfig({
  modules: [
    'unplugin-icons/nuxt',
  ],
  vite: {
    plugins: [
      ViteComponents({
        resolvers: [
          IconsResolver({/* options */}),
        ],
      }),
    ],
  },
})
```

See [the Nuxt example](examples/nuxt3) for a working example project.

<br></details>

<details>
<summary>Vue CLI</summary><br>

```ts
// vue.config.js
module.exports = {
  configureWebpack: {
    plugins: [
      require('unplugin-icons/webpack').default({ /* options */ }),
    ],
  },
}
```

You can also rename the Vue configuration file to `vue.config.mjs` and use static import syntax (you should use latest `@vue/cli-service ^5.0.8`):
```ts
// vue.config.mjs
import Icons from 'unplugin-icons/webpack'

export default {
  configureWebpack: {
    plugins: [
      Icons({ /* options */ }),
    ],
  },
}
```

<br></details>

<details>
<summary>SvelteKit</summary><br>

The `unplugin-icons` plugin should be configured in the `vite.config.js` configuration file:

```ts
// vite.config.js
import { defineConfig } from 'vite'
import { sveltekit } from '@sveltejs/kit/vite'
import Icons from 'unplugin-icons/vite'

export default defineConfig({
  plugins: [
    sveltekit(),
    Icons({
      compiler: 'svelte',
    })
  ]
})
```

Check instructions in the `Frameworks -> Svelte` section below if you faced module import errors.

See [the SvelteKit example](examples/sveltekit) for a working example project.

<br></details>

<details>
<summary>Svelte + Vite</summary><br>

Svelte support requires the `@sveltejs/vite-plugin-svelte` plugin:
```shell
npm i -D @sveltejs/vite-plugin-svelte
```

The `unplugin-icons` plugin should be configured in the `vite.config.js` configuration file:

```ts
// vite.config.js
import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import Icons from 'unplugin-icons/vite'

export default defineConfig({
  plugins: [
    svelte(),
    Icons({
      compiler: 'svelte',
    }),
  ],
})
```

Check instructions in the `Frameworks -> Svelte` section below if you faced module import errors.

See [the Svelte + Vite example](examples/vite-svelte) for a working example project.

<br></details>

<details>
<summary>Next.js</summary><br>

The `unplugin-icons` plugin should be configured on `next.config.js` configuration file:
```ts
// next.config.js
/** @type {import('next').NextConfig} */
module.exports = {
  reactStrictMode: true,
  webpack(config) {
    config.plugins.push(
      require('unplugin-icons/webpack').default({
        compiler: 'jsx',
        jsx: 'react'
      })
    )

    return config
  },
}
```

You can also rename the Next configuration file to `next.config.mjs` and use static import syntax:
```ts
// next.config.mjs
import Icons from 'unplugin-icons/webpack'

/** @type {import('next').NextConfig} */
export default {
  reactStrictMode: true,
  webpack(config) {
    config.plugins.push(
      Icons({
        compiler: 'jsx',
        jsx: 'react'
      })
    )

    return config
  }
}
```

Check instructions in the `Frameworks -> React` section below if you faced module import errors.

⚠️ **Warning:** to import an icon is necessary to explicitly add the `.jsx` extension to the import path, so that Next.js knows how to load it, by example:

<!-- eslint-skip -->

```ts
import IconArrowRight from '~icons/dashicons/arrow-right.jsx';
                                                     // ^-- write `.jsx` to avoid
                                                     // https://github.com/antfu/unplugin-icons/issues/103
// ...some code later
<IconArrowRight />
```

See [the Next.js example](examples/next) for a working example project.

<br></details>

<details>
<summary>esbuild</summary><br>

```ts
// esbuild.config.js
import { build } from 'esbuild'
import Icons from 'unplugin-icons/esbuild'

build({
  /* ... */
  plugins: [
    Icons({
      /* options */
    }),
  ],
})
```

<br></details>

<details>
<summary>Astro</summary><br>

```ts
// astro.config.mjs
import { defineConfig } from 'astro/config'
import Icons from 'unplugin-icons/vite'

// https://astro.build/config
export default defineConfig({
  vite: {
    plugins: [
      Icons({
        compiler: 'astro',
      }),
    ],
  },
})
```

See [the Astro example](examples/astro) for a working example project.

<br></details>

<details>
<summary>Astro + Vue</summary><br>

Required [@astrojs/vue](https://docs.astro.build/es/guides/integrations-guide/vue/) installed.

```ts
// astro.config.mjs
import { defineConfig } from 'astro/config'
import Vue from '@astrojs/vue'
import Icons from 'unplugin-icons/vite'

// https://astro.build/config
export default defineConfig({
  integrations: [
    Vue(),
  ],
  vite: {
    plugins: [
      Icons({
        compiler: 'vue3',
      }),
    ],
  },
})
```

See [the Astro + Vue example](examples/astro-vue) for a working example project.

<br></details>

###### Frameworks

<details>
<summary>Vue 3 / Vue 2.7+</summary><br>

Vue 3 / Vue 2.7+ support requires peer dependency `@vue/compiler-sfc`:

```bash
npm i -D @vue/compiler-sfc
```

```ts
Icons({ compiler: 'vue3' })
```

Type Declarations

<!-- eslint-skip -->

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "types": [
      "unplugin-icons/types/vue",
    ]
  }
}
```

See [the Vue 3 example](examples/vite-vue3) for a working example project.

<br></details>

<details>
<summary>Vue 2 (only for versions < 2.7)</summary><br>

Vue 2 support requires peer dependency `vue-template-compiler`:

```bash
npm i -D vue-template-compiler
```

```ts
Icons({ compiler: 'vue2' })
```

Type Declarations

<!-- eslint-skip -->

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "types": [
      "unplugin-icons/types/vue",
    ]
  }
}
```

See [the Vue 2 example](examples/vite-vue2) for a working example project.

<br></details>

<details>
<summary>React</summary><br>

JSX support requires peer dependency `@svgr/core` and its plugin `@svgr/plugin-jsx`:

```bash
npm i -D @svgr/core @svgr/plugin-jsx
```

```ts
Icons({ compiler: 'jsx', jsx: 'react' })
```

Type Declarations

<!-- eslint-skip -->

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "types": [
      "unplugin-icons/types/react",
    ]
  }
}
```

See [the React example](examples/vite-react) for a working example project.

<br></details>

<details>
<summary>Preact</summary><br>

JSX support requires peer dependency `@svgr/core` and its plugin `@svgr/plugin-jsx`:

```bash
npm i -D @svgr/core @svgr/plugin-jsx
```

```ts
Icons({ compiler: 'jsx', jsx: 'preact' })
```

Type Declarations

<!-- eslint-skip -->

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "types": [
      "unplugin-icons/types/preact",
    ]
  }
}
```

See [the Preact example](examples/vite-preact) for a working example project.

<br></details>

<details>
<summary>Solid</summary><br>

```ts
Icons({ compiler: 'solid' })
```

Type Declarations

<!-- eslint-skip -->

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "types": [
      "unplugin-icons/types/solid",
    ]
  }
}
```

See [the Solid example](examples/vite-solid) for a working example project.

<br></details>

<details>
<summary>Svelte</summary><br>

```ts
Icons({ compiler: 'svelte' })
```

Type Declarations

For SvelteKit, in the `src/app.d.ts` file:

```ts
import 'unplugin-icons/types/svelte'
```

For Svelte + Vite, in the `src/vite-env.d.ts` file:

```js
/// <reference types="svelte" />
/// <reference types="vite/client" />
/// <reference types="unplugin-icons/types/svelte" />
```

If you're still using Svelte 3, replace the reference to use Svelte 3:
```js
/// <reference types="svelte" />
/// <reference types="vite/client" />
/// <reference types="unplugin-icons/types/svelte3" />
```

See [the Svelte example](examples/vite-svelte) for a working example project.

<br></details>

<details>
<summary>Astro</summary><br>

Type Declarations

<!-- eslint-skip -->

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "types": [
      "unplugin-icons/types/astro",
    ]
  }
}
```

See [the Astro example](examples/astro) for a working example project.

<br></details>

<details>
<summary>Astro + Vue</summary><br>

Only the Vue type declarations are required:

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "types": [
      "unplugin-icons/types/vue"
    ]
  }
}
```

See [the Astro + Vue example](examples/astro-vue) for a working example project.

<br></details>

<details>
<summary>Qwik</summary><br>

Qwik support requires peer dependency `@svgx/core`:

```bash
npm i -D @svgx/core
```

```ts
Icons({ compiler: 'qwik' })
```

Alternatively, you can use `jsx` compiler, requires peer dependency `@svgr/core` and its plugin `@svgr/plugin-jsx`:
```bash
npm i -D @svgr/core @svgr/plugin-jsx
```

```ts
Icons({ compiler: 'jsx', jsx: 'qwik' })
```

Type Declarations

<!-- eslint-skip -->

```jsonc
// tsconfig.json
{
  "compilerOptions": {
    "types": [
      "unplugin-icons/types/qwik",
    ]
  }
}
```

See [the Qwik example](examples/vite-qwik) for a working example project.

<br></details>

## Use RAW compiler from query params

From `v0.13.2` you can also use `raw` compiler to access the `svg` icon and use it on your html templates, just add `raw` to the icon query param.

For example, using `vue3`:

```vue
<script setup lang='ts'>
import RawMdiAlarmOff from '~icons/mdi/alarm-off?raw&width=4em&height=4em'
import RawMdiAlarmOff2 from '~icons/mdi/alarm-off?raw&width=1em&height=1em'
</script>

<template>
  <!-- raw example -->
  <pre>
    import RawMdiAlarmOff from '~icons/mdi/alarm-off?raw&width=4em&height=4em'
    {{ RawMdiAlarmOff }}
    import RawMdiAlarmOff2 from '~icons/mdi/alarm-off?raw&width=1em&height=1em'
    {{ RawMdiAlarmOff2 }}
  </pre>
  <!-- svg example -->
  <span v-html="RawMdiAlarmOff" />
  <span v-html="RawMdiAlarmOff2" />
</template>
```

## Custom Icons

From `v0.11`, you can now load your own icons!

From `v0.13` you can also provide a transform callback to `FileSystemIconLoader`.

```ts
import { promises as fs } from 'node:fs'

// loader helpers
import { FileSystemIconLoader } from 'unplugin-icons/loaders'

Icons({
  customCollections: {
    // key as the collection name
    'my-icons': {
      account: '<svg><!-- ... --></svg>',
      // load your custom icon lazily
      settings: () => fs.readFile('./path/to/my-icon.svg', 'utf-8'),
      /* ... */
    },
    'my-other-icons': async (iconName) => {
      // your custom loader here. Do whatever you want.
      // for example, fetch from a remote server:
      return await fetch(`https://example.com/icons/${iconName}.svg`).then(res => res.text())
    },
    // a helper to load icons from the file system
    // files under `./assets/icons` with `.svg` extension will be loaded as it's file name
    // you can also provide a transform callback to change each icon (optional)
    'my-yet-other-icons': FileSystemIconLoader(
      './assets/icons',
      svg => svg.replace(/^<svg /, '<svg fill="currentColor" '),
    ),
  },
})
```

Then use as

```ts
import IconAccount from '~icons/my-icons/account'
import IconFoo from '~icons/my-other-icons/foo'
import IconBar from '~icons/my-yet-other-icons/bar'
```

> 💡 SVG Authoring Tips:
> - To make your icons color adaptable, set `fill="currentColor"` or `stroke="currentColor"` in your SVG.
> - Leave the `height` and `width` unspecified, we will set them for you.

### Use with Resolver

When using resolvers for auto-importing, you will need to tell it your custom collection names:

```ts
IconResolver({
  customCollections: [
    'my-icons',
    'my-other-icons',
    'my-yet-other-icons',
  ],
})
```

See the [Vue 3 + Vite example](./examples/vite-vue3/vite.config.ts).

### Use Custom External Collection Packages

From version `v0.18.3` you can use other packages to load icons from others authors.

**WARNING**: external packages must include `icons.json` file with the `icons` data in `IconifyJSON` format, which can be exported with Iconify Tools. Check [Exporting icon set as JSON package](https://iconify.design/docs/libraries/tools/export/json-package.html) for more details.

For example, you can use `an-awesome-collection` or `@my-awesome-collections/some-collection` to load your custom or third party icons:
```ts
// loader helpers
import { ExternalPackageIconLoader } from 'unplugin-icons/loaders'

Icons({ customCollections: ExternalPackageIconLoader('my-awesome-collection') })
```

When using with resolvers for auto-importing, remember you will need to tell it your custom collection names:
```ts
IconResolver({
  customCollections: [
    'my-awesome-collection',
  ],
})
```

You can also combine it with `FileSystemIconLoader` or with other custom icon loaders:
```ts
// loader helpers
import { ExternalPackageIconLoader, FileSystemIconLoader } from 'unplugin-icons/loaders'

Icons({
  customCollections: {
    ...ExternalPackageIconLoader('an-awesome-collection'),
    ...ExternalPackageIconLoader('@my-awesome-collections/some-collection'),
    ...ExternalPackageIconLoader('@my-awesome-collections/some-other-collection'),
    'my-yet-other-icons': FileSystemIconLoader(
      './assets/icons',
      svg => svg.replace(/^<svg /, '<svg fill="currentColor" '),
    ),
  },
})
```

See the [Vue 3 + Vite example](./examples/vite-vue3/vite.config.ts).

## Icon customizer

From `v0.13` you can also customize each icon using `iconCustomizer` configuration option or using query params when importing them.

The `query` param will take precedence over `iconCustomizer` and `iconCustomizer` over `configuration`.

The `iconCustomizer` and `query` params will be applied to any collection, that is, for each icon from `custom` loader, `inlined` on `customCollections` or from `@iconify`.

For example, you can configure `iconCustomizer` to change all icons for a collection or individual icons on a collection:

```ts
import { promises as fs } from 'node:fs'

// loader helpers
import { FileSystemIconLoader } from 'unplugin-icons/loaders'

Icons({
  customCollections: {
    // key as the collection name
    'my-icons': {
      account: '<svg><!-- ... --></svg>',
      // load your custom icon lazily
      settings: () => fs.readFile('./path/to/my-icon.svg', 'utf-8'),
      /* ... */
    },
    'my-other-icons': async (iconName) => {
      // your custom loader here. Do whatever you want.
      // for example, fetch from a remote server:
      return await fetch(`https://example.com/icons/${iconName}.svg`).then(res => res.text())
    },
    // a helper to load icons from the file system
    // files under `./assets/icons` with `.svg` extension will be loaded as it's file name
    // you can also provide a transform callback to change each icon (optional)
    'my-yet-other-icons': FileSystemIconLoader(
      './assets/icons',
      svg => svg.replace(/^<svg /, '<svg fill="currentColor" '),
    ),
  },
  iconCustomizer(collection, icon, props) {
    // customize all icons in this collection
    if (collection === 'my-other-icons') {
      props.width = '4em'
      props.height = '4em'
    }
    // customize this icon in this collection
    if (collection === 'my-icons' && icon === 'account') {
      props.width = '6em'
      props.height = '6em'
    }
    // customize this @iconify icon in this collection
    if (collection === 'mdi' && icon === 'account') {
      props.width = '2em'
      props.height = '2em'
    }
  },
})
```

or you can use `query` params to apply to individual icons:

<!-- eslint-skip -->

```vue
<script setup lang='ts'>
import MdiAlarmOff from 'virtual:icons/mdi/alarm-off?width=4em&height=4em'
import MdiAlarmOff2 from 'virtual:icons/mdi/alarm-off?width=1em&height=1em'
</script>

<template>
  <!-- width=4em and height=4em -->
  <mdi-alarm-off />
  <!-- width=4em and height=4em -->
  <MdiAlarmOff />
  <!-- width=1em and height=1em -->
  <MdiAlarmOff2 />
</template>
```

See `src/App.vue` component and `vite.config.ts` configuration on `vite-vue3` example project.

## Global Custom Icon Transformation

From version `0.14.2`, when loading your custom icons, you can transform them, for example adding `fill` attribute with `currentColor`:
```ts
Icons({
  customCollections: {
    // key as the collection name
    'my-icons': {
      account: '<svg><!-- ... --></svg>',
      /* ... */
    },
  },
  transform(svg, collection, icon) {
    // apply fill to this icon on this collection
    if (collection === 'my-icons' && icon === 'account')
      return svg.replace(/^<svg /, '<svg fill="currentColor" ')

    return svg
  },
})
```

## Advanced Custom Icon Set Cleanup

When using this plugin with your custom icons, consider using a cleanup process similar to that done by [Iconify](https://iconify.design/) for any icons sets. All the tools you need are available in [Iconify Tools](https://docs.iconify.design/tools/tools2/).

You can check this repo, using `unplugin-icons` on a `SvelteKit` project: https://github.com/iconify/tools/tree/main/%40iconify-demo/unplugin-svelte.

Read [Cleaning up icons](https://docs.iconify.design/articles/cleaning-up-icons/) article from [Iconify](https://iconify.design/) for more details.

## Migrate from `vite-plugin-icons`

`package.json`

```diff
{
  "devDependencies": {
-   "vite-plugin-icons": "*",
+   "unplugin-icons": "^0.7.0",
  }
}
```

`vite.config.json`

```diff
import Components from 'unplugin-vue-components/vite'
- import Icons, { ViteIconsResolver } from 'vite-plugin-icons'
+ import Icons from 'unplugin-icons/vite'
+ import IconsResolver from 'unplugin-icons/resolver'

export default {
  plugins: [
    Vue(),
    Components({
      resolvers: [
        IconsResolver()
      ],
    }),
    Icons(),
  ],
}
```

`*` - imports usage

```diff
- import IconComponent from 'virtual:vite-icons/collection/name'
+ import IconComponent from '~icons/collection/name'
```

> You can still use `virtual:icons` prefix in Vite if you prefer, but it's not yet supported in Webpack, we are unifying it as a workaround in the docs.

## Options

You can set default styling for all icons.
The following config shows the default values of each option:

```ts
Icons({
  scale: 1.2, // Scale of icons against 1em
  defaultStyle: '', // Style apply to icons
  defaultClass: '', // Class names apply to icons
  compiler: null, // 'vue2', 'vue3', 'jsx'
  jsx: 'react', // 'react' or 'preact'
})
```

## Auto Importing

<details>
<summary>Vue 2 & 3</summary><br>

Use with [`unplugin-vue-components`](https://github.com/antfu/unplugin-vue-components)

For example in Vite:

```js
// vite.config.js
import Vue from '@vitejs/plugin-vue'
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import Components from 'unplugin-vue-components/vite'

export default {
  plugins: [
    Vue(),
    Components({
      resolvers: [
        IconsResolver(),
      ],
    }),
    Icons(),
  ],
}
```

Then you can use any icons as you want without explicit importing. Only the used icons will be bundled.

```html
<template>
  <i-carbon-accessibility/>
  <i-mdi-account-box style="font-size: 2em; color: red"/>
</template>
```

</details>

<details>
<summary>React & Solid</summary><br>

Use with [`unplugin-auto-import`](https://github.com/antfu/unplugin-auto-import)

For example in Vite:

```js
// vite.config.js
import Icons from 'unplugin-icons/vite'
import IconsResolver from 'unplugin-icons/resolver'
import AutoImport from 'unplugin-auto-import/vite'

export default {
  plugins: [
    /* ... */
    AutoImport({
      resolvers: [
        IconsResolver({
          prefix: 'Icon',
          extension: 'jsx',
        }),
      ],
    }),
    Icons({
      compiler: 'jsx', // or 'solid'
    }),
  ],
}
```

Then you can use any icons with the prefix `Icon` as you want without explicit importing. Type declarations will be generated on the fly.

<!-- eslint-disable react/jsx-no-undef -->

```js
export function Component() {
  return (
    <div>
      <IconCarbonApps />
      <IconMdiAccountBox style="font-size: 2em; color: red" />
    </div>
  )
}
```

</details>

### Name Conversion

When using component resolver, you have to follow the name conversion for icons to be properly inferred.

```
{prefix}-{collection}-{icon}
```

The `collection` field follows [Iconify's collection IDs](https://iconify.design/icon-sets/).

By default, the prefix is set to `i` while you can customize via config

```ts
IconsResolver({
  prefix: 'icon', // <--
})
```

```html
<template>
  <icon-mdi-account />
</template>
```

Non-prefix mode is also supported

```ts
IconsResolver({
  prefix: false, // <--
  // this is optional, default enabling all the collections supported by Iconify
  enabledCollections: ['mdi'],
})
```

```vue
<template>
  <mdi-account />
</template>
```

### Collection Aliases

When using component resolver, you have to use the name of the collection that can be long or redundant: for example,
when using `icon-park` collection you need to use it like this `<icon-icon-park-abnormal />`.

You can add an alias for any collection to the `IconResolver` plugin:

```ts
IconsResolver({
  alias: {
    park: 'icon-park',
    fas: 'fa-solid',
    // ...
  }
})
```

You can use the alias or the collection name, the plugin will resolve both.

Following with the example and configuring the plugin with previous `alias` entry, you can now use
`<icon-park-abnormal />` or `<icon-icon-park-abnormal />`.

## Sponsors

This project is part of my <a href='https://github.com/antfu-sponsors'>Sponsor Program</a>

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg">
    <img src='https://cdn.jsdelivr.net/gh/antfu/static/sponsors.svg'/>
  </a>
</p>

## License

[MIT](./LICENSE) License © 2020-PRESENT [Anthony Fu](https://github.com/antfu)
