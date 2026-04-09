// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import { DocNodeKind, DocNode } from './DocNode';
import { DocExcerpt, ExcerptKind } from './DocExcerpt';
/**
 * Represents a span of text that contained invalid markup.
 * The characters should be rendered as plain text.
 */
export class DocErrorText extends DocNode {
    /**
     * Don't call this directly.  Instead use {@link TSDocParser}
     * @internal
     */
    constructor(parameters) {
        super(parameters);
        this._textExcerpt = new DocExcerpt({
            configuration: this.configuration,
            excerptKind: ExcerptKind.ErrorText,
            content: parameters.textExcerpt
        });
        this._messageId = parameters.messageId;
        this._errorMessage = parameters.errorMessage;
        this._errorLocation = parameters.errorLocation;
    }
    /** @override */
    get kind() {
        return DocNodeKind.ErrorText;
    }
    /**
     * The characters that should be rendered as plain text because they
     * could not be parsed successfully.
     */
    get text() {
        if (this._text === undefined) {
            this._text = this._textExcerpt.content.toString();
        }
        return this._text;
    }
    get textExcerpt() {
        if (this._textExcerpt) {
            return this._textExcerpt.content;
        }
        else {
            return undefined;
        }
    }
    /**
     * The TSDoc error message identifier.
     */
    get messageId() {
        return this._messageId;
    }
    /**
     * A description of why the character could not be parsed.
     */
    get errorMessage() {
        return this._errorMessage;
    }
    /**
     * The range of characters that caused the error.  In general these may be
     * somewhat farther ahead in the input stream from the DocErrorText node itself.
     *
     * @remarks
     * For example, for the malformed HTML tag `<a href="123" @ /a>`, the DocErrorText node
     * will correspond to the `<` character that looked like an HTML tag, whereas the
     * error location might be the `@` character that caused the trouble.
     */
    get errorLocation() {
        return this._errorLocation;
    }
    /** @override */
    onGetChildNodes() {
        return [this._textExcerpt];
    }
}
//# sourceMappingURL=DocErrorText.js.map