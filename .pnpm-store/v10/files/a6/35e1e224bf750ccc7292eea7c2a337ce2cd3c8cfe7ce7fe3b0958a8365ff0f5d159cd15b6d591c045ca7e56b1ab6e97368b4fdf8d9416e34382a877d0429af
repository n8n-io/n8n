export enum DiffType {
  EQUAL = 'equal',
  DELETE = 'removed',
  ADD = 'added',
  EMPTY = 'empty',
}

export interface UnifiedLineUnchanges {
  lines: UnifiedLineChange[]
  fold: boolean
}

export interface SplitLineUnchanges {
  lines: SplitLineChange[]
  fold: boolean
}

export interface DiffLine {
  type: DiffType
  code?: string
  num?: number
}

export interface SplitLineChange {
  fold?: boolean
  left: DiffLine
  right: DiffLine
  hide?: boolean
  hideIndex?: number
}

export interface UnifiedLineChange {
  fold?: boolean
  type: DiffType
  code: string
  delNum?: number
  addNum?: number
  hide?: boolean
  hideIndex?: number
}

export interface DiffStat {
  additionsNum: number
  deletionsNum: number
  ignoreAdditionsNum: number
  ignoreDeletionsNum: number
}

export interface SplitViewerChange {
  changes: SplitLineChange[]
  collector: SplitLineUnchanges[]
  stat: DiffStat
}

export interface UnifiedViewerChange {
  changes: UnifiedLineChange[]
  collector: UnifiedLineUnchanges[]
  stat: DiffStat
}
