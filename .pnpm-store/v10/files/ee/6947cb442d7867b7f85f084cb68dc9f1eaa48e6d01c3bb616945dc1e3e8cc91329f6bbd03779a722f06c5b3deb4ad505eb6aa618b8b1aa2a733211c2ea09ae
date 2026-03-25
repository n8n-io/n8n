import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { AgColumn } from '../entities/agColumn';
import type { AgColumnGroup } from '../entities/agColumnGroup';
export declare class AutoWidthCalculator extends BeanStub implements NamedBean {
    beanName: "autoWidthCalc";
    private centerRowContainerCtrl;
    postConstruct(): void;
    getPreferredWidthForColumn(column: AgColumn, skipHeader?: boolean): number;
    getPreferredWidthForColumnGroup(columnGroup: AgColumnGroup): number;
    getPreferredWidthForElements(elements: HTMLElement[], extraPadding?: number): number;
    private getHeaderCellForColumn;
    private cloneItemIntoDummy;
}
