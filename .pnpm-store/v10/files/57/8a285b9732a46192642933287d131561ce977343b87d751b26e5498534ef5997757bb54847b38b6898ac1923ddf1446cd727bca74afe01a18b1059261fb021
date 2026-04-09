import * as storybook_internal_csf from 'storybook/internal/csf';
import { AfterEach } from 'storybook/internal/types';
import { Selector, SelectorList, RunOptions, Spec } from 'axe-core';

type SelectorWithoutNode = Omit<Selector, 'Node'> | Omit<SelectorList, 'NodeList'>;
type ContextObjectWithoutNode = {
    include: SelectorWithoutNode;
    exclude?: SelectorWithoutNode;
} | {
    exclude: SelectorWithoutNode;
    include?: SelectorWithoutNode;
};
type ContextSpecWithoutNode = SelectorWithoutNode | ContextObjectWithoutNode;
type A11yTest = 'off' | 'todo' | 'error';
interface A11yParameters {
    /**
     * Context parameter for axe-core's run function, except without support for passing Nodes and
     * NodeLists directly.
     *
     * @see https://github.com/dequelabs/axe-core/blob/develop/doc/context.md
     */
    context?: ContextSpecWithoutNode;
    /**
     * Options for running axe-core.
     *
     * @see https://github.com/dequelabs/axe-core/blob/develop/doc/API.md#options-parameter
     */
    options?: RunOptions;
    /**
     * Configuration object for axe-core.
     *
     * @see https://github.com/dequelabs/axe-core/blob/develop/doc/API.md#api-name-axeconfigure
     */
    config?: Spec;
    /** Whether to disable accessibility tests. */
    disable?: boolean;
    /** Defines how accessibility violations should be handled: 'off', 'todo', or 'error'. */
    test?: A11yTest;
}

declare const decorators: storybook_internal_csf.DecoratorFunction[];
declare const afterEach: AfterEach<any>;
declare const initialGlobals: {
    a11y: {
        manual: boolean;
    };
    vision: undefined;
};
declare const parameters: {
    a11y: A11yParameters;
};

export { afterEach, decorators, initialGlobals, parameters };
