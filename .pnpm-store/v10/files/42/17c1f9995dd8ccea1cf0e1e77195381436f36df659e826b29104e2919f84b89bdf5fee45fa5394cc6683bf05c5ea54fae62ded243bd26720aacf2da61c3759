/*
  * Implementation ported from https://github.com/melt-ui/melt-ui/blob/develop/src/lib/builders/date-field/_internal/helpers.ts
*/

import type { DateSegmentPart, EditableSegmentPart, SegmentPart, TimeSegmentPart } from './types'

export const DATE_SEGMENT_PARTS = ['day', 'month', 'year'] as const
export const TIME_SEGMENT_PARTS = ['hour', 'minute', 'second', 'dayPeriod'] as const
export const NON_EDITABLE_SEGMENT_PARTS = ['literal', 'timeZoneName'] as const
export const EDITABLE_SEGMENT_PARTS = [...DATE_SEGMENT_PARTS, ...TIME_SEGMENT_PARTS] as const
export const EDITABLE_TIME_SEGMENT_PARTS = [...TIME_SEGMENT_PARTS] as const
export const ALL_SEGMENT_PARTS = [
  ...EDITABLE_SEGMENT_PARTS,
  ...NON_EDITABLE_SEGMENT_PARTS,
] as const
export const ALL_EXCEPT_LITERAL_PARTS = ALL_SEGMENT_PARTS.filter(part => part !== 'literal')

export function isDateSegmentPart(part: unknown): part is DateSegmentPart {
  return DATE_SEGMENT_PARTS.includes(part as DateSegmentPart)
}

export function isTimeSegmentPart(part: unknown): part is TimeSegmentPart {
  return TIME_SEGMENT_PARTS.includes(part as TimeSegmentPart)
}

export function isSegmentPart(part: string): part is EditableSegmentPart {
  return EDITABLE_SEGMENT_PARTS.includes(part as EditableSegmentPart)
}

export function isAnySegmentPart(part: unknown): part is SegmentPart {
  return ALL_SEGMENT_PARTS.includes(part as EditableSegmentPart)
}
