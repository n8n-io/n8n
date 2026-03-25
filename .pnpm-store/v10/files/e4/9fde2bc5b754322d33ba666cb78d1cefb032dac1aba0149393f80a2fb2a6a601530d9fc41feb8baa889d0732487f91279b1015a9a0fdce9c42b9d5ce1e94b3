var htmlPaths = require("../styles/html-paths");


function nonFreshElement(tagName, attributes, children) {
    return elementWithTag(
        htmlPaths.element(tagName, attributes, {fresh: false}),
        children);
}

function freshElement(tagName, attributes, children) {
    var tag = htmlPaths.element(tagName, attributes, {fresh: true});
    return elementWithTag(tag, children);
}

function elementWithTag(tag, children) {
    return {
        type: "element",
        tag: tag,
        children: children || []
    };
}

function text(value) {
    return {
        type: "text",
        value: value
    };
}

var forceWrite = {
    type: "forceWrite"
};

exports.freshElement = freshElement;
exports.nonFreshElement = nonFreshElement;
exports.elementWithTag = elementWithTag;
exports.text = text;
exports.forceWrite = forceWrite;

var voidTagNames = {
    "br": true,
    "hr": true,
    "img": true,
    "input": true
};

function isVoidElement(node) {
    return (node.children.length === 0) && voidTagNames[node.tag.tagName];
}

exports.isVoidElement = isVoidElement;
