import type { Ref } from 'vue';
import type { TableV2Props } from '../table';
import type { RowExpandParams, RowHeightChangedParams, RowHoverParams } from '../row';
import type { FixedDirection, KeyType } from '../types';
import type { onRowRenderedParams } from '../grid';
import type { TableGridInstance } from '../table-grid';
declare type Heights = Record<KeyType, number>;
declare type GridInstanceRef = Ref<TableGridInstance | undefined>;
declare type UseRowProps = {
    mainTableRef: GridInstanceRef;
    leftTableRef: GridInstanceRef;
    rightTableRef: GridInstanceRef;
};
export declare const useRow: (props: TableV2Props, { mainTableRef, leftTableRef, rightTableRef }: UseRowProps) => {
    hoveringRowKey: import("vue").ShallowRef<KeyType | null>;
    expandedRowKeys: Ref<KeyType[]>;
    lastRenderedRowIndex: Ref<number>;
    isDynamic: import("vue").ComputedRef<boolean>;
    isResetting: import("vue").ShallowRef<boolean>;
    rowHeights: Ref<Heights>;
    resetAfterIndex: (index: number, forceUpdate?: boolean) => void;
    onRowExpanded: ({ expanded, rowData, rowIndex, rowKey, }: RowExpandParams) => void;
    onRowHovered: ({ hovered, rowKey }: RowHoverParams) => void;
    onRowsRendered: (params: onRowRenderedParams) => void;
    onRowHeightChange: ({ rowKey, height, rowIndex }: RowHeightChangedParams, fixedDir: FixedDirection) => void;
};
export declare type UseRowReturn = ReturnType<typeof useRow>;
export {};
