import type { SetupContext } from 'vue';
import type { useLocale } from 'element-plus/es/hooks';
import type { RangePickerSharedEmits } from '../props/shared';
export declare type Shortcut = {
    text: string;
    value: [Date, Date] | (() => [Date, Date]);
    onClick?: (ctx: Omit<SetupContext<RangePickerSharedEmits>, 'expose'>) => void;
};
export declare const useShortcut: (lang: ReturnType<typeof useLocale>['lang']) => (shortcut: Shortcut) => void;
