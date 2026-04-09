import type { AgPromise } from '../../../agStack/utils/promise';
import type { IFloatingFilter } from '../../../filter/floating/floatingFilter';
import type { UserCompDetails } from '../../../interfaces/iUserCompDetails';
import type { IAbstractHeaderCellComp } from '../abstractCell/abstractHeaderCellCtrl';
export interface IHeaderFilterCellComp extends IAbstractHeaderCellComp {
    addOrRemoveBodyCssClass(cssClassName: string, on: boolean): void;
    setButtonWrapperDisplayed(displayed: boolean): void;
    setCompDetails(compDetails?: UserCompDetails | null): void;
    getFloatingFilterComp(): AgPromise<IFloatingFilter> | null;
    setWidth(width: string): void;
    setMenuIcon(icon: HTMLElement): void;
}
