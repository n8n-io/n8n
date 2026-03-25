import type { Bean } from '../context/bean';
import type { IRowNode } from './iRowNode';
export interface IServerSideStore extends Bean {
    getStoreBounds(): {
        topPx: number;
        heightPx: number;
    };
    /**
     * Returns the first child of the group (index 0), if the node is not loaded, returns null.
     */
    getFirstNode(): IRowNode | null;
}
export interface StoreRefreshAfterParams {
    valueColChanged: boolean;
    secondaryColChanged: boolean;
    changedColumns: string[];
}
export interface ServerSideGroupLevelState {
    /** The route that identifies this level. */
    route: string[];
    /** How many rows the level has. This includes 'loading rows'. */
    rowCount: number;
    /**
     * Infinite Scroll only.
     * Whether the last row index is know.
     * */
    lastRowIndexKnown?: boolean;
    /** Any extra info provided to the level, when data was loaded. */
    info?: any;
    /**
     *Infinite Scroll only.
     * Max blocks allowed in the infinite cache.
     */
    maxBlocksInCache?: number;
    /**
     * Infinite Scroll only.
     * The size (number of rows) of each infinite cache block.
     */
    cacheBlockSize?: number;
}
