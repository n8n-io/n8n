import * as storybook_internal_csf from 'storybook/internal/csf';
import { Selector, SelectorList, RunOptions, Spec, AxeResults, Result, NodeResult } from 'axe-core';

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
interface A11yParameters$1 {
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

type A11yReport = EnhancedResults | {
    error: Error;
};
interface A11yParameters {
    /**
     * Accessibility configuration
     *
     * @see https://storybook.js.org/docs/writing-tests/accessibility-testing
     */
    a11y?: A11yParameters$1;
}
interface A11yGlobals {
    /**
     * Accessibility configuration
     *
     * @see https://storybook.js.org/docs/writing-tests/accessibility-testing
     */
    a11y?: {
        /**
         * Prevent the addon from executing automated accessibility checks upon visiting a story. You
         * can still trigger the checks from the addon panel.
         *
         * @see https://storybook.js.org/docs/writing-tests/accessibility-testing#disable-automated-checks
         */
        manual?: boolean;
    };
}
type EnhancedNodeResult = NodeResult & {
    linkPath: string;
};
type EnhancedResult = Omit<Result, 'nodes'> & {
    nodes: EnhancedNodeResult[];
};
type EnhancedResults = Omit<AxeResults, 'incomplete' | 'passes' | 'violations'> & {
    incomplete: EnhancedResult[];
    passes: EnhancedResult[];
    violations: EnhancedResult[];
};
interface A11yTypes {
    parameters: A11yParameters;
    globals: A11yGlobals;
}

declare const PARAM_KEY = "a11y";

declare const _default: () => storybook_internal_csf.PreviewAddon<A11yTypes>;

export { type A11yGlobals, type A11yParameters$1 as A11yParameters, type A11yReport, type A11yTypes, type ContextObjectWithoutNode, type ContextSpecWithoutNode, PARAM_KEY, type SelectorWithoutNode, _default as default };
