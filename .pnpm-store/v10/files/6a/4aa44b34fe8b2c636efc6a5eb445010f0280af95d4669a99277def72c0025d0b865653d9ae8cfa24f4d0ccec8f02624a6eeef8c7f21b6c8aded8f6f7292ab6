import type { AgColumn } from '../entities/agColumn';
import type { RowNode } from '../entities/rowNode';
import { Component } from '../widgets/component';
export declare class RowDragComp extends Component {
    private readonly cellValueFn;
    private readonly rowNode;
    private readonly column?;
    private readonly customGui?;
    private readonly dragStartPixels?;
    private readonly suppressVisibilityChange?;
    private dragSource;
    private mouseDownListener;
    constructor(cellValueFn: () => string, rowNode: RowNode, column?: AgColumn<any> | undefined, customGui?: HTMLElement | undefined, dragStartPixels?: number | undefined, suppressVisibilityChange?: boolean | undefined);
    isCustomGui(): boolean;
    postConstruct(): void;
    setDragElement(dragElement: HTMLElement, dragStartPixels?: number): void;
    private getSelectedNodes;
    private getDragItem;
    private getRowDragText;
    private addDragSource;
    destroy(): void;
    private removeDragSource;
    private removeMouseDownListener;
}
