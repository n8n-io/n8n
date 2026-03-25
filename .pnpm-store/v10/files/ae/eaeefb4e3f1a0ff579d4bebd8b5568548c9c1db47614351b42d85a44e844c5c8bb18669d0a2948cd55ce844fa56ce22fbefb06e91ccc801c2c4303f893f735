export class InkDrawOutline extends Outline {
    static deserialize(pageX: any, pageY: any, pageWidth: any, pageHeight: any, innerMargin: any, { paths: { lines, points }, rotation, thickness }: {
        paths: {
            lines: any;
            points: any;
        };
        rotation: any;
        thickness: any;
    }): any;
    build(lines: any, parentWidth: any, parentHeight: any, parentScale: any, rotation: any, thickness: any, innerMargin: any): void;
    get thickness(): any;
    setLastElement(element: any): {
        path: {
            d: string;
        };
    };
    removeLastElement(): {
        path: {
            d: string;
        };
    };
    serialize([pageX, pageY, pageWidth, pageHeight]: [any, any, any, any], isForCopying: any): {
        lines: any[];
        points: any[];
        rect: any[];
    };
    get box(): any;
    updateProperty(name: any, value: any): any;
    updateParentDimensions([width, height]: [any, any], scale: any): any;
    updateRotation(rotation: any): {
        path: {
            transform: string;
        };
    };
    get viewBox(): any;
    get defaultProperties(): {
        root: {
            viewBox: any;
        };
        path: {
            "transform-origin": string;
        };
    };
    get rotationTransform(): string;
    getPathResizingSVGProperties([newX, newY, newWidth, newHeight]: [any, any, any, any]): {
        path: {
            "transform-origin": string;
            transform: string;
        };
    };
    getPathResizedSVGProperties([newX, newY, newWidth, newHeight]: [any, any, any, any]): {
        root: {
            viewBox: any;
        };
        path: {
            "transform-origin": string;
            transform: string | null;
            d: string;
        };
    };
    getPathTranslatedSVGProperties([newX, newY]: [any, any], parentDimensions: any): {
        root: {
            viewBox: any;
        };
        path: {
            d: string;
            "transform-origin": string;
        };
    };
    get defaultSVGProperties(): {
        root: {
            viewBox: any;
        };
        rootClass: {
            draw: boolean;
        };
        path: {
            d: string;
            "transform-origin": string;
            transform: string | null;
        };
        bbox: any;
    };
    #private;
}
export class InkDrawOutliner {
    constructor(x: any, y: any, parentWidth: any, parentHeight: any, rotation: any, thickness: any);
    updateProperty(name: any, value: any): void;
    isEmpty(): boolean;
    isCancellable(): boolean;
    add(x: any, y: any): {
        path: {
            d: string;
        };
    } | null;
    end(x: any, y: any): {
        path: {
            d: string;
        };
    } | null;
    startNew(x: any, y: any, parentWidth: any, parentHeight: any, rotation: any): null;
    getLastElement(): {
        line: any[];
        points: any[];
    } | undefined;
    setLastElement(element: any): {
        path: {
            d: string;
        };
    };
    removeLastElement(): {
        path: {
            d: string;
        };
    };
    toSVGPath(): string;
    getOutlines(parentWidth: any, parentHeight: any, scale: any, innerMargin: any): InkDrawOutline;
    get defaultSVGProperties(): {
        root: {
            viewBox: string;
        };
        rootClass: {
            draw: boolean;
        };
        bbox: number[];
    };
    #private;
}
import { Outline } from "./outline.js";
