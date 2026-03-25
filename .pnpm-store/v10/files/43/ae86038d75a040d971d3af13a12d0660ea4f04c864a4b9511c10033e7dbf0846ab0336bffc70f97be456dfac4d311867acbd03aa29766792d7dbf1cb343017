/**
 * Declaration for https://github.com/s3u/JSONPath
 */
declare module 'jsonpath-plus' {
  type JSONPathCallback = (
      payload: any, payloadType: any, fullPayload: any
  ) => any

  type JSONPathOtherTypeCallback = (...args: any[]) => void

  class EvalClass {
    constructor(code: string);
    runInNewContext(context: object): any;
  }

  interface JSONPathOptions {
    /**
     * The JSONPath expression as a (normalized or unnormalized) string or
     *   array.
     */
    path: string | any[]
    /**
     * The JSON object to evaluate (whether of null, boolean, number,
     *   string, object, or array type).
     */
    json: null | boolean | number | string | object | any[]
    /**
     * If this is supplied as false, one may call the evaluate method
     *  manually.
     *
     * @default true
     */
    autostart?: true | boolean
    /**
     * Whether the returned array of results will be flattened to a
     *   single dimension array.
     *
     * @default false
     */
    flatten?: false | boolean
    /**
     * Can be case-insensitive form of "value", "path", "pointer", "parent",
     *   or "parentProperty" to determine respectively whether to return
     *   results as the values of the found items, as their absolute paths,
     *   as JSON Pointers to the absolute paths, as their parent objects,
     *   or as their parent's property name.
     *
     * If set to "all", all of these types will be returned on an object with
     *   the type as key name.
     *
     * @default 'value'
     */
    resultType?:
        'value' | 'path' | 'pointer' | 'parent' | 'parentProperty' | 'all'

    /**
     * Key-value map of variables to be available to code evaluations such
     *   as filtering expressions.
     * (Note that the current path and value will also be available to those
     *   expressions; see the Syntax section for details.)
     */
    sandbox?: Map<string, any>
    /**
     * Whether or not to wrap the results in an array.
     *
     * If wrap is set to false, and no results are found, undefined will be
     *   returned (as opposed to an empty array when wrap is set to true).
     *
     * If wrap is set to false and a single non-array result is found, that
     *   result will be the only item returned (not within an array).
     *
     * An array will still be returned if multiple results are found, however.
     * To avoid ambiguities (in the case where it is necessary to distinguish
     * between a result which is a failure and one which is an empty array),
     * it is recommended to switch the default to false.
     *
     * @default true
     */
    wrap?: true | boolean
    /**
     * Script evaluation method.
     *
     * `safe`: In browser, it will use a minimal scripting engine which doesn't
     * use `eval` or `Function` and satisfies Content Security Policy. In NodeJS,
     * it has no effect and is equivalent to native as scripting is safe there.
     *
     * `native`: uses the native scripting capabilities. i.e. unsafe `eval` or
     * `Function` in browser and `vm.Script` in nodejs.
     *
     * `true`: Same as 'safe'
     *
     * `false`: Disable Javascript executions in path string. Same as `preventEval: true` in previous versions.
     *
     * `callback [ (code, context) => value]`: A custom implementation which is called
     * with `code` and `context` as arguments to return the evaluated value.
     *
     * `class`: A class similar to nodejs vm.Script. It will be created with `code` as constructor argument and the code
     * is evaluated by calling `runInNewContext` with `context`.
     *
     * @default 'safe'
     */
    eval?: 'safe' | 'native' | boolean | ((code: string, context: object) => any) | typeof EvalClass
    /**
     * Ignore errors while evaluating JSONPath expression.
     *
     * `true`: Don't break entire search if an error occurs while evaluating JSONPath expression on one key/value pair.
     *
     * `false`: Break entire search if an error occurs while evaluating JSONPath expression on one key/value pair.
     *
     * @default false
     *
     */
    ignoreEvalErrors?: boolean
    /**
     * In the event that a query could be made to return the root node,
     * this allows the parent of that root node to be returned within results.
     *
     * @default null
     */
    parent?: null | any
    /**
     * In the event that a query could be made to return the root node,
     * this allows the parentProperty of that root node to be returned within
     * results.
     *
     * @default null
     */
    parentProperty?: null | any
    /**
     * If supplied, a callback will be called immediately upon retrieval of
     * an end point value.
     *
     * The three arguments supplied will be the value of the payload
     * (according to `resultType`), the type of the payload (whether it is
     * a normal "value" or a "property" name), and a full payload object
     * (with all `resultType`s).
     *
     * @default undefined
     */
    callback?: undefined | JSONPathCallback
    /**
     * In the current absence of JSON Schema support,
     * one can determine types beyond the built-in types by adding the
     * perator `@other()` at the end of one's query.
     *
     * If such a path is encountered, the `otherTypeCallback` will be invoked
     * with the value of the item, its path, its parent, and its parent's
     * property name, and it should return a boolean indicating whether the
     * supplied value belongs to the "other" type or not (or it may handle
     * transformations and return false).
     *
     * @default undefined
     *   <A function that throws an error when `@other()` is encountered>
     */
    otherTypeCallback?: undefined | JSONPathOtherTypeCallback
  }

  interface JSONPathOptionsAutoStart extends JSONPathOptions {
    autostart: false
  }

  interface JSONPathCallable {
    <T = any>(options: JSONPathOptionsAutoStart): JSONPathClass
    <T = any>(options: JSONPathOptions): T

    <T = any>(
        path: JSONPathOptions['path'],
        json: JSONPathOptions['json'],
        callback: JSONPathOptions['callback'],
        otherTypeCallback: JSONPathOptions['otherTypeCallback']
    ): T
  }

  class JSONPathClass {
    /**
     * Exposes the cache object for those who wish to preserve and reuse
     *   it for optimization purposes.
     */
    cache: any

    /**
     * Accepts a normalized or unnormalized path as string and
     * converts to an array: for example,
     * `['$', 'aProperty', 'anotherProperty']`.
     */
    toPathArray(path: string): string[]

    /**
     * Accepts a path array and converts to a normalized path string.
     * The string will be in a form like:
     *   `$['aProperty']['anotherProperty][0]`.
     * The JSONPath terminal constructions `~` and `^` and type operators
     *   like `@string()` are silently stripped.
     */
    toPathString(path: string[]): string

    /**
     * Accepts a path array and converts to a JSON Pointer.
     *
     * The string will be in a form like: `/aProperty/anotherProperty/0`
     * (with any `~` and `/` internal characters escaped as per the JSON
     * Pointer spec).
     *
     * The JSONPath terminal constructions `~` and `^` and type operators
     *   like `@string()` are silently stripped.
     */
    toPointer(path: string[]): any

    evaluate(
        path: JSONPathOptions['path'],
        json: JSONPathOptions['json'],
        callback: JSONPathOptions['callback'],
        otherTypeCallback: JSONPathOptions['otherTypeCallback']
    ): any
    evaluate(options: {
        path: JSONPathOptions['path'],
        json: JSONPathOptions['json'],
        callback: JSONPathOptions['callback'],
        otherTypeCallback: JSONPathOptions['otherTypeCallback']
    }): any
  }

  type JSONPathType = JSONPathCallable & JSONPathClass

  export const JSONPath: JSONPathType
}
