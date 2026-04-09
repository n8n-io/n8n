# @vue/compiler-sfc

> Lower level utilities for compiling Vue Single File Components

**Note: as of 3.2.13+, this package is included as a dependency of the main `vue` package and can be accessed as `vue/compiler-sfc`. This means you no longer need to explicitly install this package and ensure its version matches that of `vue`'s. Just use the main `vue/compiler-sfc` deep import instead.**

This package contains lower level utilities that you can use if you are writing a plugin / transform for a bundler or module system that compiles Vue Single File Components (SFCs) into JavaScript. It is used in [vue-loader](https://github.com/vuejs/vue-loader) and [@vitejs/plugin-vue](https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue).

## API

The API is intentionally low-level due to the various considerations when integrating Vue SFCs in a build system:

- Separate hot-module replacement (HMR) for script, template and styles
  - template updates should not reset component state
  - style updates should be performed without component re-render

- Leveraging the tool's plugin system for pre-processor handling. e.g. `<style lang="scss">` should be processed by the corresponding webpack loader.

- In some cases, transformers of each block in an SFC do not share the same execution context. For example, when used with `thread-loader` or other parallelized configurations, the template sub-loader in `vue-loader` may not have access to the full SFC and its descriptor.

The general idea is to generate a facade module that imports the individual blocks of the component. The trick is the module imports itself with different query strings so that the build system can handle each request as "virtual" modules:

```
                                  +--------------------+
                                  |                    |
                                  |  script transform  |
                           +----->+                    |
                           |      +--------------------+
                           |
+--------------------+     |      +--------------------+
|                    |     |      |                    |
|  facade transform  +----------->+ template transform |
|                    |     |      |                    |
+--------------------+     |      +--------------------+
                           |
                           |      +--------------------+
                           +----->+                    |
                                  |  style transform   |
                                  |                    |
                                  +--------------------+
```

Where the facade module looks like this:

```js
// main script
import script from '/project/foo.vue?vue&type=script'
// template compiled to render function
import { render } from '/project/foo.vue?vue&type=template&id=xxxxxx'
// css
import '/project/foo.vue?vue&type=style&index=0&id=xxxxxx'

// attach render function to script
script.render = render

// attach additional metadata
// some of these should be dev only
script.__file = 'example.vue'
script.__scopeId = 'xxxxxx'

// additional tooling-specific HMR handling code
// using __VUE_HMR_API__ global

export default script
```

### High Level Workflow

1. In facade transform, parse the source into descriptor with the `parse` API and generate the above facade module code based on the descriptor;

2. In script transform, use `compileScript` to process the script. This handles features like `<script setup>` and CSS variable injection. Alternatively, this can be done directly in the facade module (with the code inlined instead of imported), but it will require rewriting `export default` to a temp variable (a `rewriteDefault` convenience API is provided for this purpose) so additional options can be attached to the exported object.

3. In template transform, use `compileTemplate` to compile the raw template into render function code.

4. In style transform, use `compileStyle` to compile raw CSS to handle `<style scoped>`, `<style module>` and CSS variable injection.

Options needed for these APIs can be passed via the query string.

For detailed API references and options, check out the source type definitions. For actual usage of these APIs, check out [@vitejs/plugin-vue](https://github.com/vitejs/vite-plugin-vue/tree/main/packages/plugin-vue) or [vue-loader](https://github.com/vuejs/vue-loader/tree/next).
