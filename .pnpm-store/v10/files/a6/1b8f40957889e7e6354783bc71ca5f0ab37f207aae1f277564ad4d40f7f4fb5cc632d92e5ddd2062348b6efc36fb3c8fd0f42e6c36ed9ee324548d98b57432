/* eslint-disable jest/no-export */
import { Schema, SchemaOptions, ValidationError } from "../../../../src/core/schemas/Schema";

export function itValidate<Raw, Parsed>(
    title: string,
    schema: Schema<Raw, Parsed>,
    input: unknown,
    errors: ValidationError[],
    opts?: SchemaOptions
): void {
    // eslint-disable-next-line jest/valid-title
    describe("parse()", () => {
        itValidateParse(title, schema, input, errors, opts);
    });
    describe("json()", () => {
        itValidateJson(title, schema, input, errors, opts);
    });
}

export function itValidateParse<Raw, Parsed>(
    title: string,
    schema: Schema<Raw, Parsed>,
    raw: unknown,
    errors: ValidationError[],
    opts?: SchemaOptions
): void {
    describe("parse", () => {
        // eslint-disable-next-line jest/valid-title
        it(title, async () => {
            const maybeValid = await schema.parse(raw, opts);
            if (maybeValid.ok) {
                throw new Error("Value passed validation");
            }
            expect(maybeValid.errors).toStrictEqual(errors);
        });
    });
}

export function itValidateJson<Raw, Parsed>(
    title: string,
    schema: Schema<Raw, Parsed>,
    parsed: unknown,
    errors: ValidationError[],
    opts?: SchemaOptions
): void {
    describe("json", () => {
        // eslint-disable-next-line jest/valid-title
        it(title, async () => {
            const maybeValid = await schema.json(parsed, opts);
            if (maybeValid.ok) {
                throw new Error("Value passed validation");
            }
            expect(maybeValid.errors).toStrictEqual(errors);
        });
    });
}
