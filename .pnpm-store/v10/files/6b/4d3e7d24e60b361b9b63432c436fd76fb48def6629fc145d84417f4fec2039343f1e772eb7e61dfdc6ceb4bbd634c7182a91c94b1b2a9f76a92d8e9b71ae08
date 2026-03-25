import type { Ref } from 'vue';
import type { WatcherPropsData } from '.';
declare function useExpand<T>(watcherData: WatcherPropsData<T>): {
    updateExpandRows: () => void;
    toggleRowExpansion: (row: T, expanded?: boolean | undefined) => void;
    setExpandRowKeys: (rowKeys: string[]) => void;
    isRowExpanded: (row: T) => boolean;
    states: {
        expandRows: Ref<T[]>;
        defaultExpandAll: Ref<boolean>;
    };
};
export default useExpand;
