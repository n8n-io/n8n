// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
/**
 * Stores the Collector's additional analysis for a specific `AstDeclaration` signature.  This object is assigned to
 * `AstDeclaration.declarationMetadata` but consumers must always obtain it by calling
 * `Collector.fetchDeclarationMetadata()`.
 *
 * Note that ancillary declarations share their `ApiItemMetadata` with the main declaration,
 * whereas a separate `DeclarationMetadata` object is created for each declaration.
 */
export class DeclarationMetadata {
}
/**
 * Used internally by the `Collector` to build up `DeclarationMetadata`.
 */
export class InternalDeclarationMetadata extends DeclarationMetadata {
    constructor() {
        super(...arguments);
        this.tsdocParserContext = undefined;
        this.isAncillary = false;
        this.ancillaryDeclarations = [];
    }
}
//# sourceMappingURL=DeclarationMetadata.js.map