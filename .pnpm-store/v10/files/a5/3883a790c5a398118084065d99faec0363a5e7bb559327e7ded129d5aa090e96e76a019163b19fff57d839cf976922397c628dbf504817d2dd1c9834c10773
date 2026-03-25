import type { AlphaSliderProps } from '../props/alpha-slider';
export declare const useAlphaSlider: (props: AlphaSliderProps) => {
    thumb: import("vue").ShallowRef<HTMLElement | undefined>;
    bar: import("vue").ShallowRef<HTMLElement | undefined>;
    handleDrag: (event: MouseEvent | TouchEvent) => void;
    handleClick: (event: MouseEvent | TouchEvent) => void;
};
export declare const useAlphaSliderDOM: (props: AlphaSliderProps, { bar, thumb, handleDrag, }: Pick<ReturnType<typeof useAlphaSlider>, 'bar' | 'thumb' | 'handleDrag'>) => {
    rootKls: import("vue").ComputedRef<string[]>;
    barKls: import("vue").ComputedRef<string>;
    barStyle: import("vue").ComputedRef<{
        background: string | undefined;
    }>;
    thumbKls: import("vue").ComputedRef<string>;
    thumbStyle: import("vue").ComputedRef<{
        left: string | undefined;
        top: string | undefined;
    }>;
    update: () => void;
};
