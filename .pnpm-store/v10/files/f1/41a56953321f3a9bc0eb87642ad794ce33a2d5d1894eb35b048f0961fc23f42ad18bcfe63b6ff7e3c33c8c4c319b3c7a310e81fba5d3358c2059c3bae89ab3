import Vue from 'vue'
import type { PluginFunction, PluginObject } from 'vue'
declare const isVue2: boolean
declare const isVue3: boolean
declare const Vue2: typeof Vue | undefined
declare const version: string
declare const install: (vue?: typeof Vue) => void
/**
 * @deprecated To avoid bringing in all the tree-shakable modules, this API has been deprecated. Use `Vue2` or named exports instead.
 * Refer to https://github.com/vueuse/vue-demi/issues/41
 */
declare const V: typeof Vue

/**
 * DebuggerEvent is a Vue 3 development only feature. This type cannot exist in Vue 2.
 */
export declare type DebuggerEvent = never

// accept no generic because Vue 3 doesn't accept any
// https://github.com/vuejs/vue-next/pull/2758/
export declare type Plugin = PluginObject<any> | PluginFunction<any>
export type { VNode } from 'vue'
export * from '@vue/composition-api'
export {
  V as Vue,
  Vue2,
  isVue2,
  isVue3,
  version,
  install,
}

export declare function hasInjectionContext(): boolean
