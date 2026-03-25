import { createReadStream } from "node:fs";
import * as fs from "node:fs/promises";
import * as stream from "node:stream";
import { describe, it, expect, vi } from "vitest";
import type { Handler, ParserOptions } from "./Parser.js";
import { WritableStream } from "./WritableStream.js";
import * as helper from "./__fixtures__/testHelper.js";

describe("WritableStream", () => {
    it("should decode fragmented unicode characters", () => {
        const ontext = vi.fn();
        const stream = new WritableStream({ ontext });

        stream.write(Buffer.from([0xe2, 0x82]));
        stream.write(Buffer.from([0xac]));
        stream.write("");
        stream.end();

        expect(ontext).toHaveBeenCalledWith("€");
    });

    it("Basic html", () => testStream("Basic.html"));
    it("Attributes", () => testStream("Attributes.html"));
    it("SVG", () => testStream("Svg.html"));
    it("RSS feed", () => testStream("RSS_Example.xml", { xmlMode: true }));
    it("Atom feed", () => testStream("Atom_Example.xml", { xmlMode: true }));
    it("RDF feed", () => testStream("RDF_Example.xml", { xmlMode: true }));
});

function getPromiseEventCollector(): [
    handler: Partial<Handler>,
    promise: Promise<unknown>,
] {
    let handler: Partial<Handler> | undefined;
    const promise = new Promise<unknown>((resolve, reject) => {
        handler = helper.getEventCollector((error, events) => {
            if (error) {
                reject(error);
            } else {
                resolve(events);
            }
        });
    });

    return [handler!, promise];
}

// TODO[engine:node@>=16]: Use promise version of `stream.finished` instead.
function finished(input: Parameters<typeof stream.finished>[0]): Promise<void> {
    return new Promise((resolve, reject) => {
        stream.finished(input, (error) => (error ? reject(error) : resolve()));
    });
}

async function testStream(
    file: string,
    options?: ParserOptions,
): Promise<void> {
    const filePath = new URL(`__fixtures__/Documents/${file}`, import.meta.url);

    const [streamHandler, eventsPromise] = getPromiseEventCollector();

    const fsStream = createReadStream(filePath).pipe(
        new WritableStream(streamHandler, options),
    );

    await finished(fsStream);

    const events = await eventsPromise;

    expect(events).toMatchSnapshot();

    const [singlePassHandler, singlePassPromise] = getPromiseEventCollector();

    const singlePassStream = new WritableStream(singlePassHandler, options).end(
        await fs.readFile(filePath),
    );

    await finished(singlePassStream);

    expect(await singlePassPromise).toStrictEqual(events);
}
