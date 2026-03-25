var assert = require("assert");

var JSZip = require("jszip");

var zipfile = require("../../lib/zipfile");
var styleMap = require("../../lib/docx/style-map");
var test = require("../test")(module);

test('reading embedded style map on document without embedded style map returns null', function() {
    return normalDocx().then(function(zip) {
        return styleMap.readStyleMap(zip).then(function(contents) {
            assert.equal(contents, null);
        });
    });
});

test('embedded style map can be read after being written', function() {
    return normalDocx().then(function(zip) {
        return styleMap.writeStyleMap(zip, "p => h1").then(function() {
            return styleMap.readStyleMap(zip).then(function(contents) {
                assert.equal(contents, "p => h1");
            });
        });
    });
});

test('embedded style map is written to separate file', function() {
    return normalDocx().then(function(zip) {
        return styleMap.writeStyleMap(zip, "p => h1").then(function() {
            return zip.read("mammoth/style-map", "utf8").then(function(contents) {
                assert.equal(contents, "p => h1");
            });
        });
    });
});

test('embedded style map is referenced in relationships', function() {
    return normalDocx().then(function(zip) {
        return styleMap.writeStyleMap(zip, "p => h1").then(function() {
            return zip.read("word/_rels/document.xml.rels", "utf8").then(function(contents) {
                assert.equal(contents, expectedRelationshipsXml);
            });
        });
    });
});

test('re-embedding style map replaces original', function() {
    return normalDocx().then(function(zip) {
        return styleMap.writeStyleMap(zip, "p => h1").then(function() {
            return styleMap.writeStyleMap(zip, "p => h2");
        }).then(function() {
            return zip.read("word/_rels/document.xml.rels", "utf8").then(function(contents) {
                assert.equal(contents, expectedRelationshipsXml);
            });
        }).then(function() {
            return styleMap.readStyleMap(zip).then(function(contents) {
                assert.equal(contents, "p => h2");
            });
        });
    });
});

test('embedded style map has override content type in [Content_Types].xml', function() {
    return normalDocx().then(function(zip) {
        return styleMap.writeStyleMap(zip, "p => h1").then(function() {
            return zip.read("[Content_Types].xml", "utf8").then(function(contents) {
                assert.equal(contents, expectedContentTypesXml);
            });
        });
    });
});

test('replacing style map keeps content type', function() {
    return normalDocx().then(function(zip) {
        return styleMap.writeStyleMap(zip, "p => h1").then(function() {
            return styleMap.writeStyleMap(zip, "p => h2");
        }).then(function() {
            return zip.read("[Content_Types].xml", "utf8").then(function(contents) {
                assert.equal(contents, expectedContentTypesXml);
            });
        });
    });
});

var expectedRelationshipsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>' +
    '<Relationship Id="rMammothStyleMap" Type="http://schemas.zwobble.org/mammoth/style-map" Target="/mammoth/style-map"/>' +
    '</Relationships>';

var expectedContentTypesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="png" ContentType="image/png"/>' +
    '<Override PartName="/mammoth/style-map" ContentType="text/prs.mammoth.style-map"/>' +
    '</Types>';

function normalDocx() {
    var zip = new JSZip();
    var originalRelationshipsXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
        '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/settings" Target="settings.xml"/>' +
        '</Relationships>';
    var originalContentTypesXml = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
        '<Default Extension="png" ContentType="image/png"/>' +
        '</Types>';
    zip.file("word/_rels/document.xml.rels", originalRelationshipsXml);
    zip.file("[Content_Types].xml", originalContentTypesXml);
    return zip.generateAsync({type: "arraybuffer"}).then(function(buffer) {
        return zipfile.openArrayBuffer(buffer);
    });
}

