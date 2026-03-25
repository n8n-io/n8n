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
exports.Memory = void 0;
const Client_1 = require("../api/resources/memory/client/Client");
const extractor_1 = require("../extractor");
class Memory extends Client_1.Memory {
    /**
     * Extracts data based on a given schema and session details, transforms it according to the defined Zod schemas, and returns the transformed results.
     *
     * This method parses the provided schema against defined Zod validation rules, sends a request to extract data, and then transforms
     * the extracted data according to the schema's specified ZepDataType.
     *
     * @template T - A record type where each key corresponds to a field name and its value is an object specifying `zep_type` and `description`.
     * @param {string} sessionId - The session identifier for which data needs to be extracted.
     * @param {T} schema - An object mapping each field to its corresponding ZepDataType and description. Each field should use one of the predefined methods from `zepFields` to ensure it conforms to the expected data type and structure.
     * @param {Omit<ExtractDataRequest, "modelSchema">} params - Additional parameters for the extraction request excluding the model schema.
     * @param {BaseMemory.RequestOptions} [requestOptions] - Optional additional request options.
     * @returns {Promise<Record<string, any>>} A promise that resolves to an object where each key corresponds to the original schema's keys and their parsed values from the extraction.
     *
     * @example
     * const result = await client.memory.extract(
     *     session_id,
     *     {
     *         shoeSize: zepFields.number("The Customer's shoe size"),
     *         budget: zepFields.number("The Customer's budget for shoe purchase"),
     *         favoriteBrand: zepFields.text("The Customer's favorite shoe brand. Just one brand, please!"),
     *         conversationDate: zepFields.date("The date of the conversation. Use current date if not present"),
     *         conversationDateTime: zepFields.dateTime("The date time of the conversation."),
     *         formattedPrice: zepFields.regex("The formatted price of the shoe", /\$\d+\.\d{2}/),
     *     },
     *     { lastN: 20, validate: false, currentDateTime: new Date().toISOString() }
     * );
     */
    extract(sessionId, schema, params, requestOptions) {
        return __awaiter(this, void 0, void 0, function* () {
            const validatedData = extractor_1.DataExtractorFields.parse(schema);
            const result = yield this.extractData(sessionId, Object.assign(Object.assign({}, params), { modelSchema: JSON.stringify({ properties: validatedData }) }), requestOptions);
            const transformedResult = {};
            for (const key in schema) {
                const schemaItem = extractor_1.schemas[schema[key].zep_type];
                if (!schemaItem) {
                    throw new Error(`Unsupported zep_type: ${schema[key].zep_type}`);
                }
                transformedResult[key] = schemaItem.parse(Object.assign(Object.assign({}, schema[key]), { value: result[key] })).value;
            }
            return transformedResult;
        });
    }
}
exports.Memory = Memory;
