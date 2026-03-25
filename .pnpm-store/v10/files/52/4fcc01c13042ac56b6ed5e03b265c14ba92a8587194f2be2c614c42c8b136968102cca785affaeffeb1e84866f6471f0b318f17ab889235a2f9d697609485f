/* eslint-disable @typescript-eslint/ban-ts-comment */
// global JSX namespace registration
// somehow we have to copy=pase the jsx-runtime types here to make TypeScript happy
import type { NativeElements, ReservedProps, VNode } from '@vue/runtime-dom'

declare global {
  namespace JSX {
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
}
