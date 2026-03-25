import { Lambda } from "../internal";
export interface IListenable {
    changeListeners_: Function[] | undefined;
}
export declare function hasListeners(listenable: IListenable): boolean;
export declare function registerListener(listenable: IListenable, handler: Function): Lambda;
export declare function notifyListeners<T>(listenable: IListenable, change: T): void;
