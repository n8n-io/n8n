const defs = require('../src/defs.js');


const unicode_tests = [
    {
        description: "Convert normal ascii string",
        literal: "foo",
        byte_array: defs.luastring_of("f".charCodeAt(0), "o".charCodeAt(0), "o".charCodeAt(0))
    },
    {
        description: "Convert ascii string containing null byte",
        literal: "fo\0o",
        byte_array: defs.luastring_of("f".charCodeAt(0), "o".charCodeAt(0), 0, "o".charCodeAt(0))
    },
    {
        description: "Convert string with BMP unicode chars",
        literal: "Café",
        byte_array: defs.luastring_of(67, 97, 102, 195, 169)
    },
    {
        description: "Convert string with codepoint in PUA (U+E000 to U+F8FF)",
        literal: "",
        byte_array: defs.luastring_of(239, 163, 191)
    },
    {
        description: "Convert string with surrogate pair",
        literal: "❤️🍾",
        byte_array: defs.luastring_of(226, 157, 164, 239, 184, 143, 240, 159, 141, 190)
    },
    {
        description: "Convert string with broken surrogate pair",
        literal: "\uD800a",
        byte_array: defs.luastring_of(237, 160, 128, 97)
    },
    {
        description: "Convert string with broken surrogate pair at end of string",
        literal: "\uD823",
        byte_array: defs.luastring_of(237, 160, 163)
    }
];

describe('to_luastring', () => {
    unicode_tests.forEach((v) => {
        test(v.description, () => {
            expect(defs.to_luastring(v.literal)).toEqual(v.byte_array);
        });
    });
});

describe('to_jsstring', () => {
    unicode_tests.forEach((v) => {
        test(v.description, () => {
            expect(defs.to_jsstring(v.byte_array)).toEqual(v.literal);
        });
    });
});


describe('to_jsstring fails on invalid unicode', () => {
    test("non-utf8 char", () => {
        expect(() => defs.to_jsstring(defs.luastring_of(165)))
            .toThrowError(RangeError);
    });

    test("invalid continuation byte", () => {
        expect(() => defs.to_jsstring(defs.luastring_of(208, 60)))
            .toThrowError(RangeError);
    });

    test("invalid continuation byte", () => {
        expect(() => defs.to_jsstring(defs.luastring_of(225, 60, 145)))
            .toThrowError(RangeError);
    });

    test("invalid continuation byte", () => {
        expect(() => defs.to_jsstring(defs.luastring_of(225, 145, 60)))
            .toThrowError(RangeError);
    });

    test("invalid continuation byte", () => {
        expect(() => defs.to_jsstring(defs.luastring_of(242, 60, 145, 145)))
            .toThrowError(RangeError);
    });

    test("invalid continuation byte", () => {
        expect(() => defs.to_jsstring(defs.luastring_of(242, 145, 60, 145)))
            .toThrowError(RangeError);
    });

    test("invalid continuation byte", () => {
        expect(() => defs.to_jsstring(defs.luastring_of(242, 145, 145, 60)))
            .toThrowError(RangeError);
    });
});
