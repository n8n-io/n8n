/**
 * Helpers to convert the change Payload into native JS types.
 */
export declare enum PostgresTypes {
    abstime = "abstime",
    bool = "bool",
    date = "date",
    daterange = "daterange",
    float4 = "float4",
    float8 = "float8",
    int2 = "int2",
    int4 = "int4",
    int4range = "int4range",
    int8 = "int8",
    int8range = "int8range",
    json = "json",
    jsonb = "jsonb",
    money = "money",
    numeric = "numeric",
    oid = "oid",
    reltime = "reltime",
    text = "text",
    time = "time",
    timestamp = "timestamp",
    timestamptz = "timestamptz",
    timetz = "timetz",
    tsrange = "tsrange",
    tstzrange = "tstzrange"
}
type Columns = {
    name: string;
    type: string;
    flags?: string[];
    type_modifier?: number;
}[];
type BaseValue = null | string | number | boolean;
type RecordValue = BaseValue | BaseValue[];
type Record = {
    [key: string]: RecordValue;
};
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
export declare const convertChangeData: (columns: Columns, record: Record, options?: {
    skipTypes?: string[];
}) => Record;
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
export declare const convertColumn: (columnName: string, columns: Columns, record: Record, skipTypes: string[]) => RecordValue;
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
export declare const convertCell: (type: string, value: RecordValue) => RecordValue;
export declare const toBoolean: (value: RecordValue) => RecordValue;
export declare const toNumber: (value: RecordValue) => RecordValue;
export declare const toJson: (value: RecordValue) => RecordValue;
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
export declare const toArray: (value: RecordValue, type: string) => RecordValue;
/**
 * Fixes timestamp to be ISO-8601. Swaps the space between the date and time for a 'T'
 * See https://github.com/supabase/supabase/issues/18
 *
 * @example toTimestampString('2019-09-10 00:00:00')
 * //=> '2019-09-10T00:00:00'
 */
export declare const toTimestampString: (value: RecordValue) => RecordValue;
export declare const httpEndpointURL: (socketUrl: string) => string;
export {};
//# sourceMappingURL=transformers.d.ts.map