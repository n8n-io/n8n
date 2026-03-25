import type { CSSProperties } from 'vue';
import type { ThumbProps } from './thumb';
export declare const GAP = 4;
export declare const BAR_MAP: {
    readonly vertical: {
        readonly offset: "offsetHeight";
        readonly scroll: "scrollTop";
        readonly scrollSize: "scrollHeight";
        readonly size: "height";
        readonly key: "vertical";
        readonly axis: "Y";
        readonly client: "clientY";
        readonly direction: "top";
    };
    readonly horizontal: {
        readonly offset: "offsetWidth";
        readonly scroll: "scrollLeft";
        readonly scrollSize: "scrollWidth";
        readonly size: "width";
        readonly key: "horizontal";
        readonly axis: "X";
        readonly client: "clientX";
        readonly direction: "left";
    };
};
export declare const renderThumbStyle: ({ move, size, bar, }: Pick<ThumbProps, "size" | "move"> & {
    bar: typeof BAR_MAP[keyof typeof BAR_MAP];
}) => CSSProperties;
