/**
 * Helpers to convert the change Payload into native JS types.
 */

// Adapted from epgsql (src/epgsql_binary.erl), this module licensed under
// 3-clause BSD found here: https://raw.githubusercontent.com/epgsql/epgsql/devel/LICENSE

export enum PostgresTypes {
  abstime = 'abstime',
  bool = 'bool',
  date = 'date',
  daterange = 'daterange',
  float4 = 'float4',
  float8 = 'float8',
  int2 = 'int2',
  int4 = 'int4',
  int4range = 'int4range',
  int8 = 'int8',
  int8range = 'int8range',
  json = 'json',
  jsonb = 'jsonb',
  money = 'money',
  numeric = 'numeric',
  oid = 'oid',
  reltime = 'reltime',
  text = 'text',
  time = 'time',
  timestamp = 'timestamp',
  timestamptz = 'timestamptz',
  timetz = 'timetz',
  tsrange = 'tsrange',
  tstzrange = 'tstzrange',
}

type Columns = {
  name: string // the column name. eg: "user_id"
  type: string // the column type. eg: "uuid"
  flags?: string[] // any special flags for the column. eg: ["key"]
  type_modifier?: number // the type modifier. eg: 4294967295
}[]

type BaseValue = null | string | number | boolean
type RecordValue = BaseValue | BaseValue[]

type Record = {
  [key: string]: RecordValue
}

/**
 * Takes an array of columns and an object of string values then converts each string value
 * to its mapped type.
 *
 * @param {{name: String, type: String}[]} columns
 * @param {Object} record
 * @param {Object} options The map of various options that can be applied to the mapper
 * @param {Array} options.skipTypes The array of types that should not be converted
 *
 * @example convertChangeData([{name: 'first_name', type: 'text'}, {name: 'age', type: 'int4'}], {first_name: 'Paul', age:'33'}, {})
 * //=>{ first_name: 'Paul', age: 33 }
 */
export const convertChangeData = (
  columns: Columns,
  record: Record,
  options: { skipTypes?: string[] } = {}
): Record => {
  const skipTypes = options.skipTypes ?? []

  return Object.keys(record).reduce((acc, rec_key) => {
    acc[rec_key] = convertColumn(rec_key, columns, record, skipTypes)
    return acc
  }, {} as Record)
}

/**
 * Converts the value of an individual column.
 *
 * @param {String} columnName The column that you want to convert
 * @param {{name: String, type: String}[]} columns All of the columns
 * @param {Object} record The map of string values
 * @param {Array} skipTypes An array of types that should not be converted
 * @return {object} Useless information
 *
 * @example convertColumn('age', [{name: 'first_name', type: 'text'}, {name: 'age', type: 'int4'}], {first_name: 'Paul', age: '33'}, [])
 * //=> 33
 * @example convertColumn('age', [{name: 'first_name', type: 'text'}, {name: 'age', type: 'int4'}], {first_name: 'Paul', age: '33'}, ['int4'])
 * //=> "33"
 */
export const convertColumn = (
  columnName: string,
  columns: Columns,
  record: Record,
  skipTypes: string[]
): RecordValue => {
  const column = columns.find((x) => x.name === columnName)
  const colType = column?.type
  const value = record[columnName]

  if (colType && !skipTypes.includes(colType)) {
    return convertCell(colType, value)
  }

  return noop(value)
}

/**
 * If the value of the cell is `null`, returns null.
 * Otherwise converts the string value to the correct type.
 * @param {String} type A postgres column type
 * @param {String} value The cell value
 *
 * @example convertCell('bool', 't')
 * //=> true
 * @example convertCell('int8', '10')
 * //=> 10
 * @example convertCell('_int4', '{1,2,3,4}')
 * //=> [1,2,3,4]
 */
export const convertCell = (type: string, value: RecordValue): RecordValue => {
  // if data type is an array
  if (type.charAt(0) === '_') {
    const dataType = type.slice(1, type.length)
    return toArray(value, dataType)
  }

  // If not null, convert to correct type.
  switch (type) {
    case PostgresTypes.bool:
      return toBoolean(value)
    case PostgresTypes.float4:
    case PostgresTypes.float8:
    case PostgresTypes.int2:
    case PostgresTypes.int4:
    case PostgresTypes.int8:
    case PostgresTypes.numeric:
    case PostgresTypes.oid:
      return toNumber(value)
    case PostgresTypes.json:
    case PostgresTypes.jsonb:
      return toJson(value)
    case PostgresTypes.timestamp:
      return toTimestampString(value) // Format to be consistent with PostgREST
    case PostgresTypes.abstime: // To allow users to cast it based on Timezone
    case PostgresTypes.date: // To allow users to cast it based on Timezone
    case PostgresTypes.daterange:
    case PostgresTypes.int4range:
    case PostgresTypes.int8range:
    case PostgresTypes.money:
    case PostgresTypes.reltime: // To allow users to cast it based on Timezone
    case PostgresTypes.text:
    case PostgresTypes.time: // To allow users to cast it based on Timezone
    case PostgresTypes.timestamptz: // To allow users to cast it based on Timezone
    case PostgresTypes.timetz: // To allow users to cast it based on Timezone
    case PostgresTypes.tsrange:
    case PostgresTypes.tstzrange:
      return noop(value)
    default:
      // Return the value for remaining types
      return noop(value)
  }
}

const noop = (value: RecordValue): RecordValue => {
  return value
}
export const toBoolean = (value: RecordValue): RecordValue => {
  switch (value) {
    case 't':
      return true
    case 'f':
      return false
    default:
      return value
  }
}
export const toNumber = (value: RecordValue): RecordValue => {
  if (typeof value === 'string') {
    const parsedValue = parseFloat(value)
    if (!Number.isNaN(parsedValue)) {
      return parsedValue
    }
  }
  return value
}
export const toJson = (value: RecordValue): RecordValue => {
  if (typeof value === 'string') {
    try {
      return JSON.parse(value)
    } catch (error) {
      console.log(`JSON parse error: ${error}`)
      return value
    }
  }
  return value
}

/**
 * Converts a Postgres Array into a native JS array
 *
 * @example toArray('{}', 'int4')
 * //=> []
 * @example toArray('{"[2021-01-01,2021-12-31)","(2021-01-01,2021-12-32]"}', 'daterange')
 * //=> ['[2021-01-01,2021-12-31)', '(2021-01-01,2021-12-32]']
 * @example toArray([1,2,3,4], 'int4')
 * //=> [1,2,3,4]
 */
export const toArray = (value: RecordValue, type: string): RecordValue => {
  if (typeof value !== 'string') {
    return value
  }

  const lastIdx = value.length - 1
  const closeBrace = value[lastIdx]
  const openBrace = value[0]

  // Confirm value is a Postgres array by checking curly brackets
  if (openBrace === '{' && closeBrace === '}') {
    let arr
    const valTrim = value.slice(1, lastIdx)

    // TODO: find a better solution to separate Postgres array data
    try {
      arr = JSON.parse('[' + valTrim + ']')
    } catch (_) {
      // WARNING: splitting on comma does not cover all edge cases
      arr = valTrim ? valTrim.split(',') : []
    }

    return arr.map((val: BaseValue) => convertCell(type, val))
  }

  return value
}

/**
 * Fixes timestamp to be ISO-8601. Swaps the space between the date and time for a 'T'
 * See https://github.com/supabase/supabase/issues/18
 *
 * @example toTimestampString('2019-09-10 00:00:00')
 * //=> '2019-09-10T00:00:00'
 */
export const toTimestampString = (value: RecordValue): RecordValue => {
  if (typeof value === 'string') {
    return value.replace(' ', 'T')
  }

  return value
}

export const httpEndpointURL = (socketUrl: string): string => {
  let url = socketUrl
  url = url.replace(/^ws/i, 'http')
  url = url.replace(/(\/socket\/websocket|\/socket|\/websocket)\/?$/i, '')
  return url.replace(/\/+$/, '')
}
