"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.maybeSkipValidation = void 0;
function maybeSkipValidation(schema) {
    return Object.assign(Object.assign({}, schema), { json: transformAndMaybeSkipValidation(schema.json), parse: transformAndMaybeSkipValidation(schema.parse) });
}
exports.maybeSkipValidation = maybeSkipValidation;
function transformAndMaybeSkipValidation(transform) {
    return (value, opts) => __awaiter(this, void 0, void 0, function* () {
        const transformed = yield transform(value, opts);
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
    });
}
