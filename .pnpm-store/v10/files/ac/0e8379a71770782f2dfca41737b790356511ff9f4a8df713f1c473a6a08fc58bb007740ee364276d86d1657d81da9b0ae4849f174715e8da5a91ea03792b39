/**
 * Get current components from the MDX Context.
 *
 * @param {Readonly<MDXComponents> | MergeComponents | null | undefined} [components]
 *   Additional components to use or a function that creates them (optional).
 * @returns {MDXComponents}
 *   Current components.
 */
export function useMDXComponents(components?: Readonly<MDXComponents> | MergeComponents | null | undefined): MDXComponents;
/**
 * Provider for MDX context.
 *
 * @param {Readonly<Props>} properties
 *   Properties.
 * @returns {JSX.Element}
 *   Element.
 * @satisfies {Component}
 */
export function MDXProvider(properties: Readonly<Props>): JSX.Element;
export type MDXComponents = import('mdx/types.js').MDXComponents;
export type Component = import('react').Component<{}, {}, unknown>;
export type ReactNode = import('react').ReactNode;
/**
 * Custom merge function.
 */
export type MergeComponents = (currentComponents: Readonly<MDXComponents>) => MDXComponents;
/**
 * Configuration for `MDXProvider`.
 */
export type Props = {
    /**
     * Children (optional).
     */
    children?: ReactNode | null | undefined;
    /**
     * Additional components to use or a function that creates them (optional).
     */
    components?: Readonly<MDXComponents> | MergeComponents | null | undefined;
    /**
     * Turn off outer component context (default: `false`).
     */
    disableParentContext?: boolean | null | undefined;
};
//# sourceMappingURL=index.d.ts.map