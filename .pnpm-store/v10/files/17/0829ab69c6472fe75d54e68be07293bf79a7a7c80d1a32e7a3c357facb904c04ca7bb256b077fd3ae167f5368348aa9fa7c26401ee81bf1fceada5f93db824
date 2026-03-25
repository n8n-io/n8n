import type { NamedBean } from '../context/bean';
import { BeanStub } from '../context/beanStub';
import type { RowNode } from '../entities/rowNode';
import type { DropIndicatorPosition, IRowDropHighlightService } from '../interfaces/IRowDropHighlightService';
export declare class RowDropHighlightService extends BeanStub implements NamedBean, IRowDropHighlightService {
    beanName: "rowDropHighlightSvc";
    private uiLevel;
    row: RowNode | null;
    position: DropIndicatorPosition;
    postConstruct(): void;
    private onModelUpdated;
    destroy(): void;
    clear(): void;
    set(row: RowNode, dropIndicatorPosition: Exclude<DropIndicatorPosition, 'none'>): void;
}
