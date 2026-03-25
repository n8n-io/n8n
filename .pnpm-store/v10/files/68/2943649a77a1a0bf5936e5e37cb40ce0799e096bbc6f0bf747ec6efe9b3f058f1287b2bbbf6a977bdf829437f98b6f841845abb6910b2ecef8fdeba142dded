import type { FlowOptions, VueFlowStore } from '../types'

/**
 * @deprecated will be removed in the next major and replaced with a ctx based solution similar to `<ReactFlowProvider>`
 *
 * Stores all existing VueFlow state instances
 */
export declare class Storage {
  currentId: number
  flows: Map<string, VueFlowStore>
  static instance: Storage
  static getInstance(): Storage
  set(id: string, flow: VueFlowStore): Map<string, VueFlowStore>
  get(id: string): VueFlowStore | undefined
  remove(id: string): boolean
  create(id: string, preloadedState?: FlowOptions): VueFlowStore
  getId(): string
}
