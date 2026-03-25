import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
/**
 * This class solves the 'max height' problem, where the user might want to show more data than
 * the max div height actually allows.
 */
export declare class RowContainerHeightService extends BeanStub implements NamedBean {
    beanName: "rowContainerHeight";
    private maxDivHeight;
    stretching: boolean;
    private modelHeight;
    uiContainerHeight: number | null;
    private pixelsToShave;
    divStretchOffset: number;
    private scrollY;
    private uiBodyHeight;
    private maxScrollY;
    postConstruct(): void;
    updateOffset(): void;
    private calculateOffset;
    private setUiContainerHeight;
    private clearOffset;
    private setDivStretchOffset;
    setModelHeight(modelHeight: number | null): void;
    getRealPixelPosition(modelPixel: number): number;
    private getUiBodyHeight;
    getScrollPositionForPixel(rowTop: number): number;
}
