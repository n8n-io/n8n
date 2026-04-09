import { WebRenderer, Canvas, StoryContext as StoryContext$1, StrictArgs, DecoratorFunction, LoaderFunction, Args, ComponentAnnotations, ProjectAnnotations, AnnotatedStoryFn, ArgsStoryFn, ArgsFromMeta, StoryAnnotations, Store_CSFExports, StoriesWithPartialProps, StoryAnnotationsOrFn, ComposedStoryFn, NamedOrDefaultProjectAnnotations, NormalizedProjectAnnotations, Renderer } from 'storybook/internal/types';
export { ArgTypes, Args, Parameters, StrictArgs } from 'storybook/internal/types';
import { ConcreteComponent, App, VNodeChild, FunctionalComponent } from 'vue';
import { RemoveIndexSignature, Constructor, Simplify, SetOptional, UnionToIntersection } from 'type-fest';
import { ComponentProps, ComponentSlots } from 'vue-component-type-helpers';
import { Meta as Meta$1, Story, AddonTypes, Preview as Preview$1, PreviewAddon, InferTypes } from 'storybook/internal/csf';

type StoryFnVueReturnType = ConcreteComponent<any>;
interface VueRenderer extends WebRenderer {
    component: Omit<ConcreteComponent<this['T']>, 'props'>;
    storyResult: StoryFnVueReturnType;
    mount: (Component?: StoryFnVueReturnType, options?: {
        props?: Record<string, any>;
        slots?: Record<string, any>;
    }) => Promise<Canvas>;
}
interface VueTypes extends VueRenderer {
}

declare const setup: <AppHostElement = any>(fn: (app: App<AppHostElement>, storyContext?: StoryContext$1<VueRenderer>) => unknown) => void;

/**
 * Metadata to configure the stories for a component.
 *
 * @see [Default export](https://storybook.js.org/docs/api/csf#default-export)
 */
type Meta<TCmpOrArgs = Args> = ComponentAnnotations<VueRenderer, ComponentPropsOrProps<TCmpOrArgs>>;
/**
 * Story function that represents a CSFv2 component example.
 *
 * @see [Named Story exports](https://storybook.js.org/docs/api/csf#named-story-exports)
 */
type StoryFn<TCmpOrArgs = Args> = AnnotatedStoryFn<VueRenderer, ComponentPropsOrProps<TCmpOrArgs>>;
/**
 * Story object that represents a CSFv3 component example.
 *
 * @see [Named Story exports](https://storybook.js.org/docs/api/csf#named-story-exports)
 */
type StoryObj<TMetaOrCmpOrArgs = Args> = TMetaOrCmpOrArgs extends {
    render?: ArgsStoryFn<VueRenderer, any>;
    component?: infer Component;
    args?: infer DefaultArgs;
} ? Simplify<ComponentPropsAndSlots<Component> & ArgsFromMeta<VueRenderer, TMetaOrCmpOrArgs>> extends infer TArgs ? StoryAnnotations<VueRenderer, TArgs, SetOptional<TArgs, Extract<keyof TArgs, keyof DefaultArgs>>> : never : StoryAnnotations<VueRenderer, ComponentPropsOrProps<TMetaOrCmpOrArgs>>;
type ExtractSlots<C> = AllowNonFunctionSlots<Partial<RemoveIndexSignature<ComponentSlots<C>>>>;
type AllowNonFunctionSlots<Slots> = {
    [K in keyof Slots]: Slots[K] | VNodeChild;
};
type ComponentPropsAndSlots<C> = ComponentProps<C> & ExtractSlots<C>;
type ComponentPropsOrProps<TCmpOrArgs> = TCmpOrArgs extends Constructor<any> ? ComponentPropsAndSlots<TCmpOrArgs> : TCmpOrArgs extends FunctionalComponent<any> ? ComponentPropsAndSlots<TCmpOrArgs> : TCmpOrArgs;
type Decorator<TArgs = StrictArgs> = DecoratorFunction<VueRenderer, TArgs>;
type Loader<TArgs = StrictArgs> = LoaderFunction<VueRenderer, TArgs>;
type StoryContext<TArgs = StrictArgs> = StoryContext$1<VueRenderer, TArgs>;
type Preview = ProjectAnnotations<VueRenderer>;

type JSXAble<TElement> = TElement & {
    new (...args: any[]): any;
    $props: any;
};
type MapToJSXAble<T> = {
    [K in keyof T]: JSXAble<T[K]>;
};
/**
 * Function that sets the globalConfig of your Storybook. The global config is the preview module of
 * your .storybook folder.
 *
 * It should be run a single time, so that your global config (e.g. decorators) is applied to your
 * stories when using `composeStories` or `composeStory`.
 *
 * Example:
 *
 * ```jsx
 * // setup-file.js
 * import { setProjectAnnotations } from '@storybook/vue3';
 * import projectAnnotations from './.storybook/preview';
 *
 * setProjectAnnotations(projectAnnotations);
 * ```
 *
 * @param projectAnnotations - E.g. (import projectAnnotations from '../.storybook/preview')
 */
declare function setProjectAnnotations(projectAnnotations: NamedOrDefaultProjectAnnotations<any> | NamedOrDefaultProjectAnnotations<any>[]): NormalizedProjectAnnotations<VueRenderer>;
declare const vueProjectAnnotations: ProjectAnnotations<VueRenderer>;
/**
 * Function that will receive a story along with meta (e.g. a default export from a .stories file)
 * and optionally projectAnnotations e.g. (import * from '../.storybook/preview) and will return a
 * composed component that has all args/parameters/decorators/etc combined and applied to it.
 *
 * It's very useful for reusing a story in scenarios outside of Storybook like unit testing.
 *
 * Example:
 *
 * ```jsx
 * import { render } from '@testing-library/vue';
 * import { composeStory } from '@storybook/vue3';
 * import Meta, { Primary as PrimaryStory } from './Button.stories';
 *
 * const Primary = composeStory(PrimaryStory, Meta);
 *
 * test('renders primary button with Hello World', () => {
 *   const { getByText } = render(Primary, { props: { label: 'Hello world' } });
 *   expect(getByText(/Hello world/i)).not.toBeNull();
 * });
 * ```
 *
 * @param story
 * @param componentAnnotations - E.g. (import Meta from './Button.stories')
 * @param [projectAnnotations] - E.g. (import * as projectAnnotations from '../.storybook/preview')
 *   this can be applied automatically if you use `setProjectAnnotations` in your setup files.
 * @param [exportsName] - In case your story does not contain a name and you want it to have a name.
 */
declare function composeStory<TArgs extends Args = Args>(story: StoryAnnotationsOrFn<VueRenderer, TArgs>, componentAnnotations: Meta<TArgs | any>, projectAnnotations?: ProjectAnnotations<VueRenderer>, exportsName?: string): JSXAble<ComposedStoryFn<VueRenderer, Partial<TArgs>>>;
/**
 * Function that will receive a stories import (e.g. `import * as stories from './Button.stories'`)
 * and optionally projectAnnotations (e.g. `import * from '../.storybook/preview`) and will return
 * an object containing all the stories passed, but now as a composed component that has all
 * args/parameters/decorators/etc combined and applied to it.
 *
 * It's very useful for reusing stories in scenarios outside of Storybook like unit testing.
 *
 * Example:
 *
 * ```jsx
 * import { render } from '@testing-library/vue';
 * import { composeStories } from '@storybook/vue3';
 * import * as stories from './Button.stories';
 *
 * const { Primary, Secondary } = composeStories(stories);
 *
 * test('renders primary button with Hello World', () => {
 *   const { getByText } = render(Primary, { props: { label: 'Hello world' } });
 *   expect(getByText(/Hello world/i)).not.toBeNull();
 * });
 * ```
 *
 * @param csfExports - E.g. (import * as stories from './Button.stories')
 * @param [projectAnnotations] - E.g. (import * as projectAnnotations from '../.storybook/preview')
 *   this can be applied automatically if you use `setProjectAnnotations` in your setup files.
 */
declare function composeStories<TModule extends Store_CSFExports<VueRenderer, any>>(csfExports: TModule, projectAnnotations?: ProjectAnnotations<VueRenderer>): MapToJSXAble<Omit<StoriesWithPartialProps<VueRenderer, TModule>, keyof Store_CSFExports>>;

/**
 * Creates a Vue3-specific preview configuration with CSF factories support.
 *
 * This function wraps the base `definePreview` and adds Vue3-specific annotations for rendering and
 * documentation. It returns a `VuePreview` that provides type-safe `meta()` and `story()` factory
 * methods.
 *
 * @example
 *
 * ```ts
 * // .storybook/preview.ts
 * import { definePreview } from '@storybook/vue3';
 *
 * export const preview = definePreview({
 *   addons: [],
 *   parameters: { layout: 'centered' },
 * });
 * ```
 */
declare function __definePreview<Addons extends PreviewAddon<never>[]>(input: {
    addons: Addons;
} & ProjectAnnotations<VueTypes & InferTypes<Addons>>): VuePreview<VueTypes & InferTypes<Addons>>;
type InferArgs<TArgs, T, Decorators> = Simplify<TArgs & Simplify<RemoveIndexSignature<DecoratorsArgs<VueTypes & T, Decorators>>>>;
type InferVueTypes<T, TArgs, Decorators> = VueTypes & T & {
    args: Simplify<InferArgs<TArgs, T, Decorators>>;
};
/**
 * Vue3-specific Preview interface that provides type-safe CSF factory methods.
 *
 * Use `preview.meta()` to create a meta configuration for a component, and then `meta.story()` to
 * create individual stories. The type system will infer args from the component props, slots,
 * decorators, and any addon types.
 *
 * @example
 *
 * ```ts
 * const meta = preview.meta({ component: Button });
 * export const Primary = meta.story({ args: { label: 'Click me' } });
 * ```
 */
interface VuePreview<T extends AddonTypes> extends Preview$1<VueTypes & T> {
    /**
     * Narrows the type of the preview to include additional type information. This is useful when you
     * need to add args that aren't inferred from the component.
     *
     * @example
     *
     * ```ts
     * const meta = preview.type<{ args: { theme: 'light' | 'dark' } }>().meta({
     *   component: Button,
     * });
     * ```
     */
    type<R>(): VuePreview<T & R>;
    meta<C, Decorators extends DecoratorFunction<VueTypes & T, any>, TMetaArgs extends Partial<ComponentPropsAndSlots<C> & T['args']>>(meta: {
        component?: C;
        args?: TMetaArgs;
        decorators?: Decorators | Decorators[];
    } & Omit<ComponentAnnotations<VueTypes & T, ComponentPropsAndSlots<C> & T['args']>, 'decorators' | 'component' | 'args'>): VueMeta<InferVueTypes<T, ComponentPropsAndSlots<C>, Decorators>, Omit<ComponentAnnotations<InferVueTypes<T, ComponentPropsAndSlots<C>, Decorators>>, 'args'> & {
        args: {} extends TMetaArgs ? {} : TMetaArgs;
    }>;
    meta<TArgs extends Args, Decorators extends DecoratorFunction<VueTypes & T, any>, TMetaArgs extends Partial<TArgs>>(meta: {
        render?: ArgsStoryFn<VueTypes & T, TArgs>;
        args?: TMetaArgs;
        decorators?: Decorators | Decorators[];
    } & Omit<ComponentAnnotations<VueTypes & T, TArgs & T['args']>, 'decorators' | 'component' | 'args' | 'render'>): VueMeta<InferVueTypes<T, TArgs, Decorators>, Omit<ComponentAnnotations<InferVueTypes<T, TArgs, Decorators>>, 'args'> & {
        args: {} extends TMetaArgs ? {} : TMetaArgs;
    }>;
}
/** Extracts and unions all args types from an array of decorators. */
type DecoratorsArgs<TRenderer extends Renderer, Decorators> = UnionToIntersection<Decorators extends DecoratorFunction<TRenderer, infer TArgs> ? TArgs : unknown>;
/**
 * Vue3-specific Meta interface returned by `preview.meta()`.
 *
 * Provides the `story()` method to create individual stories with proper type inference. Args
 * provided in meta become optional in stories, while missing required args must be provided at the
 * story level.
 */
interface VueMeta<T extends VueTypes, MetaInput extends ComponentAnnotations<T>> extends Meta$1<T, MetaInput> {
    /**
     * Creates a story with a custom render function that takes no args.
     *
     * This overload allows you to define a story using just a render function or an object with a
     * render function that doesn't depend on args. Since the render function doesn't use args, no
     * args need to be provided regardless of what's required by the component.
     *
     * @example
     *
     * ```ts
     * // Using just a render function
     * export const CustomRender = meta.story(() => h('div', 'Custom content'));
     *
     * // Using defineComponent
     * export const WithDefineComponent = meta.story(() =>
     *   defineComponent({
     *     template: '<div>Static component</div>',
     *   })
     * );
     * ```
     */
    story<TInput extends (() => VueTypes['storyResult']) | (StoryAnnotations<T, T['args']> & {
        render: () => VueTypes['storyResult'];
    })>(story: TInput): VueStory<T, TInput extends () => VueTypes['storyResult'] ? {
        render: TInput;
    } : TInput>;
    /**
     * Creates a story with custom configuration including args, decorators, or other annotations.
     *
     * This is the primary overload for defining stories. Args that were already provided in meta
     * become optional, while any remaining required args must be specified here.
     *
     * @example
     *
     * ```ts
     * // Provide required args not in meta
     * export const Primary = meta.story({
     *   args: { label: 'Click me', disabled: false },
     * });
     *
     * // Override meta args and add story-specific configuration
     * export const Disabled = meta.story({
     *   args: { disabled: true },
     *   decorators: [withCustomWrapper],
     * });
     * ```
     */
    story<TInput extends Simplify<StoryAnnotations<T, T['args'], SetOptional<T['args'], keyof T['args'] & keyof MetaInput['args']>>>>(story: TInput): VueStory<T, TInput>;
    /**
     * Creates a story with no additional configuration.
     *
     * This overload is only available when all required args have been provided in meta. The
     * conditional type `Partial<T['args']> extends SetOptional<...>` checks if the remaining required
     * args (after accounting for args provided in meta) are all optional. If so, the function accepts
     * zero arguments `[]`. Otherwise, it requires `[never]` which makes this overload unmatchable,
     * forcing the user to provide args.
     *
     * @example
     *
     * ```ts
     * // When meta provides all required args, story() can be called with no arguments
     * const meta = preview.meta({ component: Button, args: { label: 'Hi', disabled: false } });
     * export const Default = meta.story(); // Valid - all args provided in meta
     * ```
     */
    story(..._args: Partial<T['args']> extends SetOptional<T['args'], keyof T['args'] & keyof MetaInput['args']> ? [] : [never]): VueStory<T, {}>;
}
/**
 * Vue3-specific Story interface returned by `meta.story()`.
 *
 * Represents a single story with its configuration and provides access to the composed story for
 * testing via `story.run()`.
 */
interface VueStory<T extends VueTypes, TInput extends StoryAnnotations<T, T['args']>> extends Story<T, TInput> {
}

export { type ComponentPropsAndSlots, type Decorator, type Loader, type Meta, type Preview, type StoryContext, type StoryFn, type StoryObj, type VueMeta, type VuePreview, type VueRenderer, type VueStory, type VueTypes, __definePreview, composeStories, composeStory, setProjectAnnotations, setup, vueProjectAnnotations };
