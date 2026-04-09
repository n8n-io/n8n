/**
 * These are types for things that are present in the React `canary` release channel.
 *
 * To load the types declared here in an actual project, there are three ways. The easiest one,
 * if your `tsconfig.json` already has a `"types"` array in the `"compilerOptions"` section,
 * is to add `"react/canary"` to the `"types"` array.
 *
 * Alternatively, a specific import syntax can to be used from a typescript file.
 * This module does not exist in reality, which is why the {} is important:
 *
 * ```ts
 * import {} from 'react/canary'
 * ```
 *
 * It is also possible to include it through a triple-slash reference:
 *
 * ```ts
 * /// <reference types="react/canary" />
 * ```
 *
 * Either the import or the reference only needs to appear once, anywhere in the project.
 */

// See https://github.com/facebook/react/blob/main/packages/react/src/React.js to see how the exports are declared,

import React = require(".");

export {};

declare const UNDEFINED_VOID_ONLY: unique symbol;
type VoidOrUndefinedOnly = void | { [UNDEFINED_VOID_ONLY]: never };

type NativeSubmitEvent = SubmitEvent;

declare module "." {
    export function unstable_useCacheRefresh(): () => void;

    // @enableViewTransition
    export interface ViewTransitionInstance {
        /**
         * The {@link ViewTransitionProps name} that was used in the corresponding {@link ViewTransition} component or `"auto"` if the `name` prop was omitted.
         */
        name: string;
    }

    export type ViewTransitionClassPerType = Record<"default" | (string & {}), "none" | "auto" | (string & {})>;
    export type ViewTransitionClass = ViewTransitionClassPerType | ViewTransitionClassPerType[string];

    export interface ViewTransitionProps {
        children?: ReactNode | undefined;
        /**
         * Assigns the {@link https://developer.chrome.com/blog/view-transitions-update-io24#view-transition-class `view-transition-class`} class to the underlying DOM node.
         */
        default?: ViewTransitionClass | undefined;
        /**
         * Combined with {@link className} if this `<ViewTransition>` or its parent Component is mounted and there's no other with the same name being deleted.
         * `"none"` is a special value that deactivates the view transition name under that condition.
         */
        enter?: ViewTransitionClass | undefined;
        /**
         * Combined with {@link className} if this `<ViewTransition>` or its parent Component is unmounted and there's no other with the same name being deleted.
         * `"none"` is a special value that deactivates the view transition name under that condition.
         */
        exit?: ViewTransitionClass | undefined;
        /**
         * "auto" will automatically assign a view-transition-name to the inner DOM node.
         * That way you can add a View Transition to a Component without controlling its DOM nodes styling otherwise.
         *
         * A difference between this and the browser's built-in view-transition-name: auto is that switching the DOM nodes within the `<ViewTransition>` component preserves the same name so this example cross-fades between the DOM nodes instead of causing an exit and enter.
         * @default "auto"
         */
        name?: "auto" | (string & {}) | undefined;
        /**
         * The `<ViewTransition>` or its parent Component is mounted and there's no other `<ViewTransition>` with the same name being deleted.
         */
        onEnter?: (instance: ViewTransitionInstance, types: Array<string>) => void | (() => void);
        /**
         * The `<ViewTransition>` or its parent Component is unmounted and there's no other `<ViewTransition>` with the same name being deleted.
         */
        onExit?: (instance: ViewTransitionInstance, types: Array<string>) => void | (() => void);
        /**
         * This `<ViewTransition>` is being mounted and another `<ViewTransition>` instance with the same name is being unmounted elsewhere.
         */
        onShare?: (instance: ViewTransitionInstance, types: Array<string>) => void | (() => void);
        /**
         * The content of `<ViewTransition>` has changed either due to DOM mutations or because an inner child `<ViewTransition>` has resized.
         */
        onUpdate?: (instance: ViewTransitionInstance, types: Array<string>) => void | (() => void);
        ref?: Ref<ViewTransitionInstance> | undefined;
        /**
         * Combined with {@link className} if this `<ViewTransition>` is being mounted and another instance with the same name is being unmounted elsewhere.
         * `"none"` is a special value that deactivates the view transition name under that condition.
         */
        share?: ViewTransitionClass | undefined;
        /**
         * Combined with {@link className} if the content of this `<ViewTransition>` has changed either due to DOM mutations or because an inner child has resized.
         * `"none"` is a special value that deactivates the view transition name under that condition.
         */
        update?: ViewTransitionClass | undefined;
    }

    /**
     * Opt-in for using {@link https://developer.mozilla.org/en-US/docs/Web/API/View_Transition_API View Transitions} in React.
     * View Transitions only trigger for async updates like {@link startTransition}, {@link useDeferredValue}, Actions or <{@link Suspense}> revealing from fallback to content.
     * Synchronous updates provide an opt-out but also guarantee that they commit immediately which View Transitions can't.
     *
     * @see {@link https://react.dev/reference/react/ViewTransition `<ViewTransition>` reference documentation}
     */
    export const ViewTransition: ExoticComponent<ViewTransitionProps>;

    /**
     * @see {@link https://react.dev/reference/react/addTransitionType `addTransitionType` reference documentation}
     */
    export function addTransitionType(type: string): void;

    // @enableFragmentRefs
    export interface FragmentInstance {}

    export interface FragmentProps {
        ref?: Ref<FragmentInstance> | undefined;
    }

    interface SubmitEvent<T = Element> extends SyntheticEvent<T, NativeSubmitEvent> {
        /**
         * Only available in react@canary
         */
        submitter: HTMLElement | null;
    }
}
