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
exports.undiscriminatedUnion = void 0;
const Schema_1 = require("../../Schema");
const maybeSkipValidation_1 = require("../../utils/maybeSkipValidation");
const schema_utils_1 = require("../schema-utils");
function undiscriminatedUnion(schemas) {
    const baseSchema = {
        parse: (raw, opts) => __awaiter(this, void 0, void 0, function* () {
            return validateAndTransformUndiscriminatedUnion((schema, opts) => schema.parse(raw, opts), schemas, opts);
        }),
        json: (parsed, opts) => __awaiter(this, void 0, void 0, function* () {
            return validateAndTransformUndiscriminatedUnion((schema, opts) => schema.json(parsed, opts), schemas, opts);
        }),
        getType: () => Schema_1.SchemaType.UNDISCRIMINATED_UNION,
    };
    return Object.assign(Object.assign({}, (0, maybeSkipValidation_1.maybeSkipValidation)(baseSchema)), (0, schema_utils_1.getSchemaUtils)(baseSchema));
}
exports.undiscriminatedUnion = undiscriminatedUnion;
function validateAndTransformUndiscriminatedUnion(transform, schemas, opts) {
    return __awaiter(this, void 0, void 0, function* () {
        const errors = [];
        for (const [index, schema] of schemas.entries()) {
            const transformed = yield transform(schema, Object.assign(Object.assign({}, opts), { skipValidation: false }));
            if (transformed.ok) {
                return transformed;
            }
            else {
                for (const error of transformed.errors) {
                    errors.push({
                        path: error.path,
                        message: `[Variant ${index}] ${error.message}`,
                    });
                }
            }
        }
        return {
            ok: false,
            errors,
        };
    });
}
