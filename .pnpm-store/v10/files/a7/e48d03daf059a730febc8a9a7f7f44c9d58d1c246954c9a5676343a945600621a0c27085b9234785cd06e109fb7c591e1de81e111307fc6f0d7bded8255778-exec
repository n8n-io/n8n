import { buildOptions } from './OptionsBuilder.js';
import Xml2JsParser from './Xml2JsParser.js';

export default class XMLParser {

    constructor(options) {
        this.externalEntities = {};
        this.options = buildOptions(options);
        // console.log(this.options)
    }
    /**
     * Parse XML data string to JS object 
     * @param {string|Buffer} xmlData 
     * @param {boolean|Object} validationOption 
     */
    parse(xmlData) {
        if (Array.isArray(xmlData) && xmlData.byteLength !== undefined) {
            return this.parse(xmlData);
        } else if (xmlData.toString) {
            xmlData = xmlData.toString();
        } else {
            throw new Error("XML data is accepted in String or Bytes[] form.")
        }
        // if( validationOption){
        //     if(validationOption === true) validationOption = {}; //validate with default options

        //     const result = validator.validate(xmlData, validationOption);
        //     if (result !== true) {
        //       throw Error( `${result.err.msg}:${result.err.line}:${result.err.col}` )
        //     }
        //   }
        const parser = new Xml2JsParser(this.options);
        parser.entityParser.addExternalEntities(this.externalEntities);
        return parser.parse(xmlData);
    }
    /**
     * Parse XML data buffer to JS object 
     * @param {string|Buffer} xmlData 
     * @param {boolean|Object} validationOption 
     */
    parseBytesArr(xmlData) {
        if (Array.isArray(xmlData) && xmlData.byteLength !== undefined) {
        } else {
            throw new Error("XML data is accepted in Bytes[] form.")
        }
        const parser = new Xml2JsParser(this.options);
        parser.entityParser.addExternalEntities(this.externalEntities);
        return parser.parseBytesArr(xmlData);
    }
    /**
     * Parse XML data stream to JS object 
     * @param {fs.ReadableStream} xmlDataStream 
     */
    parseStream(xmlDataStream) {
        if (!isStream(xmlDataStream)) throw new Error("FXP: Invalid stream input");

        const orderedObjParser = new Xml2JsParser(this.options);
        orderedObjParser.entityParser.addExternalEntities(this.externalEntities);
        return orderedObjParser.parseStream(xmlDataStream);
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
}

function isStream(stream) {
    if (stream && typeof stream.read === "function" && typeof stream.on === "function" && typeof stream.readableEnded === "boolean") return true;
    return false;
}
