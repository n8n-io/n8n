import type { ComponentOptionsBase, DefineComponent, VNodeProps } from 'vue'
import type { ComponentProps } from 'vue-component-type-helpers'
import { h, mergeProps } from 'vue'
import { useForwardExpose } from './useForwardExpose'

// TODO: TEST

// From vue next
// https://github.com/vuejs/core/blob/1f2a652a9d2e3bec472fb1786a4c16d6ccfa1fb1/packages/runtime-core/src/h.ts#L53-L58
type RawProps = VNodeProps & {
  // used to differ from a single VNode object as children
  __v_isVNode?: never
  // used to differ from Array children
  [Symbol.iterator]?: never
} & Record<string, any>

// types inspired from vue-test-utils
// https://github.com/vuejs/test-utils/blob/main/src/mount.ts#L36
interface MountingOptions<Props> {
  /**
   * Default props for the component
   */
  props?: (RawProps & Props) | ({} extends Props ? null : never) | ((attrs: Record<string, any>) => (RawProps & Props))
  /**
   * Pass attributes into the component
   */
  attrs?: Record<string, unknown>
}

export function withDefault<
  T,
  C = T extends ((...args: any) => any) | (new (...args: any) => any)
    ? T
    : T extends { props?: infer Props }
      ? DefineComponent<
        Props extends Readonly<(infer PropNames)[]> | (infer PropNames)[]
          ? { [key in PropNames extends string ? PropNames : string]?: any }
          : Props
      >
      : DefineComponent,
  P extends ComponentProps<C> = ComponentProps<C>,
>(
  originalComponent: T,
  options?: MountingOptions<P>
): T

export function withDefault<T extends ComponentOptionsBase<{}, {}, {}, any, any, any, any, any>>(WrappedComponent: T, options?: MountingOptions<any>) {
  return ({
    inheritAttrs: false,
    name: `${WrappedComponent.__name ?? ''}Wrapper`,
    setup(_, ctx) {
      return () => {
        const optionProps = typeof options?.props === 'function' ? options?.props(ctx.attrs) : options?.props
        const { forwardRef } = useForwardExpose()

        const mergedProps = mergeProps(optionProps, ctx.attrs)
        return h(WrappedComponent, { ...mergedProps, ref: forwardRef }, ctx.slots)
      }
    },
  }) as T
}
