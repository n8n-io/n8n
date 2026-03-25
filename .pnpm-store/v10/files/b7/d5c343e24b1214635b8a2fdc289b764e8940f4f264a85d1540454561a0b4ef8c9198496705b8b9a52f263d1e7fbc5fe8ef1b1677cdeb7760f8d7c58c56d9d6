import type { infer as zodInfer, ZodType } from 'zod';
import { AutoParseableBetaOutputFormat } from "../../lib/beta-parser.js";
import { BetaRunnableTool, Promisable } from "../../lib/tools/BetaRunnableTool.js";
import { BetaToolResultContentBlockParam } from "../../resources/beta.js";
/**
 * Creates a JSON schema output format object from the given Zod schema.
 *
 * If this is passed to the `.parse()` method then the response message will contain a
 * `.parsed_output` property that is the result of parsing the content with the given Zod object.
 *
 * This can be passed directly to the `.create()` method but will not
 * result in any automatic parsing, you'll have to parse the response yourself.
 */
export declare function betaZodOutputFormat<ZodInput extends ZodType>(zodObject: ZodInput): AutoParseableBetaOutputFormat<zodInfer<ZodInput>>;
/**
 * Creates a tool using the provided Zod schema that can be passed
 * into the `.toolRunner()` method. The Zod schema will automatically be
 * converted into JSON Schema when passed to the API. The provided function's
 * input arguments will also be validated against the provided schema.
 */
export declare function betaZodTool<InputSchema extends ZodType>(options: {
    name: string;
    inputSchema: InputSchema;
    description: string;
    run: (args: zodInfer<InputSchema>) => Promisable<string | Array<BetaToolResultContentBlockParam>>;
}): BetaRunnableTool<zodInfer<InputSchema>>;
//# sourceMappingURL=zod.d.ts.map