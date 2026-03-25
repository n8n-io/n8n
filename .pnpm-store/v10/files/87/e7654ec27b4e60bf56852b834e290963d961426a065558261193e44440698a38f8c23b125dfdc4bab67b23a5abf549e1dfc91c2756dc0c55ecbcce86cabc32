export interface Delegate {
    contextEntered?(context: string, route: MatchDSL): void;
    willAddRoute?(context: string | undefined, route: string): string;
}
export declare type Opaque = {} | void | null | undefined;
export interface Route {
    path: string;
    handler: Opaque;
    queryParams?: string[];
}
export interface RouteRecognizer {
    delegate: Delegate | undefined;
    add(routes: Route[]): void;
}
export interface MatchCallback {
    (match: MatchDSL): void;
}
export interface MatchDSL {
    (path: string): ToDSL;
    (path: string, callback: MatchCallback): void;
}
export interface ToDSL {
    to(name: string, callback?: MatchCallback): void;
}
export declare class Matcher {
    routes: {
        [path: string]: string | undefined;
    };
    children: {
        [path: string]: Matcher | undefined;
    };
    target: string | undefined;
    constructor(target?: string);
    add(path: string, target: string): void;
    addChild(path: string, target: string, callback: MatchCallback, delegate: Delegate | undefined): void;
}
export default function <T extends RouteRecognizer>(this: T, callback: MatchCallback, addRouteCallback?: (routeRecognizer: T, routes: Route[]) => void): void;
