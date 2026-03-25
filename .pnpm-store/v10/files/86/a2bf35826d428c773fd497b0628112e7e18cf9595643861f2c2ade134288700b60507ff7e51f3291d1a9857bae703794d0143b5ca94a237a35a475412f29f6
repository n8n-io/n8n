import type { TableHeaderProps } from '.';
import type { TableColumnCtx } from '../table-column/defaults';
declare function useEvent<T>(props: TableHeaderProps<T>, emit: any): {
    handleHeaderClick: (event: Event, column: TableColumnCtx<T>) => void;
    handleHeaderContextMenu: (event: Event, column: TableColumnCtx<T>) => void;
    handleMouseDown: (event: MouseEvent, column: TableColumnCtx<T>) => void;
    handleMouseMove: (event: MouseEvent, column: TableColumnCtx<T>) => void;
    handleMouseOut: () => void;
    handleSortClick: (event: Event, column: TableColumnCtx<T>, givenOrder: string | boolean) => void;
    handleFilterClick: (event: Event) => void;
};
export default useEvent;
