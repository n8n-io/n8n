"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retryDeletes = exports.getRecordIds = exports.assertWithRetries = exports.waitUntilRecordsReady = exports.waitUntilReady = exports.sleep = exports.generateMetadata = exports.generateSparseValues = exports.generateValues = exports.generateRecords = exports.randomIndexName = exports.randomString = exports.globalNamespaceOne = exports.diffPrefix = exports.prefix = void 0;
const index_1 = require("../index");
const metadataMap = {
    genre: ['action', 'comedy', 'drama', 'horror', 'romance', 'thriller'],
    year: [2010, 2011, 2012, 2013, 2014, 2015],
};
const metadataKeys = Object.keys(metadataMap);
exports.prefix = 'preTest';
exports.diffPrefix = 'diff-prefix';
exports.globalNamespaceOne = 'global-ns-one';
const randomString = (length) => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters.charAt(randomIndex);
    }
    return result;
};
exports.randomString = randomString;
const randomIndexName = (testName) => {
    return `${testName}-${(0, exports.randomString)(8)}`.toLowerCase().slice(0, 45);
};
exports.randomIndexName = randomIndexName;
const generateRecords = ({ dimension = 5, quantity = 3, prefix = null, withValues = true, withSparseValues = false, withMetadata = false, }) => {
    const records = [];
    for (let i = 0; i < quantity; i++) {
        const id = prefix === null ? i.toString() : `${prefix}-${i}`;
        const values = withValues ? (0, exports.generateValues)(dimension) : undefined;
        const sparseValues = withSparseValues
            ? (0, exports.generateSparseValues)(dimension)
            : undefined;
        let vector = {
            id,
            values,
            sparseValues,
        };
        if (withMetadata) {
            vector = {
                ...vector,
                metadata: (0, exports.generateMetadata)(),
            };
        }
        records.push(vector);
    }
    return records;
};
exports.generateRecords = generateRecords;
const generateValues = (dimension) => {
    const values = [];
    for (let i = 0; i < dimension; i++) {
        values.push(parseFloat(Math.random().toFixed(5)));
    }
    return values;
};
exports.generateValues = generateValues;
const generateSparseValues = (dimension) => {
    const values = [];
    const indices = [];
    for (let j = 0; j < dimension; j++) {
        values.push(Math.random());
        indices.push(j);
    }
    return { indices, values };
};
exports.generateSparseValues = generateSparseValues;
const generateMetadata = () => {
    const metaKey = metadataKeys[Math.floor(Math.random() * metadataKeys.length)];
    const metaValue = metadataMap[metaKey][Math.floor(Math.random() * metadataMap[metaKey].length)];
    return { [metaKey]: metaValue };
};
exports.generateMetadata = generateMetadata;
const sleep = async (ms) => {
    return new Promise((resolve) => setTimeout(resolve, ms));
};
exports.sleep = sleep;
const waitUntilReady = async (indexName) => {
    const p = new index_1.Pinecone();
    const sleepIntervalMs = 1000;
    let isReady = false;
    while (!isReady) {
        try {
            const description = await p.describeIndex(indexName);
            if (description.status?.ready === true &&
                description.status?.state === 'Ready') {
                isReady = true;
            }
            else {
                await (0, exports.sleep)(sleepIntervalMs);
            }
        }
        catch (error) {
            throw new Error(`Error while waiting for index to be ready: ${error}`);
        }
    }
};
exports.waitUntilReady = waitUntilReady;
const waitUntilRecordsReady = async (index, namespace, recordIds) => {
    const sleepIntervalMs = 3000;
    let indexStats = await index.describeIndexStats();
    // if namespace is empty or the record count is not equal to the number of records we expect
    while ((indexStats.namespaces && !indexStats.namespaces[namespace]) ||
        (indexStats.namespaces &&
            indexStats.namespaces[namespace]?.recordCount !== recordIds.length)) {
        await (0, exports.sleep)(sleepIntervalMs);
        indexStats = await index.describeIndexStats();
    }
    // Sleeping one final time before returning for a bit more breathing room for freshness
    await (0, exports.sleep)(sleepIntervalMs);
    return indexStats;
};
exports.waitUntilRecordsReady = waitUntilRecordsReady;
const assertWithRetries = async (asyncFn, assertionsFn, totalMsWait = 90000, delay = 3000) => {
    let lastError = null;
    for (let msElapsed = 0; msElapsed < totalMsWait; msElapsed += delay) {
        try {
            const result = await asyncFn();
            assertionsFn(result);
            return;
        }
        catch (error) {
            lastError = error;
            await (0, exports.sleep)(delay);
        }
    }
    throw lastError;
};
exports.assertWithRetries = assertWithRetries;
const getRecordIds = async (index) => {
    const pag = await index.listPaginated();
    const ids = [];
    if (pag.vectors) {
        for (const vector of pag.vectors) {
            if (vector.id) {
                ids.push(vector.id);
            }
            else {
                console.log('No record ID found for vector:', vector);
            }
        }
    }
    if (ids.length > 0) {
        return ids;
    }
    else {
        console.log('No record IDs found in the serverless index');
    }
};
exports.getRecordIds = getRecordIds;
const retryDeletes = async (pc, indexName) => {
    try {
        await pc.deleteIndex(indexName);
    }
    catch (e) {
        console.log(`Encountered error when trying to delete index: ${e}`, '\n\nSleeping for 1s and retrying...\n\n');
        await (0, exports.sleep)(1000);
        await (0, exports.retryDeletes)(pc, indexName);
    }
};
exports.retryDeletes = retryDeletes;
//# sourceMappingURL=test-helpers.js.map