interface ComponentResolverOption {
    /**
     * Prefix for resolving components name.
     * Set '' to disable prefix.
     *
     * @default 'i'
     */
    prefix?: string | false;
    /**
     * Iconify collection names to that enable for resolving.
     *
     * @default [all collections]
     */
    enabledCollections?: string | string[];
    /**
     * Icon collections aliases.
     *
     * The `aliases` keys are the `alias` and the values are the `name` for the collection.
     *
     * Instead using `<i-icon-park-abnormal />` we can use `<i-park-abnormal />` configuring:
     * `alias: { park: 'icon-park' }`
     */
    alias?: Record<string, string>;
    /**
     * Name for custom collections provide by loaders.
     */
    customCollections?: string | string[];
    /**
     * Extension for the resolved id
     * Set `jsx` for JSX components
     *
     * @default ''
     */
    extension?: string;
    /**
     * @deprecated renamed to `prefix`
     */
    componentPrefix?: string;
    /**
     * For collections strict matching.
     * Default is `false`, not side effect.
     * Set `true` to enable strict matching with `-` suffix for all collections.
     */
    strict?: boolean;
}
/**
 * Resolver for unplugin-vue-components and unplugin-auto-import
 *
 * @param options
 */
declare function ComponentsResolver(options?: ComponentResolverOption): (name: string) => string | undefined;

export { type ComponentResolverOption, ComponentsResolver as default };
