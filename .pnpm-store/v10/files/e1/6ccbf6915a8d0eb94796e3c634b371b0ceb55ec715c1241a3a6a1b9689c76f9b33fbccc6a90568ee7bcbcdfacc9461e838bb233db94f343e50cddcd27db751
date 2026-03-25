import { Ref } from 'vue';
type StateTree = Record<string | number | symbol, unknown>;
type PiniaPlugin = (context: {
    store: {
        $id: string;
        $state: unknown;
        $onAction: (callback: (context: {
            name: string;
            after: (callback: () => void) => void;
        }) => void) => void;
    };
    pinia: {
        state: Ref<Record<string, StateTree>>;
    };
}) => void;
type SentryPiniaPluginOptions = {
    attachPiniaState: boolean;
    addBreadcrumbs: boolean;
    actionTransformer: (action: string) => any;
    stateTransformer: (state: Record<string, unknown>) => any;
};
export declare const createSentryPiniaPlugin: (userOptions?: Partial<SentryPiniaPluginOptions>) => PiniaPlugin;
export {};
//# sourceMappingURL=pinia.d.ts.map
