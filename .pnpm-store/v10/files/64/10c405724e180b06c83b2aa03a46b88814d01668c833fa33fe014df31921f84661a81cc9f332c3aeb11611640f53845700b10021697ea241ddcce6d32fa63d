import type { ComputedRef, InjectionKey, Ref, ToRefs } from 'vue';
import type { SliderProps } from './slider';
export interface SliderContext extends ToRefs<SliderProps> {
    precision: ComputedRef<number>;
    sliderSize: Ref<number>;
    emitChange: () => void;
    resetSize: () => void;
    updateDragging: (val: boolean) => void;
}
export declare const sliderContextKey: InjectionKey<SliderContext>;
