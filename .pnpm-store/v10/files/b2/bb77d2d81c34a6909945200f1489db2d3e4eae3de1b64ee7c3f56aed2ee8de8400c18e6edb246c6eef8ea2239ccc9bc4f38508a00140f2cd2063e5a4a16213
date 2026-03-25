# @vitejs/plugin-vue [![npm](https://img.shields.io/npm/v/@vitejs/plugin-vue.svg)](https://npmjs.com/package/@vitejs/plugin-vue)

> Note: as of `vue` 3.2.13+ and `@vitejs/plugin-vue` 1.9.0+, `@vue/compiler-sfc` is no longer required as a peer dependency.

```js
// vite.config.js
import vue from '@vitejs/plugin-vue'

export default {
  plugins: [vue()],
}
```

For JSX / TSX support, [`@vitejs/plugin-vue-jsx`](https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue-jsx) is also needed.

## Options

```ts
export interface Options {
  include?: string | RegExp | (string | RegExp)[]
  exclude?: string | RegExp | (string | RegExp)[]

  isProduction?: boolean

  /**
   * Requires @vitejs/plugin-vue@^5.1.0
   */
  features?: {
    /**
     * Enable reactive destructure for `defineProps`.
     * - Available in Vue 3.4 and later.
     * - **default:** `false` in Vue 3.4 (**experimental**), `true` in Vue 3.5+
     */
    propsDestructure?: boolean
    /**
     * Transform Vue SFCs into custom elements.
     * - `true`: all `*.vue` imports are converted into custom elements
     * - `string | RegExp`: matched files are converted into custom elements
     * - **default:** /\.ce\.vue$/
     */
    customElement?: boolean | string | RegExp | (string | RegExp)[]
    /**
     * Set to `false` to disable Options API support and allow related code in
     * Vue core to be dropped via dead-code elimination in production builds,
     * resulting in smaller bundles.
     * - **default:** `true`
     */
    optionsAPI?: boolean
    /**
     * Set to `true` to enable devtools support in production builds.
     * Results in slightly larger bundles.
     * - **default:** `false`
     */
    prodDevtools?: boolean
    /**
     * Set to `true` to enable detailed information for hydration mismatch
     * errors in production builds. Results in slightly larger bundles.
     * - **default:** `false`
     */
    prodHydrationMismatchDetails?: boolean
    /**
     * Customize the component ID generation strategy.
     * - `'filepath'`: hash the file path (relative to the project root)
     * - `'filepath-source'`: hash the file path and the source code
     * - `function`: custom function that takes the file path, source code,
     *   whether in production mode, and the default hash function as arguments
     * - **default:** `'filepath'` in development, `'filepath-source'` in production
     */
    componentIdGenerator?:
      | 'filepath'
      | 'filepath-source'
      | ((
          filepath: string,
          source: string,
          isProduction: boolean | undefined,
          getHash: (text: string) => string,
        ) => string)
  }

  // `script`, `template` and `style` are lower-level compiler options
  // to pass on to respective APIs of `vue/compiler-sfc`

  script?: Partial<
    Omit<
      SFCScriptCompileOptions,
      | 'id'
      | 'isProd'
      | 'inlineTemplate'
      | 'templateOptions'
      | 'sourceMap'
      | 'genDefaultAs'
      | 'customElement'
    >
  >

  template?: Partial<
    Omit<
      SFCTemplateCompileOptions,
      | 'id'
      | 'source'
      | 'ast'
      | 'filename'
      | 'scoped'
      | 'slotted'
      | 'isProd'
      | 'inMap'
      | 'ssr'
      | 'ssrCssVars'
      | 'preprocessLang'
    >
  >

  style?: Partial<
    Omit<
      SFCStyleCompileOptions,
      | 'filename'
      | 'id'
      | 'isProd'
      | 'source'
      | 'scoped'
      | 'cssDevSourcemap'
      | 'postcssOptions'
      | 'map'
      | 'postcssPlugins'
      | 'preprocessCustomRequire'
      | 'preprocessLang'
      | 'preprocessOptions'
    >
  >

  /**
   * Use custom compiler-sfc instance. Can be used to force a specific version.
   */
  compiler?: typeof _compiler

  /**
   * @deprecated moved to `features.customElement`.
   */
  customElements?: boolean | string | RegExp | (string | RegExp)[]
}
```

## Asset URL handling

When `@vitejs/plugin-vue` compiles the `<template>` blocks in SFCs, it also converts any encountered asset URLs into ESM imports.

For example, the following template snippet:

```vue
<img src="../image.png" />
```

Is the same as:

```vue
<script setup>
import _imports_0 from '../image.png'
</script>

<img :src="_imports_0" />
```

By default the following tag/attribute combinations are transformed, and can be configured using the `template.transformAssetUrls` option.

```js
{
  video: ['src', 'poster'],
  source: ['src'],
  img: ['src'],
  image: ['xlink:href', 'href'],
  use: ['xlink:href', 'href']
}
```

Note that only attribute values that are static strings are transformed. Otherwise, you'd need to import the asset manually, e.g. `import imgUrl from '../image.png'`.

## Example for passing options to `vue/compiler-sfc`:

```ts
import vue from '@vitejs/plugin-vue'

export default {
  plugins: [
    vue({
      template: {
        compilerOptions: {
          // ...
        },
        transformAssetUrls: {
          // ...
        },
      },
    }),
  ],
}
```

## Example for transforming custom blocks

```ts
import vue from '@vitejs/plugin-vue'
import yaml from 'js-yaml'

const vueI18nPlugin = {
  name: 'vue-i18n',
  transform(code, id) {
    // if .vue file don't have <i18n> block, just return
    if (!/vue&type=i18n/.test(id)) {
      return
    }
    // parse yaml
    if (/\.ya?ml$/.test(id)) {
      code = JSON.stringify(yaml.load(code.trim()))
    }
    // mount the value on the i18n property of the component instance
    return `export default Comp => {
      Comp.i18n = ${code}
    }`
  },
}

export default {
  plugins: [vue(), vueI18nPlugin],
}
```

Create a file named `Demo.vue`, add `lang="yaml"` to the `<i18n>` blocks, then you can use the syntax of `YAML`:

```vue
<template>Hello</template>

<i18n lang="yaml">
message: 'world'
fullWord: 'hello world'
</i18n>
```

`message` is mounted on the i18n property of the component instance, you can use like this:

```vue
<script setup lang="ts">
import Demo from 'components/Demo.vue'
</script>

<template>
  <Demo /> {{ Demo.i18n.message }}
  <div>{{ Demo.i18n.fullWord }}</div>
</template>
```

## Using Vue SFCs as Custom Elements

> Requires `vue@^3.2.0` & `@vitejs/plugin-vue@^1.4.0`

Vue 3.2 introduces the `defineCustomElement` method, which works with SFCs. By default, `<style>` tags inside SFCs are extracted and merged into CSS files during build. However when shipping a library of custom elements, it may be desirable to inline the styles as JavaScript strings and inject them into the custom elements' shadow root instead.

Starting in 1.4.0, files ending with `*.ce.vue` will be compiled in "custom elements" mode: its `<style>` tags are compiled into inlined CSS strings and attached to the component as its `styles` property:

```js
import { defineCustomElement } from 'vue'
import Example from './Example.ce.vue'

console.log(Example.styles) // ['/* css content */']

// register
customElements.define('my-example', defineCustomElement(Example))
```

Note in custom elements mode there is no need to use `<style scoped>` since the CSS is already scoped inside the shadow DOM.

The `customElement` plugin option can be used to configure the behavior:

- `{ customElement: true }` will import all `*.vue` files in custom element mode.
- Use a string or regex pattern to change how files should be loaded as Custom Elements (this check is applied after `include` and `exclude` matches).

## License

MIT
