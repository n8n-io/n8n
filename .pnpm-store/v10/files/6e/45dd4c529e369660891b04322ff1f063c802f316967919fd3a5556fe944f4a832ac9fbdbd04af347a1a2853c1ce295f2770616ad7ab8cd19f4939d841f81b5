'use strict';

const { Buffer } = require('node:buffer');
const test = require('node:test');
const assert = require('node:assert').strict;

const libqp = require('../lib/libqp');

test('Encoding tests', async t => {
    await t.test('simple string', async () => {
        const encoded = libqp.encode('tere jõgeva');

        assert.strictEqual(encoded, 'tere j=C3=B5geva');
    });

    await t.test('stream', async () => {
        let input = 'tere jõgeva';
        let encoder = new libqp.Encoder();

        let encoded = await new Promise((resolve, reject) => {
            let chunks = [];
            encoder.on('readable', () => {
                let chunk;

                while ((chunk = encoder.read()) !== null) {
                    chunks.push(chunk);
                }
            });
            encoder.on('end', () => {
                resolve(Buffer.concat(chunks).toString());
            });
            encoder.on('Error', err => {
                reject(err);
            });

            encoder.end(Buffer.from(input));
        });

        assert.strictEqual(encoded, 'tere j=C3=B5geva');
    });
});

test('Decoding tests', async t => {
    // Example taken from RFC2045 section 6.7
    const encoded =
        "Now's the time =\r\n" +
        "for all folk to come=\r\n" +
        " to the aid of their country."
    const expectedDecoded =
        "Now's the time for all folk to come to the aid of their country."

    await t.test('simple string', async () => {
        const decoded = libqp.decode(encoded).toString();
        assert.strictEqual(decoded, expectedDecoded);
    });

    await t.test('stream', async () => {
        const decoder = new libqp.Decoder();

        const decoded = await new Promise((resolve, reject) => {
            const chunks = [];
            decoder.on('readable', () => {
                let chunk;

                while ((chunk = decoder.read()) !== null) {
                    chunks.push(chunk);
                }
            });
            decoder.on('end', () => {
                resolve(Buffer.concat(chunks).toString());
            });
            decoder.on('Error', err => {
                reject(err);
            });

            decoder.end(Buffer.from(encoded));
        });

        assert.strictEqual(decoded, expectedDecoded);
    });

    await t.test('stream, multiple chunks', async () => {
        const encodedChunk1Length = 3;
        const encodedChunk1 = encoded.substring(0, encodedChunk1Length)
        const encodedChunk2 = encoded.substring(encodedChunk1Length)

        const decoder = new libqp.Decoder();

        const decoded = await new Promise((resolve, reject) => {
            const chunks = [];
            decoder.on('readable', () => {
                let chunk;

                while ((chunk = decoder.read()) !== null) {
                    chunks.push(chunk);
                }
            });
            decoder.on('end', () => {
                resolve(Buffer.concat(chunks).toString());
            });
            decoder.on('Error', err => {
                reject(err);
            });

            decoder.write(Buffer.from(encodedChunk1));
            decoder.end(Buffer.from(encodedChunk2));
        });

        assert.strictEqual(decoded, expectedDecoded);
    });

    await t.test('stream, space at end of chunk', async () => {
        const encodedChunk1Length = encoded.indexOf(' ') + 1;
        const encodedChunk1 = encoded.substring(0, encodedChunk1Length)
        const encodedChunk2 = encoded.substring(encodedChunk1Length)

        const decoder = new libqp.Decoder();

        const decoded = await new Promise((resolve, reject) => {
            const chunks = [];
            decoder.on('readable', () => {
                let chunk;

                while ((chunk = decoder.read()) !== null) {
                    chunks.push(chunk);
                }
            });
            decoder.on('end', () => {
                resolve(Buffer.concat(chunks).toString());
            });
            decoder.on('Error', err => {
                reject(err);
            });

            decoder.write(Buffer.from(encodedChunk1));
            decoder.end(Buffer.from(encodedChunk2));
        });

        assert.strictEqual(decoded, expectedDecoded);
    });

    await t.test('stream, soft line break equals sign at end of chunk', async () => {
        const encodedChunk1Length = encoded.indexOf('=') + 1;
        const encodedChunk1 = encoded.substring(0, encodedChunk1Length)
        const encodedChunk2 = encoded.substring(encodedChunk1Length)

        const decoder = new libqp.Decoder();

        const decoded = await new Promise((resolve, reject) => {
            const chunks = [];
            decoder.on('readable', () => {
                let chunk;

                while ((chunk = decoder.read()) !== null) {
                    chunks.push(chunk);
                }
            });
            decoder.on('end', () => {
                resolve(Buffer.concat(chunks).toString());
            });
            decoder.on('Error', err => {
                reject(err);
            });

            decoder.write(Buffer.from(encodedChunk1));
            decoder.end(Buffer.from(encodedChunk2));
        });

        assert.strictEqual(decoded, expectedDecoded);
    });

    await t.test('stream, CR at end of chunk', async () => {
        const encodedChunk1Length = encoded.indexOf('\r') + 1;
        const encodedChunk1 = encoded.substring(0, encodedChunk1Length)
        const encodedChunk2 = encoded.substring(encodedChunk1Length)

        const decoder = new libqp.Decoder();

        const decoded = await new Promise((resolve, reject) => {
            const chunks = [];
            decoder.on('readable', () => {
                let chunk;

                while ((chunk = decoder.read()) !== null) {
                    chunks.push(chunk);
                }
            });
            decoder.on('end', () => {
                resolve(Buffer.concat(chunks).toString());
            });
            decoder.on('Error', err => {
                reject(err);
            });

            decoder.write(Buffer.from(encodedChunk1));
            decoder.end(Buffer.from(encodedChunk2));
        });

        assert.strictEqual(decoded, expectedDecoded);
    });
});
