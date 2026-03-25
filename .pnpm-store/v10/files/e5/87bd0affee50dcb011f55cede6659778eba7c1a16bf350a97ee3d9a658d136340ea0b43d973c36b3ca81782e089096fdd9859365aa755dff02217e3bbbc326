import { CreateFetch, FetchConfig, Middleware, OpenapiPaths } from './types.js';
declare global {
    interface JSON {
        rawJSON?(jsonStr: string): {
            rawJSON: string;
        };
    }
}
export declare const Fetcher: {
    for: <Paths extends OpenapiPaths<Paths>>() => {
        configure: (config: FetchConfig) => void;
        use: (mw: Middleware) => number;
        path: <P extends keyof Paths>(path: P) => {
            method: <M extends keyof Paths[P]>(method: M) => {
                create: CreateFetch<M, Paths[P][M]>;
            };
        };
    };
};
