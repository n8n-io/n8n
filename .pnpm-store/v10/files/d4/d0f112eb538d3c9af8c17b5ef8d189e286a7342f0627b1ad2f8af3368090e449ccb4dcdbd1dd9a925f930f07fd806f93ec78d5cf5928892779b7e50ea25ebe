import type { NamedBean } from '../../context/bean';
import { BeanStub } from '../../context/beanStub';
import type { AgColumn } from '../../entities/agColumn';
import { AgColumnGroup } from '../../entities/agColumnGroup';
import { AgProvidedColumnGroup } from '../../entities/agProvidedColumnGroup';
import type { ColGroupDef } from '../../entities/colDef';
import type { ColumnEventType } from '../../events';
import type { ColumnPinnedType } from '../../interfaces/iColumn';
import type { IColumnKeyCreator } from '../columnKeyCreator';
import type { GroupInstanceIdCreator } from '../groupInstanceIdCreator';
export interface CreateGroupsParams {
    columns: AgColumn[];
    idCreator: GroupInstanceIdCreator;
    pinned: ColumnPinnedType;
    oldDisplayedGroups?: (AgColumn | AgColumnGroup)[];
    isStandaloneStructure?: boolean;
}
export declare class ColumnGroupService extends BeanStub implements NamedBean {
    beanName: "colGroupSvc";
    getColumnGroupState(): {
        groupId: string;
        open: boolean;
    }[];
    resetColumnGroupState(source: ColumnEventType): void;
    setColumnGroupState(stateItems: {
        groupId: string;
        open: boolean | undefined;
    }[], source: ColumnEventType): void;
    setColumnGroupOpened(key: AgProvidedColumnGroup | string | null, newValue: boolean, source: ColumnEventType): void;
    getProvidedColGroup(key: string): AgProvidedColumnGroup | null;
    getGroupAtDirection(columnGroup: AgColumnGroup, direction: 'After' | 'Before'): AgColumnGroup | null;
    getColGroupAtLevel(column: AgColumn, level: number): AgColumnGroup | null;
    updateOpenClosedVisibility(): void;
    getColumnGroup(colId: string | AgColumnGroup, partId?: number): AgColumnGroup | null;
    createColumnGroups(params: CreateGroupsParams): (AgColumn | AgColumnGroup)[];
    createProvidedColumnGroup(primaryColumns: boolean, colGroupDef: ColGroupDef, level: number, existingColumns: AgColumn[], columnKeyCreator: IColumnKeyCreator, existingGroups: AgProvidedColumnGroup[], source: ColumnEventType): AgProvidedColumnGroup;
    balanceColumnTree(unbalancedTree: (AgColumn | AgProvidedColumnGroup)[], currentDepth: number, columnDepth: number, columnKeyCreator: IColumnKeyCreator): (AgColumn | AgProvidedColumnGroup)[];
    findDepth(balancedColumnTree: (AgColumn | AgProvidedColumnGroup)[]): number;
    findMaxDepth(treeChildren: (AgColumn | AgProvidedColumnGroup)[], depth: number): number;
    /**
     * Inserts dummy group columns in the hierarchy above auto-generated columns
     * in order to ensure auto-generated columns are leaf nodes (and therefore are
     * displayed correctly)
     */
    balanceTreeForAutoCols(autoCols: AgColumn[], depth: number): (AgColumn | AgProvidedColumnGroup)[];
    private findExistingGroup;
    private createColumnGroup;
    private mapOldGroupsById;
    private setupParentsIntoCols;
}
