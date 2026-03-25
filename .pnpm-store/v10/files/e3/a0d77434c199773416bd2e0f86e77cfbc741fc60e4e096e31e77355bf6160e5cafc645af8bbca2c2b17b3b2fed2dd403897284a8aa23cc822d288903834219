var _ = require("underscore");

var promises = require("../promises");
var xml = require("../xml");

exports.writeStyleMap = writeStyleMap;
exports.readStyleMap = readStyleMap;


var schema = "http://schemas.zwobble.org/mammoth/style-map";
var styleMapPath = "mammoth/style-map";
var styleMapAbsolutePath = "/" + styleMapPath;

function writeStyleMap(docxFile, styleMap) {
    docxFile.write(styleMapPath, styleMap);
    return updateRelationships(docxFile).then(function() {
        return updateContentTypes(docxFile);
    });
}

function updateRelationships(docxFile) {
    var path = "word/_rels/document.xml.rels";
    var relationshipsUri = "http://schemas.openxmlformats.org/package/2006/relationships";
    var relationshipElementName = "{" + relationshipsUri + "}Relationship";
    return docxFile.read(path, "utf8")
        .then(xml.readString)
        .then(function(relationshipsContainer) {
            var relationships = relationshipsContainer.children;
            addOrUpdateElement(relationships, relationshipElementName, "Id", {
                "Id": "rMammothStyleMap",
                "Type": schema,
                "Target": styleMapAbsolutePath
            });
            
            var namespaces = {"": relationshipsUri};
            return docxFile.write(path, xml.writeString(relationshipsContainer, namespaces));
        });
}

function updateContentTypes(docxFile) {
    var path = "[Content_Types].xml";
    var contentTypesUri = "http://schemas.openxmlformats.org/package/2006/content-types";
    var overrideName = "{" + contentTypesUri + "}Override";
    return docxFile.read(path, "utf8")
        .then(xml.readString)
        .then(function(typesElement) {
            var children = typesElement.children;
            addOrUpdateElement(children, overrideName, "PartName", {
                "PartName": styleMapAbsolutePath,
                "ContentType": "text/prs.mammoth.style-map"
            });
            var namespaces = {"": contentTypesUri};
            return docxFile.write(path, xml.writeString(typesElement, namespaces));
        });
}

function addOrUpdateElement(elements, name, identifyingAttribute, attributes) {
    var existingElement = _.find(elements, function(element) {
        return element.name === name &&
            element.attributes[identifyingAttribute] === attributes[identifyingAttribute];
    });
    if (existingElement) {
        existingElement.attributes = attributes;
    } else {
        elements.push(xml.element(name, attributes));
    }
}

function readStyleMap(docxFile) {
    if (docxFile.exists(styleMapPath)) {
        return docxFile.read(styleMapPath, "utf8");
    } else {
        return promises.resolve(null);
    }
}
