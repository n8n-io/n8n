export class FreeDrawOutline extends Outline {
    constructor(outline: any, points: any, box: any, scaleFactor: any, innerMargin: any, isLTR: any);
    lastPoint: number[];
    serialize([blX, blY, trX, trY]: [any, any, any, any], rotation: any): {
        outline: any[];
        points: any[][];
    };
    get box(): Float32Array<ArrayBuffer>;
    newOutliner(point: any, box: any, scaleFactor: any, thickness: any, isLTR: any, innerMargin?: number): FreeDrawOutliner;
    getNewOutline(thickness: any, innerMargin: any): FreeDrawOutline;
    #private;
}
export class FreeDrawOutliner {
    static "__#19@#MIN_DIST": number;
    static "__#19@#MIN_DIFF": number;
    static "__#19@#MIN": number;
    constructor({ x, y }: {
        x: any;
        y: any;
    }, box: any, scaleFactor: any, thickness: any, isLTR: any, innerMargin?: number);
    isEmpty(): boolean;
    add({ x, y }: {
        x: any;
        y: any;
    }): boolean;
    toSVGPath(): string;
    newFreeDrawOutline(outline: any, points: any, box: any, scaleFactor: any, innerMargin: any, isLTR: any): FreeDrawOutline;
    getOutlines(): FreeDrawOutline;
    #private;
}
import { Outline } from "./outline.js";
