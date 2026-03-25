import { object, property, string, stringLiteral } from "../../../../src/core/schemas/builders";

describe("withParsedProperties", () => {
    it("Added properties included on parsed object", async () => {
        const schema = object({
            foo: property("raw_foo", string()),
            bar: stringLiteral("bar"),
        }).withParsedProperties({
            printFoo: (parsed) => () => parsed.foo,
            printHelloWorld: () => () => "Hello world",
            helloWorld: "Hello world",
        });

        const parsed = await schema.parse({ raw_foo: "value of foo", bar: "bar" });
        if (!parsed.ok) {
            throw new Error("Failed to parse");
        }
        expect(parsed.value.printFoo()).toBe("value of foo");
        expect(parsed.value.printHelloWorld()).toBe("Hello world");
        expect(parsed.value.helloWorld).toBe("Hello world");
    });

    it("Added property is removed on raw object", async () => {
        const schema = object({
            foo: property("raw_foo", string()),
            bar: stringLiteral("bar"),
        }).withParsedProperties({
            printFoo: (parsed) => () => parsed.foo,
        });

        const original = { raw_foo: "value of foo", bar: "bar" } as const;
        const parsed = await schema.parse(original);
        if (!parsed.ok) {
            throw new Error("Failed to parse()");
        }

        const raw = await schema.json(parsed.value);

        if (!raw.ok) {
            throw new Error("Failed to json()");
        }

        expect(raw.value).toEqual(original);
    });

    describe("compile", () => {
        // eslint-disable-next-line jest/expect-expect
        it("doesn't compile with non-object schema", () => {
            () =>
                object({
                    foo: string(),
                })
                    // @ts-expect-error
                    .withParsedProperties(42);
        });
    });
});
