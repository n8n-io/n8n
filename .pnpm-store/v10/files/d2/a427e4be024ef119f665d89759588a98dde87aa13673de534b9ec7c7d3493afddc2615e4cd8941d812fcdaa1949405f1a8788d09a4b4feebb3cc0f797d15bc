import type { FunctionalComponent, UnwrapNestedRefs } from 'vue';
import type { UseNamespaceReturn } from 'element-plus/es/hooks';
import type { TableV2HeaderRowCellRendererParams } from '../components';
import type { UseTableReturn } from '../use-table';
import type { TableV2Props } from '../table';
export declare type HeaderCellRendererProps = TableV2HeaderRowCellRendererParams & UnwrapNestedRefs<Pick<UseTableReturn, 'onColumnSorted'>> & Pick<TableV2Props, 'sortBy' | 'sortState' | 'headerCellProps'> & {
    ns: UseNamespaceReturn;
};
declare const HeaderCellRenderer: FunctionalComponent<HeaderCellRendererProps>;
export default HeaderCellRenderer;
export declare type HeaderCellSlotProps = HeaderCellRendererProps & {
    class: string;
};
