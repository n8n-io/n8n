import { ZepClient, zepFields } from "../../src";
import { type ExtractedData } from "../../src/extractor";

async function main() {
    const projectApiKey = process.env.ZEP_API_KEY;
    const sessionId = process.env.ZEP_SESSION_ID;
    if (!sessionId) {
        console.error("Please provide a session ID using the ZEP_SESSION_ID environment variable");
        return;
    }

    const client = new ZepClient({
        apiKey: projectApiKey,
    });

    const customerSchema = {
        shoeSize: zepFields.number("The Customer's shoe size"),
        budget: zepFields.number("The Customer's budget for shoe purchase"),
        favoriteBrand: zepFields.text("The Customer's favorite shoe brand. Just one brand, please!"),
        formattedPrice: zepFields.regex("The formatted price of the shoe", /\$\d+\.\d{2}/),
    };

    type Customer = ExtractedData<typeof customerSchema>;

    const result: Customer = await client.memory.extract(sessionId, customerSchema, {
        lastN: 20,
        validate: false,
        currentDateTime: new Date().toISOString(),
    });

    console.log("Data Extraction Result", result);
}

main();
