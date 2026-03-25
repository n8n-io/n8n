import Vue from 'vue'
import type { PluginFunction, PluginObject, VueConstructor, Directive, InjectionKey, Component } from 'vue'

declare const isVue2: boolean
declare const isVue3: boolean
declare const Vue2: typeof Vue | undefined
declare const version: string
declare const install: (vue?: typeof Vue) => void
export declare function warn(msg: string, vm?: Component | null): void
/**
 * @deprecated To avoid bringing in all the tree-shakable modules, this API has been deprecated. Use `Vue2` or named exports instead.
 * Refer to https://github.com/vueuse/vue-demi/issues/41
 */
declare const V: typeof Vue

// accept no generic because Vue 3 doesn't accept any
// https://github.com/vuejs/vue-next/pull/2758/
export declare type Plugin = PluginObject<any> | PluginFunction<any>
export type { VNode } from 'vue'
export * from 'vue'
export { V as Vue, Vue2, isVue2, isVue3, version, install }

// #region createApp polyfill
export interface App<T = any> {
  config: VueConstructor['config']
  use: VueConstructor['use']
  mixin: VueConstructor['mixin']
  component: VueConstructor['component']
  directive(name: string): Directive | undefined
  directive(name: string, directive: Directive): this
  provide<T>(key: InjectionKey<T> | string, value: T): this
  mount: Vue['$mount']
  unmount: Vue['$destroy']
}
export declare function createApp(rootComponent: any, rootProps?: any): App
// #endregion

export declare function hasInjectionContext(): boolean
