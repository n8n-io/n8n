import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
export declare class PageBoundsService extends BeanStub implements NamedBean {
    beanName: "pageBounds";
    private topRowBounds?;
    private bottomRowBounds?;
    private pixelOffset;
    getFirstRow(): number;
    getLastRow(): number;
    getCurrentPageHeight(): number;
    getCurrentPagePixelRange(): {
        pageFirstPixel: number;
        pageLastPixel: number;
    };
    calculateBounds(topDisplayedRowIndex: number, bottomDisplayedRowIndex: number): void;
    getPixelOffset(): number;
    private calculatePixelOffset;
}
