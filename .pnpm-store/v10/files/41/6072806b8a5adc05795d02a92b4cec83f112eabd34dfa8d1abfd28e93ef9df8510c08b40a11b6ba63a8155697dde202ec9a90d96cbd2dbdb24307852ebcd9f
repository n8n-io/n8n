import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
interface HorizontalResizeParams {
    eResizeBar: HTMLElement;
    dragStartPixels?: number;
    onResizeStart: (shiftKey: boolean) => void;
    onResizing: (delta: number) => void;
    onResizeEnd: (delta: number) => void;
}
export declare class HorizontalResizeService extends BeanStub implements NamedBean {
    beanName: "horizontalResizeSvc";
    private dragStartX;
    private resizeAmount;
    addResizeBar(params: HorizontalResizeParams): () => void;
    private onDragStart;
    private setResizeIcons;
    private onDragStop;
    private resetIcons;
    private onDragging;
}
export {};
