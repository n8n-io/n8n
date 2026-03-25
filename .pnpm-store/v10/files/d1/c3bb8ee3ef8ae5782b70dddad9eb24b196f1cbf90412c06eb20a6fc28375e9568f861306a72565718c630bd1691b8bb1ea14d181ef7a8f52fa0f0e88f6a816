import { TestingLibraryMatchers } from '@testing-library/jest-dom/matchers';
import { AsymmetricMatchersContaining, JestAssertion, ExpectStatic, MatchersObject, MatcherState } from '@vitest/expect';
import * as _userEvent from '@testing-library/user-event';
import { userEvent as userEvent$1 } from '@testing-library/user-event';
import * as _testing_library_user_event_dist_cjs_setup_directApi_js from '@testing-library/user-event/dist/cjs/setup/directApi.js';
import * as _testing_library_user_event_dist_cjs_setup_setup_js from '@testing-library/user-event/dist/cjs/setup/setup.js';
import { MockInstance, spyOn as spyOn$1, Mock, MaybeMocked, MaybeMockedDeep, MaybePartiallyMocked, MaybePartiallyMockedDeep } from '@vitest/spy';
export * from '@vitest/spy';
export { isMockFunction, mocks } from '@vitest/spy';

type Promisify<Fn> = Fn extends {
    <T>(...args: infer Args): infer Return;
} ? {
    <T>(...args: Args): Return extends Promise<any> ? Return : Promise<Return>;
} : Fn extends {
    (...args: infer Args): infer Return;
} ? {
    (...args: Args): Return extends Promise<any> ? Return : Promise<Return>;
} : Fn;
type PromisifyObject<O> = {
    [K in keyof O]: Promisify<O[K]>;
};

type Matchers<T> = PromisifyObject<JestAssertion<T>> & TestingLibraryMatchers<ReturnType<ExpectStatic['stringContaining']>, Promise<void>>;
interface Assertion<T> extends Matchers<T> {
    toHaveBeenCalledOnce(): Promise<void>;
    toSatisfy<E>(matcher: (value: E) => boolean, message?: string): Promise<void>;
    resolves: Assertion<T>;
    rejects: Assertion<T>;
    not: Assertion<T>;
}
interface Expect extends AsymmetricMatchersContaining {
    <T>(actual: T, message?: string): Assertion<T>;
    unreachable(message?: string): Promise<never>;
    soft<T>(actual: T, message?: string): Assertion<T>;
    extend(expects: MatchersObject): void;
    assertions(expected: number): Promise<void>;
    hasAssertions(): Promise<void>;
    anything(): any;
    any(constructor: unknown): any;
    getState(): MatcherState;
    setState(state: Partial<MatcherState>): void;
    not: AsymmetricMatchersContaining;
}

// Disable automatic exports.


type ARIAWidgetRole =
    | "button"
    | "checkbox"
    | "gridcell"
    | "link"
    | "menuitem"
    | "menuitemcheckbox"
    | "menuitemradio"
    | "option"
    | "progressbar"
    | "radio"
    | "scrollbar"
    | "searchbox"
    | "slider"
    | "spinbutton"
    | "switch"
    | "tab"
    | "tabpanel"
    | "textbox"
    | "treeitem";

type ARIACompositeWidgetRole =
    | "combobox"
    | "grid"
    | "listbox"
    | "menu"
    | "menubar"
    | "radiogroup"
    | "tablist"
    | "tree"
    | "treegrid";

type ARIADocumentStructureRole =
    | "application"
    | "article"
    | "blockquote"
    | "caption"
    | "cell"
    | "columnheader"
    | "definition"
    | "deletion"
    | "directory"
    | "document"
    | "emphasis"
    | "feed"
    | "figure"
    | "generic"
    | "group"
    | "heading"
    | "img"
    | "insertion"
    | "list"
    | "listitem"
    | "math"
    | "meter"
    | "none"
    | "note"
    | "paragraph"
    | "presentation"
    | "row"
    | "rowgroup"
    | "rowheader"
    | "separator"
    | "strong"
    | "subscript"
    | "superscript"
    | "table"
    | "term"
    | "time"
    | "toolbar"
    | "tooltip";

type ARIALandmarkRole =
    | "banner"
    | "complementary"
    | "contentinfo"
    | "form"
    | "main"
    | "navigation"
    | "region"
    | "search";

type ARIALiveRegionRole = "alert" | "log" | "marquee" | "status" | "timer";

type ARIAWindowRole = "alertdialog" | "dialog";

type ARIAUncategorizedRole = "code";

type ARIARole =
    | ARIAWidgetRole
    | ARIACompositeWidgetRole
    | ARIADocumentStructureRole
    | ARIALandmarkRole
    | ARIALiveRegionRole
    | ARIAWindowRole
    | ARIAUncategorizedRole;

type MatcherFunction = (
  content: string,
  element: Element | null,
) => boolean
type Matcher = MatcherFunction | RegExp | number | string

// Get autocomplete for ARIARole union types, while still supporting another string
// Ref: https://github.com/microsoft/TypeScript/issues/29729#issuecomment-567871939
type ByRoleMatcher = ARIARole | (string & {})

type NormalizerFn = (text: string) => string

interface MatcherOptions {
  exact?: boolean
  /** Use normalizer with getDefaultNormalizer instead */
  trim?: boolean
  /** Use normalizer with getDefaultNormalizer instead */
  collapseWhitespace?: boolean
  normalizer?: NormalizerFn
  /** suppress suggestions for a specific query */
  suggest?: boolean
}

interface DefaultNormalizerOptions {
  trim?: boolean
  collapseWhitespace?: boolean
}

declare function getDefaultNormalizer$1(
  options?: DefaultNormalizerOptions,
): NormalizerFn

interface waitForOptions {
  container?: HTMLElement
  timeout?: number
  interval?: number
  onTimeout?: (error: Error) => Error
  mutationObserverOptions?: MutationObserverInit
}

declare function waitFor$1<T>(
  callback: () => Promise<T> | T,
  options?: waitForOptions,
): Promise<T>

type WithSuggest = {suggest?: boolean}

type GetErrorFunction<Arguments extends any[] = [string]> = (
  c: Element | null,
  ...args: Arguments
) => string

interface SelectorMatcherOptions extends MatcherOptions {
  selector?: string
  ignore?: boolean | string
}

type QueryByAttribute = (
  attribute: string,
  container: HTMLElement,
  id: Matcher,
  options?: MatcherOptions,
) => HTMLElement | null

type AllByAttribute = (
  attribute: string,
  container: HTMLElement,
  id: Matcher,
  options?: MatcherOptions,
) => HTMLElement[]

declare const queryByAttribute$1: QueryByAttribute
declare const queryAllByAttribute$1: AllByAttribute
declare function getElementError$1(
  message: string | null,
  container: HTMLElement,
): Error

/**
 * query methods have a common call signature. Only the return type differs.
 */
type QueryMethod<Arguments extends any[], Return> = (
  container: HTMLElement,
  ...args: Arguments
) => Return
type QueryBy<Arguments extends any[]> = QueryMethod<
  Arguments,
  HTMLElement | null
>
type GetAllBy<Arguments extends any[]> = QueryMethod<
  Arguments,
  HTMLElement[]
>
type FindAllBy<Arguments extends any[]> = QueryMethod<
  [Arguments[0], Arguments[1]?, waitForOptions?],
  Promise<HTMLElement[]>
>
type GetBy<Arguments extends any[]> = QueryMethod<Arguments, HTMLElement>
type FindBy<Arguments extends any[]> = QueryMethod<
  [Arguments[0], Arguments[1]?, waitForOptions?],
  Promise<HTMLElement>
>

type BuiltQueryMethods<Arguments extends any[]> = [
  QueryBy<Arguments>,
  GetAllBy<Arguments>,
  GetBy<Arguments>,
  FindAllBy<Arguments>,
  FindBy<Arguments>,
]

declare function buildQueries$1<Arguments extends any[]>(
  queryAllBy: GetAllBy<Arguments>,
  getMultipleError: GetErrorFunction<Arguments>,
  getMissingError: GetErrorFunction<Arguments>,
): BuiltQueryMethods<Arguments>

type queryHelpers_d_AllByAttribute = AllByAttribute;
type queryHelpers_d_BuiltQueryMethods<Arguments extends any[]> = BuiltQueryMethods<Arguments>;
type queryHelpers_d_FindAllBy<Arguments extends any[]> = FindAllBy<Arguments>;
type queryHelpers_d_FindBy<Arguments extends any[]> = FindBy<Arguments>;
type queryHelpers_d_GetAllBy<Arguments extends any[]> = GetAllBy<Arguments>;
type queryHelpers_d_GetBy<Arguments extends any[]> = GetBy<Arguments>;
type queryHelpers_d_GetErrorFunction<Arguments extends any[] = [string]> = GetErrorFunction<Arguments>;
type queryHelpers_d_QueryBy<Arguments extends any[]> = QueryBy<Arguments>;
type queryHelpers_d_QueryByAttribute = QueryByAttribute;
type queryHelpers_d_QueryMethod<Arguments extends any[], Return> = QueryMethod<Arguments, Return>;
type queryHelpers_d_SelectorMatcherOptions = SelectorMatcherOptions;
type queryHelpers_d_WithSuggest = WithSuggest;
declare namespace queryHelpers_d {
  export { type queryHelpers_d_AllByAttribute as AllByAttribute, type queryHelpers_d_BuiltQueryMethods as BuiltQueryMethods, type queryHelpers_d_FindAllBy as FindAllBy, type queryHelpers_d_FindBy as FindBy, type queryHelpers_d_GetAllBy as GetAllBy, type queryHelpers_d_GetBy as GetBy, type queryHelpers_d_GetErrorFunction as GetErrorFunction, type queryHelpers_d_QueryBy as QueryBy, type queryHelpers_d_QueryByAttribute as QueryByAttribute, type queryHelpers_d_QueryMethod as QueryMethod, type queryHelpers_d_SelectorMatcherOptions as SelectorMatcherOptions, type queryHelpers_d_WithSuggest as WithSuggest, buildQueries$1 as buildQueries, getElementError$1 as getElementError, queryAllByAttribute$1 as queryAllByAttribute, queryByAttribute$1 as queryByAttribute };
}

type QueryByBoundAttribute<T extends HTMLElement = HTMLElement> = (
  container: HTMLElement,
  id: Matcher,
  options?: MatcherOptions,
) => T | null

type AllByBoundAttribute<T extends HTMLElement = HTMLElement> = (
  container: HTMLElement,
  id: Matcher,
  options?: MatcherOptions,
) => T[]

type FindAllByBoundAttribute<T extends HTMLElement = HTMLElement> = (
  container: HTMLElement,
  id: Matcher,
  options?: MatcherOptions,
  waitForElementOptions?: waitForOptions,
) => Promise<T[]>

type GetByBoundAttribute<T extends HTMLElement = HTMLElement> = (
  container: HTMLElement,
  id: Matcher,
  options?: MatcherOptions,
) => T

type FindByBoundAttribute<T extends HTMLElement = HTMLElement> = (
  container: HTMLElement,
  id: Matcher,
  options?: MatcherOptions,
  waitForElementOptions?: waitForOptions,
) => Promise<T>

type QueryByText<T extends HTMLElement = HTMLElement> = (
  container: HTMLElement,
  id: Matcher,
  options?: SelectorMatcherOptions,
) => T | null

type AllByText<T extends HTMLElement = HTMLElement> = (
  container: HTMLElement,
  id: Matcher,
  options?: SelectorMatcherOptions,
) => T[]

type FindAllByText<T extends HTMLElement = HTMLElement> = (
  container: HTMLElement,
  id: Matcher,
  options?: SelectorMatcherOptions,
  waitForElementOptions?: waitForOptions,
) => Promise<T[]>

type GetByText<T extends HTMLElement = HTMLElement> = (
  container: HTMLElement,
  id: Matcher,
  options?: SelectorMatcherOptions,
) => T

type FindByText<T extends HTMLElement = HTMLElement> = (
  container: HTMLElement,
  id: Matcher,
  options?: SelectorMatcherOptions,
  waitForElementOptions?: waitForOptions,
) => Promise<T>

interface ByRoleOptions {
  /** suppress suggestions for a specific query */
  suggest?: boolean
  /**
   * If true includes elements in the query set that are usually excluded from
   * the accessibility tree. `role="none"` or `role="presentation"` are included
   * in either case.
   */
  hidden?: boolean
  /**
   * If true only includes elements in the query set that are marked as
   * selected in the accessibility tree, i.e., `aria-selected="true"`
   */
  selected?: boolean
  /**
   * If true only includes elements in the query set that are marked as
   * busy in the accessibility tree, i.e., `aria-busy="true"`
   */
  busy?: boolean
  /**
   * If true only includes elements in the query set that are marked as
   * checked in the accessibility tree, i.e., `aria-checked="true"`
   */
  checked?: boolean
  /**
   * If true only includes elements in the query set that are marked as
   * pressed in the accessibility tree, i.e., `aria-pressed="true"`
   */
  pressed?: boolean
  /**
   * Filters elements by their `aria-current` state. `true` and `false` match `aria-current="true"` and `aria-current="false"` (as well as a missing `aria-current` attribute) respectively.
   */
  current?: boolean | string
  /**
   * If true only includes elements in the query set that are marked as
   * expanded in the accessibility tree, i.e., `aria-expanded="true"`
   */
  expanded?: boolean
  /**
   * Includes elements with the `"heading"` role matching the indicated level,
   * either by the semantic HTML heading elements `<h1>-<h6>` or matching
   * the `aria-level` attribute.
   */
  level?: number
  value?: {
    now?: number
    min?: number
    max?: number
    text?: Matcher
  }
  /**
   * Includes every role used in the `role` attribute
   * For example *ByRole('progressbar', {queryFallbacks: true})` will find <div role="meter progressbar">`.
   */
  queryFallbacks?: boolean
  /**
   * Only considers elements with the specified accessible name.
   */
  name?:
    | RegExp
    | string
    | ((accessibleName: string, element: Element) => boolean)
  /**
   * Only considers elements with the specified accessible description.
   */
  description?:
    | RegExp
    | string
    | ((accessibleDescription: string, element: Element) => boolean)
}

type AllByRole<T extends HTMLElement = HTMLElement> = (
  container: HTMLElement,
  role: ByRoleMatcher,
  options?: ByRoleOptions,
) => T[]

type GetByRole<T extends HTMLElement = HTMLElement> = (
  container: HTMLElement,
  role: ByRoleMatcher,
  options?: ByRoleOptions,
) => T

type QueryByRole<T extends HTMLElement = HTMLElement> = (
  container: HTMLElement,
  role: ByRoleMatcher,
  options?: ByRoleOptions,
) => T | null

type FindByRole<T extends HTMLElement = HTMLElement> = (
  container: HTMLElement,
  role: ByRoleMatcher,
  options?: ByRoleOptions,
  waitForElementOptions?: waitForOptions,
) => Promise<T>

type FindAllByRole<T extends HTMLElement = HTMLElement> = (
  container: HTMLElement,
  role: ByRoleMatcher,
  options?: ByRoleOptions,
  waitForElementOptions?: waitForOptions,
) => Promise<T[]>

declare function getByLabelText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<GetByText<T>>
): ReturnType<GetByText<T>>
declare function getAllByLabelText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<AllByText<T>>
): ReturnType<AllByText<T>>
declare function queryByLabelText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<QueryByText<T>>
): ReturnType<QueryByText<T>>
declare function queryAllByLabelText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<AllByText<T>>
): ReturnType<AllByText<T>>
declare function findByLabelText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<FindByText<T>>
): ReturnType<FindByText<T>>
declare function findAllByLabelText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<FindAllByText<T>>
): ReturnType<FindAllByText<T>>
declare function getByPlaceholderText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<GetByBoundAttribute<T>>
): ReturnType<GetByBoundAttribute<T>>
declare function getAllByPlaceholderText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>
declare function queryByPlaceholderText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<QueryByBoundAttribute<T>>
): ReturnType<QueryByBoundAttribute<T>>
declare function queryAllByPlaceholderText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>
declare function findByPlaceholderText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<FindByBoundAttribute<T>>
): ReturnType<FindByBoundAttribute<T>>
declare function findAllByPlaceholderText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<FindAllByBoundAttribute<T>>
): ReturnType<FindAllByBoundAttribute<T>>
declare function getByText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<GetByText<T>>
): ReturnType<GetByText<T>>
declare function getAllByText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<AllByText<T>>
): ReturnType<AllByText<T>>
declare function queryByText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<QueryByText<T>>
): ReturnType<QueryByText<T>>
declare function queryAllByText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<AllByText<T>>
): ReturnType<AllByText<T>>
declare function findByText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<FindByText<T>>
): ReturnType<FindByText<T>>
declare function findAllByText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<FindAllByText<T>>
): ReturnType<FindAllByText<T>>
declare function getByAltText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<GetByBoundAttribute<T>>
): ReturnType<GetByBoundAttribute<T>>
declare function getAllByAltText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>
declare function queryByAltText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<QueryByBoundAttribute<T>>
): ReturnType<QueryByBoundAttribute<T>>
declare function queryAllByAltText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>
declare function findByAltText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<FindByBoundAttribute<T>>
): ReturnType<FindByBoundAttribute<T>>
declare function findAllByAltText$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<FindAllByBoundAttribute<T>>
): ReturnType<FindAllByBoundAttribute<T>>
declare function getByTitle$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<GetByBoundAttribute<T>>
): ReturnType<GetByBoundAttribute<T>>
declare function getAllByTitle$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>
declare function queryByTitle$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<QueryByBoundAttribute<T>>
): ReturnType<QueryByBoundAttribute<T>>
declare function queryAllByTitle$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>
declare function findByTitle$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<FindByBoundAttribute<T>>
): ReturnType<FindByBoundAttribute<T>>
declare function findAllByTitle$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<FindAllByBoundAttribute<T>>
): ReturnType<FindAllByBoundAttribute<T>>
declare function getByDisplayValue$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<GetByBoundAttribute<T>>
): ReturnType<GetByBoundAttribute<T>>
declare function getAllByDisplayValue$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>
declare function queryByDisplayValue$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<QueryByBoundAttribute<T>>
): ReturnType<QueryByBoundAttribute<T>>
declare function queryAllByDisplayValue$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>
declare function findByDisplayValue$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<FindByBoundAttribute<T>>
): ReturnType<FindByBoundAttribute<T>>
declare function findAllByDisplayValue$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<FindAllByBoundAttribute<T>>
): ReturnType<FindAllByBoundAttribute<T>>
declare function getByRole$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<GetByRole<T>>
): ReturnType<GetByRole<T>>
declare function getAllByRole$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<AllByRole<T>>
): ReturnType<AllByRole<T>>
declare function queryByRole$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<QueryByRole<T>>
): ReturnType<QueryByRole<T>>
declare function queryAllByRole$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<AllByRole<T>>
): ReturnType<AllByRole<T>>
declare function findByRole$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<FindByRole<T>>
): ReturnType<FindByRole<T>>
declare function findAllByRole$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<FindAllByRole<T>>
): ReturnType<FindAllByRole<T>>
declare function getByTestId$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<GetByBoundAttribute<T>>
): ReturnType<GetByBoundAttribute<T>>
declare function getAllByTestId$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>
declare function queryByTestId$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<QueryByBoundAttribute<T>>
): ReturnType<QueryByBoundAttribute<T>>
declare function queryAllByTestId$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<AllByBoundAttribute<T>>
): ReturnType<AllByBoundAttribute<T>>
declare function findByTestId$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<FindByBoundAttribute<T>>
): ReturnType<FindByBoundAttribute<T>>
declare function findAllByTestId$1<T extends HTMLElement = HTMLElement>(
  ...args: Parameters<FindAllByBoundAttribute<T>>
): ReturnType<FindAllByBoundAttribute<T>>

type queries$1_AllByBoundAttribute<T extends HTMLElement = HTMLElement> = AllByBoundAttribute<T>;
type queries$1_AllByRole<T extends HTMLElement = HTMLElement> = AllByRole<T>;
type queries$1_AllByText<T extends HTMLElement = HTMLElement> = AllByText<T>;
type queries$1_ByRoleOptions = ByRoleOptions;
type queries$1_FindAllByBoundAttribute<T extends HTMLElement = HTMLElement> = FindAllByBoundAttribute<T>;
type queries$1_FindAllByRole<T extends HTMLElement = HTMLElement> = FindAllByRole<T>;
type queries$1_FindAllByText<T extends HTMLElement = HTMLElement> = FindAllByText<T>;
type queries$1_FindByBoundAttribute<T extends HTMLElement = HTMLElement> = FindByBoundAttribute<T>;
type queries$1_FindByRole<T extends HTMLElement = HTMLElement> = FindByRole<T>;
type queries$1_FindByText<T extends HTMLElement = HTMLElement> = FindByText<T>;
type queries$1_GetByBoundAttribute<T extends HTMLElement = HTMLElement> = GetByBoundAttribute<T>;
type queries$1_GetByRole<T extends HTMLElement = HTMLElement> = GetByRole<T>;
type queries$1_GetByText<T extends HTMLElement = HTMLElement> = GetByText<T>;
type queries$1_QueryByBoundAttribute<T extends HTMLElement = HTMLElement> = QueryByBoundAttribute<T>;
type queries$1_QueryByRole<T extends HTMLElement = HTMLElement> = QueryByRole<T>;
type queries$1_QueryByText<T extends HTMLElement = HTMLElement> = QueryByText<T>;
declare namespace queries$1 {
  export { type queries$1_AllByBoundAttribute as AllByBoundAttribute, type queries$1_AllByRole as AllByRole, type queries$1_AllByText as AllByText, type queries$1_ByRoleOptions as ByRoleOptions, type queries$1_FindAllByBoundAttribute as FindAllByBoundAttribute, type queries$1_FindAllByRole as FindAllByRole, type queries$1_FindAllByText as FindAllByText, type queries$1_FindByBoundAttribute as FindByBoundAttribute, type queries$1_FindByRole as FindByRole, type queries$1_FindByText as FindByText, type queries$1_GetByBoundAttribute as GetByBoundAttribute, type queries$1_GetByRole as GetByRole, type queries$1_GetByText as GetByText, type queries$1_QueryByBoundAttribute as QueryByBoundAttribute, type queries$1_QueryByRole as QueryByRole, type queries$1_QueryByText as QueryByText, findAllByAltText$1 as findAllByAltText, findAllByDisplayValue$1 as findAllByDisplayValue, findAllByLabelText$1 as findAllByLabelText, findAllByPlaceholderText$1 as findAllByPlaceholderText, findAllByRole$1 as findAllByRole, findAllByTestId$1 as findAllByTestId, findAllByText$1 as findAllByText, findAllByTitle$1 as findAllByTitle, findByAltText$1 as findByAltText, findByDisplayValue$1 as findByDisplayValue, findByLabelText$1 as findByLabelText, findByPlaceholderText$1 as findByPlaceholderText, findByRole$1 as findByRole, findByTestId$1 as findByTestId, findByText$1 as findByText, findByTitle$1 as findByTitle, getAllByAltText$1 as getAllByAltText, getAllByDisplayValue$1 as getAllByDisplayValue, getAllByLabelText$1 as getAllByLabelText, getAllByPlaceholderText$1 as getAllByPlaceholderText, getAllByRole$1 as getAllByRole, getAllByTestId$1 as getAllByTestId, getAllByText$1 as getAllByText, getAllByTitle$1 as getAllByTitle, getByAltText$1 as getByAltText, getByDisplayValue$1 as getByDisplayValue, getByLabelText$1 as getByLabelText, getByPlaceholderText$1 as getByPlaceholderText, getByRole$1 as getByRole, getByTestId$1 as getByTestId, getByText$1 as getByText, getByTitle$1 as getByTitle, queryAllByAltText$1 as queryAllByAltText, queryAllByDisplayValue$1 as queryAllByDisplayValue, queryAllByLabelText$1 as queryAllByLabelText, queryAllByPlaceholderText$1 as queryAllByPlaceholderText, queryAllByRole$1 as queryAllByRole, queryAllByTestId$1 as queryAllByTestId, queryAllByText$1 as queryAllByText, queryAllByTitle$1 as queryAllByTitle, queryByAltText$1 as queryByAltText, queryByDisplayValue$1 as queryByDisplayValue, queryByLabelText$1 as queryByLabelText, queryByPlaceholderText$1 as queryByPlaceholderText, queryByRole$1 as queryByRole, queryByTestId$1 as queryByTestId, queryByText$1 as queryByText, queryByTitle$1 as queryByTitle };
}

type BoundFunction<T> = T extends (
  container: HTMLElement,
  ...args: infer P
) => infer R
  ? (...args: P) => R
  : never

type BoundFunctions<Q> = Q extends typeof queries$1
  ? {
      getByLabelText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<GetByText<T>>>
      ): ReturnType<GetByText<T>>
      getAllByLabelText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<AllByText<T>>>
      ): ReturnType<AllByText<T>>
      queryByLabelText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<QueryByText<T>>>
      ): ReturnType<QueryByText<T>>
      queryAllByLabelText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<AllByText<T>>>
      ): ReturnType<AllByText<T>>
      findByLabelText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<FindByText<T>>>
      ): ReturnType<FindByText<T>>
      findAllByLabelText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<FindAllByText<T>>>
      ): ReturnType<FindAllByText<T>>
      getByPlaceholderText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<GetByBoundAttribute<T>>>
      ): ReturnType<GetByBoundAttribute<T>>
      getAllByPlaceholderText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<AllByBoundAttribute<T>>>
      ): ReturnType<AllByBoundAttribute<T>>
      queryByPlaceholderText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<QueryByBoundAttribute<T>>>
      ): ReturnType<QueryByBoundAttribute<T>>
      queryAllByPlaceholderText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<AllByBoundAttribute<T>>>
      ): ReturnType<AllByBoundAttribute<T>>
      findByPlaceholderText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<FindByBoundAttribute<T>>>
      ): ReturnType<FindByBoundAttribute<T>>
      findAllByPlaceholderText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<FindAllByBoundAttribute<T>>>
      ): ReturnType<FindAllByBoundAttribute<T>>
      getByText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<GetByText<T>>>
      ): ReturnType<GetByText<T>>
      getAllByText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<AllByText<T>>>
      ): ReturnType<AllByText<T>>
      queryByText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<QueryByText<T>>>
      ): ReturnType<QueryByText<T>>
      queryAllByText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<AllByText<T>>>
      ): ReturnType<AllByText<T>>
      findByText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<FindByText<T>>>
      ): ReturnType<FindByText<T>>
      findAllByText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<FindAllByText<T>>>
      ): ReturnType<FindAllByText<T>>
      getByAltText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<GetByBoundAttribute<T>>>
      ): ReturnType<GetByBoundAttribute<T>>
      getAllByAltText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<AllByBoundAttribute<T>>>
      ): ReturnType<AllByBoundAttribute<T>>
      queryByAltText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<QueryByBoundAttribute<T>>>
      ): ReturnType<QueryByBoundAttribute<T>>
      queryAllByAltText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<AllByBoundAttribute<T>>>
      ): ReturnType<AllByBoundAttribute<T>>
      findByAltText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<FindByBoundAttribute<T>>>
      ): ReturnType<FindByBoundAttribute<T>>
      findAllByAltText<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<FindAllByBoundAttribute<T>>>
      ): ReturnType<FindAllByBoundAttribute<T>>
      getByTitle<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<GetByBoundAttribute<T>>>
      ): ReturnType<GetByBoundAttribute<T>>
      getAllByTitle<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<AllByBoundAttribute<T>>>
      ): ReturnType<AllByBoundAttribute<T>>
      queryByTitle<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<QueryByBoundAttribute<T>>>
      ): ReturnType<QueryByBoundAttribute<T>>
      queryAllByTitle<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<AllByBoundAttribute<T>>>
      ): ReturnType<AllByBoundAttribute<T>>
      findByTitle<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<FindByBoundAttribute<T>>>
      ): ReturnType<FindByBoundAttribute<T>>
      findAllByTitle<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<FindAllByBoundAttribute<T>>>
      ): ReturnType<FindAllByBoundAttribute<T>>
      getByDisplayValue<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<GetByBoundAttribute<T>>>
      ): ReturnType<GetByBoundAttribute<T>>
      getAllByDisplayValue<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<AllByBoundAttribute<T>>>
      ): ReturnType<AllByBoundAttribute<T>>
      queryByDisplayValue<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<QueryByBoundAttribute<T>>>
      ): ReturnType<QueryByBoundAttribute<T>>
      queryAllByDisplayValue<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<AllByBoundAttribute<T>>>
      ): ReturnType<AllByBoundAttribute<T>>
      findByDisplayValue<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<FindByBoundAttribute<T>>>
      ): ReturnType<FindByBoundAttribute<T>>
      findAllByDisplayValue<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<FindAllByBoundAttribute<T>>>
      ): ReturnType<FindAllByBoundAttribute<T>>
      getByRole<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<GetByRole<T>>>
      ): ReturnType<GetByRole<T>>
      getAllByRole<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<AllByRole<T>>>
      ): ReturnType<AllByRole<T>>
      queryByRole<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<QueryByRole<T>>>
      ): ReturnType<QueryByRole<T>>
      queryAllByRole<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<AllByRole<T>>>
      ): ReturnType<AllByRole<T>>
      findByRole<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<FindByRole<T>>>
      ): ReturnType<FindByRole<T>>
      findAllByRole<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<FindAllByRole<T>>>
      ): ReturnType<FindAllByRole<T>>
      getByTestId<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<GetByBoundAttribute<T>>>
      ): ReturnType<GetByBoundAttribute<T>>
      getAllByTestId<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<AllByBoundAttribute<T>>>
      ): ReturnType<AllByBoundAttribute<T>>
      queryByTestId<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<QueryByBoundAttribute<T>>>
      ): ReturnType<QueryByBoundAttribute<T>>
      queryAllByTestId<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<AllByBoundAttribute<T>>>
      ): ReturnType<AllByBoundAttribute<T>>
      findByTestId<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<FindByBoundAttribute<T>>>
      ): ReturnType<FindByBoundAttribute<T>>
      findAllByTestId<T extends HTMLElement = HTMLElement>(
        ...args: Parameters<BoundFunction<FindAllByBoundAttribute<T>>>
      ): ReturnType<FindAllByBoundAttribute<T>>
    } & {
      [P in keyof Q]: BoundFunction<Q[P]>
    }
  : {
      [P in keyof Q]: BoundFunction<Q[P]>
    }

type Query = (
  container: HTMLElement,
  ...args: any[]
) =>
  | Error
  | HTMLElement
  | HTMLElement[]
  | Promise<HTMLElement[]>
  | Promise<HTMLElement>
  | null

interface Queries$1 {
  [T: string]: Query
}

declare function getQueriesForElement$1<
  QueriesToBind extends Queries$1 = typeof queries$1,
  // Extra type parameter required for reassignment.
  T extends QueriesToBind = QueriesToBind,
>(element: HTMLElement, queriesToBind?: T): BoundFunctions<T>

/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
declare type Colors = {
    comment: {
        close: string;
        open: string;
    };
    content: {
        close: string;
        open: string;
    };
    prop: {
        close: string;
        open: string;
    };
    tag: {
        close: string;
        open: string;
    };
    value: {
        close: string;
        open: string;
    };
};
declare type Indent = (arg0: string) => string;
declare type Refs = Array<unknown>;
declare type Print = (arg0: unknown) => string;
declare type Theme = {
    comment: string;
    content: string;
    prop: string;
    tag: string;
    value: string;
};
declare type ThemeReceived = {
    comment?: string;
    content?: string;
    prop?: string;
    tag?: string;
    value?: string;
};
declare type CompareKeys = ((a: string, b: string) => number) | undefined;
declare type Options = {
    callToJSON: boolean;
    compareKeys: CompareKeys;
    escapeRegex: boolean;
    escapeString: boolean;
    highlight: boolean;
    indent: number;
    maxDepth: number;
    min: boolean;
    plugins: Plugins;
    printBasicPrototype: boolean;
    printFunctionName: boolean;
    theme: Theme;
};
interface PrettyFormatOptions {
    callToJSON?: boolean;
    compareKeys?: CompareKeys;
    escapeRegex?: boolean;
    escapeString?: boolean;
    highlight?: boolean;
    indent?: number;
    maxDepth?: number;
    min?: boolean;
    plugins?: Plugins;
    printBasicPrototype?: boolean;
    printFunctionName?: boolean;
    theme?: ThemeReceived;
}
declare type OptionsReceived = PrettyFormatOptions;
declare type Config$1 = {
    callToJSON: boolean;
    compareKeys: CompareKeys;
    colors: Colors;
    escapeRegex: boolean;
    escapeString: boolean;
    indent: string;
    maxDepth: number;
    min: boolean;
    plugins: Plugins;
    printBasicPrototype: boolean;
    printFunctionName: boolean;
    spacingInner: string;
    spacingOuter: string;
};
declare type Printer = (val: unknown, config: Config$1, indentation: string, depth: number, refs: Refs, hasCalledToJSON?: boolean) => string;
declare type Test = (arg0: any) => boolean;
declare type NewPlugin = {
    serialize: (val: any, config: Config$1, indentation: string, depth: number, refs: Refs, printer: Printer) => string;
    test: Test;
};
declare type PluginOptions = {
    edgeSpacing: string;
    min: boolean;
    spacing: string;
};
declare type OldPlugin = {
    print: (val: unknown, print: Print, indent: Indent, options: PluginOptions, colors: Colors) => string;
    test: Test;
};
declare type Plugin = NewPlugin | OldPlugin;
declare type Plugins = Array<Plugin>;

/**
 * Copyright (c) Facebook, Inc. and its affiliates. All Rights Reserved.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

declare const DEFAULT_OPTIONS: Options;
/**
 * Returns a presentation string of your `val` object
 * @param val any potential JavaScript object
 * @param options Custom settings
 */
declare function format(val: unknown, options?: OptionsReceived): string;
declare const plugins: {
    AsymmetricMatcher: NewPlugin;
    ConvertAnsi: NewPlugin;
    DOMCollection: NewPlugin;
    DOMElement: NewPlugin;
    Immutable: NewPlugin;
    ReactElement: NewPlugin;
    ReactTestComponent: NewPlugin;
};

type index_d_Colors = Colors;
type index_d_CompareKeys = CompareKeys;
declare const index_d_DEFAULT_OPTIONS: typeof DEFAULT_OPTIONS;
type index_d_NewPlugin = NewPlugin;
type index_d_OldPlugin = OldPlugin;
type index_d_Options = Options;
type index_d_OptionsReceived = OptionsReceived;
type index_d_Plugin = Plugin;
type index_d_Plugins = Plugins;
type index_d_PrettyFormatOptions = PrettyFormatOptions;
type index_d_Printer = Printer;
type index_d_Refs = Refs;
type index_d_Theme = Theme;
declare const index_d_format: typeof format;
declare const index_d_plugins: typeof plugins;
declare namespace index_d {
  export { type index_d_Colors as Colors, type index_d_CompareKeys as CompareKeys, type Config$1 as Config, index_d_DEFAULT_OPTIONS as DEFAULT_OPTIONS, type index_d_NewPlugin as NewPlugin, type index_d_OldPlugin as OldPlugin, type index_d_Options as Options, type index_d_OptionsReceived as OptionsReceived, type index_d_Plugin as Plugin, type index_d_Plugins as Plugins, type index_d_PrettyFormatOptions as PrettyFormatOptions, type index_d_Printer as Printer, type index_d_Refs as Refs, type index_d_Theme as Theme, format as default, index_d_format as format, index_d_plugins as plugins };
}

type Screen<Q extends Queries$1 = typeof queries$1> = BoundFunctions<Q> & {
  /**
   * Convenience function for `pretty-dom` which also allows an array
   * of elements
   */
  debug: (
    element?: Array<Element | HTMLDocument> | Element | HTMLDocument,
    maxLength?: number,
    options?: OptionsReceived,
  ) => void
  /**
   * Convenience function for `Testing Playground` which logs and returns the URL that
   * can be opened in a browser
   */
  logTestingPlaygroundURL: (element?: Element | HTMLDocument) => string
}

declare function waitForElementToBeRemoved$1<T>(
  callback: T | (() => T),
  options?: waitForOptions,
): Promise<void>

declare function getNodeText$1(node: HTMLElement): string

type EventType =
  | 'copy'
  | 'cut'
  | 'paste'
  | 'compositionEnd'
  | 'compositionStart'
  | 'compositionUpdate'
  | 'keyDown'
  | 'keyPress'
  | 'keyUp'
  | 'focus'
  | 'blur'
  | 'focusIn'
  | 'focusOut'
  | 'change'
  | 'input'
  | 'invalid'
  | 'submit'
  | 'reset'
  | 'click'
  | 'contextMenu'
  | 'dblClick'
  | 'drag'
  | 'dragEnd'
  | 'dragEnter'
  | 'dragExit'
  | 'dragLeave'
  | 'dragOver'
  | 'dragStart'
  | 'drop'
  | 'mouseDown'
  | 'mouseEnter'
  | 'mouseLeave'
  | 'mouseMove'
  | 'mouseOut'
  | 'mouseOver'
  | 'mouseUp'
  | 'popState'
  | 'select'
  | 'touchCancel'
  | 'touchEnd'
  | 'touchMove'
  | 'touchStart'
  | 'resize'
  | 'scroll'
  | 'wheel'
  | 'abort'
  | 'canPlay'
  | 'canPlayThrough'
  | 'durationChange'
  | 'emptied'
  | 'encrypted'
  | 'ended'
  | 'loadedData'
  | 'loadedMetadata'
  | 'loadStart'
  | 'pause'
  | 'play'
  | 'playing'
  | 'progress'
  | 'rateChange'
  | 'seeked'
  | 'seeking'
  | 'stalled'
  | 'suspend'
  | 'timeUpdate'
  | 'volumeChange'
  | 'waiting'
  | 'load'
  | 'error'
  | 'animationStart'
  | 'animationEnd'
  | 'animationIteration'
  | 'transitionCancel'
  | 'transitionEnd'
  | 'transitionRun'
  | 'transitionStart'
  | 'doubleClick'
  | 'pointerOver'
  | 'pointerEnter'
  | 'pointerDown'
  | 'pointerMove'
  | 'pointerUp'
  | 'pointerCancel'
  | 'pointerOut'
  | 'pointerLeave'
  | 'gotPointerCapture'
  | 'lostPointerCapture'
  | 'offline'
  | 'online'
  | 'pageHide'
  | 'pageShow'
type FireObject = {
  [K in EventType]: (
    element: Document | Element | Window | Node,
    options?: {},
  ) => boolean
}
type CreateFunction = (
  eventName: string,
  node: Document | Element | Window | Node,
  init?: {},
  options?: {EventType?: string; defaultInit?: {}},
) => Event
type CreateObject = {
  [K in EventType]: (
    element: Document | Element | Window | Node,
    options?: {},
  ) => Event
}

interface PrettyDOMOptions extends OptionsReceived {
  /**
   * Given a `Node` return `false` if you wish to ignore that node in the output.
   * By default, ignores `<style />`, `<script />` and comment nodes.
   */
  filterNode?: (node: Node) => boolean
}

declare function prettyDOM$1(
  dom?: Element | HTMLDocument,
  maxLength?: number,
  options?: PrettyDOMOptions,
): string | false
declare function logDOM$1(
  dom?: Element | HTMLDocument,
  maxLength?: number,
  options?: PrettyDOMOptions,
): void

declare function logRoles$1(
  container: HTMLElement,
  options?: LogRolesOptions,
): string

interface LogRolesOptions {
  hidden?: boolean
}

declare function getRoles$1(container: HTMLElement): {
  [index: string]: HTMLElement[]
}

/**
 * https://testing-library.com/docs/dom-testing-library/api-helpers#isinaccessible
 */
declare function isInaccessible$1(element: Element): boolean

interface Config {
  testIdAttribute: string
  /**
   * WARNING: `unstable` prefix means this API may change in patch and minor releases.
   * @param cb
   */
  unstable_advanceTimersWrapper(cb: (...args: unknown[]) => unknown): unknown
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  asyncWrapper(cb: (...args: any[]) => any): Promise<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventWrapper(cb: (...args: any[]) => any): void
  asyncUtilTimeout: number
  computedStyleSupportsPseudoElements: boolean
  defaultHidden: boolean
  /** default value for the `ignore` option in `ByText` queries */
  defaultIgnore: string
  showOriginalStackTrace: boolean
  throwSuggestions: boolean
  getElementError: (message: string | null, container: Element) => Error
}

interface ConfigFn {
  (existingConfig: Config): Partial<Config>
}

declare function configure$1(configDelta: ConfigFn | Partial<Config>): void
declare function getConfig$1(): Config

interface QueryOptions {
  [key: string]: RegExp | boolean
}

type QueryArgs = [string, QueryOptions?]

interface Suggestion {
  queryName: string
  queryMethod: string
  queryArgs: QueryArgs
  variant: string
  warning?: string
  toString(): string
}

type Variant =
  | 'find'
  | 'findAll'
  | 'get'
  | 'getAll'
  | 'query'
  | 'queryAll'

type Method =
  | 'AltText'
  | 'alttext'
  | 'DisplayValue'
  | 'displayvalue'
  | 'LabelText'
  | 'labeltext'
  | 'PlaceholderText'
  | 'placeholdertext'
  | 'Role'
  | 'role'
  | 'TestId'
  | 'testid'
  | 'Text'
  | 'text'
  | 'Title'
  | 'title'

declare function getSuggestedQuery$1(
  element: HTMLElement,
  variant?: Variant,
  method?: Method,
): Suggestion | undefined

declare const buildQueries: typeof buildQueries$1;
declare const configure: typeof configure$1;
declare const createEvent: CreateObject & CreateFunction;
declare const fireEvent: (<T>(element: Element | Node | Document | Window, event: Event) => Promise<false> | Promise<true>) & PromisifyObject<FireObject>;
declare const findAllByAltText: typeof findAllByAltText$1;
declare const findAllByDisplayValue: typeof findAllByDisplayValue$1;
declare const findAllByLabelText: typeof findAllByLabelText$1;
declare const findAllByPlaceholderText: typeof findAllByPlaceholderText$1;
declare const findAllByRole: typeof findAllByRole$1;
declare const findAllByTestId: typeof findAllByTestId$1;
declare const findAllByText: typeof findAllByText$1;
declare const findAllByTitle: typeof findAllByTitle$1;
declare const findByAltText: typeof findByAltText$1;
declare const findByDisplayValue: typeof findByDisplayValue$1;
declare const findByLabelText: typeof findByLabelText$1;
declare const findByPlaceholderText: typeof findByPlaceholderText$1;
declare const findByRole: typeof findByRole$1;
declare const findByTestId: typeof findByTestId$1;
declare const findByText: typeof findByText$1;
declare const findByTitle: typeof findByTitle$1;
declare const getAllByAltText: typeof getAllByAltText$1;
declare const getAllByDisplayValue: typeof getAllByDisplayValue$1;
declare const getAllByLabelText: typeof getAllByLabelText$1;
declare const getAllByPlaceholderText: typeof getAllByPlaceholderText$1;
declare const getAllByRole: typeof getAllByRole$1;
declare const getAllByTestId: typeof getAllByTestId$1;
declare const getAllByText: typeof getAllByText$1;
declare const getAllByTitle: typeof getAllByTitle$1;
declare const getByAltText: typeof getByAltText$1;
declare const getByDisplayValue: typeof getByDisplayValue$1;
declare const getByLabelText: typeof getByLabelText$1;
declare const getByPlaceholderText: typeof getByPlaceholderText$1;
declare const getByRole: typeof getByRole$1;
declare const getByTestId: typeof getByTestId$1;
declare const getByText: typeof getByText$1;
declare const getByTitle: typeof getByTitle$1;
declare const getConfig: typeof getConfig$1;
declare const getDefaultNormalizer: typeof getDefaultNormalizer$1;
declare const getElementError: typeof getElementError$1;
declare const getNodeText: typeof getNodeText$1;
declare const getQueriesForElement: typeof getQueriesForElement$1;
declare const getRoles: typeof getRoles$1;
declare const getSuggestedQuery: typeof getSuggestedQuery$1;
declare const isInaccessible: typeof isInaccessible$1;
declare const logDOM: typeof logDOM$1;
declare const logRoles: typeof logRoles$1;
declare const prettyDOM: typeof prettyDOM$1;
declare const queries: typeof queries$1;
declare const queryAllByAltText: typeof queryAllByAltText$1;
declare const queryAllByAttribute: AllByAttribute;
declare const queryAllByDisplayValue: typeof queryAllByDisplayValue$1;
declare const queryAllByLabelText: typeof queryAllByLabelText$1;
declare const queryAllByPlaceholderText: typeof queryAllByPlaceholderText$1;
declare const queryAllByRole: typeof queryAllByRole$1;
declare const queryAllByTestId: typeof queryAllByTestId$1;
declare const queryAllByText: typeof queryAllByText$1;
declare const queryAllByTitle: typeof queryAllByTitle$1;
declare const queryByAltText: typeof queryByAltText$1;
declare const queryByAttribute: QueryByAttribute;
declare const queryByDisplayValue: typeof queryByDisplayValue$1;
declare const queryByLabelText: typeof queryByLabelText$1;
declare const queryByPlaceholderText: typeof queryByPlaceholderText$1;
declare const queryByRole: typeof queryByRole$1;
declare const queryByTestId: typeof queryByTestId$1;
declare const queryByText: typeof queryByText$1;
declare const queryByTitle: typeof queryByTitle$1;
declare const queryHelpers: typeof queryHelpers_d;
declare const screen: Screen<typeof queries$1>;
declare const waitFor: typeof waitFor$1;
declare const waitForElementToBeRemoved: typeof waitForElementToBeRemoved$1;
declare const within: typeof getQueriesForElement$1;
declare const prettyFormat: typeof index_d;
type _UserEvent = typeof _userEvent;
interface UserEvent extends _UserEvent {
}
declare const uninstrumentedUserEvent: {
    readonly setup: typeof _testing_library_user_event_dist_cjs_setup_setup_js.setupMain;
    readonly clear: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.clear;
    readonly click: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.click;
    readonly copy: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.copy;
    readonly cut: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.cut;
    readonly dblClick: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.dblClick;
    readonly deselectOptions: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.deselectOptions;
    readonly hover: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.hover;
    readonly keyboard: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.keyboard;
    readonly pointer: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.pointer;
    readonly paste: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.paste;
    readonly selectOptions: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.selectOptions;
    readonly tripleClick: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.tripleClick;
    readonly type: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.type;
    readonly unhover: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.unhover;
    readonly upload: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.upload;
    readonly tab: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.tab;
};
declare const userEvent: {
    readonly setup: typeof _testing_library_user_event_dist_cjs_setup_setup_js.setupMain;
    readonly clear: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.clear;
    readonly click: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.click;
    readonly copy: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.copy;
    readonly cut: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.cut;
    readonly dblClick: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.dblClick;
    readonly deselectOptions: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.deselectOptions;
    readonly hover: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.hover;
    readonly keyboard: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.keyboard;
    readonly pointer: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.pointer;
    readonly paste: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.paste;
    readonly selectOptions: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.selectOptions;
    readonly tripleClick: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.tripleClick;
    readonly type: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.type;
    readonly unhover: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.unhover;
    readonly upload: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.upload;
    readonly tab: typeof _testing_library_user_event_dist_cjs_setup_directApi_js.tab;
};

type Listener = (mock: MockInstance, args: unknown[]) => void;
declare function onMockCall(callback: Listener): () => void;
declare const spyOn: typeof spyOn$1;
type Procedure = (...args: any[]) => any;
declare function fn<T extends Procedure = Procedure>(implementation?: T): Mock<T>;
/**
 * Calls [`.mockClear()`](https://vitest.dev/api/mock#mockclear) on every mocked function. This will
 * only empty `.mock` state, it will not reset implementation.
 *
 * It is useful if you need to clean up mock between different assertions.
 */
declare function clearAllMocks(): void;
/**
 * Calls [`.mockReset()`](https://vitest.dev/api/mock#mockreset) on every mocked function. This will
 * empty `.mock` state, reset "once" implementations and force the base implementation to return
 * `undefined` when invoked.
 *
 * This is useful when you want to completely reset a mock to the default state.
 */
declare function resetAllMocks(): void;
/**
 * Calls [`.mockRestore()`](https://vitest.dev/api/mock#mockrestore) on every mocked function. This
 * will restore all original implementations.
 */
declare function restoreAllMocks(): void;
/**
 * Type helper for TypeScript. Just returns the object that was passed.
 *
 * When `partial` is `true` it will expect a `Partial<T>` as a return value. By default, this will
 * only make TypeScript believe that the first level values are mocked. You can pass down `{ deep:
 * true }` as a second argument to tell TypeScript that the whole object is mocked, if it actually
 * is.
 *
 * @param item Anything that can be mocked
 * @param deep If the object is deeply mocked
 * @param options If the object is partially or deeply mocked
 */
declare function mocked<T>(item: T, deep?: false): MaybeMocked<T>;
declare function mocked<T>(item: T, deep: true): MaybeMockedDeep<T>;
declare function mocked<T>(item: T, options: {
    partial?: false;
    deep?: false;
}): MaybeMocked<T>;
declare function mocked<T>(item: T, options: {
    partial?: false;
    deep: true;
}): MaybeMockedDeep<T>;
declare function mocked<T>(item: T, options: {
    partial: true;
    deep?: false;
}): MaybePartiallyMocked<T>;
declare function mocked<T>(item: T, options: {
    partial: true;
    deep: true;
}): MaybePartiallyMockedDeep<T>;
declare function mocked<T>(item: T): MaybeMocked<T>;

type Queries = BoundFunctions<typeof queries>;
type UserEventObject = ReturnType<typeof userEvent$1.setup>;
declare module 'storybook/internal/csf' {
    interface Canvas extends Queries {
    }
    interface StoryContext {
        userEvent: UserEventObject;
    }
}
declare const expect: Expect;
type ModuleMockOptions = {
    spy?: boolean;
};
type ReturnTypeOfModuleMocker = (path: string | Promise<unknown>, factory?: ModuleMockOptions) => void;
declare const sb: {
    mock: ReturnTypeOfModuleMocker;
};

export { type UserEvent, type UserEventObject, buildQueries, clearAllMocks, configure, createEvent, expect, findAllByAltText, findAllByDisplayValue, findAllByLabelText, findAllByPlaceholderText, findAllByRole, findAllByTestId, findAllByText, findAllByTitle, findByAltText, findByDisplayValue, findByLabelText, findByPlaceholderText, findByRole, findByTestId, findByText, findByTitle, fireEvent, fn, getAllByAltText, getAllByDisplayValue, getAllByLabelText, getAllByPlaceholderText, getAllByRole, getAllByTestId, getAllByText, getAllByTitle, getByAltText, getByDisplayValue, getByLabelText, getByPlaceholderText, getByRole, getByTestId, getByText, getByTitle, getConfig, getDefaultNormalizer, getElementError, getNodeText, getQueriesForElement, getRoles, getSuggestedQuery, isInaccessible, logDOM, logRoles, mocked, onMockCall, prettyDOM, prettyFormat, queries, queryAllByAltText, queryAllByAttribute, queryAllByDisplayValue, queryAllByLabelText, queryAllByPlaceholderText, queryAllByRole, queryAllByTestId, queryAllByText, queryAllByTitle, queryByAltText, queryByAttribute, queryByDisplayValue, queryByLabelText, queryByPlaceholderText, queryByRole, queryByTestId, queryByText, queryByTitle, queryHelpers, resetAllMocks, restoreAllMocks, sb, screen, spyOn, uninstrumentedUserEvent, userEvent, waitFor, waitForElementToBeRemoved, within };
