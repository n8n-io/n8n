'use strict';

const doctype = require('parse5/lib/common/doctype');
const { DOCUMENT_MODE } = require('parse5/lib/common/html');

//Conversion tables for DOM Level1 structure emulation
const nodeTypes = {
    element: 1,
    text: 3,
    cdata: 4,
    comment: 8
};

const nodePropertyShorthands = {
    tagName: 'name',
    childNodes: 'children',
    parentNode: 'parent',
    previousSibling: 'prev',
    nextSibling: 'next',
    nodeValue: 'data'
};

//Node
class Node {
    constructor(props) {
        for (const key of Object.keys(props)) {
            this[key] = props[key];
        }
    }

    get firstChild() {
        const children = this.children;

        return (children && children[0]) || null;
    }

    get lastChild() {
        const children = this.children;

        return (children && children[children.length - 1]) || null;
    }

    get nodeType() {
        return nodeTypes[this.type] || nodeTypes.element;
    }
}

Object.keys(nodePropertyShorthands).forEach(key => {
    const shorthand = nodePropertyShorthands[key];

    Object.defineProperty(Node.prototype, key, {
        get: function() {
            return this[shorthand] || null;
        },
        set: function(val) {
            this[shorthand] = val;
            return val;
        }
    });
});

//Node construction
exports.createDocument = function() {
    return new Node({
        type: 'root',
        name: 'root',
        parent: null,
        prev: null,
        next: null,
        children: [],
        'x-mode': DOCUMENT_MODE.NO_QUIRKS
    });
};

exports.createDocumentFragment = function() {
    return new Node({
        type: 'root',
        name: 'root',
        parent: null,
        prev: null,
        next: null,
        children: []
    });
};

exports.createElement = function(tagName, namespaceURI, attrs) {
    const attribs = Object.create(null);
    const attribsNamespace = Object.create(null);
    const attribsPrefix = Object.create(null);

    for (let i = 0; i < attrs.length; i++) {
        const attrName = attrs[i].name;

        attribs[attrName] = attrs[i].value;
        attribsNamespace[attrName] = attrs[i].namespace;
        attribsPrefix[attrName] = attrs[i].prefix;
    }

    return new Node({
        type: tagName === 'script' || tagName === 'style' ? tagName : 'tag',
        name: tagName,
        namespace: namespaceURI,
        attribs: attribs,
        'x-attribsNamespace': attribsNamespace,
        'x-attribsPrefix': attribsPrefix,
        children: [],
        parent: null,
        prev: null,
        next: null
    });
};

exports.createCommentNode = function(data) {
    return new Node({
        type: 'comment',
        data: data,
        parent: null,
        prev: null,
        next: null
    });
};

const createTextNode = function(value) {
    return new Node({
        type: 'text',
        data: value,
        parent: null,
        prev: null,
        next: null
    });
};

//Tree mutation
const appendChild = (exports.appendChild = function(parentNode, newNode) {
    const prev = parentNode.children[parentNode.children.length - 1];

    if (prev) {
        prev.next = newNode;
        newNode.prev = prev;
    }

    parentNode.children.push(newNode);
    newNode.parent = parentNode;
});

const insertBefore = (exports.insertBefore = function(parentNode, newNode, referenceNode) {
    const insertionIdx = parentNode.children.indexOf(referenceNode);
    const prev = referenceNode.prev;

    if (prev) {
        prev.next = newNode;
        newNode.prev = prev;
    }

    referenceNode.prev = newNode;
    newNode.next = referenceNode;

    parentNode.children.splice(insertionIdx, 0, newNode);
    newNode.parent = parentNode;
});

exports.setTemplateContent = function(templateElement, contentElement) {
    appendChild(templateElement, contentElement);
};

exports.getTemplateContent = function(templateElement) {
    return templateElement.children[0];
};

exports.setDocumentType = function(document, name, publicId, systemId) {
    const data = doctype.serializeContent(name, publicId, systemId);
    let doctypeNode = null;

    for (let i = 0; i < document.children.length; i++) {
        if (document.children[i].type === 'directive' && document.children[i].name === '!doctype') {
            doctypeNode = document.children[i];
            break;
        }
    }

    if (doctypeNode) {
        doctypeNode.data = data;
        doctypeNode['x-name'] = name;
        doctypeNode['x-publicId'] = publicId;
        doctypeNode['x-systemId'] = systemId;
    } else {
        appendChild(
            document,
            new Node({
                type: 'directive',
                name: '!doctype',
                data: data,
                'x-name': name,
                'x-publicId': publicId,
                'x-systemId': systemId
            })
        );
    }
};

exports.setDocumentMode = function(document, mode) {
    document['x-mode'] = mode;
};

exports.getDocumentMode = function(document) {
    return document['x-mode'];
};

exports.detachNode = function(node) {
    if (node.parent) {
        const idx = node.parent.children.indexOf(node);
        const prev = node.prev;
        const next = node.next;

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
};

exports.insertText = function(parentNode, text) {
    const lastChild = parentNode.children[parentNode.children.length - 1];

    if (lastChild && lastChild.type === 'text') {
        lastChild.data += text;
    } else {
        appendChild(parentNode, createTextNode(text));
    }
};

exports.insertTextBefore = function(parentNode, text, referenceNode) {
    const prevNode = parentNode.children[parentNode.children.indexOf(referenceNode) - 1];

    if (prevNode && prevNode.type === 'text') {
        prevNode.data += text;
    } else {
        insertBefore(parentNode, createTextNode(text), referenceNode);
    }
};

exports.adoptAttributes = function(recipient, attrs) {
    for (let i = 0; i < attrs.length; i++) {
        const attrName = attrs[i].name;

        if (typeof recipient.attribs[attrName] === 'undefined') {
            recipient.attribs[attrName] = attrs[i].value;
            recipient['x-attribsNamespace'][attrName] = attrs[i].namespace;
            recipient['x-attribsPrefix'][attrName] = attrs[i].prefix;
        }
    }
};

//Tree traversing
exports.getFirstChild = function(node) {
    return node.children[0];
};

exports.getChildNodes = function(node) {
    return node.children;
};

exports.getParentNode = function(node) {
    return node.parent;
};

exports.getAttrList = function(element) {
    const attrList = [];

    for (const name in element.attribs) {
        attrList.push({
            name: name,
            value: element.attribs[name],
            namespace: element['x-attribsNamespace'][name],
            prefix: element['x-attribsPrefix'][name]
        });
    }

    return attrList;
};

//Node data
exports.getTagName = function(element) {
    return element.name;
};

exports.getNamespaceURI = function(element) {
    return element.namespace;
};

exports.getTextNodeContent = function(textNode) {
    return textNode.data;
};

exports.getCommentNodeContent = function(commentNode) {
    return commentNode.data;
};

exports.getDocumentTypeNodeName = function(doctypeNode) {
    return doctypeNode['x-name'];
};

exports.getDocumentTypeNodePublicId = function(doctypeNode) {
    return doctypeNode['x-publicId'];
};

exports.getDocumentTypeNodeSystemId = function(doctypeNode) {
    return doctypeNode['x-systemId'];
};

//Node types
exports.isTextNode = function(node) {
    return node.type === 'text';
};

exports.isCommentNode = function(node) {
    return node.type === 'comment';
};

exports.isDocumentTypeNode = function(node) {
    return node.type === 'directive' && node.name === '!doctype';
};

exports.isElementNode = function(node) {
    return !!node.attribs;
};

// Source code location
exports.setNodeSourceCodeLocation = function(node, location) {
    node.sourceCodeLocation = location;
};

exports.getNodeSourceCodeLocation = function(node) {
    return node.sourceCodeLocation;
};

exports.updateNodeSourceCodeLocation = function(node, endLocation) {
    node.sourceCodeLocation = Object.assign(node.sourceCodeLocation, endLocation);
};
