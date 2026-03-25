import { buildOptions } from './OptionsBuilder.js';
import OrderedObjParser from './OrderedObjParser.js';
import prettify from './node2json.js';
import { validate } from "../validator.js";
import XmlNode from './xmlNode.js';

export default class XMLParser {

    constructor(options) {
        this.externalEntities = {};
        this.options = buildOptions(options);

    }
    /**
     * Parse XML dats to JS object 
     * @param {string|Uint8Array} xmlData 
     * @param {boolean|Object} validationOption 
     */
    parse(xmlData, validationOption) {
        if (typeof xmlData !== "string" && xmlData.toString) {
            xmlData = xmlData.toString();
        } else if (typeof xmlData !== "string") {
            throw new Error("XML data is accepted in String or Bytes[] form.")
        }

        if (validationOption) {
            if (validationOption === true) validationOption = {}; //validate with default options

            const result = validate(xmlData, validationOption);
            if (result !== true) {
                throw Error(`${result.err.msg}:${result.err.line}:${result.err.col}`)
            }
        }
        const orderedObjParser = new OrderedObjParser(this.options);
        orderedObjParser.addExternalEntities(this.externalEntities);
        const orderedResult = orderedObjParser.parseXml(xmlData);
        if (this.options.preserveOrder || orderedResult === undefined) return orderedResult;
        else return prettify(orderedResult, this.options);
    }

    /**
     * Add Entity which is not by default supported by this library
     * @param {string} key 
     * @param {string} value 
     */
    addEntity(key, value) {
        if (value.indexOf("&") !== -1) {
            throw new Error("Entity value can't have '&'")
        } else if (key.indexOf("&") !== -1 || key.indexOf(";") !== -1) {
            throw new Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'")
        } else if (value === "&") {
            throw new Error("An entity with value '&' is not permitted");
        } else {
            this.externalEntities[key] = value;
        }
    }

    /**
     * Returns a Symbol that can be used to access the metadata
     * property on a node.
     * 
     * If Symbol is not available in the environment, an ordinary property is used
     * and the name of the property is here returned.
     * 
     * The XMLMetaData property is only present when `captureMetaData`
     * is true in the options.
     */
    static getMetaDataSymbol() {
        return XmlNode.getMetaDataSymbol();
    }
}
