// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DocNodeKind, DocNode } from './DocNode';
import { DocExcerpt, ExcerptKind } from './DocExcerpt';
import { DocInlineTagBase } from './DocInlineTagBase';
/**
 * Represents a generic TSDoc inline tag, including custom tags.
 *
 * @remarks
 * NOTE: Certain tags such as `{@link}` and `{@inheritDoc}` have specialized structures and parser rules,
 * and thus are represented using {@link DocLinkTag} or {@link DocInheritDocTag} instead.  However, if the
 * specialized parser rule encounters a syntax error, but the outer framing is correct, then the parser constructs
 * a generic `DocInlineTag` instead of `DocErrorText`.  This means, for example, that it is possible sometimes for
 * `DocInlineTag.tagName` to be `"@link"`.
 */
export class DocInlineTag extends DocInlineTagBase {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        if (DocNode.isParsedParameters(parameters)) {
            if (parameters.tagContentExcerpt) {
                this._tagContentExcerpt = new DocExcerpt({
                    configuration: this.configuration,
                    excerptKind: ExcerptKind.InlineTag_TagContent,
                    content: parameters.tagContentExcerpt
                });
            }
        }
        else {
            this._tagContent = parameters.tagContent;
        }
    }
    /** @override */
    get kind() {
        return DocNodeKind.InlineTag;
    }
    /**
     * The tag content.
     * @remarks
     * For example, if the tag is `{@myTag x=12.34 y=56.78 }` then the tag content
     * would be `x=12.34 y=56.78 `, including the trailing space but not the leading space.
     */
    get tagContent() {
        if (this._tagContent === undefined) {
            if (this._tagContentExcerpt) {
                this._tagContent = this._tagContentExcerpt.content.toString();
            }
            else {
                return '';
            }
        }
        return this._tagContent;
    }
    /** @override */
    getChildNodesForContent() {
        // abstract
        return [this._tagContentExcerpt];
    }
}
//# sourceMappingURL=DocInlineTag.js.map