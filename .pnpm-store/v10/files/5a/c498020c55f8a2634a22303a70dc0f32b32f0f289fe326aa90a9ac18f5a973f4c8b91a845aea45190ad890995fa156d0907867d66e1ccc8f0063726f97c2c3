"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Filter = void 0;
class Filter {
    write(writer) {
        writer.startSequence(this.type);
        this.writeFilter(writer);
        writer.endSequence();
    }
    parse(reader) {
        return this.parseFilter(reader);
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    matches(_ = {}, __) {
        return true;
    }
    /**
     * RFC 2254 Escaping of filter strings
     * Raw                     Escaped
     * (o=Parens (R Us))       (o=Parens \28R Us\29)
     * (cn=star*)              (cn=star\2A)
     * (filename=C:\MyFile)    (filename=C:\5cMyFile)
     *
     * @param {string|Buffer} input
     */
    escape(input) {
        let escapedResult = '';
        if (Buffer.isBuffer(input)) {
            for (const inputChar of input) {
                if (inputChar < 16) {
                    escapedResult += `\\0${inputChar.toString(16)}`;
                }
                else {
                    escapedResult += `\\${inputChar.toString(16)}`;
                }
            }
        }
        else {
            for (const inputChar of input) {
                switch (inputChar) {
                    case '*':
                        escapedResult += '\\2a';
                        break;
                    case '(':
                        escapedResult += '\\28';
                        break;
                    case ')':
                        escapedResult += '\\29';
                        break;
                    case '\\':
                        escapedResult += '\\5c';
                        break;
                    case '\0':
                        escapedResult += '\\00';
                        break;
                    default:
                        escapedResult += inputChar;
                        break;
                }
            }
        }
        return escapedResult;
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    parseFilter(_) {
        // Do nothing as the default action
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    writeFilter(_) {
        // Do nothing as the default action
    }
    getObjectValue(objectToCheck, key, strictAttributeCase) {
        let objectKey;
        if (typeof objectToCheck[key] !== 'undefined') {
            objectKey = key;
        }
        else if (!strictAttributeCase && key.toLowerCase() === 'objectclass') {
            for (const objectToCheckKey of Object.keys(objectToCheck)) {
                if (objectToCheckKey.toLowerCase() === key.toLowerCase()) {
                    objectKey = objectToCheckKey;
                    break;
                }
            }
        }
        if (objectKey) {
            return objectToCheck[objectKey];
        }
        return undefined;
    }
}
exports.Filter = Filter;
//# sourceMappingURL=Filter.js.map