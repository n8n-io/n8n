import { v4 as uuidv4 } from "uuid";
import { CreateUserRequest, Message, NotFoundError } from "../../src/api";
import { ZepClient, zepFields } from "../../src";

// @ts-ignore
import { history } from "./chat_shoe_store_history";

function sleep(ms: number) {
    const date = Date.now();
    let currentDate = 0;
    do {
        currentDate = Date.now();
    } while (currentDate - date < ms);
}

async function main() {
    const projectApiKey = process.env.ZEP_API_KEY;

    const client = new ZepClient({
        apiKey: projectApiKey,
    });

    // Create a user
    const userId = uuidv4();
    const userRequest: CreateUserRequest = {
        userId: `amy${userId}`,
        metadata: { role: "admin" },
        email: "amy@acme.com",
        firstName: "Amy",
        lastName: "Wu",
    };
    const user = await client.user.add(userRequest);
    console.debug("Created user ", user);

    // Example session ID
    const sessionID = uuidv4();

    // Add session associated with the above user
    try {
        await client.memory.addSession({
            sessionId: sessionID,
            metadata: { foo: "bar" },
            userId: user.userId,
        });
        console.debug("Adding new session ", sessionID);
    } catch (error) {
        console.debug("Got error:", error);
    }

    // Get session
    try {
        const session = await client.memory.getSession(sessionID);
        console.debug("Retrieved session ", session);
    } catch (error) {
        console.debug("Got error:", error);
    }

    // Add memory. We could do this in a batch, but we'll do it one by one rather to
    // ensure that summaries and other artifacts are generated correctly.
    try {
        for (const { role, role_type, content } of history) {
            await client.memory.add(sessionID, {
                messages: [{ role, roleType: role_type, content }],
            });
        }
        console.debug("Added new memory for session ", sessionID);
    } catch (error) {
        console.debug("Got error:", error);
    }

    try {
        // Synthesize a question from most recent messages.
        // Useful for RAG apps.
        // This is faster than using an LLM chain.
        console.debug("\n---Synthesize a question from most recent messages");
        const { question } = await client.memory.synthesizeQuestion(sessionID, { lastNMessages: 3 });
        console.debug(`Question: ${question}`);
    } catch (error) {
        console.debug("Got error:", error);
    }

    try {
        // Classify the session.
        // Useful for semantic routing, filtering, and many other use cases.
        console.debug("\n---Classify the session");
        const classes = ["low spender <$50", "medium spender >=$50, <$100", "high spender >=$100", "unknown"];
        const classification = await client.memory.classifySession(sessionID, {
            name: "spender_category",
            classes,
            persist: true,
        });
        console.debug(`${classification.class} Classification Result: ${classification.name}`);
    } catch (error) {
        console.debug("Got error:", error);
    }

    console.log("Sleeping for 5 seconds to let background tasks complete...");
    sleep(5000); // Sleep for 5 seconds
    console.log("Done sleeping!");

    // Get newly added memory
    try {
        console.debug("Getting memory for newly added memory with sessionid ", sessionID);
        const memory = await client.memory.get(sessionID);
        console.log("Memory: ", JSON.stringify(memory));
        if (memory?.messages) {
            memory.messages.forEach((message) => {
                console.debug(JSON.stringify(message));
            });
        }
    } catch (error) {
        if (error instanceof NotFoundError) {
            console.error("Session not found:", error.message);
        } else {
            console.error("Got error:", error);
        }
    }

    // get session messages
    let sessionMessages: Message[] = [];
    try {
        const sessionMessagesResult = await client.memory.getSessionMessages(sessionID, { limit: 10, cursor: 1 });
        console.debug("Session messages: ", JSON.stringify(sessionMessagesResult));
        if (sessionMessagesResult?.messages) {
            sessionMessages = sessionMessagesResult.messages;
        }
    } catch (error) {
        if (error instanceof NotFoundError) {
            console.error("Session not found:", error.message);
        } else {
            console.error("Got error:", error);
        }
    }

    const firstSessionsMessageId = sessionMessages[0].uuid;

    // Update session message metadata
    try {
        const metadata = { metadata: { foo: "bar" } };
        if (firstSessionsMessageId) {
            const updatedMessage = await client.memory.updateMessageMetadata(sessionID, firstSessionsMessageId, {
                metadata: metadata,
            });
            console.debug("Updated message: ", JSON.stringify(updatedMessage));
        }
    } catch (error) {
        if (error instanceof NotFoundError) {
            console.error("Session not found:", error.message);
        } else {
            console.error("Got error:", error);
        }
    }

    // Get session message

    try {
        if (firstSessionsMessageId) {
            const message = await client.memory.getSessionMessage(sessionID, firstSessionsMessageId);
            console.debug("Session message: ", JSON.stringify(message));
        }
    } catch (error) {
        if (error instanceof NotFoundError) {
            console.error("Session not found:", error.message);
        } else {
            console.error("Got error:", error);
        }
    }

    // Search messages in memory
    try {
        const searchText = "Name some books that are about dystopian futures.";
        console.debug("Searching memory...", searchText);

        const { results: searchResults } = await client.memory.searchSessions({
            sessionIds: [sessionID],
            recordFilter: {
                where: {
                    and: [
                        {
                            jsonpath: '$.system.entities[*] ? (@.Label == "WORK_OF_ART")',
                        },
                        {
                            jsonpath: '$.system.entities[*] ? (@.Name like_regex "^parable*" flag "i")',
                        },
                    ],
                },
            },
            text: searchText,
            searchScope: "messages",
        });

        searchResults?.forEach((searchResult) => {
            console.debug("Search Result: ", JSON.stringify(searchResult.message));
            console.debug("Search Result Score: ", JSON.stringify(searchResult.score));
        });
    } catch (error) {
        if (error instanceof NotFoundError) {
            console.error("Session not found:", error.message);
        } else {
            console.error("Got error:", error);
        }
    }

    // Search messages in memory with MMR and lambda=0.6
    try {
        const searchText = "Name some books that are about dystopian futures.";
        console.debug("Searching memory with MMR...", searchText);

        const { results: searchResults } = await client.memory.searchSessions({
            sessionIds: [sessionID],
            text: searchText,
            searchType: "mmr",
            mmrLambda: 0.6,
            limit: 3,
            searchScope: "messages",
        });

        searchResults?.forEach((searchResult) => {
            console.debug("Search Result: ", JSON.stringify(searchResult.message));
            console.debug("Search Result Score: ", JSON.stringify(searchResult.score));
        });
    } catch (error) {
        if (error instanceof NotFoundError) {
            console.error("Session not found:", error.message);
        } else {
            console.error("Got error:", error);
        }
    }

    // Search summaries in memory with MMR and lambda=0.6
    try {
        const searchText = "Name some books that are about dystopian futures.";
        console.debug("Searching summaries with MMR...", searchText);

        const { results: searchResults } = await client.memory.searchSessions({
            sessionIds: [sessionID],
            text: searchText,
            searchScope: "summary",
            searchType: "mmr",
            mmrLambda: 0.6,
            limit: 3,
        });

        searchResults?.forEach((searchResult) => {
            console.debug("Search Result: ", JSON.stringify(searchResult.summary));
            console.debug("Search Result Score: ", JSON.stringify(searchResult.score));
        });
    } catch (error) {
        if (error instanceof NotFoundError) {
            console.error("Session not found:", error.message);
        } else {
            console.error("Got error:", error);
        }
    }

    try {
        const result = await client.memory.extract(
            sessionID,
            {
                shoeSize: zepFields.number("The Customer's shoe size"),
                budget: zepFields.number("The Customer's budget for shoe purchase"),
                favoriteBrand: zepFields.text("The Customer's favorite shoe brand. Just one brand, please!"),
                formattedPrice: zepFields.regex("The formatted price of the shoe", /\$\d+\.\d{2}/),
            },
            { lastN: 20, validate: false, currentDateTime: new Date().toISOString() }
        );
        console.log("Data Extraction Result", result);
    } catch (error) {
        console.debug("Got error:", error);
    }

    // End session - this will trigger summarization and other background tasks on the completed session
    try {
        await client.memory.endSession(sessionID);
        console.debug("Ended session: ", sessionID);
    } catch (error) {
        console.debug("Got error:", error);
    }
}

main();
