var assert = require("assert");

var xml = require("../../lib/xml");
var writer = require("../../lib/xml/writer");
var test = require("../test")(module);


test('writing empty root element writes out xml declaration and empty root element', function() {
    assertXmlString(xml.element("root"), {}, '<root/>');
});

test('can write empty child elements', function() {
    assertXmlString(xml.element("root", {}, [xml.element("album"), xml.element("single")]), {},
        '<root><album/><single/></root>');
});

test('can write empty descendant elements', function() {
    var element = xml.element("root", {}, [
        xml.element("album", {}, [
            xml.element("year"),
            xml.element("song")
        ])
    ]);
    assertXmlString(element, {},
        '<root><album><year/><song/></album></root>');
});

test('can write element attributes', function() {
    var element = xml.element("root", {}, [
        xml.element("album", {"title": "Everything in Transit"})
    ]);
    assertXmlString(element, {},
        '<root><album title="Everything in Transit"/></root>');
});

test('can write text nodes', function() {
    var element = xml.element("root", {}, [
        xml.element("album", {}, [
            xml.text("Everything in Transit")
        ])
    ]);
    assertXmlString(element, {},
        '<root><album>Everything in Transit</album></root>');
});

test('can write root element with long-form prefix when URI is namespace', function() {
    var element = xml.element("{music}root");
    assertXmlString(element, {"m": "music"},
        '<m:root xmlns:m="music"/>');
});

test('can write child elements with long-form prefix when URI is namespace', function() {
    var element = xml.element("root", {}, [
        xml.element("{music}album")
    ]);
    assertXmlString(element, {"m": "music"},
        '<root xmlns:m="music"><m:album/></root>');
});

test('can write child elements with short-form prefix when URI is namespace', function() {
    var element = xml.element("root", {}, [
        xml.element("m:album")
    ]);
    assertXmlString(element, {"m": "music"},
        '<root xmlns:m="music"><m:album/></root>');
});

test('default namespace has key of empty string', function() {
    var element = xml.element("root", {}, [
        xml.element("{music}album")
    ]);
    assertXmlString(element, {"": "music"},
        '<root xmlns="music"><album/></root>');
});


function assertXmlString(element, namespaces, expectedString) {
    assert.equal(writer.writeString(element, namespaces),
        '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
        expectedString);
}
