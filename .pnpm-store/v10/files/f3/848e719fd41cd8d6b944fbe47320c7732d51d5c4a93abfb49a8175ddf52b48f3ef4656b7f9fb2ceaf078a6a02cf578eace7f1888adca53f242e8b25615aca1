// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { XML_ATTRKEY, XML_CHARKEY } from "./xml.common.js";
if (!document || !DOMParser || !Node || !XMLSerializer) {
    throw new Error(`This library depends on the following DOM objects: ["document", "DOMParser", "Node", "XMLSerializer"] to parse XML, but some of these are undefined. You may provide a polyfill to make these globally available in order to support your environment. For more information, please refer to https://aka.ms/azsdk/js/web-workers. `);
}
// Policy to make our code Trusted Types compliant at running time.
//   https://github.com/w3c/webappsec-trusted-types
// We are calling DOMParser.parseFromString() to parse XML payload from Azure services.
// The parsed DOM object is not exposed to outside. Scripts are disabled when parsing
// according to the spec.  There are no HTML/XSS security concerns on the usage of
// parseFromString() here.
let ttPolicy;
try {
    if (typeof self.trustedTypes !== "undefined") {
        ttPolicy = self.trustedTypes.createPolicy("@azure/core-xml#xml.browser", {
            createHTML: (s) => s,
        });
    }
}
catch (e) {
    console.warn('Could not create trusted types policy "@azure/core-xml#xml.browser"');
}
const doc = document.implementation.createDocument(null, null, null);
const parser = new DOMParser();
export function parseXML(str, opts = {}) {
    var _a, _b, _c, _d, _e, _f;
    try {
        const updatedOptions = {
            rootName: (_a = opts.rootName) !== null && _a !== void 0 ? _a : "",
            includeRoot: (_b = opts.includeRoot) !== null && _b !== void 0 ? _b : false,
            xmlCharKey: (_c = opts.xmlCharKey) !== null && _c !== void 0 ? _c : XML_CHARKEY,
            cdataPropName: (_d = opts.cdataPropName) !== null && _d !== void 0 ? _d : "__cdata",
            stopNodes: (_e = opts.stopNodes) !== null && _e !== void 0 ? _e : [],
        };
        const dom = parser.parseFromString(((_f = ttPolicy === null || ttPolicy === void 0 ? void 0 : ttPolicy.createHTML(str)) !== null && _f !== void 0 ? _f : str), "application/xml");
        throwIfError(dom);
        let obj;
        if (updatedOptions.includeRoot) {
            obj = domToObject(dom, updatedOptions);
        }
        else {
            obj = domToObject(dom.childNodes[0], updatedOptions);
        }
        return Promise.resolve(obj);
    }
    catch (err) {
        return Promise.reject(err);
    }
}
let errorNS;
function getErrorNamespace() {
    var _a, _b;
    if (errorNS === undefined) {
        try {
            const invalidXML = ((_a = ttPolicy === null || ttPolicy === void 0 ? void 0 : ttPolicy.createHTML("INVALID")) !== null && _a !== void 0 ? _a : "INVALID");
            errorNS =
                (_b = parser.parseFromString(invalidXML, "text/xml").getElementsByTagName("parsererror")[0]
                    .namespaceURI) !== null && _b !== void 0 ? _b : "";
        }
        catch (ignored) {
            // Most browsers will return a document containing <parsererror>, but IE will throw.
            errorNS = "";
        }
    }
    return errorNS;
}
function throwIfError(dom) {
    const parserErrors = dom.getElementsByTagName("parsererror");
    if (parserErrors.length > 0 && getErrorNamespace()) {
        for (let i = 0; i < parserErrors.length; i++) {
            if (parserErrors[i].namespaceURI === errorNS) {
                throw new Error(parserErrors[i].innerHTML);
            }
        }
    }
}
function isElement(node) {
    return !!node.attributes;
}
/**
 * Get the Element-typed version of the provided Node if the provided node is an element with
 * attributes. If it isn't, then undefined is returned.
 */
function asElementWithAttributes(node) {
    return isElement(node) && node.hasAttributes() ? node : undefined;
}
function domToObject(node, options) {
    var _a;
    let result = {};
    const childNodeCount = node.childNodes.length;
    const firstChildNode = node.childNodes[0];
    const onlyChildTextValue = (firstChildNode &&
        childNodeCount === 1 &&
        firstChildNode.nodeType === Node.TEXT_NODE &&
        firstChildNode.nodeValue) ||
        undefined;
    const elementWithAttributes = asElementWithAttributes(node);
    if (elementWithAttributes) {
        result[XML_ATTRKEY] = {};
        for (let i = 0; i < elementWithAttributes.attributes.length; i++) {
            const attr = elementWithAttributes.attributes[i];
            result[XML_ATTRKEY][attr.nodeName] = attr.nodeValue;
        }
        if (onlyChildTextValue) {
            result[options.xmlCharKey] = onlyChildTextValue;
        }
    }
    else if (childNodeCount === 0) {
        result = "";
    }
    else if (onlyChildTextValue) {
        result = onlyChildTextValue;
    }
    if (!onlyChildTextValue) {
        for (let i = 0; i < childNodeCount; i++) {
            const child = node.childNodes[i];
            // Check if CData
            if ((child === null || child === void 0 ? void 0 : child.nodeType) === Node.CDATA_SECTION_NODE) {
                // Already in the CDATA
                result = child.textContent;
            }
            else if (((_a = child === null || child === void 0 ? void 0 : child.firstChild) === null || _a === void 0 ? void 0 : _a.nodeType) === Node.CDATA_SECTION_NODE) {
                // Look if child is CDATA
                result[child.nodeName] = child.textContent;
            }
            else if (child.nodeType !== Node.TEXT_NODE) {
                // Ignore leading/trailing whitespace nodes
                const childObject = domToObject(child, options);
                if (!result[child.nodeName]) {
                    result[child.nodeName] = childObject;
                }
                else if (Array.isArray(result[child.nodeName])) {
                    result[child.nodeName].push(childObject);
                }
                else {
                    result[child.nodeName] = [result[child.nodeName], childObject];
                }
            }
        }
    }
    return result;
}
const serializer = new XMLSerializer();
export function stringifyXML(content, opts = {}) {
    var _a, _b, _c, _d, _e;
    const updatedOptions = {
        rootName: (_a = opts.rootName) !== null && _a !== void 0 ? _a : "root",
        includeRoot: (_b = opts.includeRoot) !== null && _b !== void 0 ? _b : false,
        xmlCharKey: (_c = opts.xmlCharKey) !== null && _c !== void 0 ? _c : XML_CHARKEY,
        cdataPropName: (_d = opts.cdataPropName) !== null && _d !== void 0 ? _d : "__cdata",
        stopNodes: (_e = opts.stopNodes) !== null && _e !== void 0 ? _e : [],
    };
    const dom = buildNode(content, updatedOptions.rootName, updatedOptions)[0];
    return ('<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        serializer.serializeToString(dom).replace(/ xmlns=""/g, ""));
}
function buildAttributes(attrs) {
    const result = [];
    for (const key of Object.keys(attrs)) {
        const attr = doc.createAttribute(key);
        attr.value = attrs[key].toString();
        result.push(attr);
    }
    return result;
}
function buildNode(obj, elementName, options) {
    var _a;
    if (obj === undefined ||
        obj === null ||
        typeof obj === "string" ||
        typeof obj === "number" ||
        typeof obj === "boolean") {
        const elem = doc.createElement(elementName);
        elem.textContent = obj === undefined || obj === null ? "" : obj.toString();
        return [elem];
    }
    else if (Array.isArray(obj)) {
        const result = [];
        for (const arrayElem of obj) {
            for (const child of buildNode(arrayElem, elementName, options)) {
                result.push(child);
            }
        }
        return result;
    }
    else if (typeof obj === "object") {
        let elem;
        if ((_a = obj[XML_ATTRKEY]) === null || _a === void 0 ? void 0 : _a["xmlns"]) {
            elem = doc.createElementNS(obj[XML_ATTRKEY]["xmlns"], elementName);
        }
        else {
            elem = doc.createElement(elementName);
        }
        for (const key of Object.keys(obj)) {
            if (key === XML_ATTRKEY) {
                for (const attr of buildAttributes(obj[key])) {
                    elem.attributes.setNamedItem(attr);
                }
            }
            else if (key === options.xmlCharKey) {
                elem.textContent = obj[key].toString();
            }
            else if (key === options.cdataPropName) {
                const cdataElement = doc.createCDATASection(obj[key].toString());
                elem.appendChild(cdataElement);
            }
            else {
                for (const child of buildNode(obj[key], key, options)) {
                    elem.appendChild(child);
                }
            }
        }
        return [elem];
    }
    else {
        throw new Error(`Illegal value passed to buildObject: ${obj}`);
    }
}
//# sourceMappingURL=xml-browser.mjs.map