import type { D3Selection, Project, State, ViewportFunctions } from '../types'

export interface ViewportHelper extends ViewportFunctions {
  viewportInitialized: boolean
  screenToFlowCoordinate: Project
  flowToScreenCoordinate: Project
}
/**
 * Composable that provides viewport helper functions.
 *
 * @internal
 * @param state
 */
export declare function useViewportHelper(state: State): import('vue').ComputedRef<ViewportHelper>
export declare function getD3Transition(
  selection: D3Selection,
  duration?: number,
  ease?: (t: number) => number,
  onEnd?: () => void,
): D3Selection | import('d3-transition').Transition<HTMLDivElement, unknown, null, undefined>
