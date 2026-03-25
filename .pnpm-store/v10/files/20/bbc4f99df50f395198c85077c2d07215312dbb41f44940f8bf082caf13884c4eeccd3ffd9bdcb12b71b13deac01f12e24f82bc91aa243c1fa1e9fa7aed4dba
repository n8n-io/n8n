"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adapter = exports.serializeDoctypeContent = void 0;
const parse5_1 = require("parse5");
const domhandler_1 = require("domhandler");
function createTextNode(value) {
    return new domhandler_1.Text(value);
}
function enquoteDoctypeId(id) {
    const quote = id.includes('"') ? "'" : '"';
    return quote + id + quote;
}
/** @internal */
function serializeDoctypeContent(name, publicId, systemId) {
    let str = '!DOCTYPE ';
    if (name) {
        str += name;
    }
    if (publicId) {
        str += ` PUBLIC ${enquoteDoctypeId(publicId)}`;
    }
    else if (systemId) {
        str += ' SYSTEM';
    }
    if (systemId) {
        str += ` ${enquoteDoctypeId(systemId)}`;
    }
    return str;
}
exports.serializeDoctypeContent = serializeDoctypeContent;
exports.adapter = {
    // Re-exports from domhandler
    isCommentNode: domhandler_1.isComment,
    isElementNode: domhandler_1.isTag,
    isTextNode: domhandler_1.isText,
    //Node construction
    createDocument() {
        const node = new domhandler_1.Document([]);
        node['x-mode'] = parse5_1.html.DOCUMENT_MODE.NO_QUIRKS;
        return node;
    },
    createDocumentFragment() {
        return new domhandler_1.Document([]);
    },
    createElement(tagName, namespaceURI, attrs) {
        const attribs = Object.create(null);
        const attribsNamespace = Object.create(null);
        const attribsPrefix = Object.create(null);
        for (let i = 0; i < attrs.length; i++) {
            const attrName = attrs[i].name;
            attribs[attrName] = attrs[i].value;
            attribsNamespace[attrName] = attrs[i].namespace;
            attribsPrefix[attrName] = attrs[i].prefix;
        }
        const node = new domhandler_1.Element(tagName, attribs, []);
        node.namespace = namespaceURI;
        node['x-attribsNamespace'] = attribsNamespace;
        node['x-attribsPrefix'] = attribsPrefix;
        return node;
    },
    createCommentNode(data) {
        return new domhandler_1.Comment(data);
    },
    //Tree mutation
    appendChild(parentNode, newNode) {
        const prev = parentNode.children[parentNode.children.length - 1];
        if (prev) {
            prev.next = newNode;
            newNode.prev = prev;
        }
        parentNode.children.push(newNode);
        newNode.parent = parentNode;
    },
    insertBefore(parentNode, newNode, referenceNode) {
        const insertionIdx = parentNode.children.indexOf(referenceNode);
        const { prev } = referenceNode;
        if (prev) {
            prev.next = newNode;
            newNode.prev = prev;
        }
        referenceNode.prev = newNode;
        newNode.next = referenceNode;
        parentNode.children.splice(insertionIdx, 0, newNode);
        newNode.parent = parentNode;
    },
    setTemplateContent(templateElement, contentElement) {
        exports.adapter.appendChild(templateElement, contentElement);
    },
    getTemplateContent(templateElement) {
        return templateElement.children[0];
    },
    setDocumentType(document, name, publicId, systemId) {
        const data = serializeDoctypeContent(name, publicId, systemId);
        let doctypeNode = document.children.find((node) => (0, domhandler_1.isDirective)(node) && node.name === '!doctype');
        if (doctypeNode) {
            doctypeNode.data = data !== null && data !== void 0 ? data : null;
        }
        else {
            doctypeNode = new domhandler_1.ProcessingInstruction('!doctype', data);
            exports.adapter.appendChild(document, doctypeNode);
        }
        doctypeNode['x-name'] = name !== null && name !== void 0 ? name : undefined;
        doctypeNode['x-publicId'] = publicId !== null && publicId !== void 0 ? publicId : undefined;
        doctypeNode['x-systemId'] = systemId !== null && systemId !== void 0 ? systemId : undefined;
    },
    setDocumentMode(document, mode) {
        document['x-mode'] = mode;
    },
    getDocumentMode(document) {
        return document['x-mode'];
    },
    detachNode(node) {
        if (node.parent) {
            const idx = node.parent.children.indexOf(node);
            const { prev, next } = node;
            node.prev = null;
            node.next = null;
            if (prev) {
                prev.next = next;
            }
            if (next) {
                next.prev = prev;
            }
            node.parent.children.splice(idx, 1);
            node.parent = null;
        }
    },
    insertText(parentNode, text) {
        const lastChild = parentNode.children[parentNode.children.length - 1];
        if (lastChild && (0, domhandler_1.isText)(lastChild)) {
            lastChild.data += text;
        }
        else {
            exports.adapter.appendChild(parentNode, createTextNode(text));
        }
    },
    insertTextBefore(parentNode, text, referenceNode) {
        const prevNode = parentNode.children[parentNode.children.indexOf(referenceNode) - 1];
        if (prevNode && (0, domhandler_1.isText)(prevNode)) {
            prevNode.data += text;
        }
        else {
            exports.adapter.insertBefore(parentNode, createTextNode(text), referenceNode);
        }
    },
    adoptAttributes(recipient, attrs) {
        for (let i = 0; i < attrs.length; i++) {
            const attrName = attrs[i].name;
            if (typeof recipient.attribs[attrName] === 'undefined') {
                recipient.attribs[attrName] = attrs[i].value;
                recipient['x-attribsNamespace'][attrName] = attrs[i].namespace;
                recipient['x-attribsPrefix'][attrName] = attrs[i].prefix;
            }
        }
    },
    //Tree traversing
    getFirstChild(node) {
        return node.children[0];
    },
    getChildNodes(node) {
        return node.children;
    },
    getParentNode(node) {
        return node.parent;
    },
    getAttrList(element) {
        return element.attributes;
    },
    //Node data
    getTagName(element) {
        return element.name;
    },
    getNamespaceURI(element) {
        return element.namespace;
    },
    getTextNodeContent(textNode) {
        return textNode.data;
    },
    getCommentNodeContent(commentNode) {
        return commentNode.data;
    },
    getDocumentTypeNodeName(doctypeNode) {
        var _a;
        return (_a = doctypeNode['x-name']) !== null && _a !== void 0 ? _a : '';
    },
    getDocumentTypeNodePublicId(doctypeNode) {
        var _a;
        return (_a = doctypeNode['x-publicId']) !== null && _a !== void 0 ? _a : '';
    },
    getDocumentTypeNodeSystemId(doctypeNode) {
        var _a;
        return (_a = doctypeNode['x-systemId']) !== null && _a !== void 0 ? _a : '';
    },
    //Node types
    isDocumentTypeNode(node) {
        return (0, domhandler_1.isDirective)(node) && node.name === '!doctype';
    },
    // Source code location
    setNodeSourceCodeLocation(node, location) {
        if (location) {
            node.startIndex = location.startOffset;
            node.endIndex = location.endOffset;
        }
        node.sourceCodeLocation = location;
    },
    getNodeSourceCodeLocation(node) {
        return node.sourceCodeLocation;
    },
    updateNodeSourceCodeLocation(node, endLocation) {
        if (endLocation.endOffset != null)
            node.endIndex = endLocation.endOffset;
        node.sourceCodeLocation = Object.assign(Object.assign({}, node.sourceCodeLocation), endLocation);
    },
};
//# sourceMappingURL=index.js.map