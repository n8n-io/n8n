var xmldom = require("@xmldom/xmldom");
var dom = require("@xmldom/xmldom/lib/dom");

function parseFromString(string) {
    var error = null;

    var domParser = new xmldom.DOMParser({
        errorHandler: function(level, message) {
            error = {level: level, message: message};
        }
    });

    var document = domParser.parseFromString(string);

    if (error === null) {
        return document;
    } else {
        throw new Error(error.level + ": " + error.message);
    }
}

exports.parseFromString = parseFromString;
exports.Node = dom.Node;
