export type ItemWithKey<Key extends string> = {
	[K in Key]: string;
} & {
	[key: string]: unknown;
};
