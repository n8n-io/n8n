import type { InjectionKey } from 'vue';
import type Node from './node';
interface TreeNode {
    node: Node;
    $el?: HTMLElement;
}
interface DragOptions {
    event: DragEvent;
    treeNode: TreeNode;
}
export interface DragEvents {
    treeNodeDragStart: (options: DragOptions) => void;
    treeNodeDragOver: (options: DragOptions) => void;
    treeNodeDragEnd: (event: DragEvent) => void;
}
export declare const dragEventsKey: InjectionKey<DragEvents>;
export declare function useDragNodeHandler({ props, ctx, el$, dropIndicator$, store }: {
    props: any;
    ctx: any;
    el$: any;
    dropIndicator$: any;
    store: any;
}): {
    dragState: import("vue").Ref<{
        showDropIndicator: boolean;
        draggingNode: null;
        dropNode: null;
        allowDrop: boolean;
        dropType: null;
    }>;
};
export {};
