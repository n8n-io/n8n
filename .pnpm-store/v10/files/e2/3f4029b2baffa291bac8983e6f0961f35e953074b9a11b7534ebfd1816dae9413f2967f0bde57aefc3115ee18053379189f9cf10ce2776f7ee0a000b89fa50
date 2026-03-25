/**
 * This file demonstrates the following features of Zep:
 * 1. Checking the embedding status of a collection.
 * 2. Reading a chunk of text from a file.
 * 3. Printing the results of a search.
 * 4. Searching for documents using both text and metadata.
 * 5. MMR Search Re-ranking.
 * 6. Searching for documents similar to a given document using embeddings.
 * 7. Searching for non-existent documents.
 */

import * as fs from "fs";
import { faker } from "@faker-js/faker";
import { ZepClient } from "../../src";
import { Document } from "../../src/api/resources/document/client/Client";
import { CreateDocumentRequest, DocumentSearchResult } from "../../src/api";

/**
 * checkEmbeddingStatus checks the embedding status of a collection.
 * It waits until all documents in the collection are embedded.
 * @param client - The ZepClient instance.
 * @param collectionName - The name of the collection.
 */
async function checkEmbeddingStatus(client: ZepClient, collectionName: string): Promise<void> {
    let c = await client.document.getCollection(collectionName);

    while (c.documentEmbeddedCount != c.documentCount) {
        console.log(`Embedding status: ${c.documentEmbeddedCount}/${c.documentCount} documents embedded`);
        // Wait for 1 second
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Fetch the collection again to get the updated status
        c = await client.document.getCollection(collectionName);
    }
}

/**
 * readChunkFromFile reads a chunk of text from a file.
 * @param file - The file to read from.
 * @param chunkSize - The size of the chunk to read.
 * @returns An array of strings, each string being a chunk of text.
 */
function readChunkFromFile(file: string, chunkSize: number): string[] {
    const text = fs.readFileSync(file, "utf8");
    const chunks = naiveSplitText(text, chunkSize);
    console.log(`Splitting text into ${chunks.length} chunks of max size ${chunkSize} characters.`);
    return chunks;
}

/**
 * printResults prints the results of a search.
 * @param results - The results of the search.
 */
function printResults(results: DocumentSearchResult[]): void {
    for (const result of results) {
        console.log(`${result.content} - ${JSON.stringify(result.metadata)} -> ${result.score}\n`);
    }
}

/**
 * naiveSplitText splits a text into chunks of a maximum size.
 * It's a simple chunke that uses paragraphs and sentences as guides.
 * @param text - The text to split.
 * @param maxChunkSize - The maximum size of a chunk.
 * @returns An array of strings, each string being a chunk of text.
 */
function naiveSplitText(text: string, maxChunkSize: number): string[] {
    // Naive text splitter chunks document into chunks of maxChunkSize,
    // using paragraphs and sentences as guides.

    const chunks: string[] = [];

    // Remove extraneous whitespace
    text = text.split(/\s+/).join(" ");

    // Split into paragraphs
    let paragraphs = text.split("\n\n");

    // Clean up paragraphs
    paragraphs = paragraphs.map((p) => p.trim()).filter((p) => p.length > 0);

    for (const paragraph of paragraphs) {
        if (paragraph.length > 0 && paragraph.length <= maxChunkSize) {
            chunks.push(paragraph);
        } else {
            const sentences = paragraph.split(". ");
            let currentChunk = "";

            for (const sentence of sentences) {
                if (currentChunk.length + sentence.length > maxChunkSize) {
                    chunks.push(currentChunk);
                    currentChunk = sentence;
                } else {
                    currentChunk += (currentChunk ? ". " : "") + sentence;
                }
            }

            if (currentChunk) {
                chunks.push(currentChunk);
            }
        }
    }

    return chunks;
}

/**
 * This demonstrates how to use the ZepClient to interact with a Zep API.
 */
async function main() {
    const projectApiKey = process.env.ZEP_API_KEY;

    const file = "babbages_calculating_engine.txt";
    const maxChunkSize = 500;
    const collectionName = `babbage${faker.string.alphanumeric({ length: 8 })}`;

    console.log(`Creating collection ${collectionName}`);

    const client = new ZepClient({
        apiKey: projectApiKey,
    });
    await client.document.addCollection(collectionName, {
        description: "Babbage's Calculating Engine", // optional
        metadata: { qux: faker.string.sample() }, // optional
    });

    console.log(`Created collection ${collectionName}`);

    const chunks = readChunkFromFile(file, maxChunkSize);

    const documents: CreateDocumentRequest[] = chunks.map((chunk) => ({
        content: chunk,
        documentId: faker.system.fileName(), // optional document ID used in your system
        metadata: { foo: faker.string.sample(), bar: "qux" }, // optional metadata
    }));

    console.log(`Adding ${documents.length} documents to collection ${collectionName}`);

    const uuids = await client.document.addDocuments(collectionName, documents);

    console.log(`Added ${uuids.length} documents to collection ${collectionName}`);

    await checkEmbeddingStatus(client, collectionName);

    // Search for documents using text
    const query = "The celestial motions are nothing but a continual";
    const { results: searchResults } = await client.document.search(collectionName, {
        text: query,
        limit: 3,
    });
    console.log(`Found ${searchResults!.length} documents matching query '${query}'`);
    printResults(searchResults!);

    const mmrSearchResults = await client.document.search(collectionName, {
        text: query,
        searchType: "mmr",
        mmrLambda: 0.6,
    });
    console.log(`Found ${mmrSearchResults.results?.length} documents matching MMR query '${query}'`);
    printResults(mmrSearchResults.results!);

    // Search for documents using both text and metadata
    const metadataQuery = {
        where: { jsonpath: '$[*] ? (@.bar == "qux")' },
    };

    const { results: newSearchResults } = await client.document.search(collectionName, {
        text: query,
        metadata: metadataQuery,
        limit: 3,
    });
    console.log(`Found ${newSearchResults!.length} documents matching query '${query}' ${metadataQuery}`);
    printResults(newSearchResults!);

    // Search for non-existent documents will result in an empty array
    await client.document.search(collectionName, {
        metadata: {
            where: { jsonpath: '$[*] ? (@.this_key_does == "not exist")' },
        },
        limit: 3,
    });

    // Delete the collection
    console.log(`Deleting collection ${collectionName}`);
    await client.document.deleteCollection(collectionName);
}

main();
