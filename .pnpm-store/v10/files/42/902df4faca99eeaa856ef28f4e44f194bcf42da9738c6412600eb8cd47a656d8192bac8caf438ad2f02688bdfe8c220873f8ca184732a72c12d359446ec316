import { FilterFn } from './features/ColumnFiltering'

const includesString: FilterFn<any> = (
  row,
  columnId: string,
  filterValue: string
) => {
  const search = filterValue?.toString()?.toLowerCase()
  return Boolean(
    row
      .getValue<string | null>(columnId)
      ?.toString()
      ?.toLowerCase()
      ?.includes(search)
  )
}

includesString.autoRemove = (val: any) => testFalsey(val)

const includesStringSensitive: FilterFn<any> = (
  row,
  columnId: string,
  filterValue: string
) => {
  return Boolean(
    row.getValue<string | null>(columnId)?.toString()?.includes(filterValue)
  )
}

includesStringSensitive.autoRemove = (val: any) => testFalsey(val)

const equalsString: FilterFn<any> = (
  row,
  columnId: string,
  filterValue: string
) => {
  return (
    row.getValue<string | null>(columnId)?.toString()?.toLowerCase() ===
    filterValue?.toLowerCase()
  )
}

equalsString.autoRemove = (val: any) => testFalsey(val)

const arrIncludes: FilterFn<any> = (
  row,
  columnId: string,
  filterValue: unknown
) => {
  return row.getValue<unknown[]>(columnId)?.includes(filterValue)
}

arrIncludes.autoRemove = (val: any) => testFalsey(val)

const arrIncludesAll: FilterFn<any> = (
  row,
  columnId: string,
  filterValue: unknown[]
) => {
  return !filterValue.some(
    val => !row.getValue<unknown[]>(columnId)?.includes(val)
  )
}

arrIncludesAll.autoRemove = (val: any) => testFalsey(val) || !val?.length

const arrIncludesSome: FilterFn<any> = (
  row,
  columnId: string,
  filterValue: unknown[]
) => {
  return filterValue.some(val =>
    row.getValue<unknown[]>(columnId)?.includes(val)
  )
}

arrIncludesSome.autoRemove = (val: any) => testFalsey(val) || !val?.length

const equals: FilterFn<any> = (row, columnId: string, filterValue: unknown) => {
  return row.getValue(columnId) === filterValue
}

equals.autoRemove = (val: any) => testFalsey(val)

const weakEquals: FilterFn<any> = (
  row,
  columnId: string,
  filterValue: unknown
) => {
  return row.getValue(columnId) == filterValue
}

weakEquals.autoRemove = (val: any) => testFalsey(val)

const inNumberRange: FilterFn<any> = (
  row,
  columnId: string,
  filterValue: [number, number]
) => {
  let [min, max] = filterValue

  const rowValue = row.getValue<number>(columnId)
  return rowValue >= min && rowValue <= max
}

inNumberRange.resolveFilterValue = (val: [any, any]) => {
  let [unsafeMin, unsafeMax] = val

  let parsedMin =
    typeof unsafeMin !== 'number' ? parseFloat(unsafeMin as string) : unsafeMin
  let parsedMax =
    typeof unsafeMax !== 'number' ? parseFloat(unsafeMax as string) : unsafeMax

  let min =
    unsafeMin === null || Number.isNaN(parsedMin) ? -Infinity : parsedMin
  let max = unsafeMax === null || Number.isNaN(parsedMax) ? Infinity : parsedMax

  if (min > max) {
    const temp = min
    min = max
    max = temp
  }

  return [min, max] as const
}

inNumberRange.autoRemove = (val: any) =>
  testFalsey(val) || (testFalsey(val[0]) && testFalsey(val[1]))

// Export

export const filterFns = {
  includesString,
  includesStringSensitive,
  equalsString,
  arrIncludes,
  arrIncludesAll,
  arrIncludesSome,
  equals,
  weakEquals,
  inNumberRange,
}

export type BuiltInFilterFn = keyof typeof filterFns

// Utils

function testFalsey(val: any) {
  return val === undefined || val === null || val === ''
}
