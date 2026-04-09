import type { NamedBean } from '../../context/bean';
import { BeanStub } from '../../context/beanStub';
import type { FlashCellsEvent } from '../../events';
import type { FlashCellsParams } from '../../interfaces/iCellsParams';
import type { CellCtrl } from './cellCtrl';
export declare class CellFlashService extends BeanStub implements NamedBean {
    beanName: "cellFlashSvc";
    private nextAnimationTime;
    private nextAnimationCycle;
    private readonly animations;
    private animateCell;
    private advanceAnimations;
    onFlashCells(cellCtrl: CellCtrl, event: FlashCellsEvent): void;
    flashCell(cellCtrl: CellCtrl, delays?: Pick<FlashCellsParams, 'fadeDuration' | 'flashDuration'>): void;
    destroy(): void;
}
