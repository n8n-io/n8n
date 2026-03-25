var assert = require("assert");

var readRelationships = require("../../lib/docx/relationships-reader").readRelationships;
var xml = require("../../lib/xml");
var test = require("../test")(module);


test("relationships can be found by ID", function() {
    var relationships = readRelationships(relationshipsElement([
        relationshipElement({
            "Id": "rId1",
            "Target": "http://example.com/",
            "Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"
        }),
        relationshipElement({
            "Id": "rId2",
            "Target": "http://example.net/",
            "Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"
        })
    ]));
    assert.equal(relationships.findTargetByRelationshipId("rId1"), "http://example.com/");
});


test("relationships can be found by type", function() {
    var relationships = readRelationships(relationshipsElement([
        relationshipElement({
            "Id": "rId2",
            "Target": "docProps/core.xml",
            "Type": "http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties"
        }),
        relationshipElement({
            "Id": "rId1",
            "Target": "word/document.xml",
            "Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
        }),
        relationshipElement({
            "Id": "rId3",
            "Target": "word/document2.xml",
            "Type": "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
        })
    ]));
    assert.deepEqual(
        relationships.findTargetsByType("http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"),
        ["word/document.xml", "word/document2.xml"]
    );
});


test("when there are no relationships of requested type then empty array is returned", function() {
    var relationships = readRelationships(relationshipsElement([]));
    assert.deepEqual(
        relationships.findTargetsByType("http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"),
        []
    );
});


function relationshipsElement(children) {
    return xml.element("relationships:Relationships", {}, children);
}

function relationshipElement(attributes) {
    return xml.element("relationships:Relationship", attributes, []);
}
