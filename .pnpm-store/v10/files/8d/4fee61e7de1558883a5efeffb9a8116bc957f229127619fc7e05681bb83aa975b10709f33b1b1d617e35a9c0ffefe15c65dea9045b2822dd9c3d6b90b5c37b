import { ZepClient } from "../../src";
import { ZepChatMessageHistory } from "../../src/langchain";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { RunnableWithMessageHistory } from "@langchain/core/runnables";
import { ConsoleCallbackHandler } from "@langchain/core/tracers/console";
import { ChatAnthropic } from "@langchain/anthropic";

async function main() {
    const sessionId = process.env.ZEP_SESSION_ID;
    if (!sessionId) {
        throw new Error("ZEP_SESSION_ID not set");
    }

    const zepClient = new ZepClient({
        apiKey: process.env.ZEP_API_KEY,
    });

    const prompt = ChatPromptTemplate.fromMessages([
        ["system", "Answer the user's question below. Be polite and helpful:"],
        new MessagesPlaceholder("history"),
        ["human", "{question}"],
    ]);

    const chain = prompt
        .pipe(
            new ChatAnthropic({
                temperature: 0.8,
                modelName: "claude-3-sonnet-20240229",
            })
        )
        .withConfig({
            callbacks: [new ConsoleCallbackHandler()],
        });

    const chainWithHistory = new RunnableWithMessageHistory({
        runnable: chain,
        getMessageHistory: (sessionId) =>
            new ZepChatMessageHistory({
                client: zepClient,
                sessionId: sessionId,
                memoryType: "perpetual",
            }),
        inputMessagesKey: "question",
        historyMessagesKey: "history",
    });

    const result = await chainWithHistory.invoke(
        {
            question: "What did we talk about earlier?",
        },
        {
            configurable: {
                sessionId: sessionId,
            },
        }
    );

    console.log("result", result);
}

main();
