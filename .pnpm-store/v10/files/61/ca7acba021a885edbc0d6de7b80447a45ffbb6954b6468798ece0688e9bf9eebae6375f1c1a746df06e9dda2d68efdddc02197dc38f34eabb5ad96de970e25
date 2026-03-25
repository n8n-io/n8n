/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { NativeElements, ReservedProps, VNode } from '@vue/runtime-dom'

/**
 * JSX namespace for usage with @jsxImportsSource directive
 * when ts compilerOptions.jsx is 'react-jsx' or 'react-jsxdev'
 * https://www.typescriptlang.org/tsconfig#jsxImportSource
 */
export { h as jsx, h as jsxDEV, Fragment, h as jsxs } from '@vue/runtime-dom'

export namespace JSX {
  export interface Element extends VNode {}
  export interface ElementClass {
    $props: {}
  }
  export interface ElementAttributesProperty {
    $props: {}
  }
  export interface IntrinsicElements extends NativeElements {
    // allow arbitrary elements
    // @ts-ignore suppress ts:2374 = Duplicate string index signature.
    [name: string]: any
  }
  export interface IntrinsicAttributes extends ReservedProps {}
}
