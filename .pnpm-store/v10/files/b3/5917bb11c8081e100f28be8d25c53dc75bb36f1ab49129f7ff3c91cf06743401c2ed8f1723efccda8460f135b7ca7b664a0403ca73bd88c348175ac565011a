var assert = require("assert");
var promises = require("../lib/promises");

var documents = require("../lib/documents");
var documentToHtml = require("../lib/document-to-html");
var DocumentConverter = documentToHtml.DocumentConverter;
var commentAuthorLabel = documentToHtml.commentAuthorLabel;
var test = require("./test")(module);
var htmlPaths = require("../lib/styles/html-paths");
var xml = require("../lib/xml");
var results = require("../lib/results");
var documentMatchers = require("../lib/styles/document-matchers");
var Html = require("../lib/html");


test('should empty document to empty string', function() {
    var document = new documents.Document([]);
    var converter = new DocumentConverter();
    return converter.convertToHtml(document).then(function(result) {
        assert.equal(result.value, "");
    });
});

test('should convert document containing one paragraph to single p element', function() {
    var document = new documents.Document([
        paragraphOfText("Hello.")
    ]);
    var converter = new DocumentConverter();
    return converter.convertToHtml(document).then(function(result) {
        assert.equal(result.value, "<p>Hello.</p>");
    });
});

test('ignores empty paragraphs', function() {
    var document = new documents.Document([
        paragraphOfText("")
    ]);
    var converter = new DocumentConverter();
    return converter.convertToHtml(document).then(function(result) {
        assert.equal(result.value, "");
    });
});

test('text is HTML-escaped', function() {
    var document = new documents.Document([
        paragraphOfText("1 < 2")
    ]);
    var converter = new DocumentConverter();
    return converter.convertToHtml(document).then(function(result) {
        assert.equal(result.value, "<p>1 &lt; 2</p>");
    });
});

test('should convert document containing multiple paragraphs to multiple p elements', function() {
    var document = new documents.Document([
        paragraphOfText("Hello."),
        paragraphOfText("Goodbye.")
    ]);
    var converter = new DocumentConverter();
    return converter.convertToHtml(document).then(function(result) {
        assert.equal(result.value, "<p>Hello.</p><p>Goodbye.</p>");
    });
});

test('uses style mappings to pick HTML element for docx paragraph', function() {
    var document = new documents.Document([
        paragraphOfText("Hello.", "Heading1", "Heading 1")
    ]);
    var converter = new DocumentConverter({
        styleMap: [
            {
                from: documentMatchers.paragraph({styleName: documentMatchers.equalTo("Heading 1")}),
                to: htmlPaths.topLevelElement("h1")
            }
        ]
    });
    return converter.convertToHtml(document).then(function(result) {
        assert.equal(result.value, "<h1>Hello.</h1>");
    });
});

test('mappings for style names are case insensitive', function() {
    var document = new documents.Document([
        paragraphOfText("Hello.", "Heading1", "heading 1")
    ]);
    var converter = new DocumentConverter({
        styleMap: [
            {
                from: documentMatchers.paragraph({styleName: documentMatchers.equalTo("Heading 1")}),
                to: htmlPaths.topLevelElement("h1")
            }
        ]
    });
    return converter.convertToHtml(document).then(function(result) {
        assert.equal(result.value, "<h1>Hello.</h1>");
    });
});

test('can use non-default HTML element for unstyled paragraphs', function() {
    var document = new documents.Document([
        paragraphOfText("Hello.")
    ]);
    var converter = new DocumentConverter({
        styleMap: [
            {
                from: documentMatchers.paragraph(),
                to: htmlPaths.topLevelElement("h1")
            }
        ]
    });
    return converter.convertToHtml(document).then(function(result) {
        assert.equal(result.value, "<h1>Hello.</h1>");
    });
});

test('warning is emitted if paragraph style is unrecognised', function() {
    var document = new documents.Document([
        paragraphOfText("Hello.", "Heading1", "Heading 1")
    ]);
    var converter = new DocumentConverter();
    return converter.convertToHtml(document).then(function(result) {
        assert.deepEqual(result.messages, [results.warning("Unrecognised paragraph style: 'Heading 1' (Style ID: Heading1)")]);
    });
});

test('can use stacked styles to generate nested HTML elements', function() {
    var document = new documents.Document([
        paragraphOfText("Hello.")
    ]);
    var converter = new DocumentConverter({
        styleMap: [
            {
                from: documentMatchers.paragraph(),
                to: htmlPaths.elements(["h1", "span"])
            }
        ]
    });
    return converter.convertToHtml(document).then(function(result) {
        assert.equal(result.value, "<h1><span>Hello.</span></h1>");
    });
});

test('bold runs are wrapped in <strong> tags by default', function() {
    var run = runOfText("Hello.", {isBold: true});
    var converter = new DocumentConverter();
    return converter.convertToHtml(run).then(function(result) {
        assert.equal(result.value, "<strong>Hello.</strong>");
    });
});

test('bold runs can be configured with style mapping', function() {
    var run = runOfText("Hello.", {isBold: true});
    var converter = new DocumentConverter({
        styleMap: [
            {
                from: documentMatchers.bold,
                to: htmlPaths.elements([htmlPaths.element("em")])
            }
        ]
    });
    return converter.convertToHtml(run).then(function(result) {
        assert.equal(result.value, "<em>Hello.</em>");
    });
});

test('bold runs can exist inside other tags', function() {
    var run = new documents.Paragraph([
        runOfText("Hello.", {isBold: true})
    ]);
    var converter = new DocumentConverter();
    return converter.convertToHtml(run).then(function(result) {
        assert.equal(result.value, "<p><strong>Hello.</strong></p>");
    });
});

test('consecutive bold runs are wrapped in a single <strong> element', function() {
    var paragraph = new documents.Paragraph([
        runOfText("Hello", {isBold: true}),
        runOfText(".", {isBold: true})
    ]);
    var converter = new DocumentConverter();
    return converter.convertToHtml(paragraph).then(function(result) {
        assert.equal(result.value, "<p><strong>Hello.</strong></p>");
    });
});

test('underline runs are ignored by default', function() {
    var run = runOfText("Hello.", {isUnderline: true});
    var converter = new DocumentConverter();
    return converter.convertToHtml(run).then(function(result) {
        assert.equal(result.value, "Hello.");
    });
});

test('underline runs can be mapped using style mapping', function() {
    var run = runOfText("Hello.", {isUnderline: true});
    var converter = new DocumentConverter({
        styleMap: [
            {
                from: documentMatchers.underline,
                to: htmlPaths.elements([htmlPaths.element("u")])
            }
        ]
    });
    return converter.convertToHtml(run).then(function(result) {
        assert.equal(result.value, "<u>Hello.</u>");
    });
});

test('style mapping for underline runs does not close parent elements', function() {
    var run = runOfText("Hello.", {isUnderline: true, isBold: true});
    var converter = new DocumentConverter({
        styleMap: [
            {
                from: documentMatchers.underline,
                to: htmlPaths.elements([htmlPaths.element("u")])
            }
        ]
    });
    return converter.convertToHtml(run).then(function(result) {
        assert.equal(result.value, "<strong><u>Hello.</u></strong>");
    });
});

test('strikethrough runs are wrapped in <s> tags by default', function() {
    var run = runOfText("Hello.", {isStrikethrough: true});
    var converter = new DocumentConverter();
    return converter.convertToHtml(run).then(function(result) {
        assert.equal(result.value, "<s>Hello.</s>");
    });
});

test('strikethrough runs can be configured with style mapping', function() {
    var run = runOfText("Hello.", {isStrikethrough: true});
    var converter = new DocumentConverter({
        styleMap: [
            {
                from: documentMatchers.strikethrough,
                to: htmlPaths.elements([htmlPaths.element("del")])
            }
        ]
    });
    return converter.convertToHtml(run).then(function(result) {
        assert.equal(result.value, "<del>Hello.</del>");
    });
});

test('italic runs are wrapped in <em> tags', function() {
    var run = runOfText("Hello.", {isItalic: true});
    var converter = new DocumentConverter();
    return converter.convertToHtml(run).then(function(result) {
        assert.equal(result.value, "<em>Hello.</em>");
    });
});

test('italic runs can be configured with style mapping', function() {
    var run = runOfText("Hello.", {isItalic: true});
    var converter = new DocumentConverter({
        styleMap: [
            {
                from: documentMatchers.italic,
                to: htmlPaths.elements([htmlPaths.element("strong")])
            }
        ]
    });
    return converter.convertToHtml(run).then(function(result) {
        assert.equal(result.value, "<strong>Hello.</strong>");
    });
});

test('run can be both bold and italic', function() {
    var run = runOfText("Hello.", {isBold: true, isItalic: true});
    var converter = new DocumentConverter();
    return converter.convertToHtml(run).then(function(result) {
        assert.equal(result.value, "<strong><em>Hello.</em></strong>");
    });
});

test('superscript runs are wrapped in <sup> tags', function() {
    var run = runOfText("Hello.", {
        verticalAlignment: documents.verticalAlignment.superscript
    });
    var converter = new DocumentConverter();
    return converter.convertToHtml(run).then(function(result) {
        assert.equal(result.value, "<sup>Hello.</sup>");
    });
});

test('subscript runs are wrapped in <sub> tags', function() {
    var run = runOfText("Hello.", {
        verticalAlignment: documents.verticalAlignment.subscript
    });
    var converter = new DocumentConverter();
    return converter.convertToHtml(run).then(function(result) {
        assert.equal(result.value, "<sub>Hello.</sub>");
    });
});

test('all caps runs are ignored by default', function() {
    var run = runOfText("Hello.", {isAllCaps: true});
    var converter = new DocumentConverter();
    return converter.convertToHtml(run).then(function(result) {
        assert.equal(result.value, "Hello.");
    });
});

test('all caps runs can be configured with style mapping', function() {
    var run = runOfText("Hello.", {isAllCaps: true});
    var converter = new DocumentConverter({
        styleMap: [
            {
                from: documentMatchers.allCaps,
                to: htmlPaths.elements([htmlPaths.element("span")])
            }
        ]
    });
    return converter.convertToHtml(run).then(function(result) {
        assert.equal(result.value, "<span>Hello.</span>");
    });
});


test('small caps runs are ignored by default', function() {
    var run = runOfText("Hello.", {isSmallCaps: true});
    var converter = new DocumentConverter();
    return converter.convertToHtml(run).then(function(result) {
        assert.equal(result.value, "Hello.");
    });
});

test('small caps runs can be configured with style mapping', function() {
    var run = runOfText("Hello.", {isSmallCaps: true});
    var converter = new DocumentConverter({
        styleMap: [
            {
                from: documentMatchers.smallCaps,
                to: htmlPaths.elements([htmlPaths.element("span")])
            }
        ]
    });
    return converter.convertToHtml(run).then(function(result) {
        assert.equal(result.value, "<span>Hello.</span>");
    });
});


test('highlighted runs are ignored by default', function() {
    var run = runOfText("Hello.", {highlight: "yellow"});
    var converter = new DocumentConverter();
    return converter.convertToHtml(run).then(function(result) {
        assert.equal(result.value, "Hello.");
    });
});

test('highlighted runs can be configured with style mapping for all highlights', function() {
    var run = runOfText("Hello.", {highlight: "yellow"});
    var converter = new DocumentConverter({
        styleMap: [
            {
                from: documentMatchers.highlight(null),
                to: htmlPaths.elements([htmlPaths.element("mark")])
            }
        ]
    });
    return converter.convertToHtml(run).then(function(result) {
        assert.equal(result.value, "<mark>Hello.</mark>");
    });
});

test('highlighted runs can be configured with style mapping for specific highlight color', function() {
    var paragraph = new documents.Paragraph([
        runOfText("Yellow", {highlight: "yellow"}),
        runOfText("Red", {highlight: "red"})
    ]);
    var converter = new DocumentConverter({
        styleMap: [
            {
                from: documentMatchers.highlight({color: "yellow"}),
                to: htmlPaths.elements([htmlPaths.element("mark", {"class": "yellow"})])
            },
            {
                from: documentMatchers.highlight({color: undefined}),
                to: htmlPaths.elements([htmlPaths.element("mark")])
            }
        ]
    });
    return converter.convertToHtml(paragraph).then(function(result) {
        assert.equal(result.value, '<p><mark class="yellow">Yellow</mark><mark>Red</mark></p>');
    });
});


test('run styles are converted to HTML if mapping exists', function() {
    var run = runOfText("Hello.", {styleId: "Heading1Char", styleName: "Heading 1 Char"});
    var converter = new DocumentConverter({
        styleMap: [
            {
                from: documentMatchers.run({styleName: documentMatchers.equalTo("Heading 1 Char")}),
                to: htmlPaths.elements(["strong"])
            }
        ]
    });
    return converter.convertToHtml(run).then(function(result) {
        assert.equal(result.value, "<strong>Hello.</strong>");
    });
});

test('warning is emitted if run style is unrecognised', function() {
    var run = runOfText("Hello.", {styleId: "Heading1Char", styleName: "Heading 1 Char"});
    var converter = new DocumentConverter();
    return converter.convertToHtml(run).then(function(result) {
        assert.deepEqual(result.messages, [results.warning("Unrecognised run style: 'Heading 1 Char' (Style ID: Heading1Char)")]);
    });
});

test('docx hyperlink is converted to <a>', function() {
    var hyperlink = new documents.Hyperlink(
        [runOfText("Hello.")],
        {href: "http://www.example.com"}
    );
    var converter = new DocumentConverter();
    return converter.convertToHtml(hyperlink).then(function(result) {
        assert.equal(result.value, '<a href="http://www.example.com">Hello.</a>');
    });
});

test('docx hyperlink can be collapsed', function() {
    var hyperlink = new documents.Document([
        new documents.Hyperlink(
            [runOfText("Hello ")],
            {href: "http://www.example.com"}
        ),
        new documents.Hyperlink(
            [runOfText("world")],
            {href: "http://www.example.com"}
        )
    ]);
    var converter = new DocumentConverter();
    return converter.convertToHtml(hyperlink).then(function(result) {
        assert.equal(result.value, '<a href="http://www.example.com">Hello world</a>');
    });
});

test('docx hyperlink with anchor is converted to <a>', function() {
    var hyperlink = new documents.Hyperlink(
        [runOfText("Hello.")],
        {anchor: "_Peter"}
    );
    var converter = new DocumentConverter({
        idPrefix: "doc-42-"
    });
    return converter.convertToHtml(hyperlink).then(function(result) {
        assert.equal(result.value, '<a href="#doc-42-_Peter">Hello.</a>');
    });
});

test('hyperlink target frame is used as anchor target', function() {
    var hyperlink = new documents.Hyperlink(
        [runOfText("Hello.")],
        {anchor: "start", targetFrame: "_blank"}
    );
    var converter = new DocumentConverter();
    return converter.convertToHtml(hyperlink).then(function(result) {
        assert.equal(result.value, '<a href="#start" target="_blank">Hello.</a>');
    });
});

test('unchecked checkbox is converted to unchecked checkbox input', function() {
    var checkbox = documents.checkbox({checked: false});
    var converter = new DocumentConverter();
    return converter.convertToHtml(checkbox).then(function(result) {
        assert.equal(result.value, '<input type="checkbox" />');
    });
});

test('checked checkbox is converted to checked checkbox input', function() {
    var checkbox = documents.checkbox({checked: true});
    var converter = new DocumentConverter();
    return converter.convertToHtml(checkbox).then(function(result) {
        assert.equal(result.value, '<input type="checkbox" checked="checked" />');
    });
});

test('bookmarks are converted to anchors', function() {
    var bookmarkStart = new documents.BookmarkStart({name: "_Peter"});
    var converter = new DocumentConverter({
        idPrefix: "doc-42-"
    });
    var document = new documents.Document([bookmarkStart]);
    return converter.convertToHtml(document).then(function(result) {
        assert.equal(result.value, '<a id="doc-42-_Peter"></a>');
    });
});

test('docx tab is converted to tab in HTML', function() {
    var tab = new documents.Tab();
    var converter = new DocumentConverter();
    return converter.convertToHtml(tab).then(function(result) {
        assert.equal(result.value, "\t");
    });
});

test('docx table is converted to table in HTML', function() {
    var table = new documents.Table([
        new documents.TableRow([
            new documents.TableCell([paragraphOfText("Top left")]),
            new documents.TableCell([paragraphOfText("Top right")])
        ]),
        new documents.TableRow([
            new documents.TableCell([paragraphOfText("Bottom left")]),
            new documents.TableCell([paragraphOfText("Bottom right")])
        ])
    ]);
    var converter = new DocumentConverter();

    return converter.convertToHtml(table).then(function(result) {
        var expectedHtml = "<table>" +
            "<tr><td><p>Top left</p></td><td><p>Top right</p></td></tr>" +
            "<tr><td><p>Bottom left</p></td><td><p>Bottom right</p></td></tr>" +
            "</table>";
        assert.equal(result.value, expectedHtml);
    });
});

test('table style mappings can be used to map tables', function() {
    var table = new documents.Table([], {styleName: "Normal Table"});
    var converter = new DocumentConverter({
        styleMap: [
            {
                from: documentMatchers.table({styleName: documentMatchers.equalTo("Normal Table")}),
                to: htmlPaths.topLevelElement("table", {"class": "normal-table"})
            }
        ]
    });

    return converter.convertToHtml(table).then(function(result) {
        var expectedHtml = '<table class="normal-table"></table>';
        assert.equal(result.value, expectedHtml);
    });
});

test('header rows are wrapped in thead', function() {
    var table = new documents.Table([
        new documents.TableRow([new documents.TableCell([])], {isHeader: true}),
        new documents.TableRow([new documents.TableCell([])], {isHeader: true}),
        new documents.TableRow([new documents.TableCell([])], {isHeader: false})
    ]);
    var converter = new DocumentConverter();

    return converter.convertToHtml(table).then(function(result) {
        var expectedHtml = "<table>" +
            "<thead><tr><th></th></tr><tr><th></th></tr></thead>" +
            "<tbody><tr><td></td></tr></tbody>" +
            "</table>";
        assert.equal(result.value, expectedHtml);
    });
});

test('tbody is omitted if all rows are headers', function() {
    var table = new documents.Table([
        new documents.TableRow([new documents.TableCell([])], {isHeader: true})
    ]);
    var converter = new DocumentConverter();

    return converter.convertToHtml(table).then(function(result) {
        var expectedHtml = "<table>" +
            "<thead><tr><th></th></tr></thead>" +
            "</table>";
        assert.equal(result.value, expectedHtml);
    });
});

test('unexpected table children do not cause error', function() {
    var table = new documents.Table([
        new documents.tab()
    ]);
    var converter = new DocumentConverter();

    return converter.convertToHtml(table).then(function(result) {
        var expectedHtml = "<table>\t</table>";
        assert.equal(result.value, expectedHtml);
    });
});

test('empty cells are preserved in table', function() {
    var table = new documents.Table([
        new documents.TableRow([
            new documents.TableCell([paragraphOfText("")]),
            new documents.TableCell([paragraphOfText("Top right")])
        ])
    ]);
    var converter = new DocumentConverter();

    return converter.convertToHtml(table).then(function(result) {
        var expectedHtml = "<table>" +
            "<tr><td></td><td><p>Top right</p></td></tr>" +
            "</table>";
        assert.equal(result.value, expectedHtml);
    });
});

test('empty rows are preserved in table', function() {
    var table = new documents.Table([
        new documents.TableRow([
            new documents.TableCell([paragraphOfText("Row 1")])
        ]),
        new documents.TableRow([])
    ]);
    var converter = new DocumentConverter();

    return converter.convertToHtml(table).then(function(result) {
        var expectedHtml = "<table>" +
            "<tr><td><p>Row 1</p></td></tr><tr></tr>" +
            "</table>";
        assert.equal(result.value, expectedHtml);
    });
});

test('table cells are written with colSpan if not equal to one', function() {
    var table = new documents.Table([
        new documents.TableRow([
            new documents.TableCell([paragraphOfText("Top left")], {colSpan: 2}),
            new documents.TableCell([paragraphOfText("Top right")])
        ])
    ]);
    var converter = new DocumentConverter();

    return converter.convertToHtml(table).then(function(result) {
        var expectedHtml = "<table>" +
            "<tr><td colspan=\"2\"><p>Top left</p></td><td><p>Top right</p></td></tr>" +
            "</table>";
        assert.equal(result.value, expectedHtml);
    });
});

test('table cells are written with rowSpan if not equal to one', function() {
    var table = new documents.Table([
        new documents.TableRow([
            new documents.TableCell([], {rowSpan: 2})
        ])
    ]);
    var converter = new DocumentConverter();

    return converter.convertToHtml(table).then(function(result) {
        var expectedHtml = "<table>" +
            "<tr><td rowspan=\"2\"></td></tr>" +
            "</table>";
        assert.equal(result.value, expectedHtml);
    });
});

test('line break is converted to <br>', function() {
    var converter = new DocumentConverter();

    return converter.convertToHtml(documents.lineBreak).then(function(result) {
        assert.equal(result.value, "<br />");
    });
});

test('breaks that are not line breaks are ignored', function() {
    var converter = new DocumentConverter();

    return converter.convertToHtml(documents.pageBreak).then(function(result) {
        assert.equal(result.value, "");
    });
});

test('breaks can be mapped using style mappings', function() {
    var converter = new DocumentConverter({
        styleMap: [
            {
                from: documentMatchers.pageBreak,
                to: htmlPaths.topLevelElement("hr")
            },
            {
                from: documentMatchers.lineBreak,
                to: htmlPaths.topLevelElement("br", {class: "line-break"})
            }
        ]
    });

    var run = documents.run([documents.pageBreak, documents.lineBreak]);

    return converter.convertToHtml(run).then(function(result) {
        assert.equal(result.value, '<hr /><br class="line-break" />');
    });
});

test('footnote reference is converted to superscript intra-page link', function() {
    var footnoteReference = new documents.NoteReference({
        noteType: "footnote",
        noteId: "4"
    });
    var converter = new DocumentConverter({
        idPrefix: "doc-42-"
    });
    return converter.convertToHtml(footnoteReference).then(function(result) {
        assert.equal(result.value, '<sup><a href="#doc-42-footnote-4" id="doc-42-footnote-ref-4">[1]</a></sup>');
    });
});

test('footnotes are included after the main body', function() {
    var footnoteReference = new documents.NoteReference({
        noteType: "footnote",
        noteId: "4"
    });
    var document = new documents.Document(
        [new documents.Paragraph([
            runOfText("Knock knock"),
            new documents.Run([footnoteReference])
        ])],
        {
            notes: new documents.Notes({
                4: new documents.Note({
                    noteType: "footnote",
                    noteId: "4",
                    body: [paragraphOfText("Who's there?")]
                })
            })
        }
    );

    var converter = new DocumentConverter({
        idPrefix: "doc-42-"
    });
    return converter.convertToHtml(document).then(function(result) {
        var expectedOutput = '<p>Knock knock<sup><a href="#doc-42-footnote-4" id="doc-42-footnote-ref-4">[1]</a></sup></p>' +
            '<ol><li id="doc-42-footnote-4"><p>Who\'s there? <a href="#doc-42-footnote-ref-4">↑</a></p></li></ol>';
        assert.equal(result.value, expectedOutput);
    });
});

test('comments are ignored by default', function() {
    var reference = documents.commentReference({commentId: "4"});
    var comment = documents.comment({
        commentId: "4",
        body: [paragraphOfText("Who's there?")]
    });
    var document = documents.document([
        documents.paragraph([
            runOfText("Knock knock"),
            documents.run([reference])
        ])
    ], {comments: [comment]});

    var converter = new DocumentConverter({});
    return converter.convertToHtml(document).then(function(result) {
        assert.equal(result.value, '<p>Knock knock</p>');
        assert.deepEqual(result.messages, []);
    });
});

test('comment references are linked to comment after main body', function() {
    var reference = documents.commentReference({commentId: "4"});
    var comment = documents.comment({
        commentId: "4",
        body: [paragraphOfText("Who's there?")],
        authorName: "The Piemaker",
        authorInitials: "TP"
    });
    var document = documents.document([
        documents.paragraph([
            runOfText("Knock knock"),
            documents.run([reference])
        ])
    ], {comments: [comment]});

    var converter = new DocumentConverter({
        idPrefix: "doc-42-",
        styleMap: [
            {from: documentMatchers.commentReference, to: htmlPaths.element("sup")}
        ]
    });
    return converter.convertToHtml(document).then(function(result) {
        var expectedHtml = (
            '<p>Knock knock<sup><a href="#doc-42-comment-4" id="doc-42-comment-ref-4">[TP1]</a></sup></p>' +
            '<dl><dt id="doc-42-comment-4">Comment [TP1]</dt><dd><p>Who\'s there? <a href="#doc-42-comment-ref-4">↑</a></p></dd></dl>'
        );
        assert.equal(result.value, expectedHtml);
        assert.deepEqual(result.messages, []);
    });
});

test('images are written with data URIs', function() {
    var imageBuffer = new Buffer("Not an image at all!");
    var image = new documents.Image({
        readImage: function(encoding) {
            return promises.when(imageBuffer.toString(encoding));
        },
        contentType: "image/png"
    });
    var converter = new DocumentConverter();
    return converter.convertToHtml(image).then(function(result) {
        assert.equal(result.value, '<img src="data:image/png;base64,' + imageBuffer.toString("base64") + '" />');
    });
});

test('images have alt attribute if available', function() {
    var imageBuffer = new Buffer("Not an image at all!");
    var image = new documents.Image({
        readImage: function() {
            return promises.when(imageBuffer);
        },
        altText: "It's a hat"
    });
    var converter = new DocumentConverter();
    return converter.convertToHtml(image)
        .then(function(result) {
            return xml.readString(result.value);
        })
        .then(function(htmlImageElement) {
            assert.equal(htmlImageElement.attributes.alt, "It's a hat");
        });
});

test('can add custom handler for images', function() {
    var imageBuffer = new Buffer("Not an image at all!");
    var image = new documents.Image({
        readImage: function(encoding) {
            return promises.when(imageBuffer.toString(encoding));
        },
        contentType: "image/png"
    });
    var converter = new DocumentConverter({
        convertImage: function(element, messages) {
            return element.read("utf8").then(function(altText) {
                return [Html.freshElement("img", {alt: altText})];
            });
        }
    });
    return converter.convertToHtml(image).then(function(result) {
        assert.equal(result.value, '<img alt="Not an image at all!" />');
    });
});

test('when custom image handler throws error then error is stored in error message', function() {
    var error = new Error("Failed to convert image");
    var image = new documents.Image({
        readImage: function(encoding) {
            return promises.when(new Buffer().toString(encoding));
        },
        contentType: "image/png"
    });
    var converter = new DocumentConverter({
        convertImage: function(element, messages) {
            throw error;
        }
    });
    return converter.convertToHtml(image).then(function(result) {
        assert.equal(result.value, '');
        assert.equal(result.messages.length, 1);
        var message = result.messages[0];
        assert.equal("error", message.type);
        assert.equal("Failed to convert image", message.message);
        assert.equal(error, message.error);
    });
});

test('long documents do not cause stack overflow', function() {
    var paragraphs = [];
    for (var i = 0; i < 1000; i++) {
        paragraphs.push(paragraphOfText("Hello."));
    }
    var document = new documents.Document(paragraphs);
    var converter = new DocumentConverter();
    return converter.convertToHtml(document).then(function(result) {
        assert.equal(result.value.indexOf("<p>Hello.</p>"), 0);
    });
});

function paragraphOfText(text, styleId, styleName) {
    var run = runOfText(text);
    return new documents.Paragraph([run], {
        styleId: styleId,
        styleName: styleName
    });
}

function runOfText(text, properties) {
    var textElement = new documents.Text(text);
    return new documents.Run([textElement], properties);
}

test('when initials are not blank then comment author label is initials', function() {
    assert.equal(commentAuthorLabel({authorInitials: "TP"}), "TP");
});

test('when initials are blank then comment author label is blank', function() {
    assert.equal(commentAuthorLabel({authorInitials: ""}), "");
    assert.equal(commentAuthorLabel({authorInitials: undefined}), "");
    assert.equal(commentAuthorLabel({authorInitials: null}), "");
});
