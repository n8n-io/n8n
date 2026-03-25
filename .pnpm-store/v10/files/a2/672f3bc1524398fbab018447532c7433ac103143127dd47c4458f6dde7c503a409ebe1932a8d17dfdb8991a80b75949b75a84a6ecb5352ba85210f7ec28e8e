import type { Store } from '../store';
declare function useUtils<T>(store: Store<T>): {
    setCurrentRow: (row: T) => void;
    getSelectionRows: () => any;
    toggleRowSelection: (row: T, selected: boolean) => void;
    clearSelection: () => void;
    clearFilter: (columnKeys?: string[] | undefined) => void;
    toggleAllSelection: () => void;
    toggleRowExpansion: (row: T, expanded?: boolean | undefined) => void;
    clearSort: () => void;
    sort: (prop: string, order: string) => void;
};
export default useUtils;
