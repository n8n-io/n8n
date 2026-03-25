export interface PrintResultType {
    code: string;
    map?: any;
    toString(): string;
}
interface PrinterType {
    print(ast: any): PrintResultType;
    printGenerically(ast: any): PrintResultType;
}
interface PrinterConstructor {
    new (config?: any): PrinterType;
}
declare const Printer: PrinterConstructor;
export { Printer };
