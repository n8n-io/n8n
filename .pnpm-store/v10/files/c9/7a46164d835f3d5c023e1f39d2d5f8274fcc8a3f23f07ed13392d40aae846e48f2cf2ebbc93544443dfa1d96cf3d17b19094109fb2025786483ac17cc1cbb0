/* eslint-disable camelcase */
import { isFloat, toDictFilterEmpty } from "./utils";
export class Document {
    constructor({ content, uuid, created_at, updated_at, document_id, metadata, is_embedded, embedding, score, }) {
        this.content = content;
        this.uuid = uuid;
        this.created_at = created_at;
        this.updated_at = updated_at;
        this.document_id = document_id;
        this.metadata = metadata;
        this.is_embedded = is_embedded;
        this.embedding = embedding;
        this.score = score;
    }
    toDict() {
        return toDictFilterEmpty(this);
    }
}
export class DocumentCollectionModel {
    constructor({ name, uuid, created_at, updated_at, description, metadata, embedding_dimensions, is_auto_embedded = true, is_indexed, document_count, document_embedded_count, is_normalized, }) {
        this.name = name;
        this.uuid = uuid;
        this.created_at = created_at;
        this.updated_at = updated_at;
        this.description = description;
        this.metadata = metadata;
        this.embedding_dimensions = embedding_dimensions;
        this.is_auto_embedded = is_auto_embedded;
        this.is_indexed = is_indexed;
        this.document_count = document_count;
        this.document_embedded_count = document_embedded_count;
        this.is_normalized = is_normalized;
    }
    toDict() {
        return toDictFilterEmpty(this);
    }
}
export function isGetIDocument(object) {
    return ("content" in object &&
        typeof object.content === "string" &&
        "uuid" in object &&
        typeof object.uuid === "string");
}
function docsToDocsWithFloatArray(documents) {
    return documents.map((d) => {
        if (d.embedding &&
            Array.isArray(d.embedding) &&
            isFloat(d.embedding[0])) {
            const doc = Object.assign(Object.assign({}, d), { embedding: new Float32Array(d.embedding) });
            return doc;
        }
        return d;
    });
}
function docsWithFloatArrayToDocs(documents) {
    return documents.map((d) => {
        if (d.embedding && d.embedding instanceof Float32Array) {
            const doc = Object.assign(Object.assign({}, d), { embedding: Array.from(d.embedding) });
            return doc;
        }
        return d;
    });
}
export { docsToDocsWithFloatArray, docsWithFloatArrayToDocs };
