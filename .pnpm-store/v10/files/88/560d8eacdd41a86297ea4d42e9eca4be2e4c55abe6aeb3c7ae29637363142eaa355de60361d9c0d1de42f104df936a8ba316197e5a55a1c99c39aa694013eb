/**
 * Convert literal string types like 'foo-bar' to 'FooBar'
 * @see yargs
 */
export type ITSPascalCase<S extends string> = string extends S ? string : S extends `${infer T}-${infer U}` ? `${Capitalize<T>}${ITSPascalCase<U>}` : Capitalize<S>;
/**
 * Convert literal string types like 'foo-bar' to 'fooBar'
 * @see yargs
 */
export type ITSCamelCase<S extends string> = string extends S ? string : S extends `${infer T}-${infer U}` ? `${T}${ITSPascalCase<U>}` : S;
