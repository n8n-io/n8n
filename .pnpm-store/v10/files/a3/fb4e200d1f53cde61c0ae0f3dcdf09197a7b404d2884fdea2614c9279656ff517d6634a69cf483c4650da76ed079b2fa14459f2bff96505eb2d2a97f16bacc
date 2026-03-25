var assert = require("assert");

var readStylesXml = require("../../lib/docx/styles-reader").readStylesXml;
var XmlElement = require("../../lib/xml").Element;
var test = require("../test")(module);


test('paragraph style is null if no style with that ID exists', function() {
    var styles = readStylesXml(
        new XmlElement("w:styles", {}, [])
    );
    assert.equal(styles.findParagraphStyleById("Heading1"), null);
});

test('paragraph style can be found by ID', function() {
    var styles = readStylesXml(
        new XmlElement("w:styles", {}, [
            paragraphStyleElement("Heading1", "Heading 1")
        ])
    );
    assert.equal(styles.findParagraphStyleById("Heading1").styleId, "Heading1");
});

test('table style can be found by ID', function() {
    var styles = readStylesXml(
        new XmlElement("w:styles", {}, [
            tableStyleElement("TableNormal", "Normal Table")
        ])
    );
    assert.equal(styles.findTableStyleById("TableNormal").styleId, "TableNormal");
});

test('character style can be found by ID', function() {
    var styles = readStylesXml(
        new XmlElement("w:styles", {}, [
            characterStyleElement("Heading1Char", "Heading 1 Char")
        ])
    );
    assert.equal(styles.findCharacterStyleById("Heading1Char").styleId, "Heading1Char");
});

test('paragraph and character styles are distinct', function() {
    var styles = readStylesXml(
        new XmlElement("w:styles", {}, [
            paragraphStyleElement("Heading1", "Heading 1"),
            characterStyleElement("Heading1Char", "Heading 1 Char")
        ])
    );
    assert.equal(styles.findCharacterStyleById("Heading1"), null);
    assert.equal(styles.findParagraphStyleById("Heading1Char"), null);
});

test('character and table styles are distinct', function() {
    var styles = readStylesXml(
        new XmlElement("w:styles", {}, [
            tableStyleElement("Heading1", "Heading 1")
        ])
    );
    assert.equal(styles.findCharacterStyleById("Heading1"), null);
});

test('styles include names', function() {
    var styles = readStylesXml(
        new XmlElement("w:styles", {}, [
            paragraphStyleElement("Heading1", "Heading 1")
        ])
    );
    assert.equal(styles.findParagraphStyleById("Heading1").name, "Heading 1");
});

test('style name is null if w:name element does not exist', function() {
    var styles = readStylesXml(
        new XmlElement("w:styles", {}, [
            styleWithoutWNameElement("paragraph", "Heading1"),
            styleWithoutWNameElement("character", "Heading1Char")
        ])
    );
    assert.equal(styles.findParagraphStyleById("Heading1").name, null);
    assert.equal(styles.findCharacterStyleById("Heading1Char").name, null);
});

test('numbering style is null if no style with that ID exists', function() {
    var styles = readStylesXml(
        new XmlElement("w:styles", {}, [])
    );
    assert.equal(styles.findNumberingStyleById("List1"), null);
});

test('numbering style has null numId if style has no paragraph properties', function() {
    var styles = readStylesXml(
        new XmlElement("w:styles", {}, [
            new XmlElement("w:style", {"w:type": "numbering", "w:styleId": "List1"})
        ])
    );
    assert.equal(styles.findNumberingStyleById("List1").numId, null);
});

test('numbering style has numId read from paragraph properties', function() {
    var styles = readStylesXml(
        new XmlElement("w:styles", {}, [
            new XmlElement("w:style", {"w:type": "numbering", "w:styleId": "List1"}, [
                new XmlElement("w:pPr", {}, [
                    new XmlElement("w:numPr", {}, [
                        new XmlElement("w:numId", {"w:val": "42"})
                    ])
                ])
            ])
        ])
    );
    assert.equal(styles.findNumberingStyleById("List1").numId, "42");
});

test('when multiple style elements have same style ID then only first element is used', function() {
    var styles = readStylesXml(
        new XmlElement("w:styles", {}, [
            tableStyleElement("TableNormal", "Normal Table"),
            tableStyleElement("TableNormal", "Table Normal")
        ])
    );
    assert.equal(styles.findTableStyleById("TableNormal").name, "Normal Table");
});

function paragraphStyleElement(id, name) {
    return styleElement("paragraph", id, name);
}

function characterStyleElement(id, name) {
    return styleElement("character", id, name);
}

function tableStyleElement(id, name) {
    return styleElement("table", id, name);
}

function styleElement(type, id, name) {
    return new XmlElement("w:style", {"w:type": type, "w:styleId": id}, [
        new XmlElement("w:name", {"w:val": name}, [])
    ]);
}

function styleWithoutWNameElement(type, id) {
    return new XmlElement("w:style", {"w:type": type, "w:styleId": id}, []);
}
