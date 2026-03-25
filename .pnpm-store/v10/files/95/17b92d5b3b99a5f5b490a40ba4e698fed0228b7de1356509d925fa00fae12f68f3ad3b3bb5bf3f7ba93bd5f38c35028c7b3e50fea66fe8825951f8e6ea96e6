import { AggregationFn } from './features/ColumnGrouping'
import { isNumberArray } from './utils'

const sum: AggregationFn<any> = (columnId, _leafRows, childRows) => {
  // It's faster to just add the aggregations together instead of
  // process leaf nodes individually
  return childRows.reduce((sum, next) => {
    const nextValue = next.getValue(columnId)
    return sum + (typeof nextValue === 'number' ? nextValue : 0)
  }, 0)
}

const min: AggregationFn<any> = (columnId, _leafRows, childRows) => {
  let min: number | undefined

  childRows.forEach(row => {
    const value = row.getValue<number>(columnId)

    if (
      value != null &&
      (min! > value || (min === undefined && value >= value))
    ) {
      min = value
    }
  })

  return min
}

const max: AggregationFn<any> = (columnId, _leafRows, childRows) => {
  let max: number | undefined

  childRows.forEach(row => {
    const value = row.getValue<number>(columnId)
    if (
      value != null &&
      (max! < value || (max === undefined && value >= value))
    ) {
      max = value
    }
  })

  return max
}

const extent: AggregationFn<any> = (columnId, _leafRows, childRows) => {
  let min: number | undefined
  let max: number | undefined

  childRows.forEach(row => {
    const value = row.getValue<number>(columnId)
    if (value != null) {
      if (min === undefined) {
        if (value >= value) min = max = value
      } else {
        if (min > value) min = value
        if (max! < value) max = value
      }
    }
  })

  return [min, max]
}

const mean: AggregationFn<any> = (columnId, leafRows) => {
  let count = 0
  let sum = 0

  leafRows.forEach(row => {
    let value = row.getValue<number>(columnId)
    if (value != null && (value = +value) >= value) {
      ++count, (sum += value)
    }
  })

  if (count) return sum / count

  return
}

const median: AggregationFn<any> = (columnId, leafRows) => {
  if (!leafRows.length) {
    return
  }

  const values = leafRows.map(row => row.getValue(columnId))
  if (!isNumberArray(values)) {
    return
  }
  if (values.length === 1) {
    return values[0]
  }

  const mid = Math.floor(values.length / 2)
  const nums = values.sort((a, b) => a - b)
  return values.length % 2 !== 0 ? nums[mid] : (nums[mid - 1]! + nums[mid]!) / 2
}

const unique: AggregationFn<any> = (columnId, leafRows) => {
  return Array.from(new Set(leafRows.map(d => d.getValue(columnId))).values())
}

const uniqueCount: AggregationFn<any> = (columnId, leafRows) => {
  return new Set(leafRows.map(d => d.getValue(columnId))).size
}

const count: AggregationFn<any> = (_columnId, leafRows) => {
  return leafRows.length
}

export const aggregationFns = {
  sum,
  min,
  max,
  extent,
  mean,
  median,
  unique,
  uniqueCount,
  count,
}

export type BuiltInAggregationFn = keyof typeof aggregationFns
