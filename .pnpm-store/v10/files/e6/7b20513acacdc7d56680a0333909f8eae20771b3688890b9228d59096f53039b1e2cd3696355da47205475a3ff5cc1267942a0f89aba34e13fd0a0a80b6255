"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeSkipValidation = void 0;
function maybeSkipValidation(schema) {
    return Object.assign(Object.assign({}, schema), { json: transformAndMaybeSkipValidation(schema.json), parse: transformAndMaybeSkipValidation(schema.parse) });
}
exports.maybeSkipValidation = maybeSkipValidation;
function transformAndMaybeSkipValidation(transform) {
    return (value, opts) => {
        const transformed = transform(value, opts);
        const { skipValidation = false } = opts !== null && opts !== void 0 ? opts : {};
        if (!transformed.ok && skipValidation) {
            // eslint-disable-next-line no-console
            console.warn([
                "Failed to validate.",
                ...transformed.errors.map((error) => "  - " +
                    (error.path.length > 0 ? `${error.path.join(".")}: ${error.message}` : error.message)),
            ].join("\n"));
            return {
                ok: true,
                value: value,
            };
        }
        else {
            return transformed;
        }
    };
}
