import { Delegate, Route, Opaque, MatchCallback } from "./route-recognizer/dsl";
export { Delegate, MatchCallback } from './route-recognizer/dsl';
export interface Params {
    [key: string]: Opaque;
    [key: number]: Opaque;
    queryParams?: QueryParams | null;
}
export interface QueryParams {
    [param: string]: any[] | any | null | undefined;
}
export interface Result {
    handler: Opaque;
    params: Params;
    isDynamic: boolean;
}
export interface Results extends ArrayLike<Result | undefined> {
    queryParams: QueryParams;
    slice(start?: number, end?: number): Result[];
    splice(start: number, deleteCount: number, ...items: Result[]): Result[];
    push(...results: Result[]): number;
}
declare class RouteRecognizer {
    private states;
    private rootState;
    private names;
    map: (context: MatchCallback, addCallback?: (router: this, routes: Route[]) => void) => void;
    delegate: Delegate | undefined;
    constructor();
    static VERSION: string;
    static ENCODE_AND_DECODE_PATH_SEGMENTS: boolean;
    static Normalizer: {
        normalizeSegment: (segment: string) => string;
        normalizePath: (path: string) => string;
        encodePathSegment: (str: string) => string;
    };
    add(routes: Route[], options?: {
        as: string;
    }): void;
    handlersFor(name: string): any[];
    hasRoute(name: string): boolean;
    generate(name: string, params?: Params | null): string;
    generateQueryString(params: QueryParams): string;
    parseQueryString(queryString: string): QueryParams;
    recognize(path: string): Results | undefined;
}
export default RouteRecognizer;
