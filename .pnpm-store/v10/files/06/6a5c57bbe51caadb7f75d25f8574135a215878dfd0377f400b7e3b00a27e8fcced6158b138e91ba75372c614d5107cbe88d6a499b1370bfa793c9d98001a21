// eslint-disable-next-line @definitelytyped/export-just-namespace
export = PropTypes;

declare namespace PropTypes {
    type ReactComponentLike =
        | string
        | ((props: any) => any)
        | (new(props: any, context: any) => any);

    interface ReactElementLike {
        type: ReactComponentLike;
        props: unknown;
        key: string | null;
    }

    interface ReactNodeArray extends Iterable<ReactNodeLike> {}

    /**
     * @internal Use `Awaited<ReactNodeLike>` instead
     */
    // Helper type to enable `Awaited<ReactNodeLike>`.
    // Must be a copy of the non-thenables of `ReactNodeLike`.
    type AwaitedReactNodeLike =
        | ReactElementLike
        | string
        | number
        | bigint
        | ReactNodeArray
        | boolean
        | null
        | undefined;

    type ReactNodeLike =
        | ReactElementLike
        | ReactNodeArray
        | string
        | number
        | bigint
        | boolean
        | null
        | undefined
        | Promise<AwaitedReactNodeLike>;

    const nominalTypeHack: unique symbol;

    type IsOptional<T> = undefined extends T ? true : false;

    type RequiredKeys<V> = {
        [K in keyof V]-?: Exclude<V[K], undefined> extends Validator<infer T> ? IsOptional<T> extends true ? never : K
            : never;
    }[keyof V];
    type OptionalKeys<V> = Exclude<keyof V, RequiredKeys<V>>;
    type InferPropsInner<V> = { [K in keyof V]-?: InferType<V[K]> };

    interface Validator<T> {
        (
            props: { [key: string]: any },
            propName: string,
            componentName: string,
            location: string,
            propFullName: string,
        ): Error | null;
        [nominalTypeHack]?: {
            type: T;
        } | undefined;
    }

    interface Requireable<T> extends Validator<T | undefined | null> {
        isRequired: Validator<NonNullable<T>>;
    }

    type ValidationMap<T> = { [K in keyof T]?: Validator<T[K]> };

    /**
     * Like {@link ValidationMap} but treats `undefined`, `null` and optional properties the same.
     * This type is only added as a migration path in React 19 where this type was removed from React.
     * Runtime and compile time types would mismatch since you could see `undefined` at runtime when your types don't expect this type.
     */
    type WeakValidationMap<T> = {
        [K in keyof T]?: null extends T[K] ? Validator<T[K] | null | undefined>
            : undefined extends T[K] ? Validator<T[K] | null | undefined>
            : Validator<T[K]>;
    };

    type InferType<V> = V extends Validator<infer T> ? T : any;
    type InferProps<V> =
        & InferPropsInner<Pick<V, RequiredKeys<V>>>
        & Partial<InferPropsInner<Pick<V, OptionalKeys<V>>>>;

    const any: Requireable<any>;
    const array: Requireable<any[]>;
    const bool: Requireable<boolean>;
    const func: Requireable<(...args: any[]) => any>;
    const number: Requireable<number>;
    const object: Requireable<object>;
    const string: Requireable<string>;
    const node: Requireable<ReactNodeLike>;
    const element: Requireable<ReactElementLike>;
    const symbol: Requireable<symbol>;
    const elementType: Requireable<ReactComponentLike>;
    function instanceOf<T>(expectedClass: new(...args: any[]) => T): Requireable<T>;
    function oneOf<T>(types: readonly T[]): Requireable<T>;
    function oneOfType<T extends Validator<any>>(types: T[]): Requireable<NonNullable<InferType<T>>>;
    function arrayOf<T>(type: Validator<T>): Requireable<T[]>;
    function objectOf<T>(type: Validator<T>): Requireable<{ [K in keyof any]: T }>;
    function shape<P extends ValidationMap<any>>(type: P): Requireable<InferProps<P>>;
    function exact<P extends ValidationMap<any>>(type: P): Requireable<Required<InferProps<P>>>;

    /**
     * Assert that the values match with the type specs.
     * Error messages are memorized and will only be shown once.
     *
     * @param typeSpecs Map of name to a ReactPropType
     * @param values Runtime values that need to be type-checked
     * @param location e.g. "prop", "context", "child context"
     * @param componentName Name of the component for error messages
     * @param getStack Returns the component stack
     */
    function checkPropTypes(
        typeSpecs: any,
        values: any,
        location: string,
        componentName: string,
        getStack?: () => any,
    ): void;

    /**
     * Only available if NODE_ENV=production
     */
    function resetWarningCache(): void;
}
