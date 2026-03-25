// Original definitions (@types/postcss-nested)
// by Maxim Vorontsov <https://github.com/VorontsovMaxim>

import { PluginCreator } from 'postcss'

declare namespace nested {
  interface Options {
    /**
     * By default, plugin will bubble only `@media`, `@supports` and `@layer`
     * at-rules. Use this option to add your custom at-rules to this list.
     */
    bubble?: string[]

    /**
     * By default, plugin will unwrap only `@font-face`, `@keyframes`,
     * and `@document` at-rules. You can add your custom at-rules
     * to this list by this option.
     */
    unwrap?: string[]

    /**
     * By default, plugin will strip out any empty selector generated
     * by intermediate nesting levels. You can set this option to `true`
     * to preserve them.
     */
    preserveEmpty?: boolean

    /**
     * The plugin supports the SCSS custom at-rule `@at-root` which breaks
     * rule blocks out of their nested position. If you want, you can choose
     * a new custom name for this rule in your code.
     */
    rootRuleName?: string
  }

  type Nested = PluginCreator<Options>
}

declare const nested: nested.Nested

export = nested
