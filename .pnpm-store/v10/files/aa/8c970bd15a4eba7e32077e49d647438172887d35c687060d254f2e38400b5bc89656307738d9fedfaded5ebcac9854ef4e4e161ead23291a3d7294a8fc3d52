import { camelize, getCurrentInstance, toHandlerKey } from 'vue'

// Vue doesn't have emits forwarding, in order to bind the emits we have to convert events into `onXXX` handlers
// issue: https://github.com/vuejs/core/issues/5917
/**
 * The `useEmitAsProps` function is a TypeScript utility that converts emitted events into props for a
 * Vue component.
 * @param emit - The `emit` parameter is a function that is used to emit events from a component. It
 * takes two parameters: `name` which is the name of the event to be emitted, and `...args` which are
 * the arguments to be passed along with the event.
 * @returns The function `useEmitAsProps` returns an object that maps event names to functions that
 * call the `emit` function with the corresponding event name and arguments.
 */
export function useEmitAsProps<Name extends string>(
  emit: (name: Name, ...args: any[]) => void,
) {
  const vm = getCurrentInstance()

  const events = vm?.type.emits as Name[]
  const result: Record<string, any> = {}

  if (!events?.length) {
    console.warn(
      `No emitted event found. Please check component: ${vm?.type.__name}`,
    )
  }

  events?.forEach((ev) => {
    result[toHandlerKey(camelize(ev))] = (...arg: any) => emit(ev, ...arg)
  })
  return result
}
