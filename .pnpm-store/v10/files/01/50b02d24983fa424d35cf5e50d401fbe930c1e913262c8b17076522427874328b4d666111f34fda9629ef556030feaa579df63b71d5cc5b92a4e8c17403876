/*
  * Implementation ported from https://github.com/melt-ui/melt-ui/blob/develop/src/lib/internal/helpers/date/types.ts
*/

import type { DateValue } from '@internationalized/date'

export type { DateValue }
import type { DATE_SEGMENT_PARTS, EDITABLE_SEGMENT_PARTS, NON_EDITABLE_SEGMENT_PARTS, TIME_SEGMENT_PARTS } from './parts'

// Days of the week, starting with Sunday
const daysOfWeek = [0, 1, 2, 3, 4, 5, 6] as const
export type DayOfWeek = {
  daysOfWeek: (typeof daysOfWeek)[number][]
}

export type DateStep = {
  year?: number
  month?: number
  day?: number
  hour?: number
  minute?: number
  second?: number
  millisecond?: number
}

export type DateRange = {
  start: DateValue | undefined
  end: DateValue | undefined
}

export type HourCycle = 12 | 24 | undefined

export type DateSegmentPart = (typeof DATE_SEGMENT_PARTS)[number]
export type TimeSegmentPart = (typeof TIME_SEGMENT_PARTS)[number]
export type EditableSegmentPart = (typeof EDITABLE_SEGMENT_PARTS)[number]
export type NonEditableSegmentPart = (typeof NON_EDITABLE_SEGMENT_PARTS)[number]
export type SegmentPart = EditableSegmentPart | NonEditableSegmentPart

export type AnyExceptLiteral = Exclude<SegmentPart, 'literal'>

export type DayPeriod = 'AM' | 'PM' | null
export type DateSegmentObj = {
  [K in DateSegmentPart]: number | null;
}
export type TimeSegmentObj = {
  [K in TimeSegmentPart]: K extends 'dayPeriod' ? DayPeriod : number | null;
}
export type DateAndTimeSegmentObj = DateSegmentObj & TimeSegmentObj
export type SegmentValueObj = DateSegmentObj | DateAndTimeSegmentObj
export type SegmentContentObj = Record<EditableSegmentPart, string>
