/*! Based on fetch-blob. MIT License. Jimmy Wärting <https://jimmy.warting.se/opensource> & David Frank */
import type { BlobPart } from "./BlobPart";
/**
 * Creates an iterator allowing to go through blob parts and consume their content
 *
 * @param parts blob parts from Blob class
 */
export declare function consumeBlobParts(parts: BlobPart[], clone?: boolean): AsyncGenerator<Uint8Array, void>;
export declare function sliceBlob(blobParts: BlobPart[], blobSize: number, start?: number, end?: number): Generator<BlobPart, void>;
