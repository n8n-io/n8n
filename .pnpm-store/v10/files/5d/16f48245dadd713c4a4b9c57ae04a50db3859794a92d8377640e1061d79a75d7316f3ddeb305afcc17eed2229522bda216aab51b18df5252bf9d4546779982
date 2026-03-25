/* eslint-disable jest/no-export */
import { Schema, SchemaOptions } from "../../../../src/core/schemas/Schema";

export function itSchemaIdentity<T>(
    schema: Schema<T, T>,
    value: T,
    { title = "functions as identity", opts }: { title?: string; opts?: SchemaOptions } = {}
): void {
    itSchema(title, schema, { raw: value, parsed: value, opts });
}

export function itSchema<Raw, Parsed>(
    title: string,
    schema: Schema<Raw, Parsed>,
    {
        raw,
        parsed,
        opts,
        only = false,
    }: {
        raw: Raw;
        parsed: Parsed;
        opts?: SchemaOptions;
        only?: boolean;
    }
): void {
    // eslint-disable-next-line jest/valid-title
    (only ? describe.only : describe)(title, () => {
        itParse("parse()", schema, { raw, parsed, opts });
        itJson("json()", schema, { raw, parsed, opts });
    });
}

export function itParse<Raw, Parsed>(
    title: string,
    schema: Schema<Raw, Parsed>,
    {
        raw,
        parsed,
        opts,
    }: {
        raw: Raw;
        parsed: Parsed;
        opts?: SchemaOptions;
    }
): void {
    // eslint-disable-next-line jest/valid-title
    it(title, () => {
        const maybeValid = schema.parse(raw, opts);
        if (!maybeValid.ok) {
            throw new Error("Failed to parse() " + JSON.stringify(maybeValid.errors, undefined, 4));
        }
        expect(maybeValid.value).toStrictEqual(parsed);
    });
}

export function itJson<Raw, Parsed>(
    title: string,
    schema: Schema<Raw, Parsed>,
    {
        raw,
        parsed,
        opts,
    }: {
        raw: Raw;
        parsed: Parsed;
        opts?: SchemaOptions;
    }
): void {
    // eslint-disable-next-line jest/valid-title
    it(title, () => {
        const maybeValid = schema.json(parsed, opts);
        if (!maybeValid.ok) {
            throw new Error("Failed to json() " + JSON.stringify(maybeValid.errors, undefined, 4));
        }
        expect(maybeValid.value).toStrictEqual(raw);
    });
}
