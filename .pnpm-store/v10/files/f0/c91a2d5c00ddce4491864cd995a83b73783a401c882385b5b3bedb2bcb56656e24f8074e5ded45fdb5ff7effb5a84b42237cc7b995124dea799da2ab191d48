type HookMethod<Options, Result> = (
  options: Options
) => Result | Promise<Result>;

type BeforeHook<Options> = (options: Options) => void | Promise<void>;
type ErrorHook<Options, Error> = (
  error: Error,
  options: Options
) => unknown | Promise<unknown>;
type AfterHook<Options, Result> = (
  result: Result,
  options: Options
) => void | Promise<void>;
type WrapHook<Options, Result> = (
  hookMethod: HookMethod<Options, Result>,
  options: Options
) => Result | Promise<Result>;

type AnyHook<Options, Result, Error> =
  | BeforeHook<Options>
  | ErrorHook<Options, Error>
  | AfterHook<Options, Result>
  | WrapHook<Options, Result>;

type TypeStoreKeyLong = "Options" | "Result" | "Error";
type TypeStoreKeyShort = "O" | "R" | "E";
type TypeStore =
  | ({ [key in TypeStoreKeyLong]?: any } &
      { [key in TypeStoreKeyShort]?: never })
  | ({ [key in TypeStoreKeyLong]?: never } &
      { [key in TypeStoreKeyShort]?: any });
type GetType<
  Store extends TypeStore,
  LongKey extends TypeStoreKeyLong,
  ShortKey extends TypeStoreKeyShort
> = LongKey extends keyof Store
  ? Store[LongKey]
  : ShortKey extends keyof Store
  ? Store[ShortKey]
  : any;

export interface HookCollection<
  HooksType extends Record<string, TypeStore> = Record<
    string,
    { Options: any; Result: any; Error: any }
  >,
  HookName extends keyof HooksType = keyof HooksType
> {
  /**
   * Invoke before and after hooks
   */
  <Name extends HookName>(
    name: Name | Name[],
    hookMethod: HookMethod<
      GetType<HooksType[Name], "Options", "O">,
      GetType<HooksType[Name], "Result", "R">
    >,
    options?: GetType<HooksType[Name], "Options", "O">
  ): Promise<GetType<HooksType[Name], "Result", "R">>;
  /**
   * Add `before` hook for given `name`
   */
  before<Name extends HookName>(
    name: Name,
    beforeHook: BeforeHook<GetType<HooksType[Name], "Options", "O">>
  ): void;
  /**
   * Add `error` hook for given `name`
   */
  error<Name extends HookName>(
    name: Name,
    errorHook: ErrorHook<
      GetType<HooksType[Name], "Options", "O">,
      GetType<HooksType[Name], "Error", "E">
    >
  ): void;
  /**
   * Add `after` hook for given `name`
   */
  after<Name extends HookName>(
    name: Name,
    afterHook: AfterHook<
      GetType<HooksType[Name], "Options", "O">,
      GetType<HooksType[Name], "Result", "R">
    >
  ): void;
  /**
   * Add `wrap` hook for given `name`
   */
  wrap<Name extends HookName>(
    name: Name,
    wrapHook: WrapHook<
      GetType<HooksType[Name], "Options", "O">,
      GetType<HooksType[Name], "Result", "R">
    >
  ): void;
  /**
   * Remove added hook for given `name`
   */
  remove<Name extends HookName>(
    name: Name,
    hook: AnyHook<
      GetType<HooksType[Name], "Options", "O">,
      GetType<HooksType[Name], "Result", "R">,
      GetType<HooksType[Name], "Error", "E">
    >
  ): void;
  /**
   * Public API
   */
  api: Pick<
    HookCollection<HooksType>,
    "before" | "error" | "after" | "wrap" | "remove"
  >;
}

export interface HookSingular<Options, Result, Error> {
  /**
   * Invoke before and after hooks
   */
  (hookMethod: HookMethod<Options, Result>, options?: Options): Promise<Result>;
  /**
   * Add `before` hook
   */
  before(beforeHook: BeforeHook<Options>): void;
  /**
   * Add `error` hook
   */
  error(errorHook: ErrorHook<Options, Error>): void;
  /**
   * Add `after` hook
   */
  after(afterHook: AfterHook<Options, Result>): void;
  /**
   * Add `wrap` hook
   */
  wrap(wrapHook: WrapHook<Options, Result>): void;
  /**
   * Remove added hook
   */
  remove(hook: AnyHook<Options, Result, Error>): void;
  /**
   * Public API
   */
  api: Pick<
    HookSingular<Options, Result, Error>,
    "before" | "error" | "after" | "wrap" | "remove"
  >;
}

type Collection = new <
  HooksType extends Record<string, TypeStore> = Record<
    string,
    { Options: any; Result: any; Error: any }
  >
>() => HookCollection<HooksType>;
type Singular = new <
  Options = any,
  Result = any,
  Error = any
>() => HookSingular<Options, Result, Error>;

interface Hook {
  new <
    HooksType extends Record<string, TypeStore> = Record<
      string,
      { Options: any; Result: any; Error: any }
    >
  >(): HookCollection<HooksType>;

  /**
   * Creates a collection of hooks
   */
  Collection: Collection;

  /**
   * Creates a nameless hook that supports strict typings
   */
  Singular: Singular;
}

export const Hook: Hook;
export const Collection: Collection;
export const Singular: Singular;

export default Hook;
