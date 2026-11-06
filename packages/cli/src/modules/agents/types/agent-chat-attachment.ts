/** Attachment metadata passed to an execution and stored with its transcript. */
export interface StoredAttachmentRef {
	id: string;
	fileName: string;
	mimeType: string;
	sizeBytes: number;
}
