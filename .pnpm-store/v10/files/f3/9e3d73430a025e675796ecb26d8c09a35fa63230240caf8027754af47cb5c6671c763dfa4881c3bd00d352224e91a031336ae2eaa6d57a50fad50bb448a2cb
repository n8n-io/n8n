import {
  TableOptions,
  createTable,
  RowData,
  TableOptionsResolved,
} from '@tanstack/table-core'
import {
  h,
  watchEffect,
  ref,
  defineComponent,
  isRef,
  unref,
  MaybeRef,
  watch,
  shallowRef,
} from 'vue'
import { mergeProxy } from './merge-proxy'

export * from '@tanstack/table-core'

export type TableOptionsWithReactiveData<TData extends RowData> = Omit<
  TableOptions<TData>,
  'data'
> & {
  data: MaybeRef<TData[]>
}

export const FlexRender = defineComponent({
  props: ['render', 'props'],
  setup: (props: { render: any; props: any }) => {
    return () => {
      if (
        typeof props.render === 'function' ||
        typeof props.render === 'object'
      ) {
        return h(props.render, props.props)
      }

      return props.render
    }
  },
})

function getOptionsWithReactiveData<TData extends RowData>(
  options: TableOptionsWithReactiveData<TData>
) {
  return mergeProxy(options, {
    data: unref(options.data),
  })
}

export function useVueTable<TData extends RowData>(
  initialOptions: TableOptionsWithReactiveData<TData>
) {
  const IS_REACTIVE = isRef(initialOptions.data)

  const resolvedOptions = mergeProxy(
    {
      state: {}, // Dummy state
      onStateChange: () => {}, // noop
      renderFallbackValue: null,
      mergeOptions(
        defaultOptions: TableOptions<TData>,
        options: TableOptions<TData>
      ) {
        return IS_REACTIVE
          ? {
              ...defaultOptions,
              ...options,
            }
          : mergeProxy(defaultOptions, options)
      },
    },
    IS_REACTIVE ? getOptionsWithReactiveData(initialOptions) : initialOptions
  )

  const table = createTable<TData>(
    resolvedOptions as TableOptionsResolved<TData>
  )

  // Add reactivity support
  if (IS_REACTIVE) {
    const dataRef = shallowRef(initialOptions.data)
    watch(
      dataRef,
      () => {
        table.setState(prev => ({
          ...prev,
          data: dataRef.value,
        }))
      },
      { immediate: true }
    )
  }

  // can't use `reactive` because update needs to be immutable
  const state = ref(table.initialState)

  watchEffect(() => {
    table.setOptions(prev => {
      const stateProxy = new Proxy({} as typeof state.value, {
        get: (_, prop) => state.value[prop as keyof typeof state.value],
      })

      return mergeProxy(
        prev,
        IS_REACTIVE
          ? getOptionsWithReactiveData(initialOptions)
          : initialOptions,
        {
          // merge the initialState and `options.state`
          // create a new proxy on each `setOptions` call
          // and get the value from state on each property access
          state: mergeProxy(stateProxy, initialOptions.state ?? {}),
          // Similarly, we'll maintain both our internal state and any user-provided
          // state.
          onStateChange: (updater: any) => {
            if (updater instanceof Function) {
              state.value = updater(state.value)
            } else {
              state.value = updater
            }

            initialOptions.onStateChange?.(updater)
          },
        }
      )
    })
  })

  return table
}
