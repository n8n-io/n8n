"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var getDocblock_1 = __importDefault(require("./getDocblock"));
var getDoclets_1 = __importDefault(require("./getDoclets"));
var transformTagsIntoObject_1 = __importDefault(require("./transformTagsIntoObject"));
/**
 * Reads the data from a JSDoc block of a component
 * and adds it to the documentation object
 * @param componentCommentedPath the AST path of the component
 * @param documentation the documentation object to modify
 * @returns
 */
function handleComponentJSDoc(componentCommentedPath, documentation) {
    var docBlock = (0, getDocblock_1.default)(componentCommentedPath);
    // if no prop return
    if (!docBlock || !docBlock.length) {
        return Promise.resolve();
    }
    var jsDoc = (0, getDoclets_1.default)(docBlock);
    documentation.set('description', jsDoc.description);
    if (jsDoc.tags) {
        var displayNamesTags = jsDoc.tags.filter(function (t) { return t.title === 'displayName'; });
        if (displayNamesTags.length) {
            var displayName = displayNamesTags[0];
            documentation.set('displayName', displayName.content);
        }
        var tagsAsObject = (0, transformTagsIntoObject_1.default)(jsDoc.tags.filter(function (t) { return t.title !== 'example' && t.title !== 'displayName'; }) || []);
        var examples = jsDoc.tags.filter(function (t) { return t.title === 'example'; });
        if (examples.length) {
            tagsAsObject.examples = examples;
        }
        documentation.set('tags', tagsAsObject);
    }
    else {
        documentation.set('tags', {});
    }
    return Promise.resolve();
}
exports.default = handleComponentJSDoc;
