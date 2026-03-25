import type { ComputedRef } from 'vue';
interface GridWheelState {
    atXStartEdge: ComputedRef<boolean>;
    atXEndEdge: ComputedRef<boolean>;
    atYStartEdge: ComputedRef<boolean>;
    atYEndEdge: ComputedRef<boolean>;
}
declare type GridWheelHandler = (x: number, y: number) => void;
export declare const useGridWheel: ({ atXEndEdge, atXStartEdge, atYEndEdge, atYStartEdge }: GridWheelState, onWheelDelta: GridWheelHandler) => {
    hasReachedEdge: (x: number, y: number) => boolean;
    onWheel: (e: WheelEvent) => void;
};
export {};
