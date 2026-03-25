import { describe, it, expect } from "vitest";
import {
    parseDocument,
    parseDOM,
    createDocumentStream,
    createDomStream,
    DomHandler,
    DefaultHandler,
    type Parser,
} from "./index.js";
import { Element } from "domhandler";

// Add an `attributes` prop to the Element for now, to make it possible for Jest to render DOM nodes.
Object.defineProperty(Element.prototype, "attributes", {
    get() {
        return Object.keys(this.attribs).map((name) => ({
            name,
            value: this.attribs[name],
        }));
    },
    configurable: true,
    enumerable: false,
});

describe("Index", () => {
    it("parseDocument", () => {
        const dom = parseDocument("<a foo><b><c><?foo>Yay!");
        expect(dom).toMatchSnapshot();
    });

    it("parseDOM", () => {
        const dom = parseDOM("<a foo><b><c><?foo>Yay!");
        expect(dom).toMatchSnapshot();
    });

    it("createDocumentStream", () => {
        let documentStream!: Parser;

        const documentPromise = new Promise(
            (resolve, reject) =>
                (documentStream = createDocumentStream((error, dom) =>
                    error ? reject(error) : resolve(dom),
                )),
        );

        for (const c of "&amp;This is text<!-- and comments --><tags>") {
            documentStream.write(c);
        }

        documentStream.end();

        return expect(documentPromise).resolves.toMatchSnapshot();
    });

    it("createDomStream", () => {
        let domStream!: Parser;

        const domPromise = new Promise(
            (resolve, reject) =>
                (domStream = createDomStream((error, dom) =>
                    error ? reject(error) : resolve(dom),
                )),
        );

        for (const c of "&amp;This is text<!-- and comments --><tags>") {
            domStream.write(c);
        }

        domStream.end();

        return expect(domPromise).resolves.toMatchSnapshot();
    });

    describe("API", () => {
        it("should export the appropriate APIs", () => {
            expect(DomHandler).toEqual(DefaultHandler);
        });
    });
});
