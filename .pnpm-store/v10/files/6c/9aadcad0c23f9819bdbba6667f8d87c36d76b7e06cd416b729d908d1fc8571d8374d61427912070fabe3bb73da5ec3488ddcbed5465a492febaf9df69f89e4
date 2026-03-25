var assert = require("assert");
var duck = require("duck");

var readNumberingXml = require("../../lib/docx/numbering-xml").readNumberingXml;
var stylesReader = require("../../lib/docx/styles-reader");
var XmlElement = require("../../lib/xml").Element;
var test = require("../test")(module);


test('w:num element inherits levels from w:abstractNum', function() {
    var numbering = readNumberingXml(
        new XmlElement("w:numbering", {}, [
            new XmlElement("w:abstractNum", {"w:abstractNumId": "42"}, [
                new XmlElement("w:lvl", {"w:ilvl": "0"}, [
                    new XmlElement("w:numFmt", {"w:val": "bullet"})
                ]),
                new XmlElement("w:lvl", {"w:ilvl": "1"}, [
                    new XmlElement("w:numFmt", {"w:val": "decimal"})
                ])
            ]),
            new XmlElement("w:num", {"w:numId": "47"}, [
                new XmlElement("w:abstractNumId", {"w:val": "42"})
            ])
        ]),
        {styles: stylesReader.defaultStyles}
    );
    duck.assertThat(numbering.findLevel("47", "0"), duck.hasProperties({
        isOrdered: false
    }));
    duck.assertThat(numbering.findLevel("47", "1"), duck.hasProperties({
        isOrdered: true
    }));
});


test('w:num element referencing non-existent w:abstractNumId is ignored', function() {
    var numbering = readNumberingXml(
        new XmlElement("w:numbering", {}, [
            new XmlElement("w:num", {"w:numId": "47"}, [
                new XmlElement("w:abstractNumId", {"w:val": "42"})
            ])
        ]),
        {styles: stylesReader.defaultStyles}
    );
    duck.assertThat(numbering.findLevel("47", "0"), duck.equalTo(null));
});

test('given no other levels with index of 0 when level is missing w:ilvl then level index is 0', function() {
    var numbering = readNumberingXml(
        new XmlElement("w:numbering", {}, [
            new XmlElement("w:abstractNum", {"w:abstractNumId": "42"}, [
                new XmlElement("w:lvl", {}, [
                    new XmlElement("w:numFmt", {"w:val": "decimal"})
                ])
            ]),
            new XmlElement("w:num", {"w:numId": "47"}, [
                new XmlElement("w:abstractNumId", {"w:val": "42"})
            ])
        ]),
        {styles: stylesReader.defaultStyles}
    );
    duck.assertThat(numbering.findLevel("47", "0"), duck.hasProperties({
        isOrdered: true
    }));
});

test('given previous other level with index of 0 when level is missing w:ilvl then level is ignored', function() {
    var numbering = readNumberingXml(
        new XmlElement("w:numbering", {}, [
            new XmlElement("w:abstractNum", {"w:abstractNumId": "42"}, [
                new XmlElement("w:lvl", {"w:ilvl": "0"}, [
                    new XmlElement("w:numFmt", {"w:val": "bullet"})
                ]),
                new XmlElement("w:lvl", {}, [
                    new XmlElement("w:numFmt", {"w:val": "decimal"})
                ])
            ]),
            new XmlElement("w:num", {"w:numId": "47"}, [
                new XmlElement("w:abstractNumId", {"w:val": "42"})
            ])
        ]),
        {styles: stylesReader.defaultStyles}
    );
    duck.assertThat(numbering.findLevel("47", "0"), duck.hasProperties({
        isOrdered: false
    }));
});

test('given subsequent other level with index of 0 when level is missing w:ilvl then level is ignored', function() {
    var numbering = readNumberingXml(
        new XmlElement("w:numbering", {}, [
            new XmlElement("w:abstractNum", {"w:abstractNumId": "42"}, [
                new XmlElement("w:lvl", {}, [
                    new XmlElement("w:numFmt", {"w:val": "decimal"})
                ]),
                new XmlElement("w:lvl", {"w:ilvl": "0"}, [
                    new XmlElement("w:numFmt", {"w:val": "bullet"})
                ])
            ]),
            new XmlElement("w:num", {"w:numId": "47"}, [
                new XmlElement("w:abstractNumId", {"w:val": "42"})
            ])
        ]),
        {styles: stylesReader.defaultStyles}
    );
    duck.assertThat(numbering.findLevel("47", "0"), duck.hasProperties({
        isOrdered: false
    }));
});

test('when level is missing w:numFmt then level is ordered', function() {
    var numbering = readNumberingXml(
        new XmlElement("w:numbering", {}, [
            new XmlElement("w:abstractNum", {"w:abstractNumId": "42"}, [
                new XmlElement("w:lvl", {"w:ilvl": "0"})
            ]),
            new XmlElement("w:num", {"w:numId": "47"}, [
                new XmlElement("w:abstractNumId", {"w:val": "42"})
            ])
        ]),
        {styles: stylesReader.defaultStyles}
    );
    duck.assertThat(numbering.findLevel("47", "0"), duck.hasProperties({
        isOrdered: true
    }));
});


test('when w:abstractNum has w:numStyleLink then style is used to find w:num', function() {
    var numbering = readNumberingXml(
        new XmlElement("w:numbering", {}, [
            new XmlElement("w:abstractNum", {"w:abstractNumId": "100"}, [
                new XmlElement("w:lvl", {"w:ilvl": "0"}, [
                    new XmlElement("w:numFmt", {"w:val": "decimal"})
                ])
            ]),
            new XmlElement("w:abstractNum", {"w:abstractNumId": "101"}, [
                new XmlElement("w:numStyleLink", {"w:val": "List1"})
            ]),
            new XmlElement("w:num", {"w:numId": "200"}, [
                new XmlElement("w:abstractNumId", {"w:val": "100"})
            ]),
            new XmlElement("w:num", {"w:numId": "201"}, [
                new XmlElement("w:abstractNumId", {"w:val": "101"})
            ])
        ]),
        {styles: new stylesReader.Styles({}, {}, {}, {"List1": {numId: "200"}})}
    );
    duck.assertThat(numbering.findLevel("201", "0"), duck.hasProperties({
        isOrdered: true
    }));
});


// See: 17.9.23 pStyle (Paragraph Style's Associated Numbering Level) in ECMA-376, 4th Edition
test('numbering level can be found by paragraph style ID', function() {
    var numbering = readNumberingXml(
        new XmlElement("w:numbering", {}, [
            new XmlElement("w:abstractNum", {"w:abstractNumId": "42"}, [
                new XmlElement("w:lvl", {"w:ilvl": "0"}, [
                    new XmlElement("w:numFmt", {"w:val": "bullet"})
                ])
            ]),
            new XmlElement("w:abstractNum", {"w:abstractNumId": "43"}, [
                new XmlElement("w:lvl", {"w:ilvl": "0"}, [
                    new XmlElement("w:pStyle", {"w:val": "List"}),
                    new XmlElement("w:numFmt", {"w:val": "decimal"})
                ])
            ])
        ]),
        {styles: stylesReader.defaultStyles}
    );
    duck.assertThat(numbering.findLevelByParagraphStyleId("List"), duck.hasProperties({
        isOrdered: true
    }));
    duck.assertThat(numbering.findLevelByParagraphStyleId("Paragraph"), duck.equalTo(null));
});

test('when styles is missing then error is thrown', function() {
    assert.throws(function() {
        readNumberingXml(new XmlElement("w:numbering", {}, []));
    }, /styles is missing/);
});
