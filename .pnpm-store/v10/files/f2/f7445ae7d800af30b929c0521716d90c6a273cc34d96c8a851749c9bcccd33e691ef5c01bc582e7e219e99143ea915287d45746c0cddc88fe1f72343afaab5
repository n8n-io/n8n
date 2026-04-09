// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
import * as tsdoc from '@microsoft/tsdoc';
import { ApiItem } from './ApiItem';
/**
 * An abstract base class for API declarations that can have an associated TSDoc comment.
 *
 * @remarks
 *
 * This is part of the {@link ApiModel} hierarchy of classes, which are serializable representations of
 * API declarations.
 *
 * @public
 */
export class ApiDocumentedItem extends ApiItem {
    constructor(options) {
        super(options);
        this._tsdocComment = options.docComment;
    }
    /** @override */
    static onDeserializeInto(options, context, jsonObject) {
        super.onDeserializeInto(options, context, jsonObject);
        const documentedJson = jsonObject;
        if (documentedJson.docComment) {
            const tsdocParser = new tsdoc.TSDocParser(context.tsdocConfiguration);
            // NOTE: For now, we ignore TSDoc errors found in a serialized .api.json file.
            // Normally these errors would have already been reported by API Extractor during analysis.
            // However, they could also arise if the JSON file was edited manually, or if the file was saved
            // using a different release of the software that used an incompatible syntax.
            const parserContext = tsdocParser.parseString(documentedJson.docComment);
            options.docComment = parserContext.docComment;
        }
    }
    get tsdocComment() {
        return this._tsdocComment;
    }
    /** @override */
    serializeInto(jsonObject) {
        super.serializeInto(jsonObject);
        if (this.tsdocComment !== undefined) {
            jsonObject.docComment = this.tsdocComment.emitAsTsdoc();
        }
        else {
            jsonObject.docComment = '';
        }
    }
}
//# sourceMappingURL=ApiDocumentedItem.js.map