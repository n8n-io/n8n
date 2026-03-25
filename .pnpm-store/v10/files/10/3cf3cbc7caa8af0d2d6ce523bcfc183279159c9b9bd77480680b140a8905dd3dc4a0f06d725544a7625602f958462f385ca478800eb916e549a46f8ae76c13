const z = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");

const result = zodToJsonSchema(z.string());

z
  .object({
    type: z.literal("string"),
    $schema: z.string().url(),
  })
  .strict()
  .parse(result);
