import { Alias, IProjectConfig, PathLike } from '../interfaces';
export declare class TrieNode<T> {
    private children;
    data: T | null;
    constructor();
    add(name: string, data: T): void;
    search(name: string): T | null;
    static buildAliasTrie(config: IProjectConfig, paths?: PathLike): TrieNode<Alias>;
}
