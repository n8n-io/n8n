import fs from "node:fs/promises";
import { describe, it, expect } from "vitest";
import { parseFeed } from "./index.js";

const documents = new URL("__fixtures__/Documents/", import.meta.url);

describe("parseFeed", () => {
    it("(rssFeed)", async () =>
        expect(
            parseFeed(
                await fs.readFile(
                    new URL("RSS_Example.xml", documents),
                    "utf8",
                ),
            ),
        ).toMatchSnapshot());

    it("(atomFeed)", async () =>
        expect(
            parseFeed(
                await fs.readFile(
                    new URL("Atom_Example.xml", documents),
                    "utf8",
                ),
            ),
        ).toMatchSnapshot());

    it("(rdfFeed)", async () =>
        expect(
            parseFeed(
                await fs.readFile(
                    new URL("RDF_Example.xml", documents),
                    "utf8",
                ),
            ),
        ).toMatchSnapshot());
});
