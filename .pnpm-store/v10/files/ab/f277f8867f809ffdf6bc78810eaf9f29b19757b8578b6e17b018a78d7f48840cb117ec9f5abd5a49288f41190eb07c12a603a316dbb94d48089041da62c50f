var promises = require("../promises");
var _ = require("underscore");

var xmldom = require("./xmldom");
var nodes = require("./nodes");
var Element = nodes.Element;

exports.readString = readString;

var Node = xmldom.Node;

function readString(xmlString, namespaceMap) {
    namespaceMap = namespaceMap || {};

    try {
        var document = xmldom.parseFromString(xmlString, "text/xml");
    } catch (error) {
        return promises.reject(error);
    }

    if (document.documentElement.tagName === "parsererror") {
        return promises.resolve(new Error(document.documentElement.textContent));
    }

    function convertNode(node) {
        switch (node.nodeType) {
        case Node.ELEMENT_NODE:
            return convertElement(node);
        case Node.TEXT_NODE:
            return nodes.text(node.nodeValue);
        }
    }

    function convertElement(element) {
        var convertedName = convertName(element);

        var convertedChildren = [];
        _.forEach(element.childNodes, function(childNode) {
            var convertedNode = convertNode(childNode);
            if (convertedNode) {
                convertedChildren.push(convertedNode);
            }
        });

        var convertedAttributes = {};
        _.forEach(element.attributes, function(attribute) {
            convertedAttributes[convertName(attribute)] = attribute.value;
        });

        return new Element(convertedName, convertedAttributes, convertedChildren);
    }

    function convertName(node) {
        if (node.namespaceURI) {
            var mappedPrefix = namespaceMap[node.namespaceURI];
            var prefix;
            if (mappedPrefix) {
                prefix = mappedPrefix + ":";
            } else {
                prefix = "{" + node.namespaceURI + "}";
            }
            return prefix + node.localName;
        } else {
            return node.localName;
        }
    }

    return promises.resolve(convertNode(document.documentElement));
}
