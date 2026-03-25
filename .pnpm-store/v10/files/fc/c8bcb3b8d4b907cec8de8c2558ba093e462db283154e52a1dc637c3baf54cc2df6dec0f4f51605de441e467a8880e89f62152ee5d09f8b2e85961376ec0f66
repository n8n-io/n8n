"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocNode = exports.DocNodeKind = void 0;
/**
 * Indicates the type of {@link DocNode}.
 *
 * @remarks
 * When creating custom subclasses of `DocNode`, it's recommended to create your own enum to identify them.
 * To avoid naming conflicts between projects, the enum value should be a string comprised of your full
 * NPM package name, followed by a "#" symbol, followed by the class name (without the "Doc" prefix).
 */
var DocNodeKind;
(function (DocNodeKind) {
    DocNodeKind["Block"] = "Block";
    DocNodeKind["BlockTag"] = "BlockTag";
    DocNodeKind["Excerpt"] = "Excerpt";
    DocNodeKind["FencedCode"] = "FencedCode";
    DocNodeKind["CodeSpan"] = "CodeSpan";
    DocNodeKind["Comment"] = "Comment";
    DocNodeKind["DeclarationReference"] = "DeclarationReference";
    DocNodeKind["ErrorText"] = "ErrorText";
    DocNodeKind["EscapedText"] = "EscapedText";
    DocNodeKind["HtmlAttribute"] = "HtmlAttribute";
    DocNodeKind["HtmlEndTag"] = "HtmlEndTag";
    DocNodeKind["HtmlStartTag"] = "HtmlStartTag";
    DocNodeKind["InheritDocTag"] = "InheritDocTag";
    DocNodeKind["InlineTag"] = "InlineTag";
    DocNodeKind["LinkTag"] = "LinkTag";
    DocNodeKind["MemberIdentifier"] = "MemberIdentifier";
    DocNodeKind["MemberReference"] = "MemberReference";
    DocNodeKind["MemberSelector"] = "MemberSelector";
    DocNodeKind["MemberSymbol"] = "MemberSymbol";
    DocNodeKind["Paragraph"] = "Paragraph";
    DocNodeKind["ParamBlock"] = "ParamBlock";
    DocNodeKind["ParamCollection"] = "ParamCollection";
    DocNodeKind["PlainText"] = "PlainText";
    DocNodeKind["Section"] = "Section";
    DocNodeKind["SoftBreak"] = "SoftBreak";
})(DocNodeKind || (exports.DocNodeKind = DocNodeKind = {}));
/**
 * The base class for the parser's Abstract Syntax Tree nodes.
 */
var DocNode = /** @class */ (function () {
    function DocNode(parameters) {
        this.configuration = parameters.configuration;
    }
    /**
     * Returns the list of child nodes for this node.  This is useful for visitors that want
     * to scan the tree looking for nodes of a specific type, without having to process
     * intermediary nodes.
     */
    DocNode.prototype.getChildNodes = function () {
        // Do this sanity check here, since the constructor cannot access abstract members
        this.configuration.docNodeManager.throwIfNotRegisteredKind(this.kind);
        return this.onGetChildNodes().filter(function (x) { return x !== undefined; });
    };
    /**
     * Overridden by child classes to implement {@link DocNode.getChildNodes}.
     * @virtual
     */
    DocNode.prototype.onGetChildNodes = function () {
        return [];
    };
    /**
     * A type guard that returns true if the input uses the `IDocNodeParsedParameters` (parser scenario).
     *
     * @remarks
     * There are two scenarios for constructing `DocNode` objects.  The "builder scenario" constructs the object based on
     * literal strings, does NOT create DocExcerpt child nodes, and generally uses the {@link IDocNodeParameters}
     * hierarchy for its constructor parameters.  The "parser scenario" constructs the object by parsing a TypeScript
     * source file, does create DocExcerpt child nodes, and generally uses the {@link IDocNodeParsedParameters} hierarchy.
     */
    DocNode.isParsedParameters = function (parameters) {
        return parameters.parsed === true;
    };
    return DocNode;
}());
exports.DocNode = DocNode;
//# sourceMappingURL=DocNode.js.map