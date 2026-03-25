/**
 * Possible transformation options for the @Transform decorator.
 */
export interface TransformOptions {
    /**
     * First version where this property should be exposed.
     *
     * Example:
     * ```ts
     * instanceToPlain(payload, { version: 1.0 });
     * ```
     */
    since?: number;
    /**
     * Last version where this property should be exposed.
     *
     * Example:
     * ```ts
     * instanceToPlain(payload, { version: 1.0 });
     * ```
     */
    until?: number;
    /**
     * List of transformation groups this property belongs to. When set,
     * the property will be exposed only when transform is called with
     * one of the groups specified.
     *
     * Example:
     * ```ts
     * instanceToPlain(payload, { groups: ['user'] });
     * ```
     */
    groups?: string[];
    /**
     * Expose this property only when transforming from plain to class instance.
     */
    toClassOnly?: boolean;
    /**
     * Expose this property only when transforming from class instance to plain object.
     */
    toPlainOnly?: boolean;
}
