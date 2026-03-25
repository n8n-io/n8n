"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiDocumentedItem = void 0;
const tsdoc = __importStar(require("@microsoft/tsdoc"));
const ApiItem_1 = require("./ApiItem");
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
class ApiDocumentedItem extends ApiItem_1.ApiItem {
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
exports.ApiDocumentedItem = ApiDocumentedItem;
//# sourceMappingURL=ApiDocumentedItem.js.map