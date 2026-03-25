var assert = require("assert");

var docxReader = require("../../lib/docx/docx-reader");
var documents = require("../../lib/documents");
var xml = require("../../lib/xml");

var testing = require("../testing");
var test = require("../test")(module);
var testData = testing.testData;
var createFakeDocxFile = testing.createFakeDocxFile;


test("can read document with single paragraph with single run of text", function() {
    var expectedDocument = documents.Document([
        documents.Paragraph([
            documents.Run([
                documents.Text("Hello.")
            ])
        ])
    ]);
    var docxFile = createFakeDocxFile({
        "word/document.xml": testData("simple/word/document.xml")
    });
    return docxReader.read(docxFile).then(function(result) {
        assert.deepEqual(expectedDocument, result.value);
    });
});

test("hyperlink hrefs are read from relationships file", function() {
    var docxFile = createFakeDocxFile({
        "word/document.xml": testData("hyperlinks/word/document.xml"),
        "word/_rels/document.xml.rels": testData("hyperlinks/word/_rels/document.xml.rels")
    });
    return docxReader.read(docxFile).then(function(result) {
        var paragraph = result.value.children[0];
        assert.equal(1, paragraph.children.length);
        var hyperlink = paragraph.children[0];
        assert.equal(hyperlink.href, "http://www.example.com");
        assert.equal(hyperlink.children.length, 1);
    });
});

var relationshipNamespaces = {
    "r": "http://schemas.openxmlformats.org/package/2006/relationships"
};

test("main document is found using _rels/.rels", function() {
    var relationships = xml.element("r:Relationships", {}, [
        xml.element("r:Relationship", {
            "Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
            "Target": "/word/document2.xml"
        })
    ]);
    
    var docxFile = createFakeDocxFile({
        "word/document2.xml": testData("simple/word/document.xml"),
        "_rels/.rels": xml.writeString(relationships, relationshipNamespaces)
    });
    var expectedDocument = documents.Document([
        documents.Paragraph([
            documents.Run([
                documents.Text("Hello.")
            ])
        ])
    ]);
    return docxReader.read(docxFile).then(function(result) {
        assert.deepEqual(expectedDocument, result.value);
    });
});


test("error is thrown when main document part does not exist", function() {
    var relationships = xml.element("r:Relationships", {}, [
        xml.element("r:Relationship", {
            "Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
            "Target": "/word/document2.xml"
        })
    ]);
    
    var docxFile = createFakeDocxFile({
        "_rels/.rels": xml.writeString(relationships, relationshipNamespaces)
    });
    return docxReader.read(docxFile).then(function(result) {
        assert.ok(false, "Expected error");
    }, function(error) {
        assert.equal(error.message, "Could not find main document part. Are you sure this is a valid .docx file?");
    });
});


test("part paths", {
    "main document part is found using package relationships": function() {
        var relationships = xml.element("r:Relationships", {}, [
            xml.element("r:Relationship", {
                "Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
                "Target": "/word/document2.xml"
            })
        ]);
        
        var docxFile = createFakeDocxFile({
            "word/document2.xml": " ",
            "_rels/.rels": xml.writeString(relationships, relationshipNamespaces)
        });
        return docxReader._findPartPaths(docxFile).then(function(partPaths) {
            assert.equal(partPaths.mainDocument, "word/document2.xml");
        });
    },
    
    "word/document.xml is used as fallback location for main document part": function() {
        var docxFile = createFakeDocxFile({
            "word/document.xml": " "
        });
        return docxReader._findPartPaths(docxFile).then(function(partPaths) {
            assert.equal(partPaths.mainDocument, "word/document.xml");
        });
    }
});

[
    {
        name: "comments",
        type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/comments"
    },
    {
        name: "endnotes",
        type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/endnotes"
    },
    {
        name: "footnotes",
        type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/footnotes"
    },
    {
        name: "numbering",
        type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering"
    },
    {
        name: "styles",
        type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles"
    }
].forEach(function(options) {
    test(options.name + " part is found using main document relationships", function() {
        var docxFile = createFakeDocxFile({
            "_rels/.rels": createPackageRelationships("word/document.xml"),
            "word/document.xml": " ",
            "word/_rels/document.xml.rels": xml.writeString(xml.element("r:Relationships", {}, [
                xml.element("r:Relationship", {
                    "Type": options.type,
                    "Target": "target-path.xml"
                })
            ]), relationshipNamespaces),
            "word/target-path.xml": " "
        });
        return docxReader._findPartPaths(docxFile).then(function(partPaths) {
            assert.equal(partPaths[options.name], "word/target-path.xml");
        });
    });

    test("word/" + options.name + ".xml is used as fallback location for " + options.name + " part", function() {
        var zipContents = {
            "_rels/.rels": createPackageRelationships("word/document.xml"),
            "word/document.xml": " "
        };
        zipContents["word/" + options.name + ".xml"] = " ";
        var docxFile = createFakeDocxFile(zipContents);
        return docxReader._findPartPaths(docxFile).then(function(partPaths) {
            assert.equal(partPaths[options.name], "word/" + options.name + ".xml");
        });
    });
});


function createPackageRelationships(mainDocumentPath) {
    return xml.writeString(xml.element("r:Relationships", {}, [
        xml.element("r:Relationship", {
            "Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument",
            "Target": mainDocumentPath
        })
    ]), relationshipNamespaces);
}
