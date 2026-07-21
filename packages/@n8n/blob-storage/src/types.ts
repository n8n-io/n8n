/** Metadata stored alongside a blob. */
export type BlobMetadata = {
	fileName?: string;
	mimeType?: string;
	fileSize: number;
};

/** Caller-supplied metadata for a blob write, before its size is known. */
export type PreWriteBlobMetadata = Omit<BlobMetadata, 'fileSize'>;
