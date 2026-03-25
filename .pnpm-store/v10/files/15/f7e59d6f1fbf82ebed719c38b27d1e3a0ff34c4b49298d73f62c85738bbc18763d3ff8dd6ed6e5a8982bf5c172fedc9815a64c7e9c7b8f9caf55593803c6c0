/**
 * @type {CustomElementRegistry}
 */
export const registry: CustomElementRegistry;
export function define(name: string, constr: any, opts?: ElementDefinitionOptions): void;
export function whenDefined(name: string): Promise<CustomElementConstructor>;
/**
 * @template S
 */
export class Lib0Component<S> extends HTMLElement {
    /**
     * @param {S} [state]
     */
    constructor(state?: S);
    /**
     * @type {S|null}
     */
    state: S | null;
    /**
     * @type {any}
     */
    _internal: any;
    /**
     * @param {S} _state
     * @param {boolean} [_forceStateUpdate] Force that the state is rerendered even if state didn't change
     */
    setState(_state: S, _forceStateUpdate?: boolean): void;
    /**
      * @param {any} _stateUpdate
      */
    updateState(_stateUpdate: any): void;
}
export function createComponent<T>(name: string, { template, style, state: defaultState, onStateChange, childStates, attrs, listeners, slots }: CONF<T>): typeof Lib0Component;
export function createComponentDefiner(definer: Function): () => any;
export function defineListComponent(): any;
export function defineLazyLoadingComponent(): any;
export type CONF<S> = {
    /**
     * Template for the shadow dom.
     */
    template?: string | null | undefined;
    /**
     * shadow dom style. Is only used when
     * `CONF.template` is defined
     */
    style?: string | undefined;
    /**
     * Initial component state.
     */
    state?: S | undefined;
    /**
     * Called when
     * the state changes.
     */
    onStateChange?: ((arg0: S, arg1: S | null, arg2: Lib0Component<S>) => void) | undefined;
    /**
     * maps from
     * CSS-selector to transformer function. The first element that matches the
     * CSS-selector receives state updates via the transformer function.
     */
    childStates?: {
        [x: string]: (arg0: any, arg1: any) => Object;
    } | undefined;
    /**
     * attrs-keys and state-keys should be camelCase, but the DOM uses kebap-case. I.e.
     * `attrs = { myAttr: 4 }` is represeted as `<my-elem my-attr="4" />` in the DOM
     */
    attrs?: {
        [x: string]: "string" | "number" | "json" | "bool";
    } | undefined;
    /**
     * Maps from dom-event-name
     * to event listener.
     */
    listeners?: {
        [x: string]: (arg0: CustomEvent, arg1: Lib0Component<any>) => boolean | void;
    } | undefined;
    /**
     * Fill slots
     * automatically when state changes. Maps from slot-name to slot-html.
     */
    slots?: ((arg0: S, arg1: S, arg2: Lib0Component<S>) => {
        [x: string]: string;
    }) | undefined;
};
//# sourceMappingURL=component.d.ts.map