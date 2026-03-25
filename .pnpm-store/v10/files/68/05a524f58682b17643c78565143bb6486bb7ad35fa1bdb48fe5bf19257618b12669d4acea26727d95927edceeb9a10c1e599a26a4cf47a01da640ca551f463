"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.stringifyXML = stringifyXML;
exports.parseXML = parseXML;
const fast_xml_parser_1 = require("fast-xml-parser");
const xml_common_js_1 = require("./xml.common.js");
function getCommonOptions(options) {
    var _a;
    return {
        attributesGroupName: xml_common_js_1.XML_ATTRKEY,
        textNodeName: (_a = options.xmlCharKey) !== null && _a !== void 0 ? _a : xml_common_js_1.XML_CHARKEY,
        ignoreAttributes: false,
        suppressBooleanAttributes: false,
    };
}
function getSerializerOptions(options = {}) {
    var _a, _b;
    return Object.assign(Object.assign({}, getCommonOptions(options)), { attributeNamePrefix: "@_", format: true, suppressEmptyNode: true, indentBy: "", rootNodeName: (_a = options.rootName) !== null && _a !== void 0 ? _a : "root", cdataPropName: (_b = options.cdataPropName) !== null && _b !== void 0 ? _b : "__cdata" });
}
function getParserOptions(options = {}) {
    return Object.assign(Object.assign({}, getCommonOptions(options)), { parseAttributeValue: false, parseTagValue: false, attributeNamePrefix: "", stopNodes: options.stopNodes, processEntities: true, trimValues: false });
}
/**
 * Converts given JSON object to XML string
 * @param obj - JSON object to be converted into XML string
 * @param opts - Options that govern the XML building of given JSON object
 * `rootName` indicates the name of the root element in the resulting XML
 */
function stringifyXML(obj, opts = {}) {
    const parserOptions = getSerializerOptions(opts);
    const j2x = new fast_xml_parser_1.XMLBuilder(parserOptions);
    const node = { [parserOptions.rootNodeName]: obj };
    const xmlData = j2x.build(node);
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>${xmlData}`.replace(/\n/g, "");
}
/**
 * Converts given XML string into JSON
 * @param str - String containing the XML content to be parsed into JSON
 * @param opts - Options that govern the parsing of given xml string
 * `includeRoot` indicates whether the root element is to be included or not in the output
 */
async function parseXML(str, opts = {}) {
    if (!str) {
        throw new Error("Document is empty");
    }
    const validation = fast_xml_parser_1.XMLValidator.validate(str);
    if (validation !== true) {
        throw validation;
    }
    const parser = new fast_xml_parser_1.XMLParser(getParserOptions(opts));
    const parsedXml = parser.parse(str);
    // Remove the <?xml version="..." ?> node.
    // This is a change in behavior on fxp v4. Issue #424
    if (parsedXml["?xml"]) {
        delete parsedXml["?xml"];
    }
    if (!opts.includeRoot) {
        for (const key of Object.keys(parsedXml)) {
            const value = parsedXml[key];
            return typeof value === "object" ? Object.assign({}, value) : value;
        }
    }
    return parsedXml;
}
//# sourceMappingURL=xml.js.map