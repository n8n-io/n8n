"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseXML = parseXML;
const fast_xml_parser_1 = require("fast-xml-parser");
const parser = new fast_xml_parser_1.XMLParser({
    attributeNamePrefix: "",
    htmlEntities: true,
    ignoreAttributes: false,
    ignoreDeclaration: true,
    parseTagValue: false,
    trimValues: false,
    tagValueProcessor: (_, val) => (val.trim() === "" && val.includes("\n") ? "" : undefined),
});
parser.addEntity("#xD", "\r");
parser.addEntity("#10", "\n");
function parseXML(xmlString) {
    return parser.parse(xmlString, true);
}
