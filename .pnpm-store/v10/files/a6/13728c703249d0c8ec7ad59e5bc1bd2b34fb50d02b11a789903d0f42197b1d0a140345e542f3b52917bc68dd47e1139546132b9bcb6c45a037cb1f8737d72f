/**
 * An MDX file which exports a JSX component.
 *
 * The default export of MDX files is a function which takes props and returns a JSX element.
 * MDX files can export other identifiers from within the MDX file as well, either authored manually
 * or automatically through plugins
 *
 * It’s currently not possible for the other exports to be typed automatically.
 * You can type them yourself with a TypeScript
 * [script](https://www.typescriptlang.org/docs/handbook/2/modules.html#non-modules)
 * which augments `*.mdx` modules.
 * A script file is a file which doesn’t use top-level ESM syntax, but ESM syntax
 * is allowed inside the declared module.
 *
 * This is typically useful for exports created by plugins. For example:
 *
 * ```ts
 * // mdx-custom.d.ts
 * declare module '*.mdx' {
 *   import { Frontmatter } from 'my-frontmatter-types';
 *
 *   export const frontmatter: Frontmatter;
 *   export const title: string;
 * }
 * ```
 *
 * The previous example added types to *all* `.mdx` files.
 * To define types for a specific MDX file, create a file with the same name but postfixed with
 * `.d.ts` next to the MDX file.
 *
 * For example, given the following MDX file `my-component.mdx`:
 *
 * ```mdx
 * export const message = 'world';
 *
 * # Hello {message}
 * ```
 *
 * Create the following file named `my-component.mdx.d.ts` in the same directory:
 *
 * ```ts
 * export { default } from '*.mdx';
 *
 * export const message: string;
 * ```
 *
 * Note that this overwrites the `declare module '*.mdx' { … }` types from earlier, which is why you
 * also need to define the default export. You can also define your own default export type to narrow
 * the accepted prop types of this specific file.
 *
 * It should now be possible to import both the MDX component and the exported constant `message`.
 */
declare module "*.mdx" {
    // eslint-disable-next-line @definitelytyped/no-self-import
    import { Element, MDXProps } from "mdx/types";

    /**
     * An function component which renders the MDX content using JSX.
     *
     * @param props This value is be available as the named variable `props` inside the MDX component.
     * @returns A JSX element. The meaning of this may depend on the project configuration. I.e. it
     * could be a React, Preact, or Vuex element.
     */
    export default function MDXContent(props: MDXProps): Element;
}

// Support markdown extensions from
// https://github.com/sindresorhus/markdown-extensions/blob/v1.1.1/markdown-extensions.json

/**
 * A markdown file which exports a JSX component.
 */
declare module "*.md" {
    export { default } from "*.mdx";
}

/**
 * A markdown file which exports a JSX component.
 */
declare module "*.markdown" {
    export { default } from "*.mdx";
}

/**
 * A markdown file which exports a JSX component.
 */
declare module "*.mdown" {
    export { default } from "*.mdx";
}

/**
 * A markdown file which exports a JSX component.
 */
declare module "*.mkdn" {
    export { default } from "*.mdx";
}

/**
 * A markdown file which exports a JSX component.
 */
declare module "*.mkd" {
    export { default } from "*.mdx";
}

/**
 * A markdown file which exports a JSX component.
 */
declare module "*.mkdown" {
    export { default } from "*.mdx";
}

/**
 * A markdown file which exports a JSX component.
 */
declare module "*.ron" {
    export { default } from "*.mdx";
}
