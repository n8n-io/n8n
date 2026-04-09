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
 * @returns {ReactElement}
 *   Element.
 * @satisfies {Component}
 */
export function MDXProvider(properties: Readonly<Props>): React.ReactElement;
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
    children?: React.ReactNode | null | undefined;
    /**
     * Additional components to use or a function that creates them (optional).
     */
    components?: Readonly<MDXComponents> | MergeComponents | null | undefined;
    /**
     * Turn off outer component context (default: `false`).
     */
    disableParentContext?: boolean | null | undefined;
};
import type { MDXComponents } from 'mdx/types.js';
import React from 'react';
//# sourceMappingURL=index.d.ts.map