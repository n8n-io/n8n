import { ZepClient } from "../../src";
import { ChatOpenAI } from "@langchain/openai";
import { BasePromptTemplate, ChatPromptTemplate, PromptTemplate } from "@langchain/core/prompts";
import { ZepVectorStore } from "../../src/langchain";
import { Document } from "@langchain/core/documents";
import { RunnableMap, RunnableLambda, RunnablePassthrough } from "@langchain/core/runnables";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { ConsoleCallbackHandler } from "@langchain/core/tracers/console";
import { formatDocument } from "langchain/schema/prompt_template";

const DEFAULT_DOCUMENT_PROMPT = PromptTemplate.fromTemplate("{pageContent}");

async function combineDocuments(
    docs: Document[],
    documentPrompt: BasePromptTemplate = DEFAULT_DOCUMENT_PROMPT,
    documentSeparator: string = "\n\n"
) {
    const docStrings: string[] = await Promise.all(
        docs.map((doc) => {
            return formatDocument(doc, documentPrompt);
        })
    );
    return docStrings.join(documentSeparator);
}
async function main() {
    const collectionName = process.env.ZEP_COLLECTION_NAME;
    if (!collectionName) {
        throw new Error("ZEP_COLLECTION_NAME is required");
    }
    const zepClient = new ZepClient({
        apiKey: process.env.ZEP_API_KEY,
    });

    const vectorStore = await ZepVectorStore.init({
        client: zepClient,
        collectionName: collectionName,
    });

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", `Answer the question based only on the following context: {context}`],
        ["human", "{question}"],
    ]);

    const model = new ChatOpenAI({
        temperature: 0.8,
        modelName: "gpt-3.5-turbo-1106",
    });
    const retriever = vectorStore.asRetriever();

    const setupAndRetrieval = RunnableMap.from({
        context: new RunnableLambda({
            func: (input: string) => retriever.invoke(input).then(combineDocuments),
        }),
        question: new RunnablePassthrough(),
    });
    const outputParser = new StringOutputParser();

    const chain = setupAndRetrieval
        .pipe(prompt)
        .pipe(model)
        .pipe(outputParser)
        .withConfig({
            callbacks: [new ConsoleCallbackHandler()],
        });

    const result = await chain.invoke("Project Gutenberg?");

    console.log("result", result);
}

main();
