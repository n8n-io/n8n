import type { Part } from './part';
export type Theme<TParams = unknown> = {
    /**
     * Return a new theme that uses an theme part. The part will replace any
     * existing part of the same feature
     *
     * @param part a part, or a no-arg function that returns a part
     */
    withPart<TPartParams>(part: Part<TPartParams> | (() => Part<TPartParams>)): Theme<TParams & TPartParams>;
    /**
     * Return a new theme removes any existing part with a feature.
     *
     * @param feature the name of the part to remove, e.g. 'checkboxStyle'
     */
    withoutPart(feature: string): Theme<TParams>;
    /**
     * Return a new theme with different default values for the specified
     * params.
     *
     * @param defaults an object containing params e.g. {spacing: 10}
     */
    withParams(defaults: Partial<TParams>, mode?: string): Theme<TParams>;
};
