var assert = require("assert");
var test = require("../test")(module);

var mdWriter = require("../../lib/writers/markdown-writer");

test('special markdown characters are escaped', function() {
    var writer = mdWriter.writer();
    writer.text("\\*");
    return assert.equal(writer.asString(), "\\\\\\*");
});

test('unrecognised elements are treated as normal text', function() {
    var writer = mdWriter.writer();
    writer.open("blah");
    writer.text("Hello");
    writer.close("blah");
    return assert.equal(writer.asString(), "Hello");
});

test('paragraphs are terminated with double new line', function() {
    var writer = mdWriter.writer();
    writer.open("p");
    writer.text("Hello");
    writer.close("p");
    return assert.equal(writer.asString(), "Hello\n\n");
});

test('h1 elements are converted to heading with leading hash', function() {
    var writer = mdWriter.writer();
    writer.open("h1");
    writer.text("Hello");
    writer.close("h1");
    return assert.equal(writer.asString(), "# Hello\n\n");
});

test('h6 elements are converted to heading with six leading hashes', function() {
    var writer = mdWriter.writer();
    writer.open("h6");
    writer.text("Hello");
    writer.close("h6");
    return assert.equal(writer.asString(), "###### Hello\n\n");
});

test('br is written as two spaces followed by new line', function() {
    var writer = mdWriter.writer();
    writer.text("Hello World");
    writer.selfClosing("br");
    return assert.equal(writer.asString(), "Hello World  \n");
});

test('strong text is surrounded by two underscores', function() {
    var writer = mdWriter.writer();
    writer.text("Hello ");
    writer.open("strong");
    writer.text("World");
    writer.close("strong");
    return assert.equal(writer.asString(), "Hello __World__");
});

test('emphasised text is surrounded by one asterix', function() {
    var writer = mdWriter.writer();
    writer.text("Hello ");
    writer.open("em");
    writer.text("World");
    writer.close("em");
    return assert.equal(writer.asString(), "Hello *World*");
});

test('anchor tags are written as hyperlinks', function() {
    var writer = mdWriter.writer();
    writer.open("a", {"href": "http://example.com"});
    writer.text("Hello");
    writer.close("a");
    return assert.equal(writer.asString(), "[Hello](http://example.com)");
});

test('anchor tags without href attribute are treated as ordinary text', function() {
    var writer = mdWriter.writer();
    writer.open("a");
    writer.text("Hello");
    writer.close("a");
    return assert.equal(writer.asString(), "Hello");
});

test('elements with IDs have anchor tags with IDs appended to start of markdown element', function() {
    var writer = mdWriter.writer();
    writer.open("h1", {id: "start"});
    writer.text("Hello");
    writer.close("h1");
    return assert.equal(writer.asString(), '# <a id="start"></a>Hello\n\n');
});

test('links have anchors before opening square bracket', function() {
    var writer = mdWriter.writer();
    writer.open("a", {href: "http://example.com", id: "start"});
    writer.text("Hello");
    writer.close("a");
    return assert.equal(writer.asString(), '<a id="start"></a>[Hello](http://example.com)');
});

test('can generate images', function() {
    var writer = mdWriter.writer();
    writer.selfClosing("img", {"src": "http://example.com/image.jpg", "alt": "Alt Text"});
    return assert.equal(writer.asString(), "![Alt Text](http://example.com/image.jpg)");
});

test('can generate images with missing alt attribute', function() {
    var writer = mdWriter.writer();
    writer.selfClosing("img", {"src": "http://example.com/image.jpg"});
    return assert.equal(writer.asString(), "![](http://example.com/image.jpg)");
});

test('can generate images with missing src attribute', function() {
    var writer = mdWriter.writer();
    writer.selfClosing("img", {"alt": "Alt Text"});
    return assert.equal(writer.asString(), "![Alt Text]()");
});

test("doesn't display empty images", function() {
    var writer = mdWriter.writer();
    writer.selfClosing("img");
    return assert.equal(writer.asString(), "");
});

test('list item outside of list is treated as unordered list', function() {
    var writer = mdWriter.writer();
    writer.open("li");
    writer.text("Hello");
    writer.close("li");
    return assert.equal(writer.asString(), "- Hello\n");
});

test('can generate an ordered list', function() {
    var writer = mdWriter.writer();
    writer.open("ol");
    writer.open("li");
    writer.text("Hello");
    writer.close("li");
    writer.open("li");
    writer.text("World");
    writer.close("li");
    writer.close("ol");
    return assert.equal(writer.asString(), "1. Hello\n2. World\n\n");
});

test('can generate an unordered list', function() {
    var writer = mdWriter.writer();
    writer.open("ul");
    writer.open("li");
    writer.text("Hello");
    writer.close("li");
    writer.open("li");
    writer.text("World");
    writer.close("li");
    writer.close("ul");
    return assert.equal(writer.asString(), "- Hello\n- World\n\n");
});

test('can generate a nested ordered list with correct numbering', function() {
    var writer = mdWriter.writer();
    writer.open("ol");
    writer.open("li");
    writer.text("Outer One");

    writer.open("ol");
    writer.open("li");
    writer.text("Nested One");
    writer.close("li");
    writer.open("li");
    writer.text("Nested Two");
    writer.close("li");
    writer.close("ol");

    writer.close("li");
    writer.open("li");
    writer.text("Outer Two");
    writer.close("li");
    writer.close("ol");
    return assert.equal(writer.asString(), "1. Outer One\n\t1. Nested One\n\t2. Nested Two\n2. Outer Two\n\n");
});

test('can generate a multi-level nested ordered list', function() {
    var writer = mdWriter.writer();
    writer.open("ol");
    writer.open("li");
    writer.text("Outer One");

    writer.open("ol");
    writer.open("li");
    writer.text("Nested One");

    writer.open("ol");
    writer.open("li");
    writer.text("Inner One");
    writer.close("li");
    writer.close("ol");

    writer.close("li");
    writer.close("ol");

    writer.close("li");
    writer.close("ol");
    return assert.equal(writer.asString(), "1. Outer One\n\t1. Nested One\n\t\t1. Inner One\n\n");
});

test('new ordered list resets numbering', function() {
    var writer = mdWriter.writer();
    writer.open("ol");
    writer.open("li");
    writer.text("First");
    writer.close("li");
    writer.close("ol");

    writer.open("p");
    writer.text("Hello");
    writer.close("p");

    writer.open("ol");
    writer.open("li");
    writer.text("Second");
    writer.close("li");
    writer.close("ol");

    return assert.equal(writer.asString(), "1. First\n\nHello\n\n1. Second\n\n");
});

test('can generate a nested unordered list', function() {
    var writer = mdWriter.writer();
    writer.open("ul");
    writer.open("li");
    writer.text("Outer One");

    writer.open("ul");
    writer.open("li");
    writer.text("Nested One");
    writer.close("li");
    writer.open("li");
    writer.text("Nested Two");
    writer.close("li");
    writer.close("ul");

    writer.close("li");
    writer.open("li");
    writer.text("Outer Two");
    writer.close("li");
    writer.close("ul");
    return assert.equal(writer.asString(), "- Outer One\n\t- Nested One\n\t- Nested Two\n- Outer Two\n\n");
});

test('can nest inline elements', function() {
    var writer = mdWriter.writer();
    writer.open("p");
    writer.text("Lorem ");
    writer.open("strong");
    writer.text("ipsum ");
    writer.open("em");
    writer.text("dolor");
    writer.close("em");
    writer.text(" sit");
    writer.close("strong");
    writer.text(" amet");
    writer.close("p");
    return assert.equal(writer.asString(), "Lorem __ipsum *dolor* sit__ amet\n\n");
});

test('can emphasise list text', function() {
    var writer = mdWriter.writer();
    writer.open("ol");
    writer.open("li");
    writer.text("Hello ");
    writer.open("strong");
    writer.text("Strong");
    writer.close("strong");
    writer.text(" World");
    writer.close("li");
    writer.open("li");
    writer.text("Hello ");
    writer.open("em");
    writer.text("Emphasis");
    writer.close("em");
    writer.text(" World");
    writer.close("li");
    writer.close("ol");
    return assert.equal(writer.asString(), "1. Hello __Strong__ World\n2. Hello *Emphasis* World\n\n");
});

test('generates correct spacing between paragraphs and lists', function() {
    var writer = mdWriter.writer();
    writer.open("p");
    writer.text("Hello World");
    writer.close("p");
    writer.open("ul");
    writer.open("li");
    writer.text("First Item");
    writer.close("li");
    writer.open("li");
    writer.text("Second Item");
    writer.close("li");
    writer.close("ul");
    writer.open("p");
    writer.text("Hello World");
    writer.close("p");
    return assert.equal(writer.asString(), "Hello World\n\n- First Item\n- Second Item\n\nHello World\n\n");
});
