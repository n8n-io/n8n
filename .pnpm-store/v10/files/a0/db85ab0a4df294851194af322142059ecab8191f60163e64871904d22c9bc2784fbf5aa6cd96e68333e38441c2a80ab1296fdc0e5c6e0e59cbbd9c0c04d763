import type { Params } from '../../router';
export declare class Node<T> {
             
    constructor(method?: string, handler?: T, children?: Record<string, Node<T>>);
    insert(method: string, path: string, handler: T): Node<T>;
    search(method: string, path: string): [[T, Params][]];
}
