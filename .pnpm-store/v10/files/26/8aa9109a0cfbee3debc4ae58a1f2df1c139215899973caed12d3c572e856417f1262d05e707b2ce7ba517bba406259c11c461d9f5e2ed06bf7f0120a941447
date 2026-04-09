// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DocNodeKind, DocNode } from './DocNode';
import { DocExcerpt, ExcerptKind } from './DocExcerpt';
/**
 * Instructs a renderer to insert an explicit newline in the output.
 * (Normally the renderer uses a formatting rule to determine where
 * lines should wrap.)
 *
 * @remarks
 * In HTML, a soft break is represented as an ASCII newline character (which does not
 * affect the web browser's view), whereas the hard break is the `<br />` element
 * (which starts a new line in the web browser's view).
 *
 * TSDoc follows the same conventions, except the renderer avoids emitting
 * two empty lines (because that could start a new CommonMark paragraph).
 */
export class DocSoftBreak extends DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        if (DocNode.isParsedParameters(parameters)) {
            // The type is IDocNodeParsedParameters, which is a base of IDocSoftBreakParsedParameters
            // but not a base of IDocSoftBreakParameters. Therefore the type must be IDocSoftBreakParsedParameters.
            // TypeScript 4 could infer this, but for some reason TypeScript 5 cannot.
            const parsedParameters = parameters;
            this._softBreakExcerpt = new DocExcerpt({
                configuration: this.configuration,
                excerptKind: ExcerptKind.SoftBreak,
                content: parsedParameters.softBreakExcerpt
            });
        }
    }
    /** @override */
    get kind() {
        return DocNodeKind.SoftBreak;
    }
    /** @override */
    onGetChildNodes() {
        return [this._softBreakExcerpt];
    }
}
//# sourceMappingURL=DocSoftBreak.js.map