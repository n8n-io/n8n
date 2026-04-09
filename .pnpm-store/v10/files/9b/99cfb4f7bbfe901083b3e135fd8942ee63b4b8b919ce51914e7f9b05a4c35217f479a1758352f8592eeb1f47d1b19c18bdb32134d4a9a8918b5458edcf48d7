import type { IComponent } from '../agStack/interfaces/iComponent';
import type { IDragAndDropImage } from '../agStack/interfaces/iDragAndDrop';
import type { AgGridCommon } from '../interfaces/iCommon';
import { Component } from '../widgets/component';
import type { DragAndDropIcon } from './dragAndDropService';
import type { DragSource } from './rowDragTypes';
export interface IDragAndDropImageParams<TData = any, TContext = any> extends AgGridCommon<TData, TContext> {
    dragSource: DragSource;
}
export interface IDragAndDropImageComponent<TData = any, TContext = any, TParams extends Readonly<IDragAndDropImageParams<TData, TContext>> = IDragAndDropImageParams<TData, TContext>> extends IComponent<TParams>, IDragAndDropImage {
}
export declare class DragAndDropImageComponent extends Component implements IDragAndDropImageComponent<any, any> {
    private dragSource;
    private readonly eIcon;
    private readonly eLabel;
    private readonly eGhost;
    private dropIconMap;
    constructor();
    postConstruct(): void;
    init(params: IDragAndDropImageParams): void;
    destroy(): void;
    setIcon(iconName: DragAndDropIcon | null, shake: boolean): void;
    setLabel(label: string): void;
}
