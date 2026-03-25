import type { SetupContext } from 'vue';
import type { PopperContentEmits, PopperContentProps } from '../content';
export declare const usePopperContentFocusTrap: (props: PopperContentProps, emit: SetupContext<PopperContentEmits>['emit']) => {
    focusStartRef: import("vue").Ref<HTMLElement | "first" | "container" | undefined>;
    trapped: import("vue").Ref<boolean>;
    onFocusAfterReleased: (event: CustomEvent) => void;
    onFocusAfterTrapped: () => void;
    onFocusInTrap: (event: FocusEvent) => void;
    onFocusoutPrevented: (event: CustomEvent) => void;
    onReleaseRequested: () => void;
};
export declare type UsePopperContentFocusTrapReturn = ReturnType<typeof usePopperContentFocusTrap>;
