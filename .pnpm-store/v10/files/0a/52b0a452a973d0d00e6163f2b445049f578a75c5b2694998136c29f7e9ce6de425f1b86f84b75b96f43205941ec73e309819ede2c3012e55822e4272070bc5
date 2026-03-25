import type { Ref } from 'vue'
import type { Actions, GraphNode, HandleElement, HandleType } from '../types'

export declare function getHandleBounds(
  type: HandleType,
  nodeElement: HTMLDivElement,
  nodeBounds: DOMRect,
  zoom: number,
  nodeId: string,
): HandleElement[] | null
export declare function handleNodeClick(
  node: GraphNode,
  multiSelectionActive: boolean,
  addSelectedNodes: Actions['addSelectedNodes'],
  removeSelectedNodes: Actions['removeSelectedNodes'],
  nodesSelectionActive: Ref<boolean>,
  unselect: boolean | undefined,
  nodeEl: HTMLDivElement,
): void
