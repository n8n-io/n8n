import { WebRenderer, Canvas, StoryContext as StoryContext$1, Args, ComponentAnnotations, AnnotatedStoryFn, ArgsStoryFn, ArgsFromMeta, StoryAnnotations, StrictArgs, DecoratorFunction, LoaderFunction, ProjectAnnotations, NamedOrDefaultProjectAnnotations, NormalizedProjectAnnotations, StoryAnnotationsOrFn, ComposedStoryFn, Store_CSFExports, StoriesWithPartialProps } from 'storybook/internal/types';
export { ArgTypes, Args, Parameters, StrictArgs } from 'storybook/internal/types';
import { ConcreteComponent, App, VNodeChild, FunctionalComponent } from 'vue';
import { Constructor, RemoveIndexSignature, Simplify, SetOptional } from 'type-fest';
import { ComponentProps, ComponentSlots } from 'vue-component-type-helpers';

type StoryFnVueReturnType = ConcreteComponent<any>;
interface VueRenderer extends WebRenderer {
    component: Omit<ConcreteComponent<this['T']>, 'props'>;
    storyResult: StoryFnVueReturnType;
    mount: (Component?: StoryFnVueReturnType, options?: {
        props?: Record<string, any>;
        slots?: Record<string, any>;
    }) => Promise<Canvas>;
}

declare const setup: (fn: (app: App, storyContext?: StoryContext$1<VueRenderer>) => unknown) => void;

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

export { type ComponentPropsAndSlots, type Decorator, type Loader, type Meta, type Preview, type StoryContext, type StoryFn, type StoryObj, type VueRenderer, composeStories, composeStory, setProjectAnnotations, setup, vueProjectAnnotations };
