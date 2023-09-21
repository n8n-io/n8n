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
