export type LilconfigResult = null | {
	filepath: string;
	config: any;
	isEmpty?: boolean;
};
interface OptionsBase {
	cache?: boolean;
	stopDir?: string;
	searchPlaces?: string[];
	ignoreEmptySearchPlaces?: boolean;
	packageProp?: string | string[];
}
export type Transform =
	| TransformSync
	| ((result: LilconfigResult) => Promise<LilconfigResult>);
export type TransformSync = (result: LilconfigResult) => LilconfigResult;
type LoaderResult = any;
export type LoaderSync = (filepath: string, content: string) => LoaderResult;
export type Loader =
	| LoaderSync
	| ((filepath: string, content: string) => Promise<LoaderResult>);
export type Loaders = Record<string, Loader>;
export type LoadersSync = Record<string, LoaderSync>;
export interface Options extends OptionsBase {
	loaders?: Loaders;
	transform?: Transform;
}
export interface OptionsSync extends OptionsBase {
	loaders?: LoadersSync;
	transform?: TransformSync;
}
export declare const defaultLoadersSync: LoadersSync;
export declare const defaultLoaders: Loaders;
type ClearCaches = {
	clearLoadCache: () => void;
	clearSearchCache: () => void;
	clearCaches: () => void;
};
type AsyncSearcher = {
	search(searchFrom?: string): Promise<LilconfigResult>;
	load(filepath: string): Promise<LilconfigResult>;
} & ClearCaches;
export declare function lilconfig(
	name: string,
	options?: Partial<Options>,
): AsyncSearcher;
type SyncSearcher = {
	search(searchFrom?: string): LilconfigResult;
	load(filepath: string): LilconfigResult;
} & ClearCaches;
export declare function lilconfigSync(
	name: string,
	options?: OptionsSync,
): SyncSearcher;
