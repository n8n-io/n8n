# vue-component-meta

`vue-component-meta` allows you to extract the meta-data like props, slots, events, etc from your components via static code analysis. You can even generate description for your props from your source code. This helps document your components via automation. Please refer to the [reference](#reference) section for references.

## Guide 📗

First of all, you need to create a component meta checker using `createChecker`:

```ts
import * as url from 'url'
import path from 'path'

import type { MetaCheckerOptions } from 'vue-component-meta'
import { createChecker } from 'vue-component-meta'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const checkerOptions: MetaCheckerOptions = {
  forceUseTs: true,
  schema: { ignore: ['MyIgnoredNestedProps'] },
  printer: { newLine: 1 },
}

const tsconfigChecker = createChecker(
  // Write your tsconfig path
  path.join(__dirname, 'path-to-tsconfig'),
  checkerOptions,
)
```

Now, you can extract the component meta using `getComponentMeta` method of checker:

```ts
import * as url from 'url'
import path from 'path'

const __dirname = url.fileURLToPath(new URL('.', import.meta.url))

const componentPath = path.join(__dirname, 'path-to-component');
const meta = checker.getComponentMeta(componentPath);
```

This meta contains really useful stuff like component props, slots, events and more. You can refer to its [type definition](https://github.com/vuejs/language-tools/blob/master/packages/component-meta/lib/types.ts) for more details.

### Extracting prop meta

`vue-component-meta` will automatically extract the prop details like its name, default value, is required or not, etc. Additionally, you can even write prop description in source code via [JSDoc](https://jsdoc.app/) comment for that prop.

```ts
/**
 * Hide/Show alert based on v-model value
 */
modelValue: {
  type: Boolean,
  default: null,
},
```

When you extract the component meta and extract the `description` property of that prop it will be "Hide/Show alert based on v-model value" 😍

> **Warning**
>
> Do note that `meta.props` will be array of props so you can't access it via `meta.props.<prop-name>`. Moreover, `meta.props` will also contain some global prop which you can identify via `prop.global` property.

You can use it to document your component as you build your project without writing additional documentation.

## Pitfalls 👀

As `vue-component-meta` uses static code analysis, it can't extract the dynamic prop definition.

### default value

`vue-component-meta` won't be able to extract default value for prop as props can't be analyzed.

```ts
props: {
  // Props definition by function execution
  ...useLayerProps({
    color: {
      default: 'primary',
    },
    variant: {
      default: 'light',
    },
  }),
}
```

In this scenario, to get the correct default value you can let `vue-component-meta` know it by writing them explicitly:

```ts
props: {
  // let vue-component-meta found it
  color: { default: 'primary' },
  variant: { default: 'light' },

  // Props definition by function execution
  ...useLayerProps({
    color: {
      default: 'primary',
    },
    variant: {
      default: 'light',
    },
  }),
}
```

### description

Same as above scenario you might have issue with description not generating when prop definition is dynamic. In this case writing prop description can be tricky.

When it's function execution, write prop description in function definition:

```ts
export const useLayerProp = (...) => {
  const props = {
       /**
        * Layer variant
        */
       variant: {
         type: String,
         default: 'text',
       },
  }

  export { props }
}
```

### required

For generating the correct `required` value for props like below:

```ts
// @/composables/useProps.ts
export const disabled = {
  type: Boolean,
  default: false,
}
```

```ts
import { disabled } from '@/composables/useProps'

export default defineComponent({
  props: {
    disabled,
  },
})
```

You need to add `as const` to variable definition:

```diff
 export const disabled = {
   type: Boolean,
   default: false,
- }
+ } as const
```

## Used by 🎉

- [Anu](https://github.com/jd-solanki/anu) UI library uses `vue-component-meta` to generate components' API via [automation](https://github.com/jd-solanki/anu/blob/main/scripts/gen-component-meta.ts).

## Reference 📚

- [tests](https://github.com/vuejs/language-tools/blob/master/packages/component-meta/tests/index.spec.ts)
- [Anu's components' API automation](https://github.com/jd-solanki/anu/blob/main/scripts/gen-component-meta.ts)
- [Discord chat for dynamic usage](https://discord.com/channels/793943652350427136/1027819645677350912)

## Sponsors ❤️

<p align="center">
  <a href="https://cdn.jsdelivr.net/gh/johnsoncodehk/sponsors/sponsors.svg">
    <img src="https://cdn.jsdelivr.net/gh/johnsoncodehk/sponsors/sponsors.svg"/>
  </a>
</p>
