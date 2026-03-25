import * as React from 'react';
import { AppStore } from '../services/';
import { RedocRawOptions } from '../services/RedocNormalizedOptions';
export interface StoreBuilderProps {
    specUrl?: string;
    spec?: object;
    store?: AppStore;
    options?: RedocRawOptions;
    onLoaded?: (e?: Error) => void;
    children: (props: {
        loading: boolean;
        store: AppStore | null;
    }) => any;
}
export interface StoreBuilderState {
    error?: Error;
    loading: boolean;
    resolvedSpec?: any;
    prevSpec?: any;
    prevSpecUrl?: string;
}
declare const StoreContext: React.Context<AppStore | undefined>;
declare const Provider: React.Provider<AppStore | undefined>, Consumer: React.Consumer<AppStore | undefined>;
export { Provider as StoreProvider, Consumer as StoreConsumer, StoreContext };
export declare function StoreBuilder(props: StoreBuilderProps): any;
export declare function useStore(): AppStore | undefined;
