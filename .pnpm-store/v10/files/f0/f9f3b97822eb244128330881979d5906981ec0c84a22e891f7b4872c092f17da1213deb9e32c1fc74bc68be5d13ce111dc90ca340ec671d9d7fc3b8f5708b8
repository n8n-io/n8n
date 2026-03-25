var assert = require("assert");

var test = require("../test")(module);
var documentMatchers = require("../../lib/styles/document-matchers");
var documents = require("../../lib/documents");
var Paragraph = documents.Paragraph;

test("paragraph with no options matches any paragraph", function() {
    var matcher = documentMatchers.paragraph();
    assert.ok(matcher.matches(new Paragraph()));
    assert.ok(matcher.matches(paragraphWithStyle("Heading1", "Heading 1")));
});

test("paragraph style ID only matches paragraphs with that style ID", function() {
    var matcher = documentMatchers.paragraph({styleId: "Heading1"});
    assert.ok(!matcher.matches(new Paragraph()));
    assert.ok(matcher.matches(paragraphWithStyle("Heading1", "Heading 1")));
    assert.ok(!matcher.matches(paragraphWithStyle("Heading2", "Heading 2")));
});

test("paragraph style name only matches paragraphs with that style name", function() {
    var matcher = documentMatchers.paragraph({styleName: documentMatchers.equalTo("Heading 1")});
    assert.ok(!matcher.matches(new Paragraph()));
    assert.ok(matcher.matches(paragraphWithStyle("Heading1", "Heading 1")));
    assert.ok(!matcher.matches(paragraphWithStyle("Heading2", "Heading 2")));
});

test("ordered-list(index) matches an ordered list with specified level index", function() {
    var matcher = documentMatchers.paragraph({list: {isOrdered: true, levelIndex: 1}});
    assert.ok(!matcher.matches(new Paragraph()));
    assert.ok(matcher.matches(new Paragraph([], {numbering: {level: 1, isOrdered: true}})));
    assert.ok(!matcher.matches(new Paragraph([], {numbering: {level: 0, isOrdered: true}})));
    assert.ok(!matcher.matches(new Paragraph([], {numbering: {level: 1, isOrdered: false}})));
});

test("unordered-list(index) matches an unordered list with specified level index", function() {
    var matcher = documentMatchers.paragraph({list: {isOrdered: false, levelIndex: 1}});
    assert.ok(!matcher.matches(new Paragraph()));
    assert.ok(matcher.matches(new Paragraph([], {numbering: {level: 1, isOrdered: false}})));
    assert.ok(!matcher.matches(new Paragraph([], {numbering: {level: 1, isOrdered: true}})));
});

test("matchers for lists with index 0 do not match elements that are not lists", function() {
    var matcher = documentMatchers.paragraph({list: {isOrdered: true, levelIndex: 0}});
    assert.ok(!matcher.matches(new Paragraph()));
});

test("highlight matcher does not match non-highlight elements", function() {
    var matcher = documentMatchers.highlight();
    assert.ok(!matcher.matches(new Paragraph()));
});

test("highlight matcher without color matches all highlight elements", function() {
    var matcher = documentMatchers.highlight({});
    assert.ok(matcher.matches({type: "highlight", color: "yellow"}));
});

test("highlight matcher with color matches highlight with that color", function() {
    var matcher = documentMatchers.highlight({color: "yellow"});
    assert.ok(matcher.matches({type: "highlight", color: "yellow"}));
});

test("highlight matcher with color does not match highlights with other colors", function() {
    var matcher = documentMatchers.highlight({color: "yellow"});
    assert.ok(!matcher.matches({type: "highlight", color: "red"}));
});

function paragraphWithStyle(styleId, styleName) {
    return new Paragraph([], {styleId: styleId, styleName: styleName});
}


test("equalTo matcher is case insensitive", function() {
    var matcher = documentMatchers.equalTo("Heading 1");
    assert.ok(matcher.operator(matcher.operand, "heaDING 1"));
    assert.ok(!matcher.operator(matcher.operand, "heaDING 2"));
});

test("startsWith matches strings with prefix", function() {
    var matcher = documentMatchers.startsWith("Heading");
    assert.ok(matcher.operator(matcher.operand, "Heading"));
    assert.ok(matcher.operator(matcher.operand, "Heading 1"));
    assert.ok(!matcher.operator(matcher.operand, "Custom Heading"));
    assert.ok(!matcher.operator(matcher.operand, "Head"));
    assert.ok(!matcher.operator(matcher.operand, "Header 2"));
});

test("startsWith matcher is case insensitive", function() {
    var matcher = documentMatchers.startsWith("Heading");
    assert.ok(matcher.operator(matcher.operand, "heaDING"));
});
