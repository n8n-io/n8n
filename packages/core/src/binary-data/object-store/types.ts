import type { BinaryData } from '../types';

export type MetadataResponseHeaders = Record<string, string> & {
	'content-length'?: string;
	'content-type'?: string;
	'x-amz-meta-filename'?: string;
	etag?: string;
	'last-modified'?: string;
} & BinaryData.PreWriteMetadata;
