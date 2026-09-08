import { jsonParse, NodeOperationError } from 'n8n-workflow';
import { bodyProperties, readBodyEnvelope } from './bodyEnvelope';
import { fetchPageForWrite, putPage } from './pageWrite';
import { optionalSpaceRLC, pageRLC, resolvePageId } from '../common';
const showOnAppend = { resource: ['page'], operation: ['append'] };
export const description = [
    {
        ...optionalSpaceRLC,
        displayOptions: { show: showOnAppend },
    },
    {
        ...pageRLC,
        description: 'The page to append the content to',
        displayOptions: { show: showOnAppend },
    },
    ...bodyProperties(['append']),
];
function parseAdfAddition(value) {
    // The envelope already guarantees valid JSON of an object
    const doc = jsonParse(value);
    if (!Array.isArray(doc.content)) {
        throw new Error('ADF JSON body must be a document with a "content" array, e.g. { "type": "doc", "version": 1, "content": [] }');
    }
    return doc;
}
export function mergeAdfDocuments(currentValue, additionDoc) {
    // Pages saved without ADF content can come back with an empty body value
    if (currentValue.trim() === '')
        return JSON.stringify(additionDoc);
    let current;
    try {
        current = JSON.parse(currentValue);
    }
    catch {
        current = null;
    }
    if (current === null || typeof current !== 'object' || Array.isArray(current)) {
        throw new Error('The current body of the page could not be read as an ADF document');
    }
    const currentDoc = current;
    const currentContent = Array.isArray(currentDoc.content) ? currentDoc.content : [];
    return JSON.stringify({
        ...currentDoc,
        content: [...currentContent, ...additionDoc.content],
    });
}
export const execute = async function (itemIndex) {
    const addition = readBodyEnvelope(this, itemIndex);
    // Validated before any API call (a By Title page lookup is one already)
    let additionDoc;
    if (addition.representation === 'atlas_doc_format') {
        try {
            additionDoc = parseAdfAddition(addition.value);
        }
        catch (error) {
            throw new NodeOperationError(this.getNode(), error.message, { itemIndex });
        }
    }
    const pageId = await resolvePageId.call(this, itemIndex);
    // The page is fetched in the input's representation; formats are never mixed
    const page = await fetchPageForWrite.call(this, itemIndex, pageId, addition.representation);
    let value;
    if (additionDoc === undefined) {
        value = page.bodyValue + addition.value;
    }
    else {
        try {
            value = mergeAdfDocuments(page.bodyValue, additionDoc);
        }
        catch (error) {
            throw new NodeOperationError(this.getNode(), error.message, { itemIndex });
        }
    }
    return await putPage.call(this, itemIndex, pageId, page, page.title, {
        representation: addition.representation,
        value,
    });
};
//# sourceMappingURL=append.operation.js.map