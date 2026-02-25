/**
 * Modules
 */

declare module 'vue-agile';

declare module 'v3-infinite-loading' {
	import { Plugin, DefineComponent } from 'vue';

	interface InfiniteLoadingProps {
		target: string;
	}

	export interface Events {
		infinite: (state: { loaded: () => void; complete: () => void }) => void;
	}

	const InfiniteLoading: DefineComponent<InfiniteLoadingProps, {}, {}, {}, {}, {}, {}, Events> &
		Plugin;

	export default InfiniteLoading;
}

declare module 'vue-virtual-scroller' {
	import {
		type ObjectEmitsOptions,
		type PublicProps,
		type SetupContext,
		type SlotsType,
		type VNode,
	} from 'vue';

	interface RecycleScrollerProps<T> {
		items: readonly T[];
		direction?: 'vertical' | 'horizontal';
		itemSize?: number | null;
		gridItems?: number;
		itemSecondarySize?: number;
		minItemSize?: number;
		sizeField?: string;
		typeField?: string;
		keyField?: keyof T;
		pageMode?: boolean;
		prerender?: number;
		buffer?: number;
		emitUpdate?: boolean;
		updateInterval?: number;
		listClass?: string;
		itemClass?: string;
		listTag?: string;
		itemTag?: string;
	}

	interface DynamicScrollerProps<T> extends RecycleScrollerProps<T> {
		minItemSize: number;
	}

	interface RecycleScrollerEmitOptions extends ObjectEmitsOptions {
		resize: () => void;
		visible: () => void;
		hidden: () => void;
		update: (
			startIndex: number,
			endIndex: number,
			visibleStartIndex: number,
			visibleEndIndex: number,
		) => void;
		'scroll-start': () => void;
		'scroll-end': () => void;
	}

	interface RecycleScrollerSlotProps<T> {
		item: T;
		index: number;
		active: boolean;
	}

	interface RecycleScrollerSlots<T> {
		default(slotProps: RecycleScrollerSlotProps<T>): unknown;
		before(): unknown;
		empty(): unknown;
		after(): unknown;
	}

	export interface RecycleScrollerInstance {
		getScroll(): { start: number; end: number };
		scrollToItem(index: number): void;
		scrollToPosition(position: number): void;
	}

	export const RecycleScroller: <T>(
		props: RecycleScrollerProps<T> & PublicProps,
		ctx?: SetupContext<RecycleScrollerEmitOptions, SlotsType<RecycleScrollerSlots<T>>>,
		expose?: (exposed: RecycleScrollerInstance) => void,
	) => VNode & {
		__ctx?: {
			props: RecycleScrollerProps<T> & PublicProps;
			expose(exposed: RecycleScrollerInstance): void;
			slots: RecycleScrollerSlots<T>;
		};
	};

	export const DynamicScroller: <T>(
		props: DynamicScrollerProps<T> & PublicProps,
		ctx?: SetupContext<RecycleScrollerEmitOptions, SlotsType<RecycleScrollerSlots<T>>>,
		expose?: (exposed: RecycleScrollerInstance) => void,
	) => VNode & {
		__ctx?: {
			props: DynamicScrollerProps<T> & PublicProps;
			expose(exposed: RecycleScrollerInstance): void;
			slots: RecycleScrollerSlots<T>;
		};
	};

	interface DynamicScrollerItemProps<T> {
		item: T;
		active: boolean;
		sizeDependencies?: unknown[];
		watchData?: boolean;
		tag?: string;
		emitResize?: boolean;
		onResize?: () => void;
	}

	interface DynamicScrollerItemEmitOptions extends ObjectEmitsOptions {
		resize: () => void;
	}

	export const DynamicScrollerItem: <T>(
		props: DynamicScrollerItemProps<T> & PublicProps,
		ctx?: SetupContext<DynamicScrollerItemEmitOptions>,
	) => VNode;

	export function IdState(options?: { idProp?: (value: any) => unknown }): unknown;
}

declare module 'prettier/plugins/estree' {
	const plugin: PrettierPlugin;
	export = plugin;
	export default plugin;
}

declare module 'virtual:node-popularity-data' {
	const data: Array<{
		id: string;
		popularity: number;
	}>;
	export default data;
}

/**
 * wa-sqlite AccessHandlePoolVFS module declaration
 * This VFS uses the Origin Private File System (OPFS) Access Handle Pool
 * @see https://github.com/rhashimoto/wa-sqlite
 */
declare module 'wa-sqlite/src/examples/AccessHandlePoolVFS.js' {
	export class AccessHandlePoolVFS implements SQLiteVFS {
		name: string;
		mxPathName?: number;

		/** Create a new AccessHandlePoolVFS instance */
		static create(name: string, module: unknown): Promise<AccessHandlePoolVFS>;

		/** Close the VFS and release resources */
		close(): Promise<void>;

		/** Check if a file exists (synchronous access check) */
		jAccess(name: string, flags: number, pResOut: DataView): number;

		// SQLiteVFS interface methods
		isReady(): boolean | Promise<boolean>;
		xClose(fileId: number): number | Promise<number>;
		xRead(
			fileId: number,
			pData: number,
			iAmt: number,
			iOffsetLo: number,
			iOffsetHi: number,
		): number | Promise<number>;
		xWrite(
			fileId: number,
			pData: number,
			iAmt: number,
			iOffsetLo: number,
			iOffsetHi: number,
		): number | Promise<number>;
		xTruncate(fileId: number, iSizeLo: number, iSizeHi: number): number | Promise<number>;
		xSync(fileId: number, flags: number): number | Promise<number>;
		xFileSize(fileId: number, pSize64: number): number | Promise<number>;
		xLock(fileId: number, flags: number): number | Promise<number>;
		xUnlock(fileId: number, flags: number): number | Promise<number>;
		xCheckReservedLock(fileId: number, pResOut: number): number | Promise<number>;
		xFileControl(fileId: number, flags: number, pOut: number): number | Promise<number>;
		xDeviceCharacteristics(fileId: number): number | Promise<number>;
		xOpen(
			pVfs: number,
			zName: number,
			pFile: number,
			flags: number,
			pOutFlags: number,
		): number | Promise<number>;
		xDelete(pVfs: number, zName: number, syncDir: number): number | Promise<number>;
		xAccess(pVfs: number, zName: number, flags: number, pResOut: number): number | Promise<number>;
	}
}
