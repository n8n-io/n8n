import type { AcceptableValue } from '@/shared/types'
import { isEqual } from 'ohash'

export const OPEN_KEYS = [' ', 'Enter', 'ArrowUp', 'ArrowDown']
export const SELECTION_KEYS = [' ', 'Enter']
export const CONTENT_MARGIN = 10

export function valueComparator<T>(value: T | T[] | undefined, currentValue: T, comparator?: string | ((a: T, b: T) => boolean)) {
  if (value === undefined)
    return false
  else if (Array.isArray(value))
    return value.some(val => compare(val, currentValue, comparator))
  else
    return compare(value, currentValue, comparator)
}

export function compare<T>(value?: T, currentValue?: T, comparator?: string | ((a: T, b: T) => boolean)) {
  if (value === undefined || currentValue === undefined)
    return false

  if (typeof value === 'string')
    return value === currentValue

  if (typeof comparator === 'function')
    return comparator(value, currentValue)

  if (typeof comparator === 'string')
    return value?.[comparator as keyof T] === currentValue?.[comparator as keyof T]

  return isEqual(value, currentValue)
}

export function shouldShowPlaceholder(value?: AcceptableValue | AcceptableValue[]): boolean {
  return value === undefined || value === null || value === '' || (Array.isArray(value) && value.length === 0)
}
