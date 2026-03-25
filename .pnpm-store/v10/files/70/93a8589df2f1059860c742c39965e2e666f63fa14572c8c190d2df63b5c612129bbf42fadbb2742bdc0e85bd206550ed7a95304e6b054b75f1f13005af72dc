import type { Ref } from 'vue'
import { ref } from 'vue'

interface Machine<S> {
  [k: string]: { [k: string]: S }
}
type MachineState<T> = keyof T
type MachineEvent<T> = keyof UnionToIntersection<T[keyof T]>

// 🤯 https://fettblog.eu/typescript-union-to-intersection/
type UnionToIntersection<T> = (T extends any ? (x: T) => any : never) extends (
  x: infer R
) => any
  ? R
  : never

/**
 * The `useStateMachine` function is a TypeScript function that creates a state machine and returns the
 * current state and a dispatch function to update the state based on events.
 * @param initialState - The `initialState` parameter is the initial state of the state machine. It
 * represents the starting point of the state machine's state.
 * @param machine - The `machine` parameter is an object that represents a state machine. It should
 * have keys that correspond to the possible states of the machine, and the values should be objects
 * that represent the possible events and their corresponding next states.
 * @returns The `useStateMachine` function returns an object with two properties: `state` and
 * `dispatch`.
 */
export function useStateMachine<M>(
  initialState: MachineState<M>,
  machine: M & Machine<MachineState<M>>,
) {
  const state = ref(initialState) as Ref<MachineState<M>>

  function reducer(event: MachineEvent<M>) {
    // @ts-expect-error  state.value is keyof M
    const nextState = machine[state.value][event]
    return nextState ?? state.value
  }

  const dispatch = (event: MachineEvent<M>) => {
    state.value = reducer(event)
  }

  return {
    state,
    dispatch,
  }
}
