const xpath = require('./xpath.js');
const dom = require('xmldom').DOMParser;
const assert = require('assert');

var xhtmlNs = 'http://www.w3.org/1999/xhtml';

describe('xpath', () => {
    describe('api', () => {
        it('should contain the correct methods', () => {
            assert.ok(xpath.evaluate, 'evaluate api ok.');
            assert.ok(xpath.select, 'select api ok.');
            assert.ok(xpath.parse, 'parse api ok.');
        });

        it('should support .evaluate()', () => {
            var xml = '<book><title>Harry Potter</title></book>';
            var doc = new dom().parseFromString(xml);
            var nodes = xpath.evaluate('//title', doc, null, xpath.XPathResult.ANY_TYPE, null).nodes;

            assert.strictEqual('title', nodes[0].localName);
            assert.strictEqual('Harry Potter', nodes[0].firstChild.data);
            assert.strictEqual('<title>Harry Potter</title>', nodes[0].toString());
        });

        it('should support .select()', () => {
            var xml = '<?book title="Harry Potter"?><?series title="Harry Potter"?><?series books="7"?><book><!-- This is a great book --><title>Harry Potter</title></book>';
            var doc = new dom().parseFromString(xml);
            var nodes = xpath.select('//title', doc);
            assert.strictEqual('title', nodes[0].localName);
            assert.strictEqual('Harry Potter', nodes[0].firstChild.data);
            assert.strictEqual('<title>Harry Potter</title>', nodes[0].toString());

            var nodes2 = xpath.select('//node()', doc);
            assert.strictEqual(7, nodes2.length);

            var pis = xpath.select("/processing-instruction('series')", doc);
            assert.strictEqual(2, pis.length);
            assert.strictEqual('books="7"', pis[1].data);
        });
    });

    describe('parsing', () => {
        it('should detect unterminated string literals', () => {
            function testUnterminated(path) {
                assert.throws(function () {
                    xpath.evaluate('"hello');
                }, function (err) {
                    return err.message.indexOf('Unterminated') !== -1;
                });
            }

            testUnterminated('"Hello');
            testUnterminated("'Hello");
            testUnterminated('self::text() = "\""');
            testUnterminated('"\""');
        });
    });

    describe('.select()', () => {
        it('should select single nodes', () => {
            var xml = '<book><title>Harry Potter</title></book>';
            var doc = new dom().parseFromString(xml);

            assert.strictEqual('title', xpath.select('//title[1]', doc)[0].localName);
        });

        it('should select text nodes', () => {
            var xml = '<book><title>Harry</title><title>Potter</title></book>';
            var doc = new dom().parseFromString(xml);

            assert.deepEqual('book', xpath.select('local-name(/book)', doc));
            assert.deepEqual('Harry,Potter', xpath.select('//title/text()', doc).toString());
        });

        it('should select number values', () => {
            var xml = '<book><title>Harry</title><title>Potter</title></book>';
            var doc = new dom().parseFromString(xml);

            assert.deepEqual(2, xpath.select('count(//title)', doc));
        });

        it('should select with namespaces', () => {
            var xml = '<book><title xmlns="myns">Harry Potter</title></book>';
            var doc = new dom().parseFromString(xml);

            var nodes = xpath.select('//*[local-name(.)="title" and namespace-uri(.)="myns"]', doc);
            assert.strictEqual('title', nodes[0].localName);
            assert.strictEqual('myns', nodes[0].namespaceURI);

            var nodes2 = xpath.select('/*/title', doc);

            assert.strictEqual(0, nodes2.length);
        });

        it('should select with namespaces, using a resolver', () => {
            var xml = '<book xmlns:testns="http://example.com/test" xmlns:otherns="http://example.com/other"><otherns:title>Narnia</otherns:title><testns:title>Harry Potter</testns:title><testns:field testns:type="author">JKR</testns:field></book>';
            var doc = new dom().parseFromString(xml);

            var resolver = {
                mappings: {
                    'testns': 'http://example.com/test'
                },
                lookupNamespaceURI: function (prefix) {
                    return this.mappings[prefix];
                }
            };

            var nodes = xpath.selectWithResolver('//testns:title/text()', doc, resolver);
            assert.strictEqual('Harry Potter', nodes[0].nodeValue);

            assert.strictEqual('JKR', xpath.selectWithResolver('//testns:field[@testns:type="author"]/text()', doc, resolver)[0].nodeValue);

            var nodes2 = xpath.selectWithResolver('/*/testns:*', doc, resolver);

            assert.strictEqual(2, nodes2.length);
        });

        it('should select from xml with a default namespace, using a resolver', () => {
            var xml = '<book xmlns="http://example.com/test"><title>Harry Potter</title><field type="author">JKR</field></book>';
            var doc = new dom().parseFromString(xml);

            var resolver = {
                mappings: {
                    'testns': 'http://example.com/test'
                },
                lookupNamespaceURI: function (prefix) {
                    return this.mappings[prefix];
                }
            }

            var nodes = xpath.selectWithResolver('//testns:title/text()', doc, resolver);
            assert.strictEqual('Harry Potter', xpath.selectWithResolver('//testns:title/text()', doc, resolver)[0].nodeValue);
            assert.strictEqual('JKR', xpath.selectWithResolver('//testns:field[@type="author"]/text()', doc, resolver)[0].nodeValue);
        });

        it('should select with namespaces, prefixes different in xml and xpath, using a resolver', () => {
            var xml = '<book xmlns:testns="http://example.com/test"><testns:title>Harry Potter</testns:title><testns:field testns:type="author">JKR</testns:field></book>';
            var doc = new dom().parseFromString(xml);

            var resolver = {
                mappings: {
                    'ns': 'http://example.com/test'
                },
                lookupNamespaceURI: function (prefix) {
                    return this.mappings[prefix];
                }
            }

            var nodes = xpath.selectWithResolver('//ns:title/text()', doc, resolver);
            assert.strictEqual('Harry Potter', nodes[0].nodeValue);

            assert.strictEqual('JKR', xpath.selectWithResolver('//ns:field[@ns:type="author"]/text()', doc, resolver)[0].nodeValue);
        });

        it('should select with namespaces, using namespace mappings', () => {
            var xml = '<book xmlns:testns="http://example.com/test"><testns:title>Harry Potter</testns:title><testns:field testns:type="author">JKR</testns:field></book>';
            var doc = new dom().parseFromString(xml);
            var select = xpath.useNamespaces({ 'testns': 'http://example.com/test' });

            assert.strictEqual('Harry Potter', select('//testns:title/text()', doc)[0].nodeValue);
            assert.strictEqual('JKR', select('//testns:field[@testns:type="author"]/text()', doc)[0].nodeValue);
        });

        it('should select attributes', () => {
            var xml = '<author name="J. K. Rowling"></author>';
            var doc = new dom().parseFromString(xml);

            var author = xpath.select1('/author/@name', doc).value;
            assert.strictEqual('J. K. Rowling', author);
        });
    });

    describe('selection', () => {
        it('should select with multiple predicates', () => {
            var xml = '<characters><character name="Snape" sex="M" age="50" /><character name="McGonnagal" sex="F" age="65" /><character name="Harry" sex="M" age="14" /></characters>';
            var doc = new dom().parseFromString(xml);

            var characters = xpath.select('/*/character[@sex = "M"][@age > 40]/@name', doc);

            assert.strictEqual(1, characters.length);
            assert.strictEqual('Snape', characters[0].textContent);
        });

        // https://github.com/goto100/xpath/issues/37
        it('should select multiple attributes', () => {
            var xml = '<authors><author name="J. K. Rowling" /><author name="Saeed Akl" /></authors>';
            var doc = new dom().parseFromString(xml);

            var authors = xpath.select('/authors/author/@name', doc);
            assert.strictEqual(2, authors.length);
            assert.strictEqual('J. K. Rowling', authors[0].value);

            // https://github.com/goto100/xpath/issues/41
            doc = new dom().parseFromString('<chapters><chapter v="1"/><chapter v="2"/><chapter v="3"/></chapters>');
            var nodes = xpath.select("/chapters/chapter/@v", doc);
            var values = nodes.map(function (n) { return n.value; });

            assert.strictEqual(3, values.length);
            assert.strictEqual("1", values[0]);
            assert.strictEqual("2", values[1]);
            assert.strictEqual("3", values[2]);
        });

        it('should compare string values of numbers with numbers', () => {
            assert.ok(xpath.select1('"000" = 0'), '000');
            assert.ok(xpath.select1('"45.0" = 45'), '45');
        });

        it('should correctly compare strings with booleans', () => {
            // string should downcast to boolean
            assert.strictEqual(false, xpath.select1('"false" = false()'), '"false" = false()');
            assert.strictEqual(true, xpath.select1('"a" = true()'), '"a" = true()');
            assert.strictEqual(true, xpath.select1('"" = false()'), '"" = false()');
        });

        it('should evaluate local-name() and name() on processing instructions', () => {
            var xml = '<?book-record added="2015-01-16" author="J.K. Rowling" ?><book>Harry Potter</book>';
            var doc = new dom().parseFromString(xml);
            var expectedName = 'book-record';
            var localName = xpath.select('local-name(/processing-instruction())', doc);
            var name = xpath.select('name(/processing-instruction())', doc);

            assert.deepEqual(expectedName, localName, 'local-name() - "' + expectedName + '" !== "' + localName + '"');
            assert.deepEqual(expectedName, name, 'name() - "' + expectedName + '" !== "' + name + '"');
        });

        it('should support substring-after()', () => {
            var xml = '<classmate>Hermione</classmate>';
            var doc = new dom().parseFromString(xml);

            var part = xpath.select('substring-after(/classmate, "Her")', doc);
            assert.deepEqual('mione', part);
        });

        it('should support preceding:: on document fragments', () => {
            var doc = new dom().parseFromString('<n />'),
                df = doc.createDocumentFragment(),
                root = doc.createElement('book');

            df.appendChild(root);

            for (var i = 0; i < 10; i += 1) {
                root.appendChild(doc.createElement('chapter'));
            }

            var chapter = xpath.select1("book/chapter[5]", df);

            assert.ok(chapter, 'chapter');

            assert.strictEqual(xpath.select("count(preceding::chapter)", chapter), 4);
        });

        it('should allow getting sorted and unsorted arrays from nodesets', () => {
            const doc = new dom().parseFromString('<book><character>Harry</character><character>Ron</character><character>Hermione</character></book>');
            const path = xpath.parse("/*/*[3] | /*/*[2] | /*/*[1]");
            const nset = path.evaluateNodeSet({ node: doc });
            const sorted = nset.toArray();
            const unsorted = nset.toUnsortedArray();

            assert.strictEqual(sorted.length, 3);
            assert.strictEqual(unsorted.length, 3);

            assert.strictEqual(sorted[0].textContent, 'Harry');
            assert.strictEqual(sorted[1].textContent, 'Ron');
            assert.strictEqual(sorted[2].textContent, 'Hermione');

            assert.notEqual(sorted[0], unsorted[0], "first nodeset element equal");
        });

        it('should compare nodesets to nodesets (=)', () => {
            var xml = '<school><houses>' +
                '<house name="Gryffindor"><student>Harry</student><student>Hermione</student></house>' +
                '<house name="Slytherin"><student>Draco</student><student>Crabbe</student></house>' +
                '<house name="Ravenclaw"><student>Luna</student><student>Cho</student></house>' +
                '</houses>' +
                '<honorStudents><student>Hermione</student><student>Luna</student></honorStudents></school>';

            var doc = new dom().parseFromString(xml);
            var houses = xpath.parse('/school/houses/house[student = /school/honorStudents/student]').select({ node: doc });

            assert.strictEqual(houses.length, 2);

            var houseNames = houses.map(function (node) { return node.getAttribute('name'); }).sort();

            assert.strictEqual(houseNames[0], 'Gryffindor');
            assert.strictEqual(houseNames[1], 'Ravenclaw');
        });

        it('should compare nodesets to nodesets (>=)', () => {
            var xml = '<school><houses>' +
                '<house name="Gryffindor"><student level="5">Harry</student><student level="9">Hermione</student></house>' +
                '<house name="Slytherin"><student level="1">Goyle</student><student level="1">Crabbe</student></house>' +
                '<house name="Ravenclaw"><student level="4">Luna</student><student level="3">Cho</student></house>' +
                '</houses>' +
                '<courses><course minLevel="9">DADA</course><course minLevel="4">Charms</course></courses>' +
                '</school>';

            var doc = new dom().parseFromString(xml);
            var houses = xpath.parse('/school/houses/house[student/@level >= /school/courses/course/@minLevel]').select({ node: doc });

            assert.strictEqual(houses.length, 2);

            var houseNames = houses.map(function (node) { return node.getAttribute('name'); }).sort();

            assert.strictEqual(houseNames[0], 'Gryffindor');
            assert.strictEqual(houseNames[1], 'Ravenclaw');
        });

        it('should support various inequality expressions on nodesets', () => {
            var xml = "<books><book num='1' title='PS' /><book num='2' title='CoS' /><book num='3' title='PoA' /><book num='4' title='GoF' /><book num='5' title='OotP' /><book num='6' title='HBP' /><book num='7' title='DH' /></books>";
            var doc = new dom().parseFromString(xml);

            var options = { node: doc, variables: { theNumber: 3, theString: '3', theBoolean: true } };

            var numberPaths = [
                '/books/book[$theNumber <= @num]',
                '/books/book[$theNumber < @num]',
                '/books/book[$theNumber >= @num]',
                '/books/book[$theNumber > @num]'
            ];

            var stringPaths = [
                '/books/book[$theString <= @num]',
                '/books/book[$theString < @num]',
                '/books/book[$theString >= @num]',
                '/books/book[$theString > @num]'
            ];

            var booleanPaths = [
                '/books/book[$theBoolean <= @num]',
                '/books/book[$theBoolean < @num]',
                '/books/book[$theBoolean >= @num]',
                '/books/book[$theBoolean > @num]'
            ];

            var lhsPaths = [
                '/books/book[@num <= $theNumber]',
                '/books/book[@num < $theNumber]'
            ];

            function countNodes(paths) {
                return paths
                    .map(xpath.parse)
                    .map(function (path) { return path.select(options) })
                    .map(function (arr) { return arr.length; });
            }

            assert.deepEqual(countNodes(numberPaths), [5, 4, 3, 2], 'numbers');
            assert.deepEqual(countNodes(stringPaths), [5, 4, 3, 2], 'strings');
            assert.deepEqual(countNodes(booleanPaths), [7, 6, 1, 0], 'numbers');
            assert.deepEqual(countNodes(lhsPaths), [3, 2], 'lhs');
        });

        it('should correctly evaluate context position', () => {
            var doc = new dom().parseFromString("<books><book><chapter>The boy who lived</chapter><chapter>The vanishing glass</chapter></book><book><chapter>The worst birthday</chapter><chapter>Dobby's warning</chapter><chapter>The burrow</chapter></book></books>");

            var chapters = xpath.parse('/books/book/chapter[2]').select({ node: doc });

            assert.strictEqual(2, chapters.length);
            assert.strictEqual('The vanishing glass', chapters[0].textContent);
            assert.strictEqual("Dobby's warning", chapters[1].textContent);

            var lastChapters = xpath.parse('/books/book/chapter[last()]').select({ node: doc });

            assert.strictEqual(2, lastChapters.length);
            assert.strictEqual('The vanishing glass', lastChapters[0].textContent);
            assert.strictEqual("The burrow", lastChapters[1].textContent);

            var secondChapter = xpath.parse('(/books/book/chapter)[2]').select({ node: doc });

            assert.strictEqual(1, secondChapter.length);
            assert.strictEqual('The vanishing glass', chapters[0].textContent);

            var lastChapter = xpath.parse('(/books/book/chapter)[last()]').select({ node: doc });

            assert.strictEqual(1, lastChapter.length);
            assert.strictEqual("The burrow", lastChapter[0].textContent);
        });
    });

    describe('string()', () => {
        it('should work with no arguments', () => {
            var doc = new dom().parseFromString('<book>Harry Potter</book>');

            var rootElement = xpath.select1('/book', doc);
            assert.ok(rootElement, 'rootElement is null');

            assert.strictEqual('Harry Potter', xpath.select1('string()', doc));
        });

        it('should work on document fragments', () => {
            var doc = new dom().parseFromString('<n />');
            var docFragment = doc.createDocumentFragment();

            var el = doc.createElement("book");
            docFragment.appendChild(el);

            var testValue = "Harry Potter";

            el.appendChild(doc.createTextNode(testValue));

            assert.strictEqual(testValue, xpath.select1("string()", docFragment));
        });

        it('should work correctly on boolean values', () => {
            assert.strictEqual('string', typeof xpath.select1('string(true())'));
            assert.strictEqual('string', typeof xpath.select1('string(false())'));
            assert.strictEqual('string', typeof xpath.select1('string(1 = 2)'));
            assert.ok(xpath.select1('"true" = string(true())'), '"true" = string(true())');
        });

        it('should work correctly on numbers', () => {
            assert.strictEqual('string', typeof xpath.select1('string(45)'));
            assert.ok(xpath.select1('"45" = string(45)'), '"45" = string(45)');
        });
    });

    describe('type conversion', () => {
        it('should convert strings to numbers correctly', () => {
            assert.strictEqual(45.2, xpath.select1('number("45.200")'));
            assert.strictEqual(55.0, xpath.select1('number("000055")'));
            assert.strictEqual(65.0, xpath.select1('number("  65  ")'));

            assert.strictEqual(true, xpath.select1('"" != 0'), '"" != 0');
            assert.strictEqual(false, xpath.select1('"" = 0'), '"" = 0');
            assert.strictEqual(false, xpath.select1('0 = ""'), '0 = ""');
            assert.strictEqual(false, xpath.select1('0 = "   "'), '0 = "   "');

            assert.ok(Number.isNaN(xpath.select('number("")')), 'number("")');
            assert.ok(Number.isNaN(xpath.select('number("45.8g")')), 'number("45.8g")');
            assert.ok(Number.isNaN(xpath.select('number("2e9")')), 'number("2e9")');
            assert.ok(Number.isNaN(xpath.select('number("+33")')), 'number("+33")');
        });

        it('should convert numbers to strings correctly', () => {
            assert.strictEqual('0.0000000000000000000000005250000000000001', xpath.parse('0.525 div 1000000 div 1000000 div 1000000 div 1000000').evaluateString());
            assert.strictEqual('525000000000000000000000', xpath.parse('0.525 * 1000000 * 1000000 * 1000000 * 1000000').evaluateString());
        });

        it('should provide correct string value for cdata sections', () => {
            const xml = "<people><person><![CDATA[Harry Potter]]></person><person>Ron <![CDATA[Weasley]]></person></people>";
            const doc = new dom().parseFromString(xml);

            const person1 = xpath.parse("/people/person").evaluateString({ node: doc });
            const person2 = xpath.parse("/people/person/text()").evaluateString({ node: doc });
            const person3 = xpath.select("string(/people/person/text())", doc);
            const person4 = xpath.parse("/people/person[2]").evaluateString({ node: doc });

            assert.strictEqual(person1, 'Harry Potter');
            assert.strictEqual(person2, 'Harry Potter');
            assert.strictEqual(person3, 'Harry Potter');
            assert.strictEqual(person4, 'Ron Weasley');
        });

        it('should convert various node types to string values', () => {
            var xml = "<book xmlns:hp='http://harry'><!-- This describes the Harry Potter Book --><?author name='J.K. Rowling' ?><title lang='en'><![CDATA[Harry Potter & the Philosopher's Stone]]></title><character>Harry Potter</character></book>",
                doc = new dom().parseFromString(xml),
                allText = xpath.parse('.').evaluateString({ node: doc }),
                ns = xpath.parse('*/namespace::*[name() = "hp"]').evaluateString({ node: doc }),
                title = xpath.parse('*/title').evaluateString({ node: doc }),
                child = xpath.parse('*/*').evaluateString({ node: doc }),
                titleLang = xpath.parse('*/*/@lang').evaluateString({ node: doc }),
                pi = xpath.parse('*/processing-instruction()').evaluateString({ node: doc }),
                comment = xpath.parse('*/comment()').evaluateString({ node: doc });

            assert.strictEqual(allText, "Harry Potter & the Philosopher's StoneHarry Potter");
            assert.strictEqual(ns, 'http://harry');
            assert.strictEqual(title, "Harry Potter & the Philosopher's Stone");
            assert.strictEqual(child, "Harry Potter & the Philosopher's Stone");
            assert.strictEqual(titleLang, 'en');
            assert.strictEqual(pi.trim(), "name='J.K. Rowling'");
            assert.strictEqual(comment, ' This describes the Harry Potter Book ');
        });

        it('should convert booleans to numbers correctly', () => {
            var num = xpath.parse('"a" = "b"').evaluateNumber();

            assert.strictEqual(num, 0);

            var str = xpath.select('substring("expelliarmus", 1, "a" = "a")');

            assert.strictEqual(str, 'e');
        });
    });

    describe('parsed expressions', () => {
        it('should work with no options', () => {
            var parsed = xpath.parse('5 + 7');

            assert.strictEqual(typeof parsed, "object", "parse() should return an object");
            assert.strictEqual(typeof parsed.evaluate, "function", "parsed.evaluate should be a function");
            assert.strictEqual(typeof parsed.evaluateNumber, "function", "parsed.evaluateNumber should be a function");

            assert.strictEqual(parsed.evaluateNumber(), 12);

            // evaluating twice should yield the same result
            assert.strictEqual(parsed.evaluateNumber(), 12);
        });

        it('should support select1()', () => {
            var xml = '<book><title>Harry Potter</title></book>';
            var doc = new dom().parseFromString(xml);
            var parsed = xpath.parse('/*/title');

            assert.strictEqual(typeof parsed, 'object', 'parse() should return an object');

            assert.strictEqual(typeof parsed.select1, 'function', 'parsed.select1 should be a function');

            var single = parsed.select1({ node: doc });

            assert.strictEqual('title', single.localName);
            assert.strictEqual('Harry Potter', single.firstChild.data);
            assert.strictEqual('<title>Harry Potter</title>', single.toString());
        });

        it('should support select()', () => {
            var xml = '<book><title>Harry Potter</title></book>';
            var doc = new dom().parseFromString(xml);
            var parsed = xpath.parse('/*/title');

            assert.strictEqual(typeof parsed, 'object', 'parse() should return an object');

            assert.strictEqual(typeof parsed.select, 'function', 'parsed.select should be a function');

            var nodes = parsed.select({ node: doc });

            assert.ok(nodes, 'parsed.select() should return a value');
            assert.strictEqual(1, nodes.length);
            assert.strictEqual('title', nodes[0].localName);
            assert.strictEqual('Harry Potter', nodes[0].firstChild.data);
            assert.strictEqual('<title>Harry Potter</title>', nodes[0].toString());
        });

        it('should support .evaluateString() and .evaluateNumber()', () => {
            var xml = '<book><title>Harry Potter</title><numVolumes>7</numVolumes></book>';
            var doc = new dom().parseFromString(xml);
            var parsed = xpath.parse('/*/numVolumes');

            assert.strictEqual(typeof parsed, 'object', 'parse() should return an object');

            assert.strictEqual(typeof parsed.evaluateString, 'function', 'parsed.evaluateString should be a function');
            assert.strictEqual('7', parsed.evaluateString({ node: doc }));

            assert.strictEqual(typeof parsed.evaluateBoolean, 'function', 'parsed.evaluateBoolean should be a function');
            assert.strictEqual(true, parsed.evaluateBoolean({ node: doc }));

            assert.strictEqual(typeof parsed.evaluateNumber, 'function', 'parsed.evaluateNumber should be a function');
            assert.strictEqual(7, parsed.evaluateNumber({ node: doc }));
        });

        it('should support .evaluateBoolean()', () => {
            var xml = '<book><title>Harry Potter</title></book>';
            var doc = new dom().parseFromString(xml);
            var context = { node: doc };

            function evaluate(path) {
                return xpath.parse(path).evaluateBoolean(context);
            }

            assert.strictEqual(false, evaluate('/*/myrtle'), 'boolean value of empty node set should be false');

            assert.strictEqual(true, evaluate('not(/*/myrtle)'), 'not() of empty nodeset should be true');

            assert.strictEqual(true, evaluate('/*/title'), 'boolean value of non-empty nodeset should be true');

            assert.strictEqual(true, evaluate('/*/title = "Harry Potter"'), 'title equals Harry Potter');

            assert.strictEqual(false, evaluate('/*/title != "Harry Potter"'), 'title != Harry Potter should be false');

            assert.strictEqual(false, evaluate('/*/title = "Percy Jackson"'), 'title should not equal Percy Jackson');
        });

        it('should support namespaces', () => {
            var xml = '<characters xmlns:ps="http://philosophers-stone.com" xmlns:cs="http://chamber-secrets.com">' +
                '<ps:character>Quirrell</ps:character><ps:character>Fluffy</ps:character>' +
                '<cs:character>Myrtle</cs:character><cs:character>Tom Riddle</cs:character>' +
                '</characters>';
            var doc = new dom().parseFromString(xml);

            var expr = xpath.parse('/characters/c:character');
            var countExpr = xpath.parse('count(/characters/c:character)');
            var csns = 'http://chamber-secrets.com';

            function resolve(prefix) {
                if (prefix === 'c') {
                    return csns;
                }
            }

            function testContext(context, description) {
                try {
                    var value = expr.evaluateString(context);
                    var count = countExpr.evaluateNumber(context);

                    assert.strictEqual('Myrtle', value, description + ' - string value - ' + value);
                    assert.strictEqual(2, count, description + ' map - count - ' + count);
                } catch (e) {
                    e.message = description + ': ' + (e.message || '');
                    throw e;
                }
            }

            testContext({
                node: doc,
                namespaces: {
                    c: csns
                }
            }, 'Namespace map');

            testContext({
                node: doc,
                namespaces: resolve
            }, 'Namespace function');

            testContext({
                node: doc,
                namespaces: {
                    getNamespace: resolve
                }
            }, 'Namespace object');
        });

        it('should support custom functions', () => {
            var xml = '<book><title>Harry Potter</title></book>';
            var doc = new dom().parseFromString(xml);

            var parsed = xpath.parse('concat(double(/*/title), " is cool")');

            function doubleString(context, value) {
                assert.strictEqual(2, arguments.length);
                var str = value.stringValue();
                return str + str;
            }

            function functions(name, namespace) {
                if (name === 'double') {
                    return doubleString;
                }
                return null;
            }

            function testContext(context, description) {
                try {
                    var actual = parsed.evaluateString(context);
                    var expected = 'Harry PotterHarry Potter is cool';
                    assert.strictEqual(expected, actual, description + ' - ' + expected + ' != ' + actual);
                } catch (e) {
                    e.message = description + ": " + (e.message || '');
                    throw e;
                }
            }

            testContext({
                node: doc,
                functions: functions
            }, 'Functions function');

            testContext({
                node: doc,
                functions: {
                    getFunction: functions
                }
            }, 'Functions object');

            testContext({
                node: doc,
                functions: {
                    double: doubleString
                }
            }, 'Functions map');
        });

        it('should support custom functions in namespaces', () => {
            var xml = '<book><title>Harry Potter</title><friend>Ron</friend><friend>Hermione</friend><friend>Neville</friend></book>';
            var doc = new dom().parseFromString(xml);

            var parsed = xpath.parse('concat(hp:double(/*/title), " is 2 cool ", hp:square(2), " school")');
            var hpns = 'http://harry-potter.com';

            var namespaces = {
                hp: hpns
            };

            var context = {
                node: doc,
                namespaces: {
                    hp: hpns
                },
                functions: function (name, namespace) {
                    if (namespace === hpns) {
                        switch (name) {
                            case "double":
                                return function (context, value) {
                                    assert.strictEqual(2, arguments.length);
                                    var str = value.stringValue();
                                    return str + str;
                                };
                            case "square":
                                return function (context, value) {
                                    var num = value.numberValue();
                                    return num * num;
                                };

                            case "xor":
                                return function (context, l, r) {
                                    assert.strictEqual(3, arguments.length);
                                    var lbool = l.booleanValue();
                                    var rbool = r.booleanValue();
                                    return (lbool || rbool) && !(lbool && rbool);
                                };

                            case "second":
                                return function (context, nodes) {
                                    var nodesArr = nodes.toArray();
                                    var second = nodesArr[1];
                                    return second ? [second] : [];
                                };
                        }
                    }
                    return null;
                }
            };

            assert.strictEqual('Harry PotterHarry Potter is 2 cool 4 school', parsed.evaluateString(context));

            assert.strictEqual(false, xpath.parse('hp:xor(false(), false())').evaluateBoolean(context));
            assert.strictEqual(true, xpath.parse('hp:xor(false(), true())').evaluateBoolean(context));
            assert.strictEqual(true, xpath.parse('hp:xor(true(), false())').evaluateBoolean(context));
            assert.strictEqual(false, xpath.parse('hp:xor(true(), true())').evaluateBoolean(context));

            assert.strictEqual('Hermione', xpath.parse('hp:second(/*/friend)').evaluateString(context));
            assert.strictEqual(1, xpath.parse('count(hp:second(/*/friend))').evaluateNumber(context));
            assert.strictEqual(0, xpath.parse('count(hp:second(/*/friendz))').evaluateNumber(context));
        });

        it('should support xpath variables', () => {
            var xml = '<book><title>Harry Potter</title><volumes>7</volumes></book>';
            var doc = new dom().parseFromString(xml);

            var variables = {
                title: 'Harry Potter',
                notTitle: 'Percy Jackson',
                houses: 4
            };

            function variableFunction(name) {
                return variables[name];
            }

            function testContext(context, description) {
                try {
                    assert.strictEqual(true, xpath.parse('$title = /*/title').evaluateBoolean(context));
                    assert.strictEqual(false, xpath.parse('$notTitle = /*/title').evaluateBoolean(context));
                    assert.strictEqual(11, xpath.parse('$houses + /*/volumes').evaluateNumber(context));
                } catch (e) {
                    e.message = description + ": " + (e.message || '');
                    throw e;
                }
            }

            testContext({
                node: doc,
                variables: variableFunction
            }, 'Variables function');

            testContext({
                node: doc,
                variables: {
                    getVariable: variableFunction
                }
            }, 'Variables object');

            testContext({
                node: doc,
                variables: variables
            }, 'Variables map');

        });

        it('should support variables with namespaces', () => {
            var xml = '<book><title>Harry Potter</title><volumes>7</volumes></book>';
            var doc = new dom().parseFromString(xml);
            var hpns = 'http://harry-potter.com';

            var context = {
                node: doc,
                namespaces: {
                    hp: hpns
                },
                variables: function (name, namespace) {
                    if (namespace === hpns) {
                        switch (name) {
                            case 'title': return 'Harry Potter';
                            case 'houses': return 4;
                            case 'false': return false;
                            case 'falseStr': return 'false';
                        }
                    } else if (namespace === '') {
                        switch (name) {
                            case 'title': return 'World';
                        }
                    }

                    return null;
                }
            };

            assert.strictEqual(true, xpath.parse('$hp:title = /*/title').evaluateBoolean(context));
            assert.strictEqual(false, xpath.parse('$title = /*/title').evaluateBoolean(context));
            assert.strictEqual('World', xpath.parse('$title').evaluateString(context));
            assert.strictEqual(false, xpath.parse('$hp:false').evaluateBoolean(context));
            assert.notEqual(false, xpath.parse('$hp:falseStr').evaluateBoolean(context));
            assert.throws(function () {
                xpath.parse('$hp:hello').evaluateString(context);
            }, function (err) {
                return err.message === 'Undeclared variable: $hp:hello';
            });
        });

        it('should support .toString()', () => {
            var parser = new xpath.XPathParser();

            var simpleStep = parser.parse('my:book');

            assert.strictEqual(simpleStep.toString(), 'child::my:book');

            var precedingSib = parser.parse('preceding-sibling::my:chapter');

            assert.strictEqual(precedingSib.toString(), 'preceding-sibling::my:chapter');

            var withPredicates = parser.parse('book[number > 3][contains(title, "and the")]');

            assert.strictEqual(withPredicates.toString(), "child::book[(child::number > 3)][contains(child::title, 'and the')]");

            var parenthesisWithPredicate = parser.parse('(/books/book/chapter)[7]');

            assert.strictEqual(parenthesisWithPredicate.toString(), '(/child::books/child::book/child::chapter)[7]');

            var charactersOver20 = parser.parse('heroes[age > 20] | villains[age > 20]');

            assert.strictEqual(charactersOver20.toString(), 'child::heroes[(child::age > 20)] | child::villains[(child::age > 20)]');
        });
    });

    describe('html-mode support', () => {
        it('should allow null namespaces for nodes with no prefix', () => {
            var markup = `<html>
                            <head></head>
                            <body>
                                <p>Hi Ron!</p>
                                <my:p xmlns:my="http://www.example.com/my">Hi Draco!</p>
                                <p>Hi Hermione!</p>
                            </body>
                        </html>`;

            var docHtml = new dom().parseFromString(markup, 'text/html');

            var noPrefixPath = xpath.parse('/html/body/p[2]');

            var greetings1 = noPrefixPath.select({ node: docHtml, allowAnyNamespaceForNoPrefix: false });

            assert.strictEqual(0, greetings1.length);

            var allowAnyNamespaceOptions = { node: docHtml, allowAnyNamespaceForNoPrefix: true };

            // if allowAnyNamespaceForNoPrefix specified, allow using prefix-less node tests to match nodes with no prefix
            var greetings2 = noPrefixPath.select(allowAnyNamespaceOptions);

            assert.strictEqual(1, greetings2.length);
            assert.strictEqual('Hi Hermione!', greetings2[0].textContent);

            var allGreetings = xpath.parse('/html/body/p').select(allowAnyNamespaceOptions);

            assert.strictEqual(2, allGreetings.length);

            var nsm = { html: xhtmlNs, other: 'http://www.example.com/other' };

            var prefixPath = xpath.parse('/html:html/body/html:p');
            var optionsWithNamespaces = { node: docHtml, allowAnyNamespaceForNoPrefix: true, namespaces: nsm };

            // if the path uses prefixes, they have to match
            var greetings3 = prefixPath.select(optionsWithNamespaces);

            assert.strictEqual(2, greetings3.length);

            var badPrefixPath = xpath.parse('/html:html/other:body/html:p');

            var greetings4 = badPrefixPath.select(optionsWithNamespaces);

            assert.strictEqual(0, greetings4.length);
        });

        it('should support the isHtml option', () => {
            var markup = '<html><head></head><body><p>Hi Ron!</p><my:p xmlns:my="http://www.example.com/my">Hi Draco!</p><p>Hi Hermione!</p></body></html>';
            var docHtml = new dom().parseFromString(markup, 'text/html');

            var ns = { h: xhtmlNs };

            // allow matching on unprefixed nodes
            var greetings1 = xpath.parse('/html/body/p').select({ node: docHtml, isHtml: true });

            assert.strictEqual(2, greetings1.length);

            // allow case insensitive match
            var greetings2 = xpath.parse('/h:html/h:bOdY/h:p').select({ node: docHtml, namespaces: ns, isHtml: true });

            assert.strictEqual(2, greetings2.length);

            // non-html mode: allow select if case and namespaces match
            var greetings3 = xpath.parse('/h:html/h:body/h:p').select({ node: docHtml, namespaces: ns });

            assert.strictEqual(2, greetings3.length);

            // non-html mode: require namespaces
            var greetings4 = xpath.parse('/html/body/p').select({ node: docHtml, namespaces: ns });

            assert.strictEqual(0, greetings4.length);

            // non-html mode: require case to match
            var greetings5 = xpath.parse('/h:html/h:bOdY/h:p').select({ node: docHtml, namespaces: ns });

            assert.strictEqual(0, greetings5.length);
        });
    });

    describe('functions', () => {
        it('should provide a meaningful error for invalid functions', () => {
            var path = xpath.parse('invalidFunc()');

            assert.throws(function () {
                path.evaluateString();
            }, function (err) {
                return err.message.indexOf('invalidFunc') !== -1;
            });

            var path2 = xpath.parse('funcs:invalidFunc()');

            assert.throws(function () {
                path2.evaluateString({
                    namespaces: {
                        funcs: 'myfunctions'
                    }
                });
            }, function (err) {
                return err.message.indexOf('invalidFunc') !== -1;
            });
        });

        // https://github.com/goto100/xpath/issues/32
        it('should support the contains() function on attributes', () => {
            var doc = new dom().parseFromString("<books><book title='Harry Potter and the Philosopher\"s Stone' /><book title='Harry Potter and the Chamber of Secrets' /></books>"),
                andTheBooks = xpath.select("/books/book[contains(@title, ' ')]", doc),
                secretBooks = xpath.select("/books/book[contains(@title, 'Secrets')]", doc);

            assert.strictEqual(andTheBooks.length, 2);
            assert.strictEqual(secretBooks.length, 1);
        });

        it('should support builtin functions', () => {
            var translated = xpath.parse('translate("hello", "lhho", "yHb")').evaluateString();

            assert.strictEqual('Heyy', translated);

            var characters = new dom().parseFromString('<characters><character>Harry</character><character>Ron</character><character>Hermione</character></characters>');

            var firstTwo = xpath.parse('/characters/character[position() <= 2]').select({ node: characters });

            assert.strictEqual(2, firstTwo.length);
            assert.strictEqual('Harry', firstTwo[0].textContent);
            assert.strictEqual('Ron', firstTwo[1].textContent);

            var last = xpath.parse('/characters/character[last()]').select({ node: characters });

            assert.strictEqual(1, last.length);
            assert.strictEqual('Hermione', last[0].textContent);
        });
    });

    describe('.parse()', () => {
        it('should correctly set types on path steps', () => {
            const parsed = xpath.parse('./my:*/my:name');

            const steps = parsed.expression.expression.locationPath.steps;

            const step0 = steps[0];

            assert.strictEqual(xpath.NodeTest.NODE, step0.nodeTest.type);

            const step1 = steps[1];

            assert.strictEqual(xpath.NodeTest.NAMETESTPREFIXANY, step1.nodeTest.type);
            assert.strictEqual('my', step1.nodeTest.prefix);

            const step2 = steps[2];

            assert.strictEqual(xpath.NodeTest.NAMETESTQNAME, step2.nodeTest.type);
            assert.strictEqual('my', step2.nodeTest.prefix);
            assert.strictEqual('name', step2.nodeTest.localName);
            assert.strictEqual('my:name', step2.nodeTest.name);
        });
    })

    describe('miscellaneous', () => {
        it('should create XPathExceptions that act like Errors', () => {
            try {
                xpath.evaluate('1', null, null, null);
                assert.fail(null, null, 'evaluate() should throw exception');
            } catch (e) {
                assert.ok('code' in e, 'must have a code');
                assert.ok('stack' in e, 'must have a stack');
            }
        });

        it('should expose custom types', () => {
            assert.ok(xpath.XPath, "xpath.XPath");
            assert.ok(xpath.XPathParser, "xpath.XPathParser");
            assert.ok(xpath.XPathResult, "xpath.XPathResult");

            assert.ok(xpath.Step, "xpath.Step");
            assert.ok(xpath.NodeTest, "xpath.NodeTest");

            assert.ok(xpath.OrOperation, "xpath.OrOperation");
            assert.ok(xpath.AndOperation, "xpath.AndOperation");

            assert.ok(xpath.BarOperation, "xpath.BarOperation");

            assert.ok(xpath.NamespaceResolver, "xpath.NamespaceResolver");
            assert.ok(xpath.FunctionResolver, "xpath.FunctionResolver");
            assert.ok(xpath.VariableResolver, "xpath.VariableResolver");

            assert.ok(xpath.Utilities, "xpath.Utilities");

            assert.ok(xpath.XPathContext, "xpath.XPathContext");
            assert.ok(xpath.XNodeSet, "xpath.XNodeSet");
            assert.ok(xpath.XBoolean, "xpath.XBoolean");
            assert.ok(xpath.XString, "xpath.XString");
            assert.ok(xpath.XNumber, "xpath.XNumber");
        });

        it('should work with nodes created using DOM1 createElement()', () => {
            var doc = new dom().parseFromString('<book />');

            doc.documentElement.appendChild(doc.createElement('characters'));

            assert.ok(xpath.select1('/book/characters', doc));

            assert.strictEqual(xpath.select1('local-name(/book/characters)', doc), 'characters');
        });
    });
});