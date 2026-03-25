import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { BeanCollection } from '../context/context';
import { AgColumn } from '../entities/agColumn';
import { AgColumnGroup } from '../entities/agColumnGroup';
import type { Column, ColumnGroup } from '../interfaces/iColumn';
import type { HeaderPosition } from '../interfaces/iHeaderPosition';
export type HeaderNavigationDirection = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';
/**
 * @returns a header position to focus at the level provided.
 */
export declare function getHeaderIndexToFocus(beans: BeanCollection, column: AgColumn, level: number): HeaderPosition;
export declare class HeaderNavigationService extends BeanStub implements NamedBean {
    beanName: "headerNavigation";
    private gridBodyCon;
    currentHeaderRowWithoutSpan: number;
    postConstruct(): void;
    getHeaderPositionForColumn(colKey: string | Column | ColumnGroup, floatingFilter: boolean): HeaderPosition | null;
    navigateVertically(direction: HeaderNavigationDirection, event: KeyboardEvent): boolean;
    navigateHorizontally(direction: HeaderNavigationDirection, fromTab: boolean | undefined, event: KeyboardEvent): boolean;
    private focusNextHeaderRow;
    scrollToColumn(column: AgColumn | AgColumnGroup, direction?: 'Before' | 'After' | null): void;
    private findHeader;
    private getHeaderRowType;
}
