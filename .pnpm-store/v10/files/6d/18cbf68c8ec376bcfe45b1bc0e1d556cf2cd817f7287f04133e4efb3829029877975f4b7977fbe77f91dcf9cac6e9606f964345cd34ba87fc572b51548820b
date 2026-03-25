exports.DocumentXmlReader = DocumentXmlReader;

var documents = require("../documents");
var Result = require("../results").Result;


function DocumentXmlReader(options) {
    var bodyReader = options.bodyReader;

    function convertXmlToDocument(element) {
        var body = element.first("w:body");

        if (body == null) {
            throw new Error("Could not find the body element: are you sure this is a docx file?");
        }

        var result = bodyReader.readXmlElements(body.children)
            .map(function(children) {
                return new documents.Document(children, {
                    notes: options.notes,
                    comments: options.comments
                });
            });
        return new Result(result.value, result.messages);
    }

    return {
        convertXmlToDocument: convertXmlToDocument
    };
}
