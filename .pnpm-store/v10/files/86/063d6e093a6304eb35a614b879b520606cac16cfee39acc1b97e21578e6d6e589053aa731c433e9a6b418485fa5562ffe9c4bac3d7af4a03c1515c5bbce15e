import type { AgColumn } from '../entities/agColumn';
import type { IRowNode } from './iRowNode';
export interface PopupPositionParams {
    ePopup: HTMLElement;
    column?: AgColumn | null;
    rowNode?: IRowNode | null;
    nudgeX?: number;
    nudgeY?: number;
    position?: 'over' | 'under';
    alignSide?: 'left' | 'right';
    keepWithinBounds?: boolean;
    skipObserver?: boolean;
    updatePosition?: () => {
        x: number;
        y: number;
    };
    postProcessCallback?: () => void;
}
export interface PopupEventParams {
    originalMouseEvent?: MouseEvent | Touch | null;
    mouseEvent?: MouseEvent;
    touchEvent?: TouchEvent;
    keyboardEvent?: KeyboardEvent;
    forceHide?: boolean;
}
