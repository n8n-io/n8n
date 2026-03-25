interface PatcherType {
    replace(loc: any, lines: any): any;
    get(loc?: any): any;
    tryToReprintComments(newNode: any, oldNode: any, print: any): any;
    deleteComments(node: any): any;
}
interface PatcherConstructor {
    new (lines: any): PatcherType;
}
declare const Patcher: PatcherConstructor;
export { Patcher };
export declare function getReprinter(path: any): ((print: any) => any) | undefined;
