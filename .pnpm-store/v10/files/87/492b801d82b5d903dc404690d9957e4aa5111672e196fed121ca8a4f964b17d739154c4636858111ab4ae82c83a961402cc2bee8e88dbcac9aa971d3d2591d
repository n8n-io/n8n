interface FastPathType {
    stack: any[];
    copy(): any;
    getName(): any;
    getValue(): any;
    valueIsDuplicate(): any;
    getNode(count?: number): any;
    getParentNode(count?: number): any;
    getRootValue(): any;
    call(callback: any, ...names: any[]): any;
    each(callback: any, ...names: any[]): any;
    map(callback: any, ...names: any[]): any;
    hasParens(): any;
    getPrevToken(node: any): any;
    getNextToken(node: any): any;
    needsParens(assumeExpressionContext?: boolean): any;
    canBeFirstInStatement(): any;
    firstInStatement(): any;
}
interface FastPathConstructor {
    new (value: any): FastPathType;
    from(obj: any): any;
}
declare const FastPath: FastPathConstructor;
export default FastPath;
