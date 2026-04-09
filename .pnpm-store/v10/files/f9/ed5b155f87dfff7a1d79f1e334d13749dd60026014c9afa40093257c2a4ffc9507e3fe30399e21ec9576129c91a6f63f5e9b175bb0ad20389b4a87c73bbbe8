// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DeclarationReference } from '@microsoft/tsdoc/lib-commonjs/beta/DeclarationReference';
import { ApiItem, ApiItemKind } from '../items/ApiItem';
import { ApiItemContainerMixin } from '../mixins/ApiItemContainerMixin';
import { ApiNameMixin } from '../mixins/ApiNameMixin';
import { ApiPackage } from './ApiPackage';
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
export class ApiEntryPoint extends ApiItemContainerMixin(ApiNameMixin(ApiItem)) {
    constructor(options) {
        super(options);
    }
    /** @override */
    get kind() {
        return ApiItemKind.EntryPoint;
    }
    /** @override */
    get containerKey() {
        // No prefix needed, because ApiEntryPoint is the only possible member of an ApiPackage
        return this.name;
    }
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
    get importPath() {
        return this.name;
    }
    /** @beta @override */
    buildCanonicalReference() {
        if (this.parent instanceof ApiPackage) {
            return DeclarationReference.package(this.parent.name, this.importPath);
        }
        return DeclarationReference.empty();
    }
}
//# sourceMappingURL=ApiEntryPoint.js.map