import { BeanStub } from '../../context/beanStub';
import type { BeanCollection } from '../../context/context';
import type { AgColumn } from '../../entities/agColumn';
import type { AgColumnGroup } from '../../entities/agColumnGroup';
export declare class SetLeftFeature extends BeanStub {
    private readonly columnOrGroup;
    private eCell;
    private colsSpanning?;
    private ariaEl;
    private actualLeft;
    constructor(columnOrGroup: AgColumn | AgColumnGroup, eCell: HTMLElement, beans: BeanCollection, colsSpanning?: AgColumn<any>[] | undefined);
    setColsSpanning(colsSpanning: AgColumn[]): void;
    getColumnOrGroup(): AgColumn | AgColumnGroup;
    postConstruct(): void;
    private setLeftFirstTime;
    private animateInLeft;
    private onLeftChanged;
    private modifyLeftForPrintLayout;
    private setLeft;
}
