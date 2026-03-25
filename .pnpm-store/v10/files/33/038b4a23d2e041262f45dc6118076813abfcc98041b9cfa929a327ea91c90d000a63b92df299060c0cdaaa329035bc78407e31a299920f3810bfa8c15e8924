import type { OpenAPISpec } from '../types';
import { MarkerService } from './MarkerService';
import { MenuStore } from './MenuStore';
import { SpecStore } from './models';
import { RedocNormalizedOptions } from './RedocNormalizedOptions';
import type { RedocRawOptions } from './RedocNormalizedOptions';
import { SearchStore } from './SearchStore';
import type { StoreState } from './types';
export declare function createStore(spec: object, specUrl: string | undefined, options?: RedocRawOptions): Promise<AppStore>;
export declare class AppStore {
    /**
     * deserialize store
     * **SUPER HACKY AND NOT OPTIMAL IMPLEMENTATION**
     */
    static fromJS(state: StoreState): AppStore;
    menu: MenuStore;
    spec: SpecStore;
    rawOptions: RedocRawOptions;
    options: RedocNormalizedOptions;
    search?: SearchStore<string>;
    marker: MarkerService;
    private scroll;
    private disposer;
    constructor(spec: OpenAPISpec, specUrl?: string, options?: RedocRawOptions, createSearchIndex?: boolean);
    onDidMount(): void;
    dispose(): void;
    /**
     * serializes store
     * **SUPER HACKY AND NOT OPTIMAL IMPLEMENTATION**
     */
    toJS(): Promise<StoreState>;
    private updateMarkOnMenu;
}
