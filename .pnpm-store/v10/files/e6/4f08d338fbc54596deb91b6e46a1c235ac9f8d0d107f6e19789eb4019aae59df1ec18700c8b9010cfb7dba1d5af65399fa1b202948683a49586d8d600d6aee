var assert = require("assert");
var path = require("path");

var _ = require("underscore");
var hamjest = require("hamjest");
var assertThat = hamjest.assertThat;
var promiseThat = hamjest.promiseThat;
var allOf = hamjest.allOf;
var contains = hamjest.contains;
var equalTo = hamjest.equalTo;
var hasProperties = hamjest.hasProperties;
var willBe = hamjest.willBe;
var FeatureMatcher = hamjest.FeatureMatcher;

var documentMatchers = require("./document-matchers");
var isEmptyRun = documentMatchers.isEmptyRun;
var isCheckbox = documentMatchers.isCheckbox;
var isHyperlink = documentMatchers.isHyperlink;
var isRun = documentMatchers.isRun;
var isText = documentMatchers.isText;
var isTable = documentMatchers.isTable;
var isRow = documentMatchers.isRow;

var _readNumberingProperties = require("../../lib/docx/body-reader")._readNumberingProperties;
var documents = require("../../lib/documents");
var xml = require("../../lib/xml");
var XmlElement = xml.Element;
var Relationships = require("../../lib/docx/relationships-reader").Relationships;
var Styles = require("../../lib/docx/styles-reader").Styles;
var warning = require("../../lib/results").warning;

var testing = require("../testing");
var test = require("../test")(module);
var createBodyReaderForTests = require("./testing").createBodyReaderForTests;
var createFakeDocxFile = testing.createFakeDocxFile;

function readXmlElement(element, options) {
    return createBodyReaderForTests(options).readXmlElement(element);
}

function readXmlElements(element, options) {
    return createBodyReaderForTests(options).readXmlElements(element);
}

function readXmlElementValue(element, options) {
    var result = readXmlElement(element, options);
    assert.deepEqual(result.messages, []);
    return result.value;
}

function readXmlElementsValue(elements, options) {
    var result = readXmlElements(elements, options);
    assert.deepEqual(result.messages, []);
    return result.value;
}

var fakeContentTypes = {
    findContentType: function(filePath) {
        var extensionTypes = {
            ".png": "image/png",
            ".emf": "image/x-emf"
        };
        return extensionTypes[path.extname(filePath)];
    }
};

test("paragraph has no style if it has no properties", function() {
    var paragraphXml = new XmlElement("w:p", {}, []);
    var paragraph = readXmlElementValue(paragraphXml);
    assert.deepEqual(paragraph.styleId, null);
});

test("paragraph has style ID and name read from paragraph properties if present", function() {
    var styleXml = new XmlElement("w:pStyle", {"w:val": "Heading1"}, []);
    var propertiesXml = new XmlElement("w:pPr", {}, [styleXml]);
    var paragraphXml = new XmlElement("w:p", {}, [propertiesXml]);

    var styles = new Styles({"Heading1": {name: "Heading 1"}}, {});

    var paragraph = readXmlElementValue(paragraphXml, {styles: styles});
    assert.deepEqual(paragraph.styleId, "Heading1");
    assert.deepEqual(paragraph.styleName, "Heading 1");
});

test("warning is emitted when paragraph style cannot be found", function() {
    var styleXml = new XmlElement("w:pStyle", {"w:val": "Heading1"}, []);
    var propertiesXml = new XmlElement("w:pPr", {}, [styleXml]);
    var paragraphXml = new XmlElement("w:p", {}, [propertiesXml]);

    var styles = new Styles({}, {});

    var result = readXmlElement(paragraphXml, {styles: styles});
    var paragraph = result.value;
    assert.deepEqual(paragraph.styleId, "Heading1");
    assert.deepEqual(paragraph.styleName, null);
    assert.deepEqual(result.messages, [warning("Paragraph style with ID Heading1 was referenced but not defined in the document")]);
});

test("paragraph has justification read from paragraph properties if present", function() {
    var justificationXml = new XmlElement("w:jc", {"w:val": "center"}, []);
    var propertiesXml = new XmlElement("w:pPr", {}, [justificationXml]);
    var paragraphXml = new XmlElement("w:p", {}, [propertiesXml]);
    var paragraph = readXmlElementValue(paragraphXml);
    assert.deepEqual(paragraph.alignment, "center");
});

test("paragraph indent", {
    "when w:start is set then start indent is read from w:start": function() {
        var paragraphXml = paragraphWithIndent({"w:start": "720", "w:left": "40"});
        var paragraph = readXmlElementValue(paragraphXml);
        assert.equal(paragraph.indent.start, "720");
    },

    "when w:start is not set then start indent is read from w:left": function() {
        var paragraphXml = paragraphWithIndent({"w:left": "720"});
        var paragraph = readXmlElementValue(paragraphXml);
        assert.equal(paragraph.indent.start, "720");
    },

    "when w:end is set then end indent is read from w:end": function() {
        var paragraphXml = paragraphWithIndent({"w:end": "720", "w:right": "40"});
        var paragraph = readXmlElementValue(paragraphXml);
        assert.equal(paragraph.indent.end, "720");
    },

    "when w:end is not set then end indent is read from w:right": function() {
        var paragraphXml = paragraphWithIndent({"w:right": "720"});
        var paragraph = readXmlElementValue(paragraphXml);
        assert.equal(paragraph.indent.end, "720");
    },

    "paragraph has indent firstLine read from paragraph properties if present": function() {
        var paragraphXml = paragraphWithIndent({"w:firstLine": "720"});
        var paragraph = readXmlElementValue(paragraphXml);
        assert.equal(paragraph.indent.firstLine, "720");
    },

    "paragraph has indent hanging read from paragraph properties if present": function() {
        var paragraphXml = paragraphWithIndent({"w:hanging": "720"});
        var paragraph = readXmlElementValue(paragraphXml);
        assert.equal(paragraph.indent.hanging, "720");
    },

    "when indent attributes aren't set then indents are null": function() {
        var paragraphXml = paragraphWithIndent({});
        var paragraph = readXmlElementValue(paragraphXml);
        assert.equal(paragraph.indent.start, null);
        assert.equal(paragraph.indent.end, null);
        assert.equal(paragraph.indent.firstLine, null);
        assert.equal(paragraph.indent.hanging, null);
    }
});

function paragraphWithIndent(indentAttributes) {
    var indentXml = new XmlElement("w:ind", indentAttributes, []);
    var propertiesXml = new XmlElement("w:pPr", {}, [indentXml]);
    return new XmlElement("w:p", {}, [propertiesXml]);
}

test("paragraph has numbering properties from paragraph properties if present", function() {
    var numberingPropertiesXml = new XmlElement("w:numPr", {}, [
        new XmlElement("w:ilvl", {"w:val": "1"}),
        new XmlElement("w:numId", {"w:val": "42"})
    ]);
    var propertiesXml = new XmlElement("w:pPr", {}, [numberingPropertiesXml]);
    var paragraphXml = new XmlElement("w:p", {}, [propertiesXml]);

    var numbering = new NumberingMap({
        findLevel: {"42": {"1": {isOrdered: true, level: "1"}}}
    });

    var paragraph = readXmlElementValue(paragraphXml, {numbering: numbering});
    assert.deepEqual(paragraph.numbering, {level: "1", isOrdered: true});
});

test("paragraph has numbering from paragraph style if present", function() {
    var propertiesXml = new XmlElement("w:pPr", {}, [
        new XmlElement("w:pStyle", {"w:val": "List"})
    ]);
    var paragraphXml = new XmlElement("w:p", {}, [propertiesXml]);

    var numbering = new NumberingMap({
        findLevelByParagraphStyleId: {"List": {isOrdered: true, level: "1"}}
    });
    var styles = new Styles({"List": {name: "List"}}, {});

    var paragraph = readXmlElementValue(paragraphXml, {numbering: numbering, styles: styles});
    assert.deepEqual(paragraph.numbering, {level: "1", isOrdered: true});
});

test("numbering properties in paragraph properties takes precedence over numbering in paragraph style", function() {
    var numberingPropertiesXml = new XmlElement("w:numPr", {}, [
        new XmlElement("w:ilvl", {"w:val": "1"}),
        new XmlElement("w:numId", {"w:val": "42"})
    ]);
    var propertiesXml = new XmlElement("w:pPr", {}, [
        new XmlElement("w:pStyle", {"w:val": "List"}),
        numberingPropertiesXml
    ]);
    var paragraphXml = new XmlElement("w:p", {}, [propertiesXml]);

    var numbering = new NumberingMap({
        findLevel: {"42": {"1": {isOrdered: true, level: "1"}}},
        findLevelByParagraphStyleId: {"List": {isOrdered: true, level: "2"}}
    });
    var styles = new Styles({"List": {name: "List"}}, {});

    var paragraph = readXmlElementValue(paragraphXml, {numbering: numbering, styles: styles});
    assert.deepEqual(paragraph.numbering, {level: "1", isOrdered: true});
});

test("numbering properties are converted to numbering at specified level", function() {
    var numberingPropertiesXml = new XmlElement("w:numPr", {}, [
        new XmlElement("w:ilvl", {"w:val": "1"}),
        new XmlElement("w:numId", {"w:val": "42"})
    ]);

    var numbering = new NumberingMap({
        findLevel: {"42": {"1": {isOrdered: true, level: "1"}}}
    });

    var numberingLevel = _readNumberingProperties(null, numberingPropertiesXml, numbering);
    assert.deepEqual(numberingLevel, {level: "1", isOrdered: true});
});

test("when numbering properties are missing w:ilvl then level of 0 is assumed", function() {
    var numberingPropertiesXml = new XmlElement("w:numPr", {}, [
        new XmlElement("w:numId", {"w:val": "42"})
    ]);

    var numbering = new NumberingMap({
        findLevel: {"42": {"0": {isOrdered: true, level: "0"}}}
    });

    var numberingLevel = _readNumberingProperties(null, numberingPropertiesXml, numbering);
    assert.deepEqual(numberingLevel, {level: "0", isOrdered: true});
});

test("numbering properties are ignored if w:numId is missing", function() {
    var numberingPropertiesXml = new XmlElement("w:numPr", {}, [
        new XmlElement("w:ilvl", {"w:val": "1"})
    ]);

    var numbering = new NumberingMap({
        findLevel: {"42": {"1": {isOrdered: true, level: "1"}}}
    });

    var numberingLevel = _readNumberingProperties(null, numberingPropertiesXml, numbering);
    assert.equal(numberingLevel, null);
});

test("content of deleted paragraph is prepended to next paragraph", function() {
    var styles = new Styles(
        {
            "Heading1": {name: "Heading 1"},
            "Heading2": {name: "Heading 2"}
        },
        {}
    );
    var bodyXml = [
        new XmlElement("w:p", {}, [
            new XmlElement("w:pPr", {}, [
                new XmlElement("w:pStyle", {"w:val": "Heading1"}, []),
                new XmlElement("w:rPr", {}, [
                    new XmlElement("w:del")
                ])
            ]),
            runOfText("One")
        ]),
        new XmlElement("w:p", {}, [
            new XmlElement("w:pPr", {}, [
                new XmlElement("w:pStyle", {"w:val": "Heading2"}, [])
            ]),
            runOfText("Two")
        ]),
        // Include a second paragraph that isn't deleted to ensure we only add
        // the deleted paragraph contents once.
        new XmlElement("w:p", {}, [
            runOfText("Three")
        ])
    ];

    var result = readXmlElementsValue(bodyXml, {styles: styles});

    assertThat(result, contains(
        hasProperties({
            type: documents.types.paragraph,
            styleId: "Heading2",
            children: contains(
                documents.run([documents.text("One")]),
                documents.run([documents.text("Two")])
            )
        }),
        hasProperties({
            type: documents.types.paragraph,
            children: contains(
                documents.run([documents.text("Three")])
            )
        })
    ));
});

test("complex fields", (function() {
    var uri = "http://example.com";
    var beginXml = new XmlElement("w:r", {}, [
        new XmlElement("w:fldChar", {"w:fldCharType": "begin"})
    ]);
    var endXml = new XmlElement("w:r", {}, [
        new XmlElement("w:fldChar", {"w:fldCharType": "end"})
    ]);
    var separateXml = new XmlElement("w:r", {}, [
        new XmlElement("w:fldChar", {"w:fldCharType": "separate"})
    ]);
    var hyperlinkInstrText = new XmlElement("w:instrText", {}, [
        xml.text(' HYPERLINK "' + uri + '"')
    ]);
    var hyperlinkRunXml = runOfText("this is a hyperlink");

    var isEmptyHyperlinkedRun = isHyperlinkedRun({children: []});

    function isHyperlinkedRun(hyperlinkProperties) {
        return isRun({
            children: contains(
                isHyperlink(hyperlinkProperties)
            )
        });
    }

    return {
        "stores instrText returns empty result": function() {
            var instrText = readXmlElementValue(hyperlinkInstrText);
            assert.deepEqual(instrText, []);
        },

        "runs in a complex field for hyperlink without switch are read as external hyperlinks": function() {
            var hyperlinkRunXml = runOfText("this is a hyperlink");
            var paragraphXml = new XmlElement("w:p", {}, [
                beginXml,
                hyperlinkInstrText,
                separateXml,
                hyperlinkRunXml,
                endXml
            ]);
            var paragraph = readXmlElementValue(paragraphXml);

            assertThat(paragraph.children, contains(
                isEmptyRun,
                isEmptyHyperlinkedRun,
                isHyperlinkedRun({
                    href: uri,
                    children: contains(
                        isText("this is a hyperlink")
                    )
                }),
                isEmptyRun
            ));
        },

        "runs in a complex field for hyperlink with l switch are read as internal hyperlinks": function() {
            var hyperlinkRunXml = runOfText("this is a hyperlink");
            var paragraphXml = new XmlElement("w:p", {}, [
                beginXml,
                new XmlElement("w:instrText", {}, [
                    xml.text(' HYPERLINK \\l "InternalLink"')
                ]),
                separateXml,
                hyperlinkRunXml,
                endXml
            ]);
            var paragraph = readXmlElementValue(paragraphXml);

            assertThat(paragraph.children, contains(
                isEmptyRun,
                isEmptyHyperlinkedRun,
                isHyperlinkedRun({
                    anchor: "InternalLink",
                    children: contains(
                        isText("this is a hyperlink")
                    )
                }),
                isEmptyRun
            ));
        },

        "runs after a complex field for hyperlinks are not read as hyperlinks": function() {
            var afterEndXml = runOfText("this will not be a hyperlink");
            var paragraphXml = new XmlElement("w:p", {}, [
                beginXml,
                hyperlinkInstrText,
                separateXml,
                endXml,
                afterEndXml
            ]);
            var paragraph = readXmlElementValue(paragraphXml);

            assertThat(paragraph.children, contains(
                isEmptyRun,
                isEmptyHyperlinkedRun,
                isEmptyRun,
                isRun({
                    children: contains(
                        isText("this will not be a hyperlink")
                    )
                })
            ));
        },

        "can handle split instrText elements": function() {
            var hyperlinkInstrTextPart1 = new XmlElement("w:instrText", {}, [
                xml.text(" HYPE")
            ]);
            var hyperlinkInstrTextPart2 = new XmlElement("w:instrText", {}, [
                xml.text('RLINK "' + uri + '"')
            ]);
            var paragraphXml = new XmlElement("w:p", {}, [
                beginXml,
                hyperlinkInstrTextPart1,
                hyperlinkInstrTextPart2,
                separateXml,
                hyperlinkRunXml,
                endXml
            ]);
            var paragraph = readXmlElementValue(paragraphXml);

            assertThat(paragraph.children, contains(
                isEmptyRun,
                isEmptyHyperlinkedRun,
                isHyperlinkedRun({
                    href: uri,
                    children: contains(
                        isText("this is a hyperlink")
                    )
                }),
                isEmptyRun
            ));
        },

        "hyperlink is not ended by end of nested complex field": function() {
            var authorInstrText = new XmlElement("w:instrText", {}, [
                xml.text(' AUTHOR "John Doe"')
            ]);
            var paragraphXml = new XmlElement("w:p", {}, [
                beginXml,
                hyperlinkInstrText,
                separateXml,
                beginXml,
                authorInstrText,
                separateXml,
                endXml,
                hyperlinkRunXml,
                endXml
            ]);
            var paragraph = readXmlElementValue(paragraphXml);

            assertThat(paragraph.children, contains(
                isEmptyRun,
                isEmptyHyperlinkedRun,
                isEmptyHyperlinkedRun,
                isEmptyHyperlinkedRun,
                isEmptyHyperlinkedRun,
                isHyperlinkedRun({
                    href: uri,
                    children: contains(
                        isText("this is a hyperlink")
                    )
                }),
                isEmptyRun
          ));
        },

        "complex field nested within a hyperlink complex field is wrapped with the hyperlink": function() {
            var authorInstrText = new XmlElement("w:instrText", {}, [
                xml.text(' AUTHOR "John Doe"')
            ]);
            var paragraphXml = new XmlElement("w:p", {}, [
                beginXml,
                hyperlinkInstrText,
                separateXml,
                beginXml,
                authorInstrText,
                separateXml,
                runOfText("John Doe"),
                endXml,
                endXml
            ]);
            var paragraph = readXmlElementValue(paragraphXml);

            assertThat(paragraph.children, contains(
                isEmptyRun,
                isEmptyHyperlinkedRun,
                isEmptyHyperlinkedRun,
                isEmptyHyperlinkedRun,
                isHyperlinkedRun({
                    href: uri,
                    children: contains(
                        isText("John Doe")
                    )
                }),
                isEmptyHyperlinkedRun,
                isEmptyRun
          ));
        },

        "field without separate w:fldChar is ignored": function() {
            var hyperlinkRunXml = runOfText("this is a hyperlink");
            var paragraphXml = new XmlElement("w:p", {}, [
                beginXml,
                hyperlinkInstrText,
                separateXml,
                beginXml,
                endXml,
                hyperlinkRunXml,
                endXml
            ]);
            var paragraph = readXmlElementValue(paragraphXml);

            assertThat(paragraph.children, contains(
                isEmptyRun,
                isEmptyHyperlinkedRun,
                isEmptyHyperlinkedRun,
                isEmptyHyperlinkedRun,
                isHyperlinkedRun({
                    href: uri,
                    children: contains(
                        isText("this is a hyperlink")
                    )
                }),
                isEmptyRun
            ));
        }
    };
})());

test("checkboxes", {
    "complex field checkbox without separate is read": function() {
        var paragraphXml = xml.element("w:p", {}, [
            xml.element("w:r", {}, [
                xml.element("w:fldChar", {"w:fldCharType": "begin"})
            ]),
            xml.element("w:instrText", {}, [
                xml.text(' FORMCHECKBOX ')
            ]),
            xml.element("w:r", {}, [
                xml.element("w:fldChar", {"w:fldCharType": "end"})
            ])
        ]);

        var paragraph = readXmlElementValue(paragraphXml);

        assertThat(paragraph.children, contains(
            isEmptyRun,
            isRun({
                children: contains(
                    isCheckbox()
                )
            })
        ));
    },

    "complex field checkbox with separate is read": function() {
        var paragraphXml = xml.element("w:p", {}, [
            xml.element("w:r", {}, [
                xml.element("w:fldChar", {"w:fldCharType": "begin"})
            ]),
            xml.element("w:instrText", {}, [
                xml.text(' FORMCHECKBOX ')
            ]),
            xml.element("w:r", {}, [
                xml.element("w:fldChar", {"w:fldCharType": "separate"})
            ]),
            xml.element("w:r", {}, [
                xml.element("w:fldChar", {"w:fldCharType": "end"})
            ])
        ]);

        var paragraph = readXmlElementValue(paragraphXml);

        assertThat(paragraph.children, contains(
            isEmptyRun,
            isEmptyRun,
            isRun({
                children: contains(
                    isCheckbox()
                )
            })
        ));
    },

    "complex field checkbox without w:default nor w:checked is unchecked": function() {
        var paragraphXml = complexFieldCheckboxParagraph([
            xml.element("w:checkBox")
        ]);

        var paragraph = readXmlElementValue(paragraphXml);

        assertThat(paragraph.children, contains(
            isEmptyRun,
            isEmptyRun,
            isRun({
                children: contains(
                    isCheckbox({checked: equalTo(false)})
                )
            })
        ));
    },

    "complex field checkbox with w:default=0 and without w:checked is unchecked": function() {
        var paragraphXml = complexFieldCheckboxParagraph([
            xml.element("w:checkBox", {}, [
                xml.element("w:default", {"w:val": "0"})
            ])
        ]);

        var paragraph = readXmlElementValue(paragraphXml);

        assertThat(paragraph.children, contains(
            isEmptyRun,
            isEmptyRun,
            isRun({
                children: contains(
                    isCheckbox({checked: equalTo(false)})
                )
            })
        ));
    },

    "complex field checkbox with w:default=1 and without w:checked is checked": function() {
        var paragraphXml = complexFieldCheckboxParagraph([
            xml.element("w:checkBox", {}, [
                xml.element("w:default", {"w:val": "1"})
            ])
        ]);

        var paragraph = readXmlElementValue(paragraphXml);

        assertThat(paragraph.children, contains(
            isEmptyRun,
            isEmptyRun,
            isRun({
                children: contains(
                    isCheckbox({checked: equalTo(true)})
                )
            })
        ));
    },

    "complex field checkbox with w:default=1 and w:checked=0 is unchecked": function() {
        var paragraphXml = complexFieldCheckboxParagraph([
            xml.element("w:checkBox", {}, [
                xml.element("w:default", {"w:val": "1"}),
                xml.element("w:checked", {"w:val": "0"})
            ])
        ]);

        var paragraph = readXmlElementValue(paragraphXml);

        assertThat(paragraph.children, contains(
            isEmptyRun,
            isEmptyRun,
            isRun({
                children: contains(
                    isCheckbox({checked: equalTo(false)})
                )
            })
        ));
    },

    "complex field checkbox with w:default=0 and w:checked=1 is checked": function() {
        var paragraphXml = complexFieldCheckboxParagraph([
            xml.element("w:checkBox", {}, [
                xml.element("w:default", {"w:val": "0"}),
                xml.element("w:checked", {"w:val": "1"})
            ])
        ]);

        var paragraph = readXmlElementValue(paragraphXml);

        assertThat(paragraph.children, contains(
            isEmptyRun,
            isEmptyRun,
            isRun({
                children: contains(
                    isCheckbox({checked: equalTo(true)})
                )
            })
        ));
    },

    "structured document tag checkbox without checked is not checked": function() {
        var sdtXml = xml.element("w:sdt", {}, [
            xml.element("w:sdtPr", {}, [
                xml.element("wordml:checkbox")
            ])
        ]);

        var result = readXmlElementValue(sdtXml);

        assertThat(result, isCheckbox({checked: equalTo(false)}));
    },

    "structured document tag checkbox with checked=0 is not checked": function() {
        var sdtXml = xml.element("w:sdt", {}, [
            xml.element("w:sdtPr", {}, [
                xml.element("wordml:checkbox", {}, [
                    xml.element("wordml:checked", {"wordml:val": "0"})
                ])
            ])
        ]);

        var result = readXmlElementValue(sdtXml);

        assertThat(result, isCheckbox({checked: equalTo(false)}));
    },

    "structured document tag checkbox with checked=1 is checked": function() {
        var sdtXml = xml.element("w:sdt", {}, [
            xml.element("w:sdtPr", {}, [
                xml.element("wordml:checkbox", {}, [
                    xml.element("wordml:checked", {"wordml:val": "1"})
                ])
            ])
        ]);

        var result = readXmlElementValue(sdtXml);

        assertThat(result, isCheckbox({checked: equalTo(true)}));
    },

    "when structured document tag checkbox has sdtContent then checkbox replaces single character": function() {
        var tableXml = new XmlElement("w:tbl", {}, [
            row(
                xml.element("w:sdt", {}, [
                    xml.element("w:sdtPr", {}, [
                        xml.element("wordml:checkbox", {}, [
                            xml.element("wordml:checked", {"wordml:val": "1"})
                        ])
                    ]),
                    xml.element("w:sdtContent", {}, [
                        xml.element("w:tc", {}, [
                            xml.element("w:p", {}, [
                                xml.element("w:r", {}, [
                                    xml.element("w:t", {}, [
                                        xml.text("☐")
                                    ])
                                ])
                            ])
                        ])
                    ])
                ])
            )
        ]);

        var result = readXmlElementValue(tableXml);

        assert.deepEqual(result, new documents.Table([
            new documents.TableRow([
                new documents.TableCell([
                    new documents.Paragraph([
                        new documents.Run([
                            new documents.Checkbox({checked: true})
                        ])
                    ])
                ])
            ])
        ]));
    },

    "when structured document tag checkbox has sdtContent then deleted content is ignored": function() {
        var tableXml = new XmlElement("w:tbl", {}, [
            row(
                xml.element("w:sdt", {}, [
                    xml.element("w:sdtPr", {}, [
                        xml.element("wordml:checkbox", {}, [
                            xml.element("wordml:checked", {"wordml:val": "1"})
                        ])
                    ]),
                    xml.element("w:sdtContent", {}, [
                        xml.element("w:tc", {}, [
                            xml.element("w:p", {}, [
                                xml.element("w:r", {}, [
                                    xml.element("w:t", {}, [
                                        xml.text("☐")
                                    ])
                                ]),
                                xml.element("w:del", {}, [
                                    xml.element("w:r", {}, [
                                        xml.element("w:t", {}, [
                                            xml.text("☐")
                                        ])
                                    ])
                                ])
                            ])
                        ])
                    ])
                ])
            )
        ]);

        var result = readXmlElementValue(tableXml);

        assert.deepEqual(result, new documents.Table([
            new documents.TableRow([
                new documents.TableCell([
                    new documents.Paragraph([
                        new documents.Run([
                            new documents.Checkbox({checked: true})
                        ])
                    ])
                ])
            ])
        ]));
    }
});

function complexFieldCheckboxParagraph(ffDataChildren) {
    return xml.element("w:p", {}, [
        xml.element("w:r", {}, [
            xml.element("w:fldChar", {"w:fldCharType": "begin"}, [
                xml.element("w:ffData", {}, ffDataChildren)
            ])
        ]),
        xml.element("w:instrText", {}, [
            xml.text(' FORMCHECKBOX ')
        ]),
        xml.element("w:r", {}, [
            xml.element("w:fldChar", {"w:fldCharType": "separate"})
        ]),
        xml.element("w:r", {}, [
            xml.element("w:fldChar", {"w:fldCharType": "end"})
        ])
    ]);
}

test("run has no style if it has no properties", function() {
    var runXml = runWithProperties([]);
    var run = readXmlElementValue(runXml);
    assert.deepEqual(run.styleId, null);
});

test("run has style ID and name read from run properties if present", function() {
    var runStyleXml = new XmlElement("w:rStyle", {"w:val": "Heading1Char"});
    var runXml = runWithProperties([runStyleXml]);

    var styles = new Styles({}, {"Heading1Char": {name: "Heading 1 Char"}});

    var run = readXmlElementValue(runXml, {styles: styles});
    assert.deepEqual(run.styleId, "Heading1Char");
    assert.deepEqual(run.styleName, "Heading 1 Char");
});

test("warning is emitted when run style cannot be found", function() {
    var runStyleXml = new XmlElement("w:rStyle", {"w:val": "Heading1Char"});
    var runXml = runWithProperties([runStyleXml]);

    var styles = new Styles({}, {});

    var result = readXmlElement(runXml, {styles: styles});
    var run = result.value;
    assert.deepEqual(run.styleId, "Heading1Char");
    assert.deepEqual(run.styleName, null);
    assert.deepEqual(result.messages, [warning("Run style with ID Heading1Char was referenced but not defined in the document")]);
});

test("isBold is false if bold element is not present", function() {
    var runXml = runWithProperties([]);
    var run = readXmlElementValue(runXml);
    assert.deepEqual(run.isBold, false);
});

test("isBold is true if bold element is present", function() {
    var boldXml = new XmlElement("w:b");
    var runXml = runWithProperties([boldXml]);
    var run = readXmlElementValue(runXml);
    assert.equal(run.isBold, true);
});

test("isBold is false if bold element is present and w:val is false", function() {
    var boldXml = new XmlElement("w:b", {"w:val": "false"});
    var runXml = runWithProperties([boldXml]);
    var run = readXmlElementValue(runXml);
    assert.equal(run.isBold, false);
});

test("isUnderline is false if underline element is not present", function() {
    var runXml = runWithProperties([]);
    var run = readXmlElementValue(runXml);
    assert.deepEqual(run.isUnderline, false);
});

test("isUnderline is false if underline element is present without w:val attribute", function() {
    var underlineXml = new XmlElement("w:u");
    var runXml = runWithProperties([underlineXml]);
    var run = readXmlElementValue(runXml);
    assert.equal(run.isUnderline, false);
});

test("isUnderline is false if underline element is present and w:val is false", function() {
    var underlineXml = new XmlElement("w:u", {"w:val": "false"});
    var runXml = runWithProperties([underlineXml]);
    var run = readXmlElementValue(runXml);
    assert.equal(run.isUnderline, false);
});

test("isUnderline is false if underline element is present and w:val is 0", function() {
    var underlineXml = new XmlElement("w:u", {"w:val": "0"});
    var runXml = runWithProperties([underlineXml]);
    var run = readXmlElementValue(runXml);
    assert.equal(run.isUnderline, false);
});

test("isUnderline is false if underline element is present and w:val is none", function() {
    var underlineXml = new XmlElement("w:u", {"w:val": "none"});
    var runXml = runWithProperties([underlineXml]);
    var run = readXmlElementValue(runXml);
    assert.equal(run.isUnderline, false);
});

test("isUnderline is true if underline element is present and w:val is not none or falsy", function() {
    var underlineXml = new XmlElement("w:u", {"w:val": "single"});
    var runXml = runWithProperties([underlineXml]);
    var run = readXmlElementValue(runXml);
    assert.equal(run.isUnderline, true);
});

test("isStrikethrough is false if strikethrough element is not present", function() {
    var runXml = runWithProperties([]);
    var run = readXmlElementValue(runXml);
    assert.deepEqual(run.isStrikethrough, false);
});

test("isStrikethrough is true if strikethrough element is present", function() {
    var strikethroughXml = new XmlElement("w:strike");
    var runXml = runWithProperties([strikethroughXml]);
    var run = readXmlElementValue(runXml);
    assert.equal(run.isStrikethrough, true);
});

test("isItalic is false if bold element is not present", function() {
    var runXml = runWithProperties([]);
    var run = readXmlElementValue(runXml);
    assert.deepEqual(run.isItalic, false);
});

test("isItalic is true if bold element is present", function() {
    var italicXml = new XmlElement("w:i");
    var runXml = runWithProperties([italicXml]);
    var run = readXmlElementValue(runXml);
    assert.equal(run.isItalic, true);
});

test("isSmallCaps is false if smallcaps element is not present", function() {
    var runXml = runWithProperties([]);
    var run = readXmlElementValue(runXml);
    assert.deepEqual(run.isSmallCaps, false);
});

test("isSmallCaps is true if smallcaps element is present", function() {
    var smallCapsXml = new XmlElement("w:smallCaps");
    var runXml = runWithProperties([smallCapsXml]);
    var run = readXmlElementValue(runXml);
    assert.equal(run.isSmallCaps, true);
});

var booleanRunProperties = [
    {name: "isBold", tagName: "w:b"},
    {name: "isUnderline", tagName: "w:u"},
    {name: "isItalic", tagName: "w:i"},
    {name: "isStrikethrough", tagName: "w:strike"},
    {name: "isAllCaps", tagName: "w:caps"},
    {name: "isSmallCaps", tagName: "w:smallCaps"}
];

booleanRunProperties.forEach(function(runProperty) {
    test(runProperty.name + " is false if " + runProperty.tagName + " is present and w:val is false", function() {
        var propertyXml = new XmlElement(runProperty.tagName, {"w:val": "false"});
        var runXml = runWithProperties([propertyXml]);
        var run = readXmlElementValue(runXml);
        assert.equal(run[runProperty.name], false);
    });

    test(runProperty.name + " is false if " + runProperty.tagName + " is present and w:val is 0", function() {
        var propertyXml = new XmlElement(runProperty.tagName, {"w:val": "0"});
        var runXml = runWithProperties([propertyXml]);
        var run = readXmlElementValue(runXml);
        assert.equal(run[runProperty.name], false);
    });

    test(runProperty.name + " is true if " + runProperty.tagName + " is present and w:val is true", function() {
        var propertyXml = new XmlElement(runProperty.tagName, {"w:val": "true"});
        var runXml = runWithProperties([propertyXml]);
        var run = readXmlElementValue(runXml);
        assert.equal(run[runProperty.name], true);
    });

    test(runProperty.name + " is true if " + runProperty.tagName + " is present and w:val is 1", function() {
        var propertyXml = new XmlElement(runProperty.tagName, {"w:val": "1"});
        var runXml = runWithProperties([propertyXml]);
        var run = readXmlElementValue(runXml);
        assert.equal(run[runProperty.name], true);
    });
});

test("run has baseline vertical alignment by default", function() {
    var runXml = runWithProperties([]);
    var run = readXmlElementValue(runXml);
    assert.deepEqual(run.verticalAlignment, documents.verticalAlignment.baseline);
});

test("run has vertical alignment read from properties", function() {
    var verticalAlignmentXml = new XmlElement("w:vertAlign", {"w:val": "superscript"});
    var runXml = runWithProperties([verticalAlignmentXml]);

    var run = readXmlElementValue(runXml);
    assert.deepEqual(run.verticalAlignment, documents.verticalAlignment.superscript);
});

test("run has null font by default", function() {
    var runXml = runWithProperties([]);

    var run = readXmlElementValue(runXml);
    assert.deepEqual(run.font, null);
});

test("run has font read from properties", function() {
    var fontXml = new XmlElement("w:rFonts", {"w:ascii": "Arial"});
    var runXml = runWithProperties([fontXml]);

    var run = readXmlElementValue(runXml);
    assert.deepEqual(run.font, "Arial");
});

test("run has null fontSize by default", function() {
    var runXml = runWithProperties([]);

    var run = readXmlElementValue(runXml);
    assert.deepEqual(run.fontSize, null);
});

test("run has fontSize read from properties", function() {
    var fontSizeXml = new XmlElement("w:sz", {"w:val": "28"});
    var runXml = runWithProperties([fontSizeXml]);

    var run = readXmlElementValue(runXml);
    assert.deepEqual(run.fontSize, 14);
});

test("run with invalid w:sz has null font size", function() {
    var fontSizeXml = new XmlElement("w:sz", {"w:val": "28a"});
    var runXml = runWithProperties([fontSizeXml]);

    var run = readXmlElementValue(runXml);
    assert.deepEqual(run.fontSize, null);
});

test("run has no highlight by default", function() {
    var runXml = runWithProperties([]);

    var run = readXmlElementValue(runXml);
    assert.deepEqual(run.highlight, null);
});

test("run has highlight read from properties", function() {
    var highlightXml = new XmlElement("w:highlight", {"w:val": "yellow"});
    var runXml = runWithProperties([highlightXml]);

    var run = readXmlElementValue(runXml);
    assert.deepEqual(run.highlight, "yellow");
});

test("when highlight is none then run has no highlight", function() {
    var highlightXml = new XmlElement("w:highlight", {"w:val": "none"});
    var runXml = runWithProperties([highlightXml]);

    var run = readXmlElementValue(runXml);
    assert.deepEqual(run.highlight, null);
});

test("run properties not included as child of run", function() {
    var runStyleXml = new XmlElement("w:rStyle");
    var runPropertiesXml = new XmlElement("w:rPr", {}, [runStyleXml]);
    var runXml = new XmlElement("w:r", {}, [runPropertiesXml]);
    var result = readXmlElement(runXml);
    assert.deepEqual(result.value.children, []);
});

test("w:tab is read as document tab element", function() {
    var tabXml = new XmlElement("w:tab");
    var result = readXmlElement(tabXml);
    assert.deepEqual(result.value, new documents.Tab());
});

test("w:noBreakHyphen is read as non-breaking hyphen character", function() {
    var noBreakHyphenXml = new XmlElement("w:noBreakHyphen");
    var result = readXmlElement(noBreakHyphenXml);
    assert.deepEqual(result.value, new documents.Text("\u2011"));
});

test("soft hyphens are read as text", function() {
    var element = new XmlElement("w:softHyphen", {}, []);
    var text = readXmlElementValue(element);
    assert.deepEqual(text, new documents.Text("\u00AD"));
});

test("w:sym with supported font and supported code point in ASCII range is converted to text", function() {
    var element = new XmlElement("w:sym", {"w:font": "Wingdings", "w:char": "28"}, []);
    var text = readXmlElementValue(element);
    assert.deepEqual(text, new documents.Text("🕿"));
});

test("w:sym with supported font and supported code point in private use area is converted to text", function() {
    var element = new XmlElement("w:sym", {"w:font": "Wingdings", "w:char": "F028"}, []);
    var text = readXmlElementValue(element);
    assert.deepEqual(text, new documents.Text("🕿"));
});

test("w:sym with unsupported font and code point produces empty result with warning", function() {
    var element = new XmlElement("w:sym", {"w:font": "Dingwings", "w:char": "28"}, []);

    var result = readXmlElement(element);

    assert.deepEqual(result.value, []);
    assert.deepEqual(result.messages, [warning("A w:sym element with an unsupported character was ignored: char 28 in font Dingwings")]);
});

test("w:tbl is read as document table element", function() {
    var tableXml = new XmlElement("w:tbl", {}, [
        new XmlElement("w:tr", {}, [
            new XmlElement("w:tc", {}, [
                new XmlElement("w:p", {}, [])
            ])
        ])
    ]);
    var result = readXmlElement(tableXml);
    assert.deepEqual(result.value, new documents.Table([
        new documents.TableRow([
            new documents.TableCell([
                new documents.Paragraph([])
            ])
        ])
    ]));
});

test("table has no style if it has no properties", function() {
    var tableXml = new XmlElement("w:tbl", {}, []);
    var table = readXmlElementValue(tableXml);
    assert.deepEqual(table.styleId, null);
});

test("table has style ID and name read from table properties if present", function() {
    var styleXml = new XmlElement("w:tblStyle", {"w:val": "TableNormal"}, []);
    var propertiesXml = new XmlElement("w:tblPr", {}, [styleXml]);
    var tableXml = new XmlElement("w:tbl", {}, [propertiesXml]);

    var styles = new Styles({}, {}, {"TableNormal": {name: "Normal Table"}});

    var table = readXmlElementValue(tableXml, {styles: styles});
    assert.deepEqual(table.styleId, "TableNormal");
    assert.deepEqual(table.styleName, "Normal Table");
});

test("warning is emitted when table style cannot be found", function() {
    var styleXml = new XmlElement("w:tblStyle", {"w:val": "TableNormal"}, []);
    var propertiesXml = new XmlElement("w:tblPr", {}, [styleXml]);
    var tableXml = new XmlElement("w:tbl", {}, [propertiesXml]);

    var result = readXmlElement(tableXml, {styles: Styles.EMPTY});
    var table = result.value;
    assert.deepEqual(table.styleId, "TableNormal");
    assert.deepEqual(table.styleName, null);
    assert.deepEqual(result.messages, [warning("Table style with ID TableNormal was referenced but not defined in the document")]);
});

test("w:tblHeader marks table row as header", function() {
    var tableXml = new XmlElement("w:tbl", {}, [
        new XmlElement("w:tr", {}, [
            new XmlElement("w:trPr", {}, [
                new XmlElement("w:tblHeader")
            ])
        ]),
        new XmlElement("w:tr")
    ]);
    var result = readXmlElementValue(tableXml);
    assertThat(result, isTable({
        children: contains(
            isRow({isHeader: true}),
            isRow({isHeader: false})
        )
    }));
});

test("w:gridSpan is read as colSpan for table cell", function() {
    var tableXml = new XmlElement("w:tbl", {}, [
        new XmlElement("w:tr", {}, [
            new XmlElement("w:tc", {}, [
                new XmlElement("w:tcPr", {}, [
                    new XmlElement("w:gridSpan", {"w:val": "2"})
                ]),
                new XmlElement("w:p", {}, [])
            ])
        ])
    ]);
    var result = readXmlElement(tableXml);
    assert.deepEqual(result.value, new documents.Table([
        new documents.TableRow([
            new documents.TableCell([
                new documents.Paragraph([])
            ], {colSpan: 2})
        ])
    ]));
});

test("w:vMerge is read as rowSpan for table cell", function() {
    var tableXml = new XmlElement("w:tbl", {}, [
        row(emptyCell()),
        row(emptyCell(vMerge("restart"))),
        row(emptyCell(vMerge("continue"))),
        row(emptyCell(vMerge("continue"))),
        row(emptyCell())
    ]);
    var result = readXmlElement(tableXml);
    assert.deepEqual(result.value, new documents.Table([
        docRow([docEmptyCell()]),
        docRow([docEmptyCell({rowSpan: 3})]),
        docRow([]),
        docRow([]),
        docRow([docEmptyCell()])
    ]));
});

test("w:vMerge without val is treated as continue", function() {
    var tableXml = new XmlElement("w:tbl", {}, [
        row(emptyCell(vMerge("restart"))),
        row(emptyCell(vMerge()))
    ]);
    var result = readXmlElement(tableXml);
    assert.deepEqual(result.value, new documents.Table([
        docRow([docEmptyCell({rowSpan: 2})]),
        docRow([])
    ]));
});

test("w:vMerge accounts for cells spanning columns", function() {
    var tableXml = new XmlElement("w:tbl", {}, [
        row(emptyCell(), emptyCell(), emptyCell(vMerge("restart"))),
        row(emptyCell(gridSpan("2")), emptyCell(vMerge("continue"))),
        row(emptyCell(), emptyCell(), emptyCell(vMerge("continue"))),
        row(emptyCell(), emptyCell(), emptyCell())
    ]);
    var result = readXmlElement(tableXml);
    assert.deepEqual(result.value, new documents.Table([
        docRow([docEmptyCell(), docEmptyCell(), docEmptyCell({rowSpan: 3})]),
        docRow([docEmptyCell({colSpan: 2})]),
        docRow([docEmptyCell(), docEmptyCell()]),
        docRow([docEmptyCell(), docEmptyCell(), docEmptyCell()])
    ]));
});

test("no vertical cell merging if merged cells do not line up", function() {
    var tableXml = new XmlElement("w:tbl", {}, [
        row(emptyCell(gridSpan("2"), vMerge("restart"))),
        row(emptyCell(), emptyCell(vMerge("continue")))
    ]);
    var result = readXmlElement(tableXml);
    assert.deepEqual(result.value, new documents.Table([
        docRow([docEmptyCell({colSpan: 2})]),
        docRow([docEmptyCell(), docEmptyCell()])
    ]));
});

test("when row is marked as deleted in row properties then row is ignored", function() {
    var tableXml = xml.element("w:tbl", {}, [
        xml.element("w:tr", {}, [
            xml.element("w:tc", {}, [
                xml.element("w:p", {}, [
                    runOfText("Row 1")
                ])
            ])
        ]),

        xml.element("w:tr", {}, [
            xml.element("w:trPr", {}, [
                xml.element("w:del")
            ]),
            xml.element("w:tc", {}, [
                xml.element("w:p", {}, [
                    runOfText("Row 2")
                ])
            ])
        ])
    ]);

    var result = readXmlElement(tableXml);

    assert.deepEqual(result.value, new documents.Table([
        new documents.TableRow([
            new documents.TableCell([
                new documents.Paragraph([
                    new documents.Run([
                        new documents.Text("Row 1")
                    ])
                ])
            ])
        ])
    ]));
});

test("warning if non-row in table", function() {
    // Include normal rows to ensure they're still read correctly.
    var tableXml = new XmlElement("w:tbl", {}, [
        xml.element("w:tr", {}, [
            xml.element("w:tc", {}, [
                xml.element("w:p", {}, [
                    runOfText("Row 1")
                ])
            ])
        ]),
        new XmlElement("w:p"),
        xml.element("w:tr", {}, [
            xml.element("w:tc", {}, [
                xml.element("w:p", {}, [
                    runOfText("Row 2")
                ])
            ])
        ])
    ]);

    var result = readXmlElement(tableXml);

    assert.deepEqual(result.value, new documents.Table([
        new documents.TableRow([
            new documents.TableCell([
                new documents.Paragraph([
                    new documents.Run([
                        new documents.Text("Row 1")
                    ])
                ])
            ])
        ]),
        new documents.Paragraph([]),
        new documents.TableRow([
            new documents.TableCell([
                new documents.Paragraph([
                    new documents.Run([
                        new documents.Text("Row 2")
                    ])
                ])
            ])
        ])
    ]));
    assert.deepEqual(result.messages, [warning("unexpected non-row element in table, cell merging may be incorrect")]);
});

test("warning if non-cell in table row", function() {
    // Include normal cells to ensure they're still read correctly.
    var tableXml = new XmlElement("w:tbl", {}, [
        row(
            xml.element("w:tc", {}, [
                xml.element("w:p", {}, [
                    runOfText("Cell 1")
                ])
            ]),
            new XmlElement("w:p"),
            xml.element("w:tc", {}, [
                xml.element("w:p", {}, [
                    runOfText("Cell 2")
                ])
            ])
        )
    ]);

    var result = readXmlElement(tableXml);

    assert.deepEqual(result.value, new documents.Table([
        new documents.TableRow([
            new documents.TableCell([
                new documents.Paragraph([
                    new documents.Run([
                        new documents.Text("Cell 1")
                    ])
                ])
            ]),
            new documents.Paragraph([]),
            new documents.TableCell([
                new documents.Paragraph([
                    new documents.Run([
                        new documents.Text("Cell 2")
                    ])
                ])
            ])
        ])
    ]));
    assert.deepEqual(result.messages, [warning("unexpected non-cell element in table row, cell merging may be incorrect")]);
});

function row() {
    return new XmlElement("w:tr", {}, Array.prototype.slice.call(arguments));
}

function emptyCell() {
    return new XmlElement("w:tc", {}, [
        new XmlElement("w:tcPr", {}, Array.prototype.slice.call(arguments))
    ]);
}

function vMerge(val) {
    return new XmlElement("w:vMerge", {"w:val": val}, []);
}

function gridSpan(val) {
    return new XmlElement("w:gridSpan", {"w:val": val});
}

function docRow(children) {
    return new documents.TableRow(children);
}

function docEmptyCell(properties) {
    return new documents.TableCell([], properties);
}

test("w:bookmarkStart is read as a bookmarkStart", function() {
    var bookmarkStart = new XmlElement("w:bookmarkStart", {"w:name": "_Peter", "w:id": "42"});
    var result = readXmlElement(bookmarkStart);
    assert.deepEqual(result.value.name, "_Peter");
    assert.deepEqual(result.value.type, "bookmarkStart");
});

test('_GoBack bookmark is ignored', function() {
    var bookmarkStart = new XmlElement("w:bookmarkStart", {"w:name": "_GoBack"});
    var result = readXmlElement(bookmarkStart);
    assert.deepEqual(result.value, []);
});

var IMAGE_BUFFER = new Buffer("Not an image at all!");
var IMAGE_RELATIONSHIP_ID = "rId5";

function isSuccess(valueMatcher) {
    return hasProperties({
        messages: [],
        value: valueMatcher
    });
}

function isImage(options) {
    var matcher = hasProperties(_.extend({type: "image"}, _.omit(options, "buffer")));
    if (options.buffer) {
        return allOf(
            matcher,
            new FeatureMatcher(willBe(options.buffer), "buffer", "buffer", function(element) {
                return element.read();
            })
        );
    } else {
        return matcher;
    }
}

function readEmbeddedImage(element) {
    return readXmlElement(element, {
        relationships: new Relationships([
            imageRelationship("rId5", "media/hat.png")
        ]),
        contentTypes: fakeContentTypes,
        docxFile: createFakeDocxFile({
            "word/media/hat.png": IMAGE_BUFFER
        })
    });
}

test("can read imagedata elements with r:id attribute", function() {
    var imagedataElement = new XmlElement("v:imagedata", {
        "r:id": IMAGE_RELATIONSHIP_ID,
        "o:title": "It's a hat"
    });

    var result = readEmbeddedImage(imagedataElement);

    return promiseThat(result, isSuccess(isImage({
        altText: "It's a hat",
        contentType: "image/png",
        buffer: IMAGE_BUFFER
    })));
});

test("when v:imagedata element has no relationship ID then it is ignored with warning", function() {
    var imagedataElement = new XmlElement("v:imagedata");

    var result = readXmlElement(imagedataElement);

    assert.deepEqual(result.value, []);
    assert.deepEqual(result.messages, [warning("A v:imagedata element without a relationship ID was ignored")]);
});

test("can read inline pictures", function() {
    var drawing = createInlineImage({
        blip: createEmbeddedBlip(IMAGE_RELATIONSHIP_ID),
        description: "It's a hat"
    });

    var result = readEmbeddedImage(drawing);

    return promiseThat(result, isSuccess(contains(isImage({
        altText: "It's a hat",
        contentType: "image/png",
        buffer: IMAGE_BUFFER
    }))));
});

test("alt text title is used if alt text description is missing", function() {
    var drawing = createInlineImage({
        blip: createEmbeddedBlip(IMAGE_RELATIONSHIP_ID),
        title: "It's a hat"
    });

    var result = readEmbeddedImage(drawing);

    return promiseThat(result, isSuccess(contains(isImage({
        altText: "It's a hat"
    }))));
});

test("alt text title is used if alt text description is blank", function() {
    var drawing = createInlineImage({
        blip: createEmbeddedBlip(IMAGE_RELATIONSHIP_ID),
        description: " ",
        title: "It's a hat"
    });

    var result = readEmbeddedImage(drawing);

    return promiseThat(result, isSuccess(contains(isImage({
        altText: "It's a hat"
    }))));
});

test("alt text description is preferred to alt text title", function() {
    var drawing = createInlineImage({
        blip: createEmbeddedBlip(IMAGE_RELATIONSHIP_ID),
        description: "It's a hat",
        title: "hat"
    });

    var result = readEmbeddedImage(drawing);

    return promiseThat(result, isSuccess(contains(isImage({
        altText: "It's a hat"
    }))));
});

test("can read anchored pictures", function() {
    var drawing = new XmlElement("w:drawing", {}, [
        new XmlElement("wp:anchor", {}, [
            new XmlElement("wp:docPr", {descr: "It's a hat"}),
            new XmlElement("a:graphic", {}, [
                new XmlElement("a:graphicData", {}, [
                    new XmlElement("pic:pic", {}, [
                        new XmlElement("pic:blipFill", {}, [
                            new XmlElement("a:blip", {"r:embed": IMAGE_RELATIONSHIP_ID})
                        ])
                    ])
                ])
            ])
        ])
    ]);

    var result = readEmbeddedImage(drawing);

    return promiseThat(result, isSuccess(contains(isImage({
        altText: "It's a hat",
        contentType: "image/png",
        buffer: IMAGE_BUFFER
    }))));
});

test("can read linked pictures", function() {
    var drawing = createInlineImage({
        blip: createLinkedBlip("rId5"),
        description: "It's a hat"
    });

    var element = single(readXmlElementValue(drawing, {
        relationships: new Relationships([
            imageRelationship("rId5", "file:///media/hat.png")
        ]),
        contentTypes: fakeContentTypes,
        files: testing.createFakeFiles({
            "file:///media/hat.png": IMAGE_BUFFER
        })
    }));
    return promiseThat(element, isImage({
        altText: "It's a hat",
        contentType: "image/png",
        buffer: IMAGE_BUFFER
    }));
});

test("warning if blip has no image file", function() {
    var drawing = createInlineImage({
        blip: new XmlElement("a:blip"),
        description: "It's a hat"
    });

    var result = readXmlElement(drawing);

    assert.deepEqual(result.messages, [warning("Could not find image file for a:blip element")]);
    assert.deepEqual(result.value, []);
});

test("warning if unsupported image type", function() {
    var drawing = createInlineImage({
        blip: createEmbeddedBlip("rId5"),
        description: "It's a hat"
    });

    var result = readXmlElement(drawing, {
        relationships: new Relationships([
            imageRelationship("rId5", "media/hat.emf")
        ]),
        contentTypes: fakeContentTypes,
        docxFile: createFakeDocxFile({
            "word/media/hat.emf": IMAGE_BUFFER
        })
    });
    assert.deepEqual(result.messages, [warning("Image of type image/x-emf is unlikely to display in web browsers")]);
    var element = single(result.value);
    assert.equal(element.contentType, "image/x-emf");
});

test("no elements created if image cannot be found in w:drawing", function() {
    var drawing = new XmlElement("w:drawing", {}, []);

    var result = readXmlElement(drawing);
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.value, []);
});

test("no elements created if image cannot be found in wp:inline", function() {
    var drawing = new XmlElement("wp:inline", {}, []);

    var result = readXmlElement(drawing);
    assert.deepEqual(result.messages, []);
    assert.deepEqual(result.value, []);
});

test("children of w:ins are converted normally", function() {
    assertChildrenAreConvertedNormally("w:ins");
});

test("children of w:object are converted normally", function() {
    assertChildrenAreConvertedNormally("w:object");
});

test("children of w:smartTag are converted normally", function() {
    assertChildrenAreConvertedNormally("w:smartTag");
});

test("children of v:group are converted normally", function() {
    assertChildrenAreConvertedNormally("v:group");
});

test("children of v:rect are converted normally", function() {
    assertChildrenAreConvertedNormally("v:rect");
});

function assertChildrenAreConvertedNormally(tagName) {
    var runXml = new XmlElement("w:r", {}, []);
    var result = readXmlElement(new XmlElement(tagName, {}, [runXml]));
    assert.deepEqual(result.value[0].type, "run");
}

test("w:hyperlink", {
    "is read as external hyperlink if it has a relationship ID": function() {
        var runXml = new XmlElement("w:r", {}, []);
        var hyperlinkXml = new XmlElement("w:hyperlink", {"r:id": "r42"}, [runXml]);
        var relationships = new Relationships([
            hyperlinkRelationship("r42", "http://example.com")
        ]);
        var result = readXmlElement(hyperlinkXml, {relationships: relationships});
        assert.deepEqual(result.value.href, "http://example.com");
        assert.deepEqual(result.value.children[0].type, "run");
    },

    "is read as external hyperlink if it has a relationship ID and an anchor": function() {
        var runXml = new XmlElement("w:r", {}, []);
        var hyperlinkXml = new XmlElement("w:hyperlink", {"r:id": "r42", "w:anchor": "fragment"}, [runXml]);
        var relationships = new Relationships([
            hyperlinkRelationship("r42", "http://example.com/")
        ]);
        var result = readXmlElement(hyperlinkXml, {relationships: relationships});
        assert.deepEqual(result.value.href, "http://example.com/#fragment");
        assert.deepEqual(result.value.children[0].type, "run");
    },

    "existing fragment is replaced when anchor is set on external link": function() {
        var runXml = new XmlElement("w:r", {}, []);
        var hyperlinkXml = new XmlElement("w:hyperlink", {"r:id": "r42", "w:anchor": "fragment"}, [runXml]);
        var relationships = new Relationships([
            hyperlinkRelationship("r42", "http://example.com/#previous")
        ]);
        var result = readXmlElement(hyperlinkXml, {relationships: relationships});
        assert.deepEqual(result.value.href, "http://example.com/#fragment");
        assert.deepEqual(result.value.children[0].type, "run");
    },

    "is read as internal hyperlink if it has an anchor": function() {
        var runXml = new XmlElement("w:r", {}, []);
        var hyperlinkXml = new XmlElement("w:hyperlink", {"w:anchor": "_Peter"}, [runXml]);
        var result = readXmlElement(hyperlinkXml);
        assert.deepEqual(result.value.anchor, "_Peter");
        assert.deepEqual(result.value.children[0].type, "run");
    },

    "is ignored if it does not have a relationship ID nor anchor": function() {
        var runXml = new XmlElement("w:r", {}, []);
        var hyperlinkXml = new XmlElement("w:hyperlink", {}, [runXml]);
        var result = readXmlElement(hyperlinkXml);
        assert.deepEqual(result.value[0].type, "run");
    },

    "target frame is read": function() {
        var hyperlinkXml = new XmlElement("w:hyperlink", {
            "w:anchor": "Introduction",
            "w:tgtFrame": "_blank"
        });
        var result = readXmlElementValue(hyperlinkXml);
        assertThat(result, hasProperties({targetFrame: "_blank"}));
    },

    "empty target frame is ignored": function() {
        var hyperlinkXml = new XmlElement("w:hyperlink", {
            "w:anchor": "Introduction",
            "w:tgtFrame": ""
        });
        var result = readXmlElementValue(hyperlinkXml);
        assertThat(result, hasProperties({targetFrame: null}));
    }
});

test("w:br without explicit type is read as line break", function() {
    var breakXml = new XmlElement("w:br", {}, []);
    var result = readXmlElementValue(breakXml);
    assert.deepEqual(result, documents.lineBreak);
});

test("w:br with textWrapping type is read as line break", function() {
    var breakXml = new XmlElement("w:br", {"w:type": "textWrapping"}, []);
    var result = readXmlElementValue(breakXml);
    assert.deepEqual(result, documents.lineBreak);
});

test("w:br with page type is read as page break", function() {
    var breakXml = new XmlElement("w:br", {"w:type": "page"}, []);
    var result = readXmlElementValue(breakXml);
    assert.deepEqual(result, documents.pageBreak);
});

test("w:br with column type is read as column break", function() {
    var breakXml = new XmlElement("w:br", {"w:type": "column"}, []);
    var result = readXmlElementValue(breakXml);
    assert.deepEqual(result, documents.columnBreak);
});

test("warning on breaks that aren't recognised", function() {
    var breakXml = new XmlElement("w:br", {"w:type": "unknownBreakType"}, []);
    var result = readXmlElement(breakXml);
    assert.deepEqual(result.value, []);
    assert.deepEqual(result.messages, [warning("Unsupported break type: unknownBreakType")]);
});

test("w:footnoteReference has ID read", function() {
    var referenceXml = new XmlElement("w:footnoteReference", {"w:id": "4"});
    var result = readXmlElement(referenceXml);
    assert.deepEqual(
        result.value,
        documents.noteReference({noteType: "footnote", noteId: "4"})
    );
    assert.deepEqual(result.messages, []);
});

test("w:commentReference has ID read", function() {
    var referenceXml = new XmlElement("w:commentReference", {"w:id": "4"});
    var result = readXmlElement(referenceXml);
    assert.deepEqual(
        result.value,
        documents.commentReference({commentId: "4"})
    );
    assert.deepEqual(result.messages, []);
});

test("emits warning on unrecognised element", function() {
    var unrecognisedElement = new XmlElement("w:not-an-element");
    var result = readXmlElement(unrecognisedElement);
    assert.deepEqual(
        result.messages,
        [{
            type: "warning",
            message: "An unrecognised element was ignored: w:not-an-element"
        }]
    );
    assert.deepEqual(result.value, []);
});

test("w:bookmarkEnd is ignored without warning", function() {
    var ignoredElement = new XmlElement("w:bookmarkEnd");
    var result = readXmlElement(ignoredElement);
    assert.deepEqual(result.messages, []);
    assert.deepEqual([], result.value);
});

test("text boxes have content appended after containing paragraph", function() {
    var textbox = new XmlElement("w:pict", {}, [
        new XmlElement("v:shape", {}, [
            new XmlElement("v:textbox", {}, [
                new XmlElement("w:txbxContent", {}, [
                    paragraphWithStyleId("textbox-content")
                ])
            ])
        ])
    ]);
    var paragraph = new XmlElement("w:p", {}, [
        new XmlElement("w:r", {}, [textbox])
    ]);
    var result = readXmlElement(paragraph);
    assert.deepEqual(result.value[1].styleId, "textbox-content");
});

test("mc:AlternateContent", {
    "when mc:Fallback is present then mc:Fallback is read": function() {
        var styles = new Styles({"first": {name: "First"}, "second": {name: "Second"}}, {});
        var textbox = new XmlElement("mc:AlternateContent", {}, [
            new XmlElement("mc:Choice", {"Requires": "wps"}, [
                paragraphWithStyleId("first")
            ]),
            new XmlElement("mc:Fallback", {}, [
                paragraphWithStyleId("second")
            ])
        ]);
        var result = readXmlElement(textbox, {styles: styles});
        assert.deepEqual(result.value[0].styleId, "second");
    },

    "when mc:Fallback is not present then element is ignored": function() {
        var textbox = new XmlElement("mc:AlternateContent", {}, [
            new XmlElement("mc:Choice", {"Requires": "wps"}, [
                paragraphWithStyleId("first")
            ])
        ]);
        var result = readXmlElement(textbox);
        assert.deepEqual(result.value, []);
    }
});

test("w:sdtContent is used when w:sdt is read", function() {
    var element = xml.element("w:sdt", {}, [
        xml.element("w:sdtContent", {}, [
            xml.element("w:t", {}, [xml.text("Blackdown")])
        ])
    ]);
    var result = readXmlElement(element);
    assert.deepEqual(result.value, [new documents.Text("Blackdown")]);
});

test("text nodes are ignored when reading children", function() {
    var runXml = new XmlElement("w:r", {}, [xml.text("[text]")]);
    var run = readXmlElementValue(runXml);
    assert.deepEqual(run, new documents.Run([]));
});

function paragraphWithStyleId(styleId) {
    return new XmlElement("w:p", {}, [
        new XmlElement("w:pPr", {}, [
            new XmlElement("w:pStyle", {"w:val": styleId}, [])
        ])
    ]);
}

function runWithProperties(children) {
    return new XmlElement("w:r", {}, [createRunPropertiesXml(children)]);
}

function createRunPropertiesXml(children) {
    return new XmlElement("w:rPr", {}, children);
}

function single(array) {
    if (array.length === 1) {
        return array[0];
    } else {
        throw new Error("Array has " + array.length + " elements");
    }
}

function createInlineImage(options) {
    return new XmlElement("w:drawing", {}, [
        new XmlElement("wp:inline", {}, [
            new XmlElement("wp:docPr", {descr: options.description, title: options.title}),
            new XmlElement("a:graphic", {}, [
                new XmlElement("a:graphicData", {}, [
                    new XmlElement("pic:pic", {}, [
                        new XmlElement("pic:blipFill", {}, [
                            options.blip
                        ])
                    ])
                ])
            ])
        ])
    ]);
}

function createEmbeddedBlip(relationshipId) {
    return new XmlElement("a:blip", {"r:embed": relationshipId});
}

function createLinkedBlip(relationshipId) {
    return new XmlElement("a:blip", {"r:link": relationshipId});
}

function runOfText(text) {
    var textXml = new XmlElement("w:t", {}, [xml.text(text)]);
    return new XmlElement("w:r", {}, [textXml]);
}

function hyperlinkRelationship(relationshipId, target) {
    return {
        relationshipId: relationshipId,
        target: target,
        type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/hyperlink"
    };
}

function imageRelationship(relationshipId, target) {
    return {
        relationshipId: relationshipId,
        target: target,
        type: "http://schemas.openxmlformats.org/officeDocument/2006/relationships/image"
    };
}

function NumberingMap(options) {
    var findLevel = options.findLevel;
    var findLevelByParagraphStyleId = options.findLevelByParagraphStyleId || {};

    return {
        findLevel: function(numId, level) {
            return findLevel[numId][level];
        },
        findLevelByParagraphStyleId: function(styleId) {
            return findLevelByParagraphStyleId[styleId];
        }
    };
}
