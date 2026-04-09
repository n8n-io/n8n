import { AgPromise } from '../agStack/utils/promise';
import type { AgColumn } from '../entities/agColumn';
import type { IAfterGuiAttachedParams } from '../interfaces/iAfterGuiAttachedParams';
import type { IFilterComp } from '../interfaces/iFilter';
import { Component } from '../widgets/component';
import type { FilterRequestSource } from './iColumnFilter';
/** Wraps column filters for use in menus, tool panel etc. */
export declare class FilterComp extends Component {
    private readonly column;
    readonly source: FilterRequestSource;
    private readonly enableGlobalButtonCheck?;
    private wrapper;
    private comp?;
    private afterGuiAttachedParams?;
    constructor(column: AgColumn, source: FilterRequestSource, enableGlobalButtonCheck?: boolean | undefined);
    postConstruct(): void;
    hasFilter(): boolean;
    getFilter(): AgPromise<IFilterComp> | null;
    afterInit(): AgPromise<void>;
    afterGuiAttached(params?: IAfterGuiAttachedParams): void;
    afterGuiDetached(): void;
    private createFilter;
    private onFilterDestroyed;
    destroy(): void;
}
