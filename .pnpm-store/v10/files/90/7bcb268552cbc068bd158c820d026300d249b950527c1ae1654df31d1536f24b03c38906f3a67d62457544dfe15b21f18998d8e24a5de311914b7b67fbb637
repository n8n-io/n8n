import { Loading } from './src/service';
import { vLoading } from './src/directive';
import type { App } from 'vue';
export declare const ElLoading: {
    install(app: App): void;
    directive: import("vue").Directive<import("./src/directive").ElementLoading, import("./src/directive").LoadingBinding>;
    service: (options?: Partial<Omit<import("./src/types").LoadingOptionsResolved, "target" | "parent"> & {
        target: string | HTMLElement;
        body: boolean;
    }>) => {
        setText: (text: string) => void;
        removeElLoadingChild: () => void;
        close: () => void;
        handleAfterLeave: () => void;
        vm: import("vue").ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, import("vue").ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}>>;
        $el: HTMLElement;
        originalPosition: import("vue").Ref<string>;
        originalOverflow: import("vue").Ref<string>;
        visible: import("vue").Ref<boolean>;
        parent: import("vue").Ref<import("./src/types").LoadingParentElement>;
        background: import("vue").Ref<string>;
        svg: import("vue").Ref<string>;
        svgViewBox: import("vue").Ref<string>;
        spinner: import("vue").Ref<string | boolean>;
        text: import("vue").Ref<string>;
        fullscreen: import("vue").Ref<boolean>;
        lock: import("vue").Ref<boolean>;
        customClass: import("vue").Ref<string>;
        target: import("vue").Ref<HTMLElement>;
        beforeClose?: import("vue").Ref<(() => boolean) | undefined> | undefined;
        closed?: import("vue").Ref<(() => void) | undefined> | undefined;
    };
};
export default ElLoading;
export { vLoading, vLoading as ElLoadingDirective, Loading as ElLoadingService };
export * from './src/types';
