import type { BeanCollection } from '../../context/context';
import type { HeaderLocation } from '../../entities/colDef';
import type { Column, ColumnGroup, ProvidedColumnGroup } from '../../interfaces/iColumn';
export declare function setColumnGroupOpened(beans: BeanCollection, group: ProvidedColumnGroup | string, newValue: boolean): void;
export declare function getColumnGroup(beans: BeanCollection, name: string, instanceId?: number): ColumnGroup | null;
export declare function getProvidedColumnGroup(beans: BeanCollection, name: string): ProvidedColumnGroup | null;
export declare function getDisplayNameForColumnGroup(beans: BeanCollection, columnGroup: ColumnGroup, location: HeaderLocation): string;
export declare function getColumnGroupState(beans: BeanCollection): {
    groupId: string;
    open: boolean;
}[];
export declare function setColumnGroupState(beans: BeanCollection, stateItems: {
    groupId: string;
    open: boolean;
}[]): void;
export declare function resetColumnGroupState(beans: BeanCollection): void;
export declare function getLeftDisplayedColumnGroups(beans: BeanCollection): (Column | ColumnGroup)[];
export declare function getCenterDisplayedColumnGroups(beans: BeanCollection): (Column | ColumnGroup)[];
export declare function getRightDisplayedColumnGroups(beans: BeanCollection): (Column | ColumnGroup)[];
export declare function getAllDisplayedColumnGroups(beans: BeanCollection): (Column | ColumnGroup)[] | null;
