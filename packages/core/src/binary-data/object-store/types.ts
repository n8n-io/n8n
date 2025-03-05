import type { AxiosResponseHeaders, ResponseType } from 'axios';

import type { BinaryData } from '../types';

export type RawListPage = {
	listBucketResult: {
		name: string;
		prefix: string;
		keyCount: number;
		maxKeys: number;
		isTruncated: boolean;
		nextContinuationToken?: string; // only if isTruncated is true
		contents?: Item | Item[];
	};
};

type Item = {
	key: string;
	lastModified: string;
	eTag: string;
	size: number; // bytes
	storageClass: string;
};

export type ListPage = Omit<RawListPage['listBucketResult'], 'contents'> & { contents: Item[] };

export type RequestOptions = {
	qs?: Record<string, string | number>;
	headers?: Record<string, string | number>;
	body?: string | Buffer;
	responseType?: ResponseType;
};

export type MetadataResponseHeaders = AxiosResponseHeaders & {
	'content-length': string;
	'content-type'?: string;
	'x-amz-meta-filename'?: string;
} & BinaryData.PreWriteMetadata;
