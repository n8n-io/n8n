import type { Ref } from 'vue';
import type { WatcherPropsData } from '.';
declare function useCurrent<T>(watcherData: WatcherPropsData<T>): {
    setCurrentRowKey: (key: string) => void;
    restoreCurrentRowKey: () => void;
    setCurrentRowByKey: (key: string) => void;
    updateCurrentRow: (_currentRow: T) => void;
    updateCurrentRowData: () => void;
    states: {
        _currentRowKey: Ref<string>;
        currentRow: Ref<T>;
    };
};
export default useCurrent;
