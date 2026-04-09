/// <reference types="node" />

declare namespace convict {
    // Taken from https://github.com/Microsoft/TypeScript/issues/12215#issuecomment-307871458
    type Overwrite<T, U> = { [P in Exclude<keyof T, keyof U>]: T[P] } & U;

    type ValidationMethod = "strict" | "warn";

    interface ValidateOptions {
        /**
         * If set to warn, any properties specified in config files that are not declared in
         * the schema will print a warning. This is the default behavior. If set to strict,
         * any properties specified in config files that are not declared in the schema will
         * throw errors. This is to ensure that the schema and the config files are in sync.
         */
        allowed?: ValidationMethod | undefined;

        /** @deprecated use allowed instead */
        strict?: boolean | undefined;

        /**
         * If specified, possible warnings will be passed to this function instead of being
         * outputted to console.log, which would be the default behaviour.
         */
        output?: ((message: string) => void) | undefined;
    }

    interface Format {
        name?: string | undefined;
        validate?(val: any, schema: SchemaObj): void;
        coerce?(val: any): any;
    }

    interface Parser {
        extension: string | string[];
        parse: (content: string) => any;
    }

    type PredefinedFormat =
        | "*"
        | "int"
        | "port"
        | "windows_named_pipe"
        | "port_or_windows_named_pipe"
        | "url"
        | "email"
        | "ipaddress"
        | "duration"
        | "timestamp"
        | "nat"
        | String
        | Object
        | Number
        | RegExp
        | Boolean;

    interface SchemaObj<T = any> {
        /**
         * You can define a configuration property as "required" without providing a default value.
         * Set its default to null and if your format doesn't accept null it will throw an error.
         */
        default: T | null;
        doc?: string | undefined;
        /**
         * From the implementation:
         *
         *  format can be a:
         *   - predefined type, as seen below
         *   - an array of enumerated values, e.g. ["production", "development", "testing"]
         *   - built-in JavaScript type, i.e. Object, Array, String, Number, Boolean
         *   - function that performs validation and throws an Error on failure
         *
         * If omitted, format will be set to the value of Object.prototype.toString.call
         * for the default value
         */
        format?: PredefinedFormat | any[] | ((val: any) => asserts val is T) | ((val: any) => void) | undefined;
        env?: string | undefined;
        arg?: string | undefined;
        sensitive?: boolean | undefined;
        nullable?: boolean | undefined;
        [key: string]: any;
    }

    type Schema<T> = {
        [P in keyof T]: Schema<T[P]> | SchemaObj<T[P]>;
    };

    interface InternalSchema<T> {
        _cvtProperties: {
            [K in keyof T]: T[K] extends object ? InternalSchema<T[K]> : { default: T[K] };
        };
    }

    interface Options {
        env?: NodeJS.ProcessEnv | undefined;
        args?: string[] | undefined;
    }

    // Taken from https://twitter.com/diegohaz/status/1309489079378219009
    type PathImpl<T, K extends keyof T> = K extends string
        ? T[K] extends Record<string, any>
            ? T[K] extends ArrayLike<any> ? K | `${K}.${PathImpl<T[K], Exclude<keyof T[K], keyof any[]>>}`
            : K | `${K}.${PathImpl<T[K], keyof T[K]>}`
        : K
        : never;

    type Path<T> = PathImpl<T, keyof T> | keyof T;

    type PathValue<T, P extends Path<T>> = P extends `${infer K}.${infer Rest}`
        ? K extends keyof T ? Rest extends Path<T[K]> ? PathValue<T[K], Rest>
            : never
        : never
        : P extends keyof T ? T[P]
        : never;

    interface Config<T> {
        /**
         * @returns the current value of the name property. name can use dot
         * notation to reference nested values
         */
        get<K extends Path<T> | null | undefined = undefined>(
            name?: K,
        ): K extends null | undefined ? T : K extends Path<T> ? PathValue<T, K> : never;

        /**
         * @returns the default value of the name property. name can use dot
         * notation to reference nested values
         */
        default<K extends Path<T> | null | undefined = undefined>(
            name?: K,
        ): K extends null | undefined ? T : K extends Path<T> ? PathValue<T, K> : never;

        /**
         * @returns true if the property name is defined, or false otherwise
         */
        has<K extends Path<T>>(name: K): boolean;

        /**
         * Resets a property to its default value as defined in the schema
         */
        reset<K extends Path<T>>(name: K): void;

        /**
         * Sets the value of name to value. name can use dot notation to reference
         * nested values, e.g. "database.port". If objects in the chain don't yet
         * exist, they will be initialized to empty objects
         */
        set<K extends Path<T> | string>(name: K, value: K extends Path<T> ? PathValue<T, K> : any): Config<T>;

        /**
         * Loads and merges a JavaScript object into config
         */
        load<U>(conf: U): Config<Overwrite<T, U>>;

        /**
         * Loads and merges JSON configuration file(s) into config
         */

        loadFile<U>(files: string | string[]): Config<Overwrite<T, U>>;
        /**
         * Validates config against the schema used to initialize it
         */
        validate(options?: ValidateOptions): Config<T>;

        /**
         * Exports all the properties (that is the keys and their current values) as a {JSON} {Object}
         * @returns A {JSON} compliant {Object}
         */
        getProperties(): T;

        /**
         * Exports the schema as a {JSON} {Object}
         * @returns A {JSON} compliant {Object}
         */
        getSchema(): InternalSchema<T>;

        /**
         * Exports all the properties (that is the keys and their current values) as a JSON string.
         * @returns A string representing this object
         */
        toString(): string;

        /**
         * Exports the schema as a JSON string.
         * @returns A string representing the schema of this {Config}
         */
        getSchemaString(): string;

        /**
         * Gets the environment variable map, using the override passed to the
         * convict function or process.env if no override was passed.
         */
        getEnv(): string[];

        /**
         * Gets the array of process arguments, using the override passed to the
         * convict function or process.argv if no override was passed.
         */
        getArgs(): string[];
    }
}

interface convict {
    addFormat(format: convict.Format): void;
    addFormats(formats: { [name: string]: convict.Format }): void;
    addParser(parsers: convict.Parser | convict.Parser[]): void;
    <T>(config: convict.Schema<T> | string, opts?: convict.Options): convict.Config<T>;
}
declare var convict: convict;
export = convict;
