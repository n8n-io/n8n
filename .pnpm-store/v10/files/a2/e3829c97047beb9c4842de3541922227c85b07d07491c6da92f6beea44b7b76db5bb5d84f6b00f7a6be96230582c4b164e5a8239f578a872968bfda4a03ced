import type { ComputedRef } from 'vue';
import type { LayoutDirection } from '../types';
interface ListWheelState {
    atStartEdge: ComputedRef<boolean>;
    atEndEdge: ComputedRef<boolean>;
    layout: ComputedRef<LayoutDirection>;
}
declare type ListWheelHandler = (offset: number) => void;
declare const useWheel: ({ atEndEdge, atStartEdge, layout }: ListWheelState, onWheelDelta: ListWheelHandler) => {
    hasReachedEdge: (offset: number) => boolean;
    onWheel: (e: WheelEvent) => void;
};
export default useWheel;
