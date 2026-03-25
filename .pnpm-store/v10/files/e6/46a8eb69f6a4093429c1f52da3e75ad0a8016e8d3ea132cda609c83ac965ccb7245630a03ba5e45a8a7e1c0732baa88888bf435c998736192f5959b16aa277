import { StorybookTypes, Renderer as Renderer$1, ProjectAnnotations as ProjectAnnotations$1, NormalizedProjectAnnotations, Args as Args$1, ComponentAnnotations as ComponentAnnotations$1, StoryAnnotations as StoryAnnotations$1, ComposedStoryFn, TestFunction as TestFunction$1 } from 'storybook/internal/types';
import { AddonTypes as AddonTypes$1, StoryContext as StoryContext$1 } from 'storybook/internal/csf';

declare global {
	interface SymbolConstructor {
		readonly observable: symbol;
	}
}

/**
@see Simplify
*/
interface SimplifyOptions {
	/**
	Do the simplification recursively.

	@default false
	*/
	deep?: boolean;
}

// Flatten a type without worrying about the result.
type Flatten<
	AnyType,
	Options extends SimplifyOptions = {},
> = Options['deep'] extends true
	? {[KeyType in keyof AnyType]: Simplify<AnyType[KeyType], Options>}
	: {[KeyType in keyof AnyType]: AnyType[KeyType]};

/**
Useful to flatten the type output to improve type hints shown in editors. And also to transform an interface into a type to aide with assignability.

@example
```
import type {Simplify} from 'type-fest';

type PositionProps = {
	top: number;
	left: number;
};

type SizeProps = {
	width: number;
	height: number;
};

// In your editor, hovering over `Props` will show a flattened object with all the properties.
type Props = Simplify<PositionProps & SizeProps>;
```

Sometimes it is desired to pass a value as a function argument that has a different type. At first inspection it may seem assignable, and then you discover it is not because the `value`'s type definition was defined as an interface. In the following example, `fn` requires an argument of type `Record<string, unknown>`. If the value is defined as a literal, then it is assignable. And if the `value` is defined as type using the `Simplify` utility the value is assignable.  But if the `value` is defined as an interface, it is not assignable because the interface is not sealed and elsewhere a non-string property could be added to the interface.

If the type definition must be an interface (perhaps it was defined in a third-party npm package), then the `value` can be defined as `const value: Simplify<SomeInterface> = ...`. Then `value` will be assignable to the `fn` argument.  Or the `value` can be cast as `Simplify<SomeInterface>` if you can't re-declare the `value`.

@example
```
import type {Simplify} from 'type-fest';

interface SomeInterface {
	foo: number;
	bar?: string;
	baz: number | undefined;
}

type SomeType = {
	foo: number;
	bar?: string;
	baz: number | undefined;
};

const literal = {foo: 123, bar: 'hello', baz: 456};
const someType: SomeType = literal;
const someInterface: SomeInterface = literal;

function fn(object: Record<string, unknown>): void {}

fn(literal); // Good: literal object type is sealed
fn(someType); // Good: type is sealed
fn(someInterface); // Error: Index signature for type 'string' is missing in type 'someInterface'. Because `interface` can be re-opened
fn(someInterface as Simplify<SomeInterface>); // Good: transform an `interface` into a `type`
```

@link https://github.com/microsoft/TypeScript/issues/15300

@category Object
*/
type Simplify<
	AnyType,
	Options extends SimplifyOptions = {},
> = Flatten<AnyType> extends AnyType
	? Flatten<AnyType, Options>
	: AnyType;

/**
Remove any index signatures from the given object type, so that only explicitly defined properties remain.

Use-cases:
- Remove overly permissive signatures from third-party types.

This type was taken from this [StackOverflow answer](https://stackoverflow.com/a/68261113/420747).

It relies on the fact that an empty object (`{}`) is assignable to an object with just an index signature, like `Record<string, unknown>`, but not to an object with explicitly defined keys, like `Record<'foo' | 'bar', unknown>`.

(The actual value type, `unknown`, is irrelevant and could be any type. Only the key type matters.)

```
const indexed: Record<string, unknown> = {}; // Allowed

const keyed: Record<'foo', unknown> = {}; // Error
// => TS2739: Type '{}' is missing the following properties from type 'Record<"foo" | "bar", unknown>': foo, bar
```

Instead of causing a type error like the above, you can also use a [conditional type](https://www.typescriptlang.org/docs/handbook/2/conditional-types.html) to test whether a type is assignable to another:

```
type Indexed = {} extends Record<string, unknown>
	? '✅ `{}` is assignable to `Record<string, unknown>`'
	: '❌ `{}` is NOT assignable to `Record<string, unknown>`';
// => '✅ `{}` is assignable to `Record<string, unknown>`'

type Keyed = {} extends Record<'foo' | 'bar', unknown>
	? "✅ `{}` is assignable to `Record<'foo' | 'bar', unknown>`"
	: "❌ `{}` is NOT assignable to `Record<'foo' | 'bar', unknown>`";
// => "❌ `{}` is NOT assignable to `Record<'foo' | 'bar', unknown>`"
```

Using a [mapped type](https://www.typescriptlang.org/docs/handbook/2/mapped-types.html#further-exploration), you can then check for each `KeyType` of `ObjectType`...

```
import type {RemoveIndexSignature} from 'type-fest';

type RemoveIndexSignature<ObjectType> = {
	[KeyType in keyof ObjectType // Map each key of `ObjectType`...
	]: ObjectType[KeyType]; // ...to its original value, i.e. `RemoveIndexSignature<Foo> == Foo`.
};
```

...whether an empty object (`{}`) would be assignable to an object with that `KeyType` (`Record<KeyType, unknown>`)...

```
import type {RemoveIndexSignature} from 'type-fest';

type RemoveIndexSignature<ObjectType> = {
	[KeyType in keyof ObjectType
		// Is `{}` assignable to `Record<KeyType, unknown>`?
		as {} extends Record<KeyType, unknown>
			? ... // ✅ `{}` is assignable to `Record<KeyType, unknown>`
			: ... // ❌ `{}` is NOT assignable to `Record<KeyType, unknown>`
	]: ObjectType[KeyType];
};
```

If `{}` is assignable, it means that `KeyType` is an index signature and we want to remove it. If it is not assignable, `KeyType` is a "real" key and we want to keep it.

```
import type {RemoveIndexSignature} from 'type-fest';

type RemoveIndexSignature<ObjectType> = {
	[KeyType in keyof ObjectType
		as {} extends Record<KeyType, unknown>
			? never // => Remove this `KeyType`.
			: KeyType // => Keep this `KeyType` as it is.
	]: ObjectType[KeyType];
};
```

@example
```
import type {RemoveIndexSignature} from 'type-fest';

interface Example {
	// These index signatures will be removed.
	[x: string]: any
	[x: number]: any
	[x: symbol]: any
	[x: `head-${string}`]: string
	[x: `${string}-tail`]: string
	[x: `head-${string}-tail`]: string
	[x: `${bigint}`]: string
	[x: `embedded-${number}`]: string

	// These explicitly defined keys will remain.
	foo: 'bar';
	qux?: 'baz';
}

type ExampleWithoutIndexSignatures = RemoveIndexSignature<Example>;
// => { foo: 'bar'; qux?: 'baz' | undefined; }
```

@category Object
*/
type RemoveIndexSignature<ObjectType> = {
	[KeyType in keyof ObjectType as {} extends Record<KeyType, unknown>
		? never
		: KeyType]: ObjectType[KeyType];
};

/**
Convert a union type to an intersection type using [distributive conditional types](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#distributive-conditional-types).

Inspired by [this Stack Overflow answer](https://stackoverflow.com/a/50375286/2172153).

@example
```
import type {UnionToIntersection} from 'type-fest';

type Union = {the(): void} | {great(arg: string): void} | {escape: boolean};

type Intersection = UnionToIntersection<Union>;
//=> {the(): void; great(arg: string): void; escape: boolean};
```

A more applicable example which could make its way into your library code follows.

@example
```
import type {UnionToIntersection} from 'type-fest';

class CommandOne {
	commands: {
		a1: () => undefined,
		b1: () => undefined,
	}
}

class CommandTwo {
	commands: {
		a2: (argA: string) => undefined,
		b2: (argB: string) => undefined,
	}
}

const union = [new CommandOne(), new CommandTwo()].map(instance => instance.commands);
type Union = typeof union;
//=> {a1(): void; b1(): void} | {a2(argA: string): void; b2(argB: string): void}

type Intersection = UnionToIntersection<Union>;
//=> {a1(): void; b1(): void; a2(argA: string): void; b2(argB: string): void}
```

@category Type
*/
type UnionToIntersection<Union> = (
	// `extends unknown` is always going to be the case and is used to convert the
	// `Union` into a [distributive conditional
	// type](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-8.html#distributive-conditional-types).
	Union extends unknown
		// The union type is used as the only argument to a function since the union
		// of function arguments is an intersection.
		? (distributedUnion: Union) => void
		// This won't happen.
		: never
		// Infer the `Intersection` type since TypeScript represents the positional
		// arguments of unions of functions as an intersection of the union.
	) extends ((mergedIntersection: infer Intersection) => void)
		? Intersection
		: never;

interface SBBaseType {
    required?: boolean;
    raw?: string;
}
type SBScalarType = SBBaseType & {
    name: 'boolean' | 'string' | 'number' | 'function' | 'symbol';
};
type SBArrayType = SBBaseType & {
    name: 'array';
    value: SBType;
};
type SBObjectType = SBBaseType & {
    name: 'object';
    value: Record<string, SBType>;
};
type SBEnumType = SBBaseType & {
    name: 'enum';
    value: (string | number)[];
};
type SBIntersectionType = SBBaseType & {
    name: 'intersection';
    value: SBType[];
};
type SBUnionType = SBBaseType & {
    name: 'union';
    value: SBType[];
};
type SBOtherType = SBBaseType & {
    name: 'other';
    value: string;
};
type SBType = SBScalarType | SBEnumType | SBArrayType | SBObjectType | SBIntersectionType | SBUnionType | SBOtherType;

interface ActionsParameters {
    /**
     * Actions configuration
     *
     * @see https://storybook.js.org/docs/essentials/actions#parameters
     */
    actions?: {
        /**
         * Create actions for each arg that matches the regex. (**NOT recommended, see below**)
         *
         * This is quite useful when your component has dozens (or hundreds) of methods and you do not
         * want to manually apply the fn utility for each of those methods. However, this is not the
         * recommended way of writing actions. That's because automatically inferred args are not
         * available as spies in your play function. If you use argTypesRegex and your stories have play
         * functions, you will need to also define args with the fn utility to test them in your play
         * function.
         *
         * @example `argTypesRegex: '^on.*'`
         */
        argTypesRegex?: string;
        /** Remove the addon panel and disable the addon's behavior */
        disable?: boolean;
        /**
         * Binds a standard HTML event handler to the outermost HTML element rendered by your component
         * and triggers an action when the event is called for a given selector. The format is
         * `<eventname> <selector>`. The selector is optional; it defaults to all elements.
         *
         * **To enable this feature, you must use the `withActions` decorator.**
         *
         * @example `handles: ['mouseover', 'click .btn']`
         *
         * @see https://storybook.js.org/docs/essentials/actions#action-event-handlers
         */
        handles?: string[];
    };
}
interface ActionsTypes {
    parameters: ActionsParameters;
}

declare const PARAM_KEY = "backgrounds";

interface Background {
    name: string;
    value: string;
}
type BackgroundMap = Record<string, Background>;
interface GridConfig {
    cellAmount: number;
    cellSize: number;
    opacity: number;
    offsetX?: number;
    offsetY?: number;
}
type GlobalState$1 = {
    value: string | undefined;
    grid?: boolean;
};
interface BackgroundsParameters {
    /**
     * Backgrounds configuration
     *
     * @see https://storybook.js.org/docs/essentials/backgrounds#parameters
     */
    backgrounds?: {
        /** Default background color */
        default?: string;
        /** Remove the addon panel and disable the addon's behavior */
        disable?: boolean;
        /** Configuration for the background grid */
        grid?: GridConfig;
        /** Available background colors */
        options?: BackgroundMap;
    };
}
interface BackgroundsGlobals {
    /**
     * Backgrounds configuration
     *
     * @see https://storybook.js.org/docs/essentials/backgrounds#globals
     */
    [PARAM_KEY]?: GlobalState$1 | GlobalState$1['value'];
}
interface BackgroundTypes {
    parameters: BackgroundsParameters;
    globals: BackgroundsGlobals;
}

interface ControlsParameters {
    /**
     * Controls configuration
     *
     * @see https://storybook.js.org/docs/essentials/controls#parameters-1
     */
    controls?: {
        /** Remove the addon panel and disable the addon's behavior */
        disable?: boolean;
        /** Disable the ability to create or edit stories from the Controls panel */
        disableSaveFromUI?: boolean;
        /** Exclude specific properties from the Controls panel */
        exclude?: string[] | RegExp;
        /**
         * Show the full documentation for each property in the Controls addon panel, including the
         * description and default value.
         */
        expanded?: boolean;
        /** Exclude only specific properties in the Controls panel */
        include?: string[] | RegExp;
        /**
         * Custom control type matchers
         *
         * @see https://storybook.js.org/docs/essentials/controls#custom-control-type-matchers
         */
        matchers?: {
            date?: RegExp;
            color?: RegExp;
        };
        /**
         * Preset color swatches for the color picker control
         *
         * @example PresetColors: [{ color: '#ff4785', title: 'Coral' }, 'rgba(0, 159, 183, 1)',
         * '#fe4a49']
         */
        presetColors?: Array<string | {
            color: string;
            title?: string;
        }>;
        /** Controls sorting order */
        sort?: 'none' | 'alpha' | 'requiredFirst';
    };
}
interface ControlsTypes {
    parameters: ControlsParameters;
}

interface HighlightTypes {
    parameters: HighlightParameters;
}
interface HighlightParameters {
    /**
     * Highlight configuration
     *
     * @see https://storybook.js.org/docs/essentials/highlight#parameters
     */
    highlight?: {
        /** Remove the addon panel and disable the addon's behavior */
        disable?: boolean;
    };
}

interface MeasureParameters {
    /**
     * Measure configuration
     *
     * @see https://storybook.js.org/docs/essentials/measure-and-outline#parameters
     */
    measure?: {
        /** Remove the addon panel and disable the addon's behavior */
        disable?: boolean;
    };
}
interface MeasureTypes {
    parameters: MeasureParameters;
}

interface OutlineParameters {
    /**
     * Outline configuration
     *
     * @see https://storybook.js.org/docs/essentials/measure-and-outline#parameters
     */
    outline?: {
        /** Remove the addon panel and disable the addon's behavior */
        disable?: boolean;
    };
}
interface OutlineTypes {
    parameters: OutlineParameters;
}

interface TestParameters {
    test?: {
        /** Ignore unhandled errors during test execution */
        dangerouslyIgnoreUnhandledErrors?: boolean;
        /** Whether to throw exceptions coming from the play function */
        throwPlayFunctionExceptions?: boolean;
    };
}
interface TestTypes {
    parameters: TestParameters;
}

interface Viewport {
    name: string;
    styles: ViewportStyles;
    type?: 'desktop' | 'mobile' | 'tablet' | 'other';
}
interface ViewportStyles {
    height: string;
    width: string;
}
type GlobalState = {
    /**
     * When set, the viewport is applied and cannot be changed using the toolbar. Must match the key
     * of one of the available viewports.
     */
    value: string | undefined;
    /**
     * When true the viewport applied will be rotated 90°, e.g. it will rotate from portrait to
     * landscape orientation.
     */
    isRotated?: boolean;
};
interface ViewportParameters {
    /**
     * Viewport configuration
     *
     * @see https://storybook.js.org/docs/essentials/viewport#parameters
     */
    viewport?: {
        /**
         * Remove the addon panel and disable the addon's behavior . If you wish to turn off this addon
         * for the entire Storybook, you should do so when registering addon-essentials
         *
         * @see https://storybook.js.org/docs/essentials/index#disabling-addons
         */
        disable?: boolean;
        /**
         * Specify the available viewports. The width and height values must include the unit, e.g.
         * '320px'.
         */
        options: Record<string, Viewport>;
    };
}
interface ViewportGlobals {
    /**
     * Viewport configuration
     *
     * @see https://storybook.js.org/docs/essentials/viewport#globals
     */
    viewport?: GlobalState | GlobalState['value'];
}
interface ViewportTypes {
    parameters: ViewportParameters;
    globals: ViewportGlobals;
}

type CoreTypes = StorybookTypes & ActionsTypes & BackgroundTypes & ControlsTypes & HighlightTypes & MeasureTypes & OutlineTypes & TestTypes & ViewportTypes;
declare function getCoreAnnotations(): any[];

type StoryId = string;
type ComponentId = string;
type ComponentTitle = string;
type StoryName = string;
/** @deprecated */
type StoryKind = ComponentTitle;
type Tag = string;
interface StoryIdentifier {
    componentId: ComponentId;
    title: ComponentTitle;
    /** @deprecated */
    kind: ComponentTitle;
    id: StoryId;
    name: StoryName;
    /** @deprecated */
    story: StoryName;
    tags: Tag[];
}
interface Parameters {
    [name: string]: any;
}
interface StrictParameters {
    [name: string]: unknown;
}
type ControlType = 'object' | 'boolean' | 'check' | 'inline-check' | 'radio' | 'inline-radio' | 'select' | 'multi-select' | 'number' | 'range' | 'file' | 'color' | 'date' | 'text';
type ConditionalTest = {
    truthy?: boolean;
} | {
    exists: boolean;
} | {
    eq: any;
} | {
    neq: any;
};
type ConditionalValue = {
    arg: string;
} | {
    global: string;
};
type Conditional = ConditionalValue & ConditionalTest;
interface ControlBase {
    [key: string]: any;
    /** @see https://storybook.js.org/docs/api/arg-types#controltype */
    type?: ControlType;
    disable?: boolean;
}
interface Report {
    type: string;
    version?: number;
    result: unknown;
    status: 'failed' | 'passed' | 'warning';
}
interface ReportingAPI {
    reports: Report[];
    addReport: (report: Report) => void;
}
type Control = ControlType | false | (ControlBase & (ControlBase | {
    type: 'color';
    /** @see https://storybook.js.org/docs/api/arg-types#controlpresetcolors */
    presetColors?: string[];
} | {
    type: 'file';
    /** @see https://storybook.js.org/docs/api/arg-types#controlaccept */
    accept?: string;
} | {
    type: 'inline-check' | 'radio' | 'inline-radio' | 'select' | 'multi-select';
    /** @see https://storybook.js.org/docs/api/arg-types#controllabels */
    labels?: {
        [options: string]: string;
    };
} | {
    type: 'number' | 'range';
    /** @see https://storybook.js.org/docs/api/arg-types#controlmax */
    max?: number;
    /** @see https://storybook.js.org/docs/api/arg-types#controlmin */
    min?: number;
    /** @see https://storybook.js.org/docs/api/arg-types#controlstep */
    step?: number;
}));
interface InputType {
    /** @see https://storybook.js.org/docs/api/arg-types#control */
    control?: Control;
    /** @see https://storybook.js.org/docs/api/arg-types#description */
    description?: string;
    /** @see https://storybook.js.org/docs/api/arg-types#if */
    if?: Conditional;
    /** @see https://storybook.js.org/docs/api/arg-types#mapping */
    mapping?: {
        [key: string]: any;
    };
    /** @see https://storybook.js.org/docs/api/arg-types#name */
    name?: string;
    /** @see https://storybook.js.org/docs/api/arg-types#options */
    options?: readonly any[];
    /** @see https://storybook.js.org/docs/api/arg-types#table */
    table?: {
        [key: string]: unknown;
        /** @see https://storybook.js.org/docs/api/arg-types#tablecategory */
        category?: string;
        /** @see https://storybook.js.org/docs/api/arg-types#tabledefaultvalue */
        defaultValue?: {
            summary?: string;
            detail?: string;
        };
        /** @see https://storybook.js.org/docs/api/arg-types#tabledisable */
        disable?: boolean;
        /** @see https://storybook.js.org/docs/api/arg-types#tablesubcategory */
        subcategory?: string;
        /** @see https://storybook.js.org/docs/api/arg-types#tabletype */
        type?: {
            summary?: string;
            detail?: string;
        };
    };
    /** @see https://storybook.js.org/docs/api/arg-types#type */
    type?: SBType | SBScalarType['name'];
    /**
     * @deprecated Use `table.defaultValue.summary` instead.
     * @see https://storybook.js.org/docs/api/arg-types#defaultvalue
     */
    defaultValue?: any;
    [key: string]: any;
}
interface StrictInputType extends InputType {
    name: string;
    type?: SBType;
}
interface Args {
    [name: string]: any;
}
interface StrictArgs {
    [name: string]: unknown;
}
/** @see https://storybook.js.org/docs/api/arg-types#argtypes */
type ArgTypes<TArgs = Args> = {
    [name in keyof TArgs]: InputType;
};
type StrictArgTypes<TArgs = Args> = {
    [name in keyof TArgs]: StrictInputType;
};
interface Globals {
    [name: string]: any;
}
interface GlobalTypes {
    [name: string]: InputType;
}
interface StrictGlobalTypes {
    [name: string]: StrictInputType;
}
interface AddonTypes {
    parameters?: Record<string, any>;
    globals?: Record<string, any>;
}
interface Renderer extends AddonTypes {
    /** What is the type of the `component` annotation in this renderer? */
    component: any;
    /** What does the story function return in this renderer? */
    storyResult: any;
    /** What type of element does this renderer render to? */
    canvasElement: any;
    mount(): Promise<Canvas>;
    T?: unknown;
    args: unknown;
    csf4: boolean;
}
/** @deprecated - Use `Renderer` */
type AnyFramework = Renderer;
interface StoryContextForEnhancers<TRenderer extends Renderer = Renderer, TArgs = Args> extends StoryIdentifier {
    component?: (TRenderer & {
        T: any;
    })['component'];
    subcomponents?: Record<string, (TRenderer & {
        T: any;
    })['component']>;
    parameters: Parameters;
    initialArgs: TArgs;
    argTypes: StrictArgTypes<TArgs>;
}
type ArgsEnhancer<TRenderer extends Renderer = Renderer, TArgs = Args> = (context: StoryContextForEnhancers<TRenderer, TArgs>) => TArgs;
type ArgTypesEnhancer<TRenderer extends Renderer = Renderer, TArgs = Args> = ((context: StoryContextForEnhancers<TRenderer, TArgs>) => StrictArgTypes<TArgs>) & {
    secondPass?: boolean;
};
interface StoryContextUpdate<TArgs = Args> {
    args?: TArgs;
    globals?: Globals;
    [key: string]: any;
}
type ViewMode = 'story' | 'docs';
type LoaderFunction<TRenderer extends Renderer = Renderer, TArgs = Args> = (context: StoryContextForLoaders<TRenderer, TArgs>) => Promise<Record<string, any> | void> | Record<string, any> | void;
type Awaitable<T> = T | PromiseLike<T>;
type CleanupCallback = () => Awaitable<unknown>;
type BeforeAll = () => Awaitable<CleanupCallback | void>;
type BeforeEach<TRenderer extends Renderer = Renderer, TArgs = Args> = (context: StoryContext<TRenderer, TArgs>) => Awaitable<CleanupCallback | void>;
type AfterEach<TRenderer extends Renderer = Renderer, TArgs = Args> = (context: StoryContext<TRenderer, TArgs>) => Awaitable<void>;
interface Canvas {
}
interface StoryContext<TRenderer extends Renderer = Renderer, TArgs = Args> extends StoryContextForEnhancers<TRenderer, TArgs>, Required<StoryContextUpdate<TArgs>> {
    loaded: Record<string, any>;
    abortSignal: AbortSignal;
    canvasElement: TRenderer['canvasElement'];
    hooks: unknown;
    originalStoryFn: ArgsStoryFn<TRenderer>;
    viewMode: ViewMode;
    step: StepFunction<TRenderer, TArgs>;
    context: this;
    canvas: Canvas;
    mount: TRenderer['mount'];
    reporting: ReportingAPI;
}
/** @deprecated Use {@link StoryContext} instead. */
interface StoryContextForLoaders<TRenderer extends Renderer = Renderer, TArgs = Args> extends StoryContext<TRenderer, TArgs> {
}
/** @deprecated Use {@link StoryContext} instead. */
interface PlayFunctionContext<TRenderer extends Renderer = Renderer, TArgs = Args> extends StoryContext<TRenderer, TArgs> {
}
type StepLabel = string;
type StepFunction<TRenderer extends Renderer = Renderer, TArgs = Args> = (label: StepLabel, play: PlayFunction<TRenderer, TArgs>) => Promise<void> | void;
type PlayFunction<TRenderer extends Renderer = Renderer, TArgs = Args> = (context: PlayFunctionContext<TRenderer, TArgs>) => Promise<void> | void;
type TestFunction<TRenderer extends Renderer = Renderer, TArgs = TRenderer['args']> = (context: StoryContext<TRenderer, TArgs>) => Promise<void> | void;
type PartialStoryFn<TRenderer extends Renderer = Renderer, TArgs = Args> = (update?: StoryContextUpdate<Partial<TArgs>>) => TRenderer['storyResult'];
type LegacyStoryFn<TRenderer extends Renderer = Renderer, TArgs = Args> = (context: StoryContext<TRenderer, TArgs>) => TRenderer['storyResult'];
type ArgsStoryFn<TRenderer extends Renderer = Renderer, TArgs = Args> = (args: TArgs, context: StoryContext<TRenderer, TArgs>) => (TRenderer & {
    T: TArgs;
})['storyResult'];
type StoryFn<TRenderer extends Renderer = Renderer, TArgs = Args> = LegacyStoryFn<TRenderer, TArgs> | ArgsStoryFn<TRenderer, TArgs>;
type DecoratorFunction<TRenderer extends Renderer = Renderer, TArgs = Args> = (fn: PartialStoryFn<TRenderer, TArgs>, c: StoryContext<TRenderer, TArgs>) => TRenderer['storyResult'];
type DecoratorApplicator<TRenderer extends Renderer = Renderer, TArgs = Args> = (storyFn: LegacyStoryFn<TRenderer, TArgs>, decorators: DecoratorFunction<TRenderer, TArgs>[]) => LegacyStoryFn<TRenderer, TArgs>;
type StepRunner<TRenderer extends Renderer = Renderer, TArgs = Args> = (label: StepLabel, play: PlayFunction<TRenderer, TArgs>, context: StoryContext<TRenderer, TArgs>) => Promise<void>;
interface BaseAnnotations<TRenderer extends Renderer = Renderer, TArgs = Args> {
    /**
     * Wrapper components or Storybook decorators that wrap a story.
     *
     * Decorators defined in Meta will be applied to every story variation.
     *
     * @see [Decorators](https://storybook.js.org/docs/writing-stories/decorators)
     */
    decorators?: DecoratorFunction<TRenderer, Simplify<TArgs>>[] | DecoratorFunction<TRenderer, Simplify<TArgs>>;
    /**
     * Custom metadata for a story.
     *
     * @see [Parameters](https://storybook.js.org/docs/writing-stories/parameters)
     */
    parameters?: Parameters & (TRenderer['csf4'] extends true ? CoreTypes['parameters'] & TRenderer['parameters'] : unknown);
    /**
     * Dynamic data that are provided (and possibly updated by) Storybook and its addons.
     *
     * @see [Args](https://storybook.js.org/docs/writing-stories/args)
     */
    args?: Partial<TArgs>;
    /**
     * ArgTypes encode basic metadata for args, such as `name`, `description`, `defaultValue` for an
     * arg. These get automatically filled in by Storybook Docs.
     *
     * @see [ArgTypes](https://storybook.js.org/docs/api/arg-types)
     */
    argTypes?: Partial<ArgTypes<TArgs>>;
    /**
     * Asynchronous functions which provide data for a story.
     *
     * @see [Loaders](https://storybook.js.org/docs/writing-stories/loaders)
     */
    loaders?: LoaderFunction<TRenderer, TArgs>[] | LoaderFunction<TRenderer, TArgs>;
    /**
     * Function to be called before each story. When the function is async, it will be awaited.
     *
     * `beforeEach` can be added to preview, the default export and to a specific story. They are run
     * (and awaited) in the order: preview, default export, story
     *
     * A cleanup function can be returned.
     */
    beforeEach?: BeforeEach<TRenderer, TArgs>[] | BeforeEach<TRenderer, TArgs>;
    /**
     * Function to be called after each play function for post-test assertions. Don't use this
     * function for cleaning up state. You can use the return callback of `beforeEach` for that, which
     * is run when switching stories. When the function is async, it will be awaited.
     *
     * `afterEach` can be added to preview, the default export and to a specific story. They are run
     * (and awaited) reverse order: preview, default export, story
     */
    afterEach?: AfterEach<TRenderer, TArgs>[] | AfterEach<TRenderer, TArgs>;
    /**
     * Define a custom render function for the story(ies). If not passed, a default render function by
     * the renderer will be used.
     */
    render?: ArgsStoryFn<TRenderer, TArgs>;
    /** Named tags for a story, used to filter stories in different contexts. */
    tags?: Tag[];
    mount?: (context: StoryContext<TRenderer, TArgs>) => TRenderer['mount'];
}
interface ProjectAnnotations<TRenderer extends Renderer = Renderer, TArgs = Args> extends BaseAnnotations<TRenderer, TArgs> {
    argsEnhancers?: ArgsEnhancer<TRenderer, Args>[];
    argTypesEnhancers?: ArgTypesEnhancer<TRenderer, Args>[];
    /**
     * Lifecycle hook which runs once, before any loaders, decorators or stories, and may rerun when
     * configuration changes or when reinitializing (e.g. between test runs). The function may be
     * synchronous or asynchronous, and may return a cleanup function which may also be synchronous or
     * asynchronous. The cleanup function is not guaranteed to run (e.g. when the browser closes), but
     * runs when configuration changes or when reinitializing. This hook may only be defined globally
     * (i.e. not on component or story level). When multiple hooks are specified, they are to be
     * executed sequentially (and awaited) in the following order:
     *
     * - Addon hooks (in order of addons array in e.g. .storybook/main.js)
     * - Annotation hooks (in order of previewAnnotations array in e.g. .storybook/main.js)
     * - Preview hook (via e.g. .storybook/preview.js) Cleanup functions are executed sequentially in
     *   reverse order of initialization.
     */
    beforeAll?: BeforeAll;
    initialGlobals?: Globals & (TRenderer['csf4'] extends true ? CoreTypes['globals'] & TRenderer['globals'] : unknown);
    globalTypes?: GlobalTypes;
    applyDecorators?: DecoratorApplicator<TRenderer, Args>;
    runStep?: StepRunner<TRenderer, TArgs>;
}
type StoryDescriptor$1 = string[] | RegExp;
interface ComponentAnnotations<TRenderer extends Renderer = Renderer, TArgs = Args> extends BaseAnnotations<TRenderer, TArgs> {
    /**
     * Title of the component which will be presented in the navigation. **Should be unique.**
     *
     * Components can be organized in a nested structure using "/" as a separator.
     *
     * Since CSF 3.0 this property is optional -- it can be inferred from the filesystem path
     *
     * @example Export default { ... title: 'Design System/Atoms/Button' }
     *
     * @see [Story Hierarchy](https://storybook.js.org/docs/writing-stories/naming-components-and-hierarchy#structure-and-hierarchy)
     */
    title?: ComponentTitle;
    /**
     * Id of the component (prefix of the story id) which is used for URLs.
     *
     * By default is inferred from sanitizing the title
     *
     * @see [Permalink to stories](https://storybook.js.org/docs/configure/sidebar-and-urls#permalink-to-stories)
     */
    id?: ComponentId;
    /**
     * Used to only include certain named exports as stories. Useful when you want to have non-story
     * exports such as mock data or ignore a few stories.
     *
     * @example IncludeStories: ['SimpleStory', 'ComplexStory'] includeStories: /.*Story$/
     *
     * @see [Non-story exports](https://storybook.js.org/docs/api/csf#non-story-exports)
     */
    includeStories?: StoryDescriptor$1;
    /**
     * Used to exclude certain named exports. Useful when you want to have non-story exports such as
     * mock data or ignore a few stories.
     *
     * @example ExcludeStories: ['simpleData', 'complexData'] excludeStories: /.*Data$/
     *
     * @see [Non-story exports](https://storybook.js.org/docs/api/csf#non-story-exports)
     */
    excludeStories?: StoryDescriptor$1;
    /**
     * The primary component for your story.
     *
     * Used by addons for automatic prop table generation and display of other component metadata.
     */
    component?: (TRenderer & {
        T: Record<string, unknown> extends Required<TArgs> ? any : TArgs;
    })['component'];
    /**
     * Auxiliary subcomponents that are part of the stories.
     *
     * Used by addons for automatic prop table generation and display of other component metadata.
     *
     * @example Import { Button, ButtonGroup } from './components';
     *
     * Export default { ... subcomponents: { Button, ButtonGroup } }
     *
     * By defining them each component will have its tab in the args table.
     */
    subcomponents?: Record<string, (TRenderer & {
        T: any;
    })['component']>;
    /** Function that is executed after the story is rendered. */
    play?: PlayFunction<TRenderer, TArgs>;
    /** Override the globals values for all stories in this component */
    globals?: Globals & (TRenderer['csf4'] extends true ? CoreTypes['globals'] & TRenderer['globals'] : unknown);
}
type StoryAnnotations<TRenderer extends Renderer = Renderer, TArgs = Args, TRequiredArgs = Partial<TArgs>> = BaseAnnotations<TRenderer, TArgs> & {
    /** Override the display name in the UI (CSF v3) */
    name?: StoryName;
    /** Override the display name in the UI (CSF v2) */
    storyName?: StoryName;
    /** Function that is executed after the story is rendered. */
    play?: PlayFunction<TRenderer, TArgs>;
    /** Override the globals values for this story */
    globals?: Globals & (TRenderer['csf4'] extends true ? CoreTypes['globals'] & TRenderer['globals'] : unknown);
    /** @deprecated */
    story?: Omit<StoryAnnotations<TRenderer, TArgs>, 'story'>;
} & ({} extends TRequiredArgs ? {
    args?: TRequiredArgs;
} : {
    args: TRequiredArgs;
});
type LegacyAnnotatedStoryFn<TRenderer extends Renderer = Renderer, TArgs = Args> = StoryFn<TRenderer, TArgs> & StoryAnnotations<TRenderer, TArgs>;
type LegacyStoryAnnotationsOrFn<TRenderer extends Renderer = Renderer, TArgs = Args> = LegacyAnnotatedStoryFn<TRenderer, TArgs> | StoryAnnotations<TRenderer, TArgs>;
type AnnotatedStoryFn<TRenderer extends Renderer = Renderer, TArgs = Args> = ArgsStoryFn<TRenderer, TArgs> & StoryAnnotations<TRenderer, TArgs>;
type StoryAnnotationsOrFn<TRenderer extends Renderer = Renderer, TArgs = Args> = AnnotatedStoryFn<TRenderer, TArgs> | StoryAnnotations<TRenderer, TArgs>;
type ArgsFromMeta<TRenderer extends Renderer, Meta> = Meta extends {
    render?: ArgsStoryFn<TRenderer, infer RArgs>;
    loaders?: (infer Loaders)[] | infer Loaders;
    decorators?: (infer Decorators)[] | infer Decorators;
} ? Simplify<RemoveIndexSignature<RArgs & DecoratorsArgs<TRenderer, Decorators> & LoaderArgs<TRenderer, Loaders>>> : unknown;
type DecoratorsArgs<TRenderer extends Renderer, Decorators> = UnionToIntersection<Decorators extends DecoratorFunction<TRenderer, infer TArgs> ? TArgs : unknown>;
type LoaderArgs<TRenderer extends Renderer, Loaders> = UnionToIntersection<Loaders extends LoaderFunction<TRenderer, infer TArgs> ? TArgs : unknown>;

/**
 * Helper function to include/exclude an arg based on the value of other other args aka "conditional
 * args"
 */
declare const includeConditionalArg: (argType: InputType, args: Args, globals: Globals) => any;

interface Preview<TRenderer extends Renderer$1 = Renderer$1> {
    readonly _tag: 'Preview';
    input: ProjectAnnotations$1<TRenderer> & {
        addons?: PreviewAddon<never>[];
    };
    composed: NormalizedProjectAnnotations<TRenderer>;
    meta<TArgs extends Args$1, TInput extends ComponentAnnotations$1<TRenderer & {
        args: TArgs;
    }, TArgs>>(input: TInput): Meta<TRenderer & {
        args: TArgs;
    }, TInput>;
}
type InferTypes<T extends PreviewAddon<never>[]> = T extends PreviewAddon<infer C>[] ? C & {
    csf4: true;
} : never;
declare function definePreview<TRenderer extends Renderer$1, Addons extends PreviewAddon<never>[]>(input: ProjectAnnotations$1<TRenderer> & {
    addons?: Addons;
}): Preview<TRenderer & InferTypes<Addons>>;
interface PreviewAddon<in TExtraContext extends AddonTypes$1 = AddonTypes$1> extends ProjectAnnotations$1<Renderer$1> {
}
declare function definePreviewAddon<TExtraContext extends AddonTypes$1 = AddonTypes$1>(preview: ProjectAnnotations$1<Renderer$1>): PreviewAddon<TExtraContext>;
declare function isPreview(input: unknown): input is Preview<Renderer$1>;
interface Meta<TRenderer extends Renderer$1, TInput extends ComponentAnnotations$1<TRenderer, TRenderer['args']> = ComponentAnnotations$1<TRenderer, TRenderer['args']>> {
    readonly _tag: 'Meta';
    input: TInput;
    preview: Preview<TRenderer>;
    story(input?: () => TRenderer['storyResult']): Story<TRenderer, {
        render: () => TRenderer['storyResult'];
    }>;
    story<TInput extends StoryAnnotations$1<TRenderer, TRenderer['args']>>(input?: TInput): Story<TRenderer, TInput>;
}
declare function isMeta(input: unknown): input is Meta<Renderer$1>;
interface Story<TRenderer extends Renderer$1, TInput extends StoryAnnotations$1<TRenderer, TRenderer['args']> = StoryAnnotations$1<TRenderer, TRenderer['args']>> {
    readonly _tag: 'Story';
    input: TInput;
    composed: Pick<ComposedStoryFn<TRenderer>, 'argTypes' | 'parameters' | 'id' | 'tags' | 'globals'> & {
        args: TRenderer['args'];
        name: string;
    };
    meta: Meta<TRenderer>;
    play: TInput['play'];
    run: (context?: Partial<StoryContext$1<TRenderer, Partial<TRenderer['args']>>>, testName?: string) => Promise<void>;
    extend<TInput extends StoryAnnotations$1<TRenderer, TRenderer['args']>>(input: TInput): Story<TRenderer, TInput>;
    test(name: string, fn: TestFunction$1<TRenderer>): void;
    test(name: string, annotations: StoryAnnotations$1<TRenderer, TRenderer['args']>, fn: TestFunction$1<TRenderer>): void;
}
declare function isStory<TRenderer extends Renderer$1>(input: unknown): input is Story<TRenderer>;
declare function getStoryChildren<TRenderer extends Renderer$1>(story: Story<TRenderer>): Story<TRenderer>[];

/**
 * Remove punctuation and illegal characters from a story ID.
 *
 * See https://gist.github.com/davidjrice/9d2af51100e41c6c4b4a
 */
declare const sanitize: (string: string) => string;
/** Generate a storybook ID from a component/kind and story name. */
declare const toId: (kind: string, name?: string) => string;
/** Generate a storybook test ID from a story ID and test name. */
declare const toTestId: (parentId: string, testName: string) => string;
/** Transform a CSF named export into a readable story name */
declare const storyNameFromExport: (key: string) => string;
type StoryDescriptor = string[] | RegExp;
interface IncludeExcludeOptions {
    includeStories?: StoryDescriptor;
    excludeStories?: StoryDescriptor;
}
/** Does a named export match CSF inclusion/exclusion options? */
declare function isExportStory(key: string, { includeStories, excludeStories }: IncludeExcludeOptions): boolean | null;
interface SeparatorOptions {
    rootSeparator: string | RegExp;
    groupSeparator: string | RegExp;
}
/** Parse out the component/kind name from a path, using the given separator config. */
declare const parseKind: (kind: string, { rootSeparator, groupSeparator }: SeparatorOptions) => {
    root: string | null;
    groups: string[];
};
/** Combine a set of project / meta / story tags, removing duplicates and handling negations. */
declare const combineTags: (...tags: string[]) => string[];

export { type AddonTypes, type AfterEach, type AnnotatedStoryFn, type AnyFramework, type ArgTypes, type ArgTypesEnhancer, type Args, type ArgsEnhancer, type ArgsFromMeta, type ArgsStoryFn, type BaseAnnotations, type BeforeAll, type BeforeEach, type Canvas, type CleanupCallback, type ComponentAnnotations, type ComponentId, type ComponentTitle, type Conditional, type CoreTypes, type DecoratorApplicator, type DecoratorFunction, type GlobalTypes, type Globals, type IncludeExcludeOptions, type InferTypes, type InputType, type LegacyAnnotatedStoryFn, type LegacyStoryAnnotationsOrFn, type LegacyStoryFn, type LoaderFunction, type Meta, type Parameters, type PartialStoryFn, type PlayFunction, type PlayFunctionContext, type Preview, type PreviewAddon, type ProjectAnnotations, type Renderer, type SBArrayType, type SBEnumType, type SBIntersectionType, type SBObjectType, type SBOtherType, type SBScalarType, type SBType, type SBUnionType, type SeparatorOptions, type StepFunction, type StepLabel, type StepRunner, type Story, type StoryAnnotations, type StoryAnnotationsOrFn, type StoryContext, type StoryContextForEnhancers, type StoryContextForLoaders, type StoryContextUpdate, type StoryFn, type StoryId, type StoryIdentifier, type StoryKind, type StoryName, type StrictArgTypes, type StrictArgs, type StrictGlobalTypes, type StrictInputType, type StrictParameters, type Tag, type TestFunction, type ViewMode, combineTags, definePreview, definePreviewAddon, getCoreAnnotations, getStoryChildren, includeConditionalArg, isExportStory, isMeta, isPreview, isStory, parseKind, sanitize, storyNameFromExport, toId, toTestId };
