import type { MaybeRefOrGetter } from 'vue'
import { computed } from 'vue'
import { useEmitAsProps } from './useEmitAsProps'
import { useForwardProps } from './useForwardProps'

/**
 * The function `useForwardPropsEmits` takes in props and an optional emit function, and returns a
 * computed object that combines the parsed props and emits as props.
 * @param {T} props - The `props` parameter is of type `T`, which is a generic type that extends the
 * parameters of the `useForwardProps` function. It represents the props object that is passed to the
 * `useForwardProps` function.
 * @param [emit] - The `emit` parameter is a function that can be used to emit events. It takes two
 * arguments: `name`, which is the name of the event to be emitted, and `args`, which are the arguments
 * to be passed along with the event.
 * @returns a computed property that combines the parsed
 * props and emits as props.
 */
export function useForwardPropsEmits<T extends Record<string, any>, Name extends string>(props: MaybeRefOrGetter<T>, emit?: (name: Name, ...args: any[]) => void) {
  const parsedProps = useForwardProps(props)
  const emitsAsProps = emit ? useEmitAsProps(emit) : {}

  return computed(() => ({
    ...parsedProps.value,
    ...emitsAsProps,
  }))
}
