import { AccessorFn, AccessorFnColumnDef, AccessorKeyColumnDef, DisplayColumnDef, GroupColumnDef, IdentifiedColumnDef, RowData } from './types';
import { DeepKeys, DeepValue } from './utils';
export type ColumnHelper<TData extends RowData> = {
    accessor: <TAccessor extends AccessorFn<TData> | DeepKeys<TData>, TValue extends TAccessor extends AccessorFn<TData, infer TReturn> ? TReturn : TAccessor extends DeepKeys<TData> ? DeepValue<TData, TAccessor> : never>(accessor: TAccessor, column: TAccessor extends AccessorFn<TData> ? DisplayColumnDef<TData, TValue> : IdentifiedColumnDef<TData, TValue>) => TAccessor extends AccessorFn<TData> ? AccessorFnColumnDef<TData, TValue> : AccessorKeyColumnDef<TData, TValue>;
    display: (column: DisplayColumnDef<TData>) => DisplayColumnDef<TData, unknown>;
    group: (column: GroupColumnDef<TData>) => GroupColumnDef<TData, unknown>;
};
export declare function createColumnHelper<TData extends RowData>(): ColumnHelper<TData>;
