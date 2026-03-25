import { describe, it, expect, vi } from "vitest";
import { Parser, type ParserOptions } from "./Parser.js";
import * as helper from "./__fixtures__/testHelper.js";

/**
 * Write to the parser twice, once a bytes, once as a single blob. Then check
 * that we received the expected events.
 *
 * @internal
 * @param input Data to write.
 * @param options Parser options.
 * @returns Promise that resolves if the test passes.
 */
function runTest(input: string, options?: ParserOptions) {
    let firstResult: unknown[] | undefined;

    return new Promise<void>((resolve, reject) => {
        const handler = helper.getEventCollector((error, actual) => {
            if (error) {
                return reject(error);
            }

            if (firstResult) {
                expect(actual).toEqual(firstResult);
                resolve();
            } else {
                firstResult = actual;
                expect(actual).toMatchSnapshot();
            }
        });

        const parser = new Parser(handler, options);
        // First, try to run the test via chunks
        for (let index = 0; index < input.length; index++) {
            parser.write(input.charAt(index));
        }
        parser.end();
        // Then, parse everything
        parser.parseComplete(input);
    });
}

describe("Events", () => {
    it("simple", () => runTest("<h1 class=test>adsf</h1>"));

    it("Template script tags", () =>
        runTest(
            '<p><script type="text/template"><h1>Heading1</h1></script></p>',
        ));

    it("Lowercase tags", () =>
        runTest("<H1 class=test>adsf</H1>", { lowerCaseTags: true }));

    it("CDATA", () =>
        runTest("<tag><![CDATA[ asdf ><asdf></adsf><> fo]]></tag><![CD>", {
            xmlMode: true,
        }));

    it("CDATA (inside special)", () =>
        runTest(
            "<script>/*<![CDATA[*/ asdf ><asdf></adsf><> fo/*]]>*/</script>",
        ));

    it("leading lt", () => runTest(">a>"));

    it("end slash: void element ending with />", () =>
        runTest("<hr / ><p>Hold the line."));

    it("end slash: void element ending with >", () =>
        runTest("<hr   ><p>Hold the line."));

    it("end slash: void element ending with >, xmlMode=true", () =>
        runTest("<hr   ><p>Hold the line.", { xmlMode: true }));

    it("end slash: non-void element ending with />", () =>
        runTest("<xx / ><p>Hold the line."));

    it("end slash: non-void element ending with />, xmlMode=true", () =>
        runTest("<xx / ><p>Hold the line.", { xmlMode: true }));

    it("end slash: non-void element ending with />, recognizeSelfClosing=true", () =>
        runTest("<xx / ><p>Hold the line.", { recognizeSelfClosing: true }));

    it("end slash: as part of attrib value of void element", () =>
        runTest("<img src=gif.com/123/><p>Hold the line."));

    it("end slash: as part of attrib value of non-void element", () =>
        runTest("<a href=http://test.com/>Foo</a><p>Hold the line."));

    it("Implicit close tags", () =>
        runTest(
            "<ol><li class=test><div><table style=width:100%><tr><th>TH<td colspan=2><h3>Heading</h3><tr><td><div>Div</div><td><div>Div2</div></table></div><li><div><h3>Heading 2</h3></div></li></ol><p>Para<h4>Heading 4</h4><p><ul><li>Hi<li>bye</ul>",
        ));

    it("attributes (no white space, no value, no quotes)", () =>
        runTest(
            '<button class="test0"title="test1" disabled value=test2>adsf</button>',
        ));

    it("crazy attribute", () => runTest("<p < = '' FAIL>stuff</p><a"));

    it("Scripts creating other scripts", () =>
        runTest("<p><script>var str = '<script></'+'script>';</script></p>"));

    it("Long comment ending", () =>
        runTest("<meta id='before'><!-- text ---><meta id='after'>"));

    it("Long CDATA ending", () =>
        runTest("<before /><tag><![CDATA[ text ]]]></tag><after />", {
            xmlMode: true,
        }));

    it("Implicit open p and br tags", () =>
        runTest("<div>Hallo</p>World</br></ignore></div></p></br>"));

    it("lt followed by whitespace", () => runTest("a < b"));

    it("double attribute", () => runTest("<h1 class=test class=boo></h1>"));

    it("numeric entities", () =>
        runTest("&#x61;&#x62&#99;&#100&#x66g&#x;&#x68"));

    it("legacy entities", () => runTest("&AMPel&iacutee&ampeer;s&lter&sum"));

    it("named entities", () =>
        runTest("&amp;el&lt;er&CounterClockwiseContourIntegral;foo&bar"));

    it("xml entities", () =>
        runTest("&amp;&gt;&amp&lt;&uuml;&#x61;&#x62&#99;&#100&#101", {
            xmlMode: true,
        }));

    it("entity in attribute", () =>
        runTest(
            "<a href='http://example.com/p&#x61;#x61ge?param=value&param2&param3=&lt;val&; & &'>",
        ));

    it("double brackets", () =>
        runTest("<<princess-purpose>>testing</princess-purpose>"));

    it("legacy entities fail", () => runTest("M&M"));

    it("Special special tags", () =>
        runTest(
            "<tItLe><b>foo</b><title></TiTlE><sitle><b></b></sitle><ttyle><b></b></ttyle><sCriPT></scripter</soo</sCript><STyLE></styler</STylE><sCiPt><stylee><scriptee><soo>",
        ));

    it("Empty tag name", () => runTest("< ></ >"));

    it("Not quite closed", () => runTest("<foo /bar></foo bar>"));

    it("Entities in attributes", () =>
        runTest("<foo bar=&amp; baz=\"&amp;\" boo='&amp;' noo=>"));

    it("CDATA in HTML", () => runTest("<![CDATA[ foo ]]>"));

    it("Comment edge-cases", () => runTest("<!-foo><!-- --- --><!--foo"));

    it("CDATA edge-cases", () =>
        runTest("<![CDATA><![CDATA[[]]sdaf]]><![CDATA[foo", {
            recognizeCDATA: true,
        }));

    it("Comment false ending", () => runTest("<!-- a-b-> -->"));

    it("Scripts ending with <", () => runTest("<script><</script>"));

    it("CDATA more edge-cases", () =>
        runTest("<![CDATA[foo]bar]>baz]]>", { recognizeCDATA: true }));

    it("tag names are not ASCII alpha", () => runTest("<12>text</12>"));

    it("open-implies-close case of (non-br) void close tag in non-XML mode", () =>
        runTest("<select><input></select>", { lowerCaseAttributeNames: true }));

    it("entity in attribute (#276)", () =>
        runTest(
            '<img src="?&image_uri=1&&image;=2&image=3"/>?&image_uri=1&&image;=2&image=3',
        ));

    it("entity in title (#592)", () => runTest("<title>the &quot;title&quot"));

    it("entity in title - decodeEntities=false (#592)", () =>
        runTest("<title>the &quot;title&quot;", { decodeEntities: false }));

    it("</title> in <script> (#745)", () =>
        runTest("<script>'</title>'</script>"));

    it("XML tags", () => runTest("<:foo><_bar>", { xmlMode: true }));

    it("Trailing legacy entity", () => runTest("&timesbar;&timesbar"));

    it("Trailing numeric entity", () => runTest("&#53&#53"));

    it("Multi-byte entity", () => runTest("&NotGreaterFullEqual;"));

    it("Start & end indices from domhandler", () =>
        runTest(
            "<!DOCTYPE html> <html> <title>The Title</title> <body class='foo'>Hello world <p></p></body> <!-- the comment --> </html> ",
        ));

    it("Self-closing indices (#941)", () =>
        runTest("<xml><a/><b/></xml>", { xmlMode: true }));

    it("Entity after <", () => runTest("<&amp;"));

    it("Attribute in XML (see #1350)", () =>
        runTest(
            '<Page\n    title="Hello world"\n    actionBarVisible="false"/>',
            { xmlMode: true },
        ));
});

describe("Helper", () => {
    it("should handle errors", () => {
        const eventCallback = vi.fn();
        const parser = new Parser(helper.getEventCollector(eventCallback));

        parser.end();
        parser.write("foo");

        expect(eventCallback).toHaveBeenCalledTimes(2);
        expect(eventCallback).toHaveBeenNthCalledWith(1, null, []);
        expect(eventCallback).toHaveBeenLastCalledWith(
            new Error(".write() after done!"),
        );
    });
});
