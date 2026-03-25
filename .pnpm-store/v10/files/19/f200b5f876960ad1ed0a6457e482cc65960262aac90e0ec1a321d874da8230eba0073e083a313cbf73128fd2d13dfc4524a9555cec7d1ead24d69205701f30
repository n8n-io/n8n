import type { CSSProperties, ComputedRef, Ref, SetupContext } from 'vue';
import type { SliderButtonEmits, SliderButtonInitData, SliderButtonProps } from '../button';
export declare const useSliderButton: (props: SliderButtonProps, initData: SliderButtonInitData, emit: SetupContext<SliderButtonEmits>['emit']) => {
    disabled: Ref<boolean>;
    button: Ref<HTMLDivElement | undefined>;
    tooltip: Ref<any>;
    tooltipVisible: Ref<boolean>;
    showTooltip: Ref<import("../../../../utils").EpPropMergeType<BooleanConstructor, unknown, unknown>>;
    wrapperStyle: ComputedRef<CSSProperties>;
    formatValue: ComputedRef<string | number>;
    handleMouseEnter: () => void;
    handleMouseLeave: () => void;
    onButtonDown: (event: MouseEvent | TouchEvent) => void;
    onKeyDown: (event: KeyboardEvent) => void;
    setPosition: (newPosition: number) => Promise<void>;
};
