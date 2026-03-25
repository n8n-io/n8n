import { DeclarationReference } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItem, ApiItemKind } from '../items/ApiItem';
import { ApiItemContainerMixin, type IApiItemContainerMixinOptions } from '../mixins/ApiItemContainerMixin';
import { type IApiNameMixinOptions, ApiNameMixin } from '../mixins/ApiNameMixin';
/**
 * Constructor options for {@link ApiEntryPoint}.
 * @public
 */
export interface IApiEntryPointOptions extends IApiItemContainerMixinOptions, IApiNameMixinOptions {
}
declare const ApiEntryPoint_base: typeof ApiItem & (new (...args: any[]) => ApiNameMixin) & (new (...args: any[]) => ApiItemContainerMixin);
/**
 * Represents the entry point for an NPM package.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * `ApiEntryPoint` represents the entry point to an NPM package.  API Extractor does not currently support
 * analysis of multiple entry points, but the `ApiEntryPoint` object is included to support a future feature.
 * In the current implementation, `ApiEntryPoint.importPath` is always the empty string.
 *
 * For example, suppose the package.json file looks like this:
 *
 * ```json
 * {
 *   "name": "example-library",
 *   "version": "1.0.0",
 *   "main": "./lib/index.js",
 *   "typings": "./lib/index.d.ts"
 * }
 * ```
 *
 * In this example, the `ApiEntryPoint` would represent the TypeScript module for `./lib/index.js`.
 *
 * @public
 */
export declare class ApiEntryPoint extends ApiEntryPoint_base {
    constructor(options: IApiEntryPointOptions);
    /** @override */
    get kind(): ApiItemKind;
    /** @override */
    get containerKey(): string;
    /**
     * The module path for this entry point, relative to the parent `ApiPackage`.  In the current implementation,
     * this is always the empty string, indicating the default entry point.
     *
     * @remarks
     *
     * API Extractor does not currently support analysis of multiple entry points.  If that feature is implemented
     * in the future, then the `ApiEntryPoint.importPath` will be used to distinguish different entry points,
     * for example: `controls/Button` in `import { Button } from "example-package/controls/Button";`.
     *
     * The `ApiEntryPoint.name` property stores the same value as `ApiEntryPoint.importPath`.
     */
    get importPath(): string;
    /** @beta @override */
    buildCanonicalReference(): DeclarationReference;
}
export {};
//# sourceMappingURL=ApiEntryPoint.d.ts.map