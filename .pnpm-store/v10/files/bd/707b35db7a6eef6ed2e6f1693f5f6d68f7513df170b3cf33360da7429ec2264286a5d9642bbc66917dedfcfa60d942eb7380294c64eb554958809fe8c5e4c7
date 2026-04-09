"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkSchema = checkSchema;
const _2020_1 = __importDefault(require("@redocly/ajv/dist/2020"));
const jest_diff_1 = require("jest-diff");
const colorette_1 = require("colorette");
const checks_1 = require("../../checks");
const ajv_errors_1 = require("../../../utils/ajv-errors");
const check_circular_refs_in_schema_1 = require("../../../utils/check-circular-refs-in-schema");
const description_parser_1 = require("../../description-parser");
const logger_1 = require("../../../utils/logger/logger");
const logger = logger_1.DefaultLogger.getInstance();
const ajvStrict = new _2020_1.default({
    schemaId: '$id',
    meta: true,
    allErrors: true,
    strictSchema: false,
    inlineRefs: false,
    validateSchema: false,
    discriminator: true,
    allowUnionTypes: true,
    validateFormats: false,
    logger: false,
    verbose: true,
    defaultUnevaluatedProperties: false,
});
function checkSchema({ stepCallCtx, descriptionOperation, ctx, }) {
    const { $response } = stepCallCtx;
    const checks = [];
    // if no $response, that is a common case for executing dependsOn workflow steps of workflow inside
    // the step - return checks
    if (!$response || !descriptionOperation) {
        return checks;
    }
    checkStatusCodeFromDescription({ checks, descriptionOperation, $response, ctx });
    checkContentTypeFromDescription({ checks, descriptionOperation, $response, ctx });
    checkSchemaFromDescription({ checks, descriptionOperation, $response, ctx });
    return checks;
}
function checkSchemaFromDescription({ checks, descriptionOperation, $response, ctx, }) {
    const { body: resultBody } = $response;
    const descriptionResponseByCode = descriptionOperation?.responses[String($response?.statusCode)] ||
        descriptionOperation?.responses['default'];
    const schemaFromDescription = $response?.contentType
        ? descriptionResponseByCode?.content?.[$response.contentType]?.schema
        : undefined;
    const isSchemaWithCircularRef = (0, check_circular_refs_in_schema_1.checkCircularRefsInSchema)(schemaFromDescription);
    if (isSchemaWithCircularRef) {
        logger.log(`${(0, colorette_1.yellow)('WARNING: schema have circular references')}`);
        logger.printNewLine();
    }
    if (schemaFromDescription && !isSchemaWithCircularRef) {
        try {
            checks.push({
                name: checks_1.CHECKS.SCHEMA_CHECK,
                passed: ajvStrict.validate((0, description_parser_1.removeWriteOnlyProperties)(schemaFromDescription), resultBody),
                message: ajvStrict.errors
                    ? (0, ajv_errors_1.printErrors)((0, description_parser_1.removeWriteOnlyProperties)(schemaFromDescription), resultBody, ajvStrict.errors)
                    : '',
                severity: ctx.severity['SCHEMA_CHECK'],
            });
        }
        catch (error) {
            checks.push({
                name: checks_1.CHECKS.SCHEMA_CHECK,
                passed: false,
                message: `Ajv error: ${error.message}`,
                severity: ctx.severity['SCHEMA_CHECK'],
            });
        }
    }
}
function checkStatusCodeFromDescription({ checks, descriptionOperation, $response, ctx, }) {
    const responseStatusCode = $response?.statusCode;
    const responseCodesFromDescription = Object.keys(descriptionOperation?.responses || {});
    const matchesCodeFromDescription = responseStatusCode &&
        responseCodesFromDescription
            .map((item) => item.toString())
            .includes(responseStatusCode.toString());
    const matchesDefaultResponse = responseCodesFromDescription.includes('default');
    const message = matchesCodeFromDescription
        ? (0, colorette_1.dim)(`List of valid response codes are inferred from description \n\n`) +
            (0, jest_diff_1.diffLinesUnified)(responseCodesFromDescription.map(String), [`${responseStatusCode}`])
        : ''; // NOTE: we don't show any diff if response code hits default response
    const passed = matchesCodeFromDescription || matchesDefaultResponse;
    checks.push({
        name: checks_1.CHECKS.STATUS_CODE_CHECK,
        passed,
        message,
        ...(passed && {
            condition: `$statusCode in [${responseCodesFromDescription.join(', ')}]`,
        }),
        severity: ctx.severity['STATUS_CODE_CHECK'],
    });
}
function checkContentTypeFromDescription({ checks, descriptionOperation, $response, ctx, }) {
    const statusCode = $response?.statusCode;
    const responseContentType = $response?.contentType;
    const possibleContentTypesFromDescription = Object.keys(descriptionOperation?.responses[statusCode]?.content || {});
    if (!possibleContentTypesFromDescription.length) {
        return;
    }
    if (responseContentType && !possibleContentTypesFromDescription.includes(responseContentType)) {
        checks.push({
            name: checks_1.CHECKS.CONTENT_TYPE_CHECK,
            passed: false,
            message: `Content type ${(0, colorette_1.red)(responseContentType)} for ${(0, colorette_1.blue)(statusCode)} response is not described in the schema.
       Expected content types: ${(0, colorette_1.blue)(possibleContentTypesFromDescription.join(', '))}.`,
            severity: ctx.severity['CONTENT_TYPE_CHECK'],
        });
    }
    else {
        checks.push({
            name: checks_1.CHECKS.CONTENT_TYPE_CHECK,
            passed: true,
            message: `Content type "${responseContentType}" is described in the schema.`,
            severity: ctx.severity['CONTENT_TYPE_CHECK'],
        });
    }
}
//# sourceMappingURL=schema-checker.js.map