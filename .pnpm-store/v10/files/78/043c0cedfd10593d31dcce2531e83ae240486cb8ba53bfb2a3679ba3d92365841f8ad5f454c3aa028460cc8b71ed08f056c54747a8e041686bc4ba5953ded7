import { Memory as BaseMemory } from "../api/resources/memory/client/Client";
import { ExtractDataRequest } from "../api";
import { schemas, SupportedZepField } from "../extractor";
export declare class Memory extends BaseMemory {
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
    extract<T extends Record<string, SupportedZepField>>(sessionId: string, schema: T, params: Omit<ExtractDataRequest, "modelSchema">, requestOptions?: BaseMemory.RequestOptions): Promise<{
        [K in keyof T]: ReturnType<typeof schemas[T[K]["zep_type"]]["parse"]>["value"];
    }>;
}
