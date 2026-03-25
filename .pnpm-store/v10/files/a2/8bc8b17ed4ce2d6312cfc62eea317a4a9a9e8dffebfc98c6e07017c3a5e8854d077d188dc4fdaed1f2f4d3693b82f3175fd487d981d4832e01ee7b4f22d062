"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.InternalDeclarationMetadata = exports.DeclarationMetadata = void 0;
/**
 * Stores the Collector's additional analysis for a specific `AstDeclaration` signature.  This object is assigned to
 * `AstDeclaration.declarationMetadata` but consumers must always obtain it by calling
 * `Collector.fetchDeclarationMetadata()`.
 *
 * Note that ancillary declarations share their `ApiItemMetadata` with the main declaration,
 * whereas a separate `DeclarationMetadata` object is created for each declaration.
 */
class DeclarationMetadata {
}
exports.DeclarationMetadata = DeclarationMetadata;
/**
 * Used internally by the `Collector` to build up `DeclarationMetadata`.
 */
class InternalDeclarationMetadata extends DeclarationMetadata {
    constructor() {
        super(...arguments);
        this.tsdocParserContext = undefined;
        this.isAncillary = false;
        this.ancillaryDeclarations = [];
    }
}
exports.InternalDeclarationMetadata = InternalDeclarationMetadata;
//# sourceMappingURL=DeclarationMetadata.js.map