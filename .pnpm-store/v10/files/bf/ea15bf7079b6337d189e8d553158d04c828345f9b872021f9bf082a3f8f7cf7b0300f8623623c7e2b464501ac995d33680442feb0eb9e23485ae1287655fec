export function print(...args: Array<string | Symbol | Object | number>): void;
export function warn(...args: Array<string | Symbol | Object | number>): void;
export function printError(err: Error): void;
export function printImg(url: string, height: number): void;
export function printImgBase64(base64: string, height: number): void;
export function group(...args: Array<string | Symbol | Object | number>): void;
export function groupCollapsed(...args: Array<string | Symbol | Object | number>): void;
export function groupEnd(): void;
export function printDom(createNode: () => Node): void;
export function printCanvas(canvas: HTMLCanvasElement, height: number): void;
export const vconsoles: Set<any>;
export class VConsole {
    /**
     * @param {Element} dom
     */
    constructor(dom: Element);
    dom: Element;
    /**
     * @type {Element}
     */
    ccontainer: Element;
    depth: number;
    /**
     * @param {Array<string|Symbol|Object|number>} args
     * @param {boolean} collapsed
     */
    group(args: Array<string | Symbol | Object | number>, collapsed?: boolean): void;
    /**
     * @param {Array<string|Symbol|Object|number>} args
     */
    groupCollapsed(args: Array<string | Symbol | Object | number>): void;
    groupEnd(): void;
    /**
     * @param {Array<string|Symbol|Object|number>} args
     */
    print(args: Array<string | Symbol | Object | number>): void;
    /**
     * @param {Error} err
     */
    printError(err: Error): void;
    /**
     * @param {string} url
     * @param {number} height
     */
    printImg(url: string, height: number): void;
    /**
     * @param {Node} node
     */
    printDom(node: Node): void;
    destroy(): void;
}
export function createVConsole(dom: Element): VConsole;
export function createModuleLogger(moduleName: string): (...args: any[]) => void;
export { BOLD, UNBOLD, BLUE, GREY, GREEN, RED, PURPLE, ORANGE, UNCOLOR } from "./logging.common.js";
//# sourceMappingURL=logging.d.ts.map