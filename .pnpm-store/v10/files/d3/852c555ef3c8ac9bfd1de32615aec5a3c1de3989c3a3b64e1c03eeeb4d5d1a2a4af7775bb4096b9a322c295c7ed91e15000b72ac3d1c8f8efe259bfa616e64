import type { SearchResponse } from "../../api";
import type { Metadata } from "../../types";
import { deserializeMetadatas } from "../../utils";

export interface SearchResultRow {
  id: string;
  document?: string | null;
  embedding?: number[] | null;
  metadata?: Metadata | null;
  score?: number | null;
}

const normalizePayloadArray = <T>(
  payload: Array<T[] | null> | null | undefined,
  count: number,
): Array<T[] | null> => {
  if (!payload) {
    return Array(count).fill(null);
  }
  if (payload.length === count) {
    return payload.map((item) => (item ? item.slice() : null));
  }
  const result: Array<T[] | null> = payload.map((item) => (item ? item.slice() : null));
  while (result.length < count) {
    result.push(null);
  }
  return result;
};

export class SearchResult {
  public readonly ids: string[][];
  public readonly documents: Array<Array<string | null> | null>;
  public readonly embeddings: Array<Array<Array<number> | null> | null>;
  public readonly metadatas: Array<Array<Metadata | null> | null>;
  public readonly scores: Array<Array<number | null> | null>;
  public readonly select: SearchResponse["select"];

  constructor(response: SearchResponse) {
    this.ids = response.ids;
    const payloadCount = this.ids.length;
    this.documents = normalizePayloadArray(response.documents, payloadCount);
    this.embeddings = normalizePayloadArray(response.embeddings, payloadCount);
    const rawMetadatas = normalizePayloadArray(response.metadatas, payloadCount);
    this.metadatas = rawMetadatas.map((payload) => {
      if (!payload) {
        return null;
      }
      return deserializeMetadatas(payload) ?? [];
    });
    this.scores = normalizePayloadArray(response.scores, payloadCount);
    this.select = response.select ?? [];
  }

  public rows(): SearchResultRow[][] {
    const results: SearchResultRow[][] = [];

    for (let payloadIndex = 0; payloadIndex < this.ids.length; payloadIndex += 1) {
      const ids = this.ids[payloadIndex];
      const docPayload = this.documents[payloadIndex] ?? [];
      const embedPayload = this.embeddings[payloadIndex] ?? [];
      const metaPayload = this.metadatas[payloadIndex] ?? [];
      const scorePayload = this.scores[payloadIndex] ?? [];

      const rows: SearchResultRow[] = ids.map((id, rowIndex) => {
        const row: SearchResultRow = { id };

        const document = docPayload[rowIndex];
        if (document !== undefined && document !== null) {
          row.document = document;
        }

        const embedding = embedPayload[rowIndex];
        if (embedding !== undefined && embedding !== null) {
          row.embedding = embedding;
        }

        const metadata = metaPayload[rowIndex];
        if (metadata !== undefined && metadata !== null) {
          row.metadata = metadata;
        }

        const score = scorePayload[rowIndex];
        if (score !== undefined && score !== null) {
          row.score = score;
        }

        return row;
      });

      results.push(rows);
    }

    return results;
  }
}
