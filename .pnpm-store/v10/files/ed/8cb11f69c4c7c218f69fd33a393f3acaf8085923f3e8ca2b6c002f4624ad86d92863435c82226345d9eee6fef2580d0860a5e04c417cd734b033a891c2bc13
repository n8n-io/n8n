type PropertiesIterator = Generator<string, void, unknown>;
type ExpressAppLike = {
    set(key: string, value: unknown): unknown;
    locals?: Record<string, unknown>;
};
type Nullable<T> = T | null;
type Value = number | boolean | string;
type ParsedValue = Nullable<Value>;
type PathLeafValue = Value | undefined;
type PathValue = PathLeafValue & {
    [k: string]: PathValue;
};
type PathProxy = {
    [k: string]: PathValue;
} & {
    [k: symbol]: unknown;
};
interface Reader {
    /**
     * Gets the number of properties in the reader instance.
     */
    readonly length: number;
    /**
     * Reads the content of the named `sourceFile` into the current reader
     * instance, returns the reader instance for ease of chaining.
     *
     * ```
     * const props = propertiesReader({ sourceFile: 'first.ini' });
     * props.append('second.ini');
     * ```
     *
     * @param sourceFile
     * @param enc
     */
    append(sourceFile?: string | null, enc?: BufferEncoding): Reader;
    /**
     * Creates a clone of the current properties reader, carries forward
     * all properties and factory settings from the current reader.
     *
     * Useful for staging additions to a reader instance:
     *
     * ```
     * const props1 = propertiesReader({ sourceFile: 'first.ini' });
     * const props2 = props1.clone().append('second.ini');
     * ```
     */
    clone(): Reader;
    /**
     * @deprecated
     * Switch to using the separate `bindToExpress` function.
     *
     * ```
     * import { propertiesReader, bindToExpress } from 'properties-reader';
     *
     * const props = propertiesReader({ sourceFile: 'props.ini' });
     * bindToExpress(
     *   props,
     *   app,
     *   __dirname,
     *   false
     * );
     * ```
     *
     * @param app
     * @param basePath
     * @param makePaths
     */
    bindToExpress(app: ExpressAppLike, basePath?: string | null, makePaths?: boolean): void;
    /**
     * @deprecated
     * Switch to using the `.entries()` iterator.
     *
     * ```
     * // instead of:
     * props.each(scope.fn, scope);
     *
     * // change to:
     * for (const [key, value] of props.entries()) {
     *   scope.fn(key, value);
     * }
     * ```
     */
    each<T>(fn: (key: string, value: Value) => void, scope?: T): Reader;
    /**
     * Gets an iterator to the full set of property key/value pairs for use in any
     * `for of` style iteration or iterator consumer.
     *
     * Optional `options` argument configures the iterator to also parse the
     * property values, defaults to leaving unparsed (all values will be strings).
     *
     * ```
     * // use in any iterator loop
     * for (const [key, value] of props.entries()) { }
     *
     * // consume as an object, optionally parsing the values
     * Object.fromEntries(props.entries({ parsed: true })
     * ```
     */
    entries: {
        (options?: {
            parsed?: false | undefined;
        }): MapIterator<[string, string]>;
        (options: {
            parsed: true;
        }): MapIterator<[string, ParsedValue]>;
    };
    /**
     * Gets the parsed value for the property at named `key`, when not present returns `null`.
     *
     * ```
     * props.get('section.prop.key') == 'value'
     * ```
     *
     * @param key
     */
    get(key: string): ParsedValue;
    /**
     * @deprecated
     * Switch to using the `.entries()` iterator
     *
     * ```
     * // instead of:
     * props.getAllProperties() == { 'section.prop.key': 'value' }
     *
     * // change to:
     * Object.fromEntries(props.entries()) == { 'section.prop.key': 'value' }
     * ```
     */
    getAllProperties(): Record<string, string>;
    /**
     * Creates a new Record object from the properties, with values parsed, offset by the
     * supplied `root` parameter.
     *
     * ```
     * props.getByRoot('section') == { 'prop.key': 'value' };
     * props.getByRoot('section.prop') == { 'key': 'value' };
     * ```
     *
     * @param root
     */
    getByRoot(root: string): Record<string, ParsedValue>;
    /**
     * Gets the property with the named `key`, when present returns the string
     * value, when not present returns `null`.
     *
     * ```
     * const props = propertiesReader().set('section.prop.key', 'value');
     * props.getRaw('section.prop.key') == 'value';
     * props.getRaw('unknown.key') == null;
     * ```
     *
     * @param key
     */
    getRaw(key: string): Nullable<string>;
    /**
     * Gets an iterator for the lines that would be written when saving the
     * properties as a file. Output is determined by the
     * `allowDuplicateSections` and `saveSections` configuration options used
     * when creating the properties reader instance.
     *
     * ```
     * // example of custom file writing with the `props.out` iterator
     * fs.writeFile(`props.ini`, Array.from(props.out).join('\n'), 'utf8');
     * ```
     */
    out(): PropertiesIterator;
    /**
     * Lazily evaluates the properties into a nested object based on the
     * dot-delimited key names. Cache calls to `.path()` to reuse the same
     * lazy evaluation.
     *
     * ```
     * const props = propertiesReader().set('section.prop.key', 'value');
     * const p = props.path();
     * p.section?.prop?.key == 'value';
     *
     * ```
     */
    path(): PathProxy;
    /**
     * Reads properties from the supplied input string or buffer. When reading
     * from a buffer, the content will be converted to a string of `encoding`
     * (as configured when the propertiesReader was initialised, defaults to
     * utf8).
     */
    read(input: string | Buffer): Reader;
    /**
     * Saves the contents of the properties reader to a file at `destFile`,
     * overwrites existing file contents, throws if there is an exception
     * writing to the file.
     *
     * Output file is always utf8 encoded.
     *
     * Note: API changed from v2 -> v3, this method no longer returns the
     * content of the file. For access to the generated file content,
     * use the `props.out()` iterator.
     *
     * @param destFile
     */
    save(destFile: string): Promise<void>;
    /**
     * Adds / updates a single item into the reader. Returns the same reader
     * instance for ease of chaining.
     *
     * @param key
     * @param value
     */
    set(key: string, value: Value): Reader;
}

type AppenderOptions = {
    allowDuplicateSections: boolean;
};
type WriterOptions = {
    saveSections: boolean;
};
type PropertiesFactoryOptions = {
    encoding?: BufferEncoding;
    sourceFile?: string;
} & Partial<AppenderOptions> & Partial<WriterOptions>;
declare const createPropertiesReader: ({ sourceFile, encoding, allowDuplicateSections, saveSections, }?: PropertiesFactoryOptions) => Reader;

/**
 * Helper to ensure the provided `basePath` has a trailing slash suffix. When omitted
 * or empty, defaults to using the process current working directory.
 *
 * @param basePath
 */
declare function expressBasePath(basePath?: Nullable<string>): string;
/**
 * Binds properties into the settings for an express app.
 *
 * Where properties have a key ending with either `path` or `dir`, the value of the property
 * resolved relative to the `basePath` directory and optionally (when `makePaths` is `true`)
 * the path will be created.
 *
 * Where a property key starts with `browser.`, the `app.locals` will have a property added
 * (without the `browser.` prefix). Useful for including variables for templating libraries.
 *
 * ```
 * import { propertiesReader, bindToExpress } from 'properties-reader';
 *
 * const props = propertiesReader()
 *    .set('config.dir', './config')
 *    .set('service.username', 'some secret here')
 *    .set('browser.app.name', 'My App');
 *
 * bindToExpress(
 *   props, app, '/bin/my-app', true
 * );
 *
 * app.get('config.dir') === '/bin/my-app/config';
 * app.get('service.username') === 'some secret here';
 * app.get('properties') === props;
 *
 * // only if `app.locals` had already been enabled before using `bindToExpress`
 * app.locals?.['app-name'] === 'My App';
 * ```
 *
 *
 * @param reader
 * @param app
 * @param basePath
 * @param makePaths
 */
declare function bindToExpress(reader: Reader, app: ExpressAppLike, basePath: string, makePaths: boolean): Reader;

declare const propertiesReader: ({ sourceFile, encoding, allowDuplicateSections, saveSections, }?: PropertiesFactoryOptions) => Reader;

export { type PropertiesFactoryOptions, type Reader, bindToExpress, createPropertiesReader as default, expressBasePath, propertiesReader };
