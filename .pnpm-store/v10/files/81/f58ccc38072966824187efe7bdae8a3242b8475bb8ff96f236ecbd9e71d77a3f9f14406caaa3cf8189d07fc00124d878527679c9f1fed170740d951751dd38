import type { CSSProperties, FunctionalComponent, RendererElement, RendererNode, VNode } from 'vue';
import type { FixedDir, SortOrder } from './constants';
export declare type Alignment = 'left' | 'center' | 'right';
export declare type FixedDirection = FixedDir;
export declare type KeyType = string | number | symbol;
/**
 * Param types
 */
export declare type CellRendererParams<T> = {
    cellData: T;
} & RowCommonParams & ColumnCommonParams<T>;
export declare type ColumnCommonParams<T> = {
    columns: Column<T>[];
    column: Column<T>;
    columnIndex: number;
};
export declare type HeaderCellRendererParams<T> = {
    headerIndex: number;
} & ColumnCommonParams<T>;
export declare type RowCommonParams = {
    rowData: any;
    rowIndex: number;
};
export declare type ClassNameGetterParams<T> = {
    cellData: T;
} & RowCommonParams & ColumnCommonParams<T>;
export declare type DataGetterParams<T> = {
    columns: Column<T>[];
    column: Column<T>;
    columnIndex: number;
} & RowCommonParams;
export declare type DataGetter<T> = (params: DataGetterParams<T>) => T;
export declare type ClassNameGetter<T> = (params: ClassNameGetterParams<T>) => string;
export declare type HeaderClassGetter<T> = (params: ColumnCommonParams<T> & {
    headerIndex: number;
}) => string;
/**
 * Renderer/Getter types
 */
export declare type CellRenderer<T> = (params: CellRendererParams<T>) => VNode;
export declare type HeaderCellRenderer<T> = (params: HeaderCellRendererParams<T>) => VNode;
export declare type Column<T = any> = {
    /**
     * Attributes
     */
    align?: Alignment;
    class?: string | ClassNameGetter<T>;
    dataKey?: KeyType;
    fixed?: true | FixedDirection;
    flexGrow?: CSSProperties['flexGrow'];
    flexShrink?: CSSProperties['flexShrink'];
    title?: string;
    hidden?: boolean;
    headerClass?: HeaderClassGetter<T> | string;
    maxWidth?: number;
    minWidth?: number;
    style?: CSSProperties;
    sortable?: boolean;
    width: number;
    /**
     * Renderers
     */
    cellRenderer?: CellRenderer<T>;
    headerCellRenderer?: HeaderCellRenderer<T>;
    /**
     * Extendable sections
     */
    [key: string]: any;
};
export declare type Columns<T> = Column<T>[];
export declare type AnyColumns = Columns<any>;
export declare type SortBy = {
    key: KeyType;
    order: SortOrder;
};
export declare type SortState = {
    [key: KeyType]: SortOrder;
};
export declare type CustomizedCellsType = VNode<RendererNode, RendererElement, {
    [key: string]: any;
}>[];
export declare type DefaultCellsType = VNode<RendererNode, RendererElement, {
    [key: string]: any;
}>[][];
export declare type ColumnCellsType = DefaultCellsType | CustomizedCellsType;
export declare type TableV2CustomizedHeaderSlotParam<T = any> = {
    cells: VNode[];
    columns: Columns<T>;
    headerIndex: number;
};
export declare type SimpleFunctionalComponentProps<T extends object> = {
    class?: JSX.IntrinsicAttributes['class'];
    style?: CSSProperties;
} & T;
export declare type SimpleFunctionalComponent<E extends object = {
    [key: string]: any;
}> = FunctionalComponent<SimpleFunctionalComponentProps<E>>;
