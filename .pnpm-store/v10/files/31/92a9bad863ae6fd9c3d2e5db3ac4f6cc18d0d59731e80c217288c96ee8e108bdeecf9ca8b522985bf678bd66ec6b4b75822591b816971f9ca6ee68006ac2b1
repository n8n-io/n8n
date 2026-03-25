interface Flatted {
  /**
   * Converts a JavaScript Object Notation (using Flatted encoding) string into an object.
   * @param text A valid Flatted string.
   * @param reviver A function that transforms the results. This function is called for each member of the object.
   * If a member contains nested objects, the nested objects are transformed before the parent object is.
   */
  parse(
    text: string,
    reviver?: (this: any, key: string, value: any) => any
  ): any;
  /**
   * Converts a JavaScript value to a JavaScript Object Notation (using Flatted encoding) string.
   * @param value A JavaScript value, usually an object or array, to be converted.
   * @param replacer A function that transforms the results.
   * @param space Adds indentation, white space, and line break characters to the return-value JSON text to make it easier to read.
   */
  stringify(
    value: any,
    replacer?: (this: any, key: string, value: any) => any,
    space?: string | number
  ): string;
  /**
   * Converts a JavaScript value to a JavaScript Object Notation (using Flatted encoding) string.
   * @param value A JavaScript value, usually an object or array, to be converted.
   * @param replacer An array of strings and numbers that acts as an approved list for selecting the object properties that will be stringified.
   * @param space Adds indentation, white space, and line break characters to the return-value JSON text to make it easier to read.
   */
  stringify(
    value: any,
    replacer?: (number | string)[] | null,
    space?: string | number
  ): string;
  /**
   * Helper to allow explicit conversions with classes.
   * @param value The JSON to convert to JavaScript value
   */
  fromJSON(value: any): any;
  /**
   * Helper to allow explicit conversions with classes.
   * @param value A JavaScript value, usually an object or array, to be converted.
   */
  toJSON(value: any): any;
}

/**
 * Fast and minimal circular JSON parser.
 * logic example
```js
var a = [{one: 1}, {two: '2'}];
a[0].a = a;
// a is the main object, will be at index '0'
// {one: 1} is the second object, index '1'
// {two: '2'} the third, in '2', and it has a string
// which will be found at index '3'
Flatted.stringify(a);
// [["1","2"],{"one":1,"a":"0"},{"two":"3"},"2"]
// a[one,two]    {one: 1, a}    {two: '2'}  '2'
```
 */
declare const Flatted: Flatted;
export = Flatted;
