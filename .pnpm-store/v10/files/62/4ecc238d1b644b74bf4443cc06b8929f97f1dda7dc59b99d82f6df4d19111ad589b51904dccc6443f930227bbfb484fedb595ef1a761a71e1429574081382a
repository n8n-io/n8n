export interface IDependencyTree {
    name: string;
    dependencies?: IDependencyTree[];
}
export interface IObserverTree {
    name: string;
    observers?: IObserverTree[];
}
export declare function getDependencyTree(thing: any, property?: string): IDependencyTree;
export declare function getObserverTree(thing: any, property?: string): IObserverTree;
