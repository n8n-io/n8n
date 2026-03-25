var assert = require("assert");

var createCommentsReader = require("../../lib/docx/comments-reader").createCommentsReader;
var createBodyReader = require("../../lib/docx/body-reader").createBodyReader;
var stylesReader = require("../../lib/docx/styles-reader");
var documents = require("../../lib/documents");
var xml = require("../../lib/xml");
var test = require("../test")(module);


function readComment(element) {
    var bodyReader = createBodyReader({styles: stylesReader.defaultStyles});
    var commentsReader = createCommentsReader(bodyReader);
    var comments = commentsReader(element);
    assert.equal(comments.value.length, 1);
    return comments.value[0];
}

test('ID and body of comment are read', function() {
    var body = [xml.element("w:p")];
    var comment = readComment(xml.element("w:comments", {}, [
        xml.element("w:comment", {"w:id": "1"}, body)
    ]));
    assert.deepEqual(comment.body, [new documents.Paragraph([])]);
    assert.deepEqual(comment.commentId, "1");
});


test('when optional attributes of comment are missing then they are read as null', function() {
    var comment = readComment(xml.element("w:comments", {}, [
        xml.element("w:comment", {"w:id": "1"})
    ]));
    assert.strictEqual(comment.authorName, null);
    assert.strictEqual(comment.authorInitials, null);
});


test('when optional attributes of comment are blank then they are read as null', function() {
    var comment = readComment(xml.element("w:comments", {}, [
        xml.element("w:comment", {"w:id": "1", "w:author": " ", "w:initials": " "})
    ]));
    assert.strictEqual(comment.authorName, null);
    assert.strictEqual(comment.authorInitials, null);
});


test('when optional attributes of comment are not blank then they are read', function() {
    var comment = readComment(xml.element("w:comments", {}, [
        xml.element("w:comment", {"w:id": "1", "w:author": "The Piemaker", "w:initials": "TP"})
    ]));
    assert.strictEqual(comment.authorName, "The Piemaker");
    assert.strictEqual(comment.authorInitials, "TP");
});
