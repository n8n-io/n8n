import { isName } from '../util.js';

export default class DocTypeReader {
    constructor(options) {
        this.suppressValidationErr = !options;
        this.options = options;
    }

    readDocType(xmlData, i) {

        const entities = Object.create(null);
        if (xmlData[i + 3] === 'O' &&
            xmlData[i + 4] === 'C' &&
            xmlData[i + 5] === 'T' &&
            xmlData[i + 6] === 'Y' &&
            xmlData[i + 7] === 'P' &&
            xmlData[i + 8] === 'E') {
            i = i + 9;
            let angleBracketsCount = 1;
            let hasBody = false, comment = false;
            let exp = "";
            for (; i < xmlData.length; i++) {
                if (xmlData[i] === '<' && !comment) { //Determine the tag type
                    if (hasBody && hasSeq(xmlData, "!ENTITY", i)) {
                        i += 7;
                        let entityName, val;
                        [entityName, val, i] = this.readEntityExp(xmlData, i + 1, this.suppressValidationErr);
                        if (val.indexOf("&") === -1) { //Parameter entities are not supported
                            const escaped = entityName.replace(/[.\-+*:]/g, '\\.');
                            entities[entityName] = {
                                regx: RegExp(`&${escaped};`, "g"),
                                val: val
                            };
                        }
                    }
                    else if (hasBody && hasSeq(xmlData, "!ELEMENT", i)) {
                        i += 8;//Not supported
                        const { index } = this.readElementExp(xmlData, i + 1);
                        i = index;
                    } else if (hasBody && hasSeq(xmlData, "!ATTLIST", i)) {
                        i += 8;//Not supported
                        // const {index} = this.readAttlistExp(xmlData,i+1);
                        // i = index;
                    } else if (hasBody && hasSeq(xmlData, "!NOTATION", i)) {
                        i += 9;//Not supported
                        const { index } = this.readNotationExp(xmlData, i + 1, this.suppressValidationErr);
                        i = index;
                    } else if (hasSeq(xmlData, "!--", i)) comment = true;
                    else throw new Error(`Invalid DOCTYPE`);

                    angleBracketsCount++;
                    exp = "";
                } else if (xmlData[i] === '>') { //Read tag content
                    if (comment) {
                        if (xmlData[i - 1] === "-" && xmlData[i - 2] === "-") {
                            comment = false;
                            angleBracketsCount--;
                        }
                    } else {
                        angleBracketsCount--;
                    }
                    if (angleBracketsCount === 0) {
                        break;
                    }
                } else if (xmlData[i] === '[') {
                    hasBody = true;
                } else {
                    exp += xmlData[i];
                }
            }
            if (angleBracketsCount !== 0) {
                throw new Error(`Unclosed DOCTYPE`);
            }
        } else {
            throw new Error(`Invalid Tag instead of DOCTYPE`);
        }
        return { entities, i };
    }
    readEntityExp(xmlData, i) {
        //External entities are not supported
        //    <!ENTITY ext SYSTEM "http://normal-website.com" >

        //Parameter entities are not supported
        //    <!ENTITY entityname "&anotherElement;">

        //Internal entities are supported
        //    <!ENTITY entityname "replacement text">

        // Skip leading whitespace after <!ENTITY
        i = skipWhitespace(xmlData, i);

        // Read entity name
        let entityName = "";
        while (i < xmlData.length && !/\s/.test(xmlData[i]) && xmlData[i] !== '"' && xmlData[i] !== "'") {
            entityName += xmlData[i];
            i++;
        }
        validateEntityName(entityName);

        // Skip whitespace after entity name
        i = skipWhitespace(xmlData, i);

        // Check for unsupported constructs (external entities or parameter entities)
        if (!this.suppressValidationErr) {
            if (xmlData.substring(i, i + 6).toUpperCase() === "SYSTEM") {
                throw new Error("External entities are not supported");
            } else if (xmlData[i] === "%") {
                throw new Error("Parameter entities are not supported");
            }
        }

        // Read entity value (internal entity)
        let entityValue = "";
        [i, entityValue] = this.readIdentifierVal(xmlData, i, "entity");

        // Validate entity size
        if (this.options.enabled !== false &&
            this.options.maxEntitySize &&
            entityValue.length > this.options.maxEntitySize) {
            throw new Error(
                `Entity "${entityName}" size (${entityValue.length}) exceeds maximum allowed size (${this.options.maxEntitySize})`
            );
        }

        i--;
        return [entityName, entityValue, i];
    }

    readNotationExp(xmlData, i) {
        // Skip leading whitespace after <!NOTATION
        i = skipWhitespace(xmlData, i);

        // Read notation name
        let notationName = "";
        while (i < xmlData.length && !/\s/.test(xmlData[i])) {
            notationName += xmlData[i];
            i++;
        }
        !this.suppressValidationErr && validateEntityName(notationName);

        // Skip whitespace after notation name
        i = skipWhitespace(xmlData, i);

        // Check identifier type (SYSTEM or PUBLIC)
        const identifierType = xmlData.substring(i, i + 6).toUpperCase();
        if (!this.suppressValidationErr && identifierType !== "SYSTEM" && identifierType !== "PUBLIC") {
            throw new Error(`Expected SYSTEM or PUBLIC, found "${identifierType}"`);
        }
        i += identifierType.length;

        // Skip whitespace after identifier type
        i = skipWhitespace(xmlData, i);

        // Read public identifier (if PUBLIC)
        let publicIdentifier = null;
        let systemIdentifier = null;

        if (identifierType === "PUBLIC") {
            [i, publicIdentifier] = this.readIdentifierVal(xmlData, i, "publicIdentifier");

            // Skip whitespace after public identifier
            i = skipWhitespace(xmlData, i);

            // Optionally read system identifier
            if (xmlData[i] === '"' || xmlData[i] === "'") {
                [i, systemIdentifier] = this.readIdentifierVal(xmlData, i, "systemIdentifier");
            }
        } else if (identifierType === "SYSTEM") {
            // Read system identifier (mandatory for SYSTEM)
            [i, systemIdentifier] = this.readIdentifierVal(xmlData, i, "systemIdentifier");

            if (!this.suppressValidationErr && !systemIdentifier) {
                throw new Error("Missing mandatory system identifier for SYSTEM notation");
            }
        }

        return { notationName, publicIdentifier, systemIdentifier, index: --i };
    }

    readIdentifierVal(xmlData, i, type) {
        let identifierVal = "";
        const startChar = xmlData[i];
        if (startChar !== '"' && startChar !== "'") {
            throw new Error(`Expected quoted string, found "${startChar}"`);
        }
        i++;

        while (i < xmlData.length && xmlData[i] !== startChar) {
            identifierVal += xmlData[i];
            i++;
        }

        if (xmlData[i] !== startChar) {
            throw new Error(`Unterminated ${type} value`);
        }
        i++;
        return [i, identifierVal];
    }

    readElementExp(xmlData, i) {
        // <!ELEMENT br EMPTY>
        // <!ELEMENT div ANY>
        // <!ELEMENT title (#PCDATA)>
        // <!ELEMENT book (title, author+)>
        // <!ELEMENT name (content-model)>

        // Skip leading whitespace after <!ELEMENT
        i = skipWhitespace(xmlData, i);

        // Read element name
        let elementName = "";
        while (i < xmlData.length && !/\s/.test(xmlData[i])) {
            elementName += xmlData[i];
            i++;
        }

        // Validate element name
        if (!this.suppressValidationErr && !isName(elementName)) {
            throw new Error(`Invalid element name: "${elementName}"`);
        }

        // Skip whitespace after element name
        i = skipWhitespace(xmlData, i);
        let contentModel = "";
        // Expect '(' to start content model
        if (xmlData[i] === "E" && hasSeq(xmlData, "MPTY", i)) i += 4;
        else if (xmlData[i] === "A" && hasSeq(xmlData, "NY", i)) i += 2;
        else if (xmlData[i] === "(") {
            i++; // Move past '('

            // Read content model
            while (i < xmlData.length && xmlData[i] !== ")") {
                contentModel += xmlData[i];
                i++;
            }
            if (xmlData[i] !== ")") {
                throw new Error("Unterminated content model");
            }

        } else if (!this.suppressValidationErr) {
            throw new Error(`Invalid Element Expression, found "${xmlData[i]}"`);
        }

        return {
            elementName,
            contentModel: contentModel.trim(),
            index: i
        };
    }

    readAttlistExp(xmlData, i) {
        // Skip leading whitespace after <!ATTLIST
        i = skipWhitespace(xmlData, i);

        // Read element name
        let elementName = "";
        while (i < xmlData.length && !/\s/.test(xmlData[i])) {
            elementName += xmlData[i];
            i++;
        }

        // Validate element name
        validateEntityName(elementName)

        // Skip whitespace after element name
        i = skipWhitespace(xmlData, i);

        // Read attribute name
        let attributeName = "";
        while (i < xmlData.length && !/\s/.test(xmlData[i])) {
            attributeName += xmlData[i];
            i++;
        }

        // Validate attribute name
        if (!validateEntityName(attributeName)) {
            throw new Error(`Invalid attribute name: "${attributeName}"`);
        }

        // Skip whitespace after attribute name
        i = skipWhitespace(xmlData, i);

        // Read attribute type
        let attributeType = "";
        if (xmlData.substring(i, i + 8).toUpperCase() === "NOTATION") {
            attributeType = "NOTATION";
            i += 8; // Move past "NOTATION"

            // Skip whitespace after "NOTATION"
            i = skipWhitespace(xmlData, i);

            // Expect '(' to start the list of notations
            if (xmlData[i] !== "(") {
                throw new Error(`Expected '(', found "${xmlData[i]}"`);
            }
            i++; // Move past '('

            // Read the list of allowed notations
            let allowedNotations = [];
            while (i < xmlData.length && xmlData[i] !== ")") {
                let notation = "";
                while (i < xmlData.length && xmlData[i] !== "|" && xmlData[i] !== ")") {
                    notation += xmlData[i];
                    i++;
                }

                // Validate notation name
                notation = notation.trim();
                if (!validateEntityName(notation)) {
                    throw new Error(`Invalid notation name: "${notation}"`);
                }

                allowedNotations.push(notation);

                // Skip '|' separator or exit loop
                if (xmlData[i] === "|") {
                    i++; // Move past '|'
                    i = skipWhitespace(xmlData, i); // Skip optional whitespace after '|'
                }
            }

            if (xmlData[i] !== ")") {
                throw new Error("Unterminated list of notations");
            }
            i++; // Move past ')'

            // Store the allowed notations as part of the attribute type
            attributeType += " (" + allowedNotations.join("|") + ")";
        } else {
            // Handle simple types (e.g., CDATA, ID, IDREF, etc.)
            while (i < xmlData.length && !/\s/.test(xmlData[i])) {
                attributeType += xmlData[i];
                i++;
            }

            // Validate simple attribute type
            const validTypes = ["CDATA", "ID", "IDREF", "IDREFS", "ENTITY", "ENTITIES", "NMTOKEN", "NMTOKENS"];
            if (!this.suppressValidationErr && !validTypes.includes(attributeType.toUpperCase())) {
                throw new Error(`Invalid attribute type: "${attributeType}"`);
            }
        }

        // Skip whitespace after attribute type
        i = skipWhitespace(xmlData, i);

        // Read default value
        let defaultValue = "";
        if (xmlData.substring(i, i + 8).toUpperCase() === "#REQUIRED") {
            defaultValue = "#REQUIRED";
            i += 8;
        } else if (xmlData.substring(i, i + 7).toUpperCase() === "#IMPLIED") {
            defaultValue = "#IMPLIED";
            i += 7;
        } else {
            [i, defaultValue] = this.readIdentifierVal(xmlData, i, "ATTLIST");
        }

        return {
            elementName,
            attributeName,
            attributeType,
            defaultValue,
            index: i
        }
    }
}



const skipWhitespace = (data, index) => {
    while (index < data.length && /\s/.test(data[index])) {
        index++;
    }
    return index;
};



function hasSeq(data, seq, i) {
    for (let j = 0; j < seq.length; j++) {
        if (seq[j] !== data[i + j + 1]) return false;
    }
    return true;
}

function validateEntityName(name) {
    if (isName(name))
        return name;
    else
        throw new Error(`Invalid entity name ${name}`);
}