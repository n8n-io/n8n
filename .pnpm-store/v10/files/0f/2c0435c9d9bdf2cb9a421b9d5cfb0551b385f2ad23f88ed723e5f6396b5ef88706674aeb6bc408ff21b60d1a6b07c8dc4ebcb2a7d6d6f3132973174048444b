/**
 * Basic text editor in order to create a Signature annotation.
 */
export class SignatureExtractor {
    static "__#30@#PARAMETERS": {
        maxDim: number;
        sigmaSFactor: number;
        sigmaR: number;
        kernelSize: number;
    };
    static "__#30@#neighborIndexToId"(i0: any, j0: any, i: any, j: any): any;
    static "__#30@#neighborIdToIndex": Int32Array<ArrayBuffer>;
    static "__#30@#clockwiseNonZero"(buf: any, width: any, i0: any, j0: any, i: any, j: any, offset: any): number;
    static "__#30@#counterClockwiseNonZero"(buf: any, width: any, i0: any, j0: any, i: any, j: any, offset: any): number;
    static "__#30@#findContours"(buf: any, width: any, height: any, threshold: any): {
        isHole: boolean;
        points: number[];
        id: number;
        parent: number;
    }[];
    static "__#30@#douglasPeuckerHelper"(points: any, start: any, end: any, output: any): void;
    static "__#30@#douglasPeucker"(points: any): any[] | null;
    static "__#30@#bilateralFilter"(buf: any, width: any, height: any, sigmaS: any, sigmaR: any, kernelSize: any): (Uint32Array<ArrayBuffer> | Uint8Array<any>)[];
    static "__#30@#getHistogram"(buf: any): Uint32Array<ArrayBuffer>;
    static "__#30@#toUint8"(buf: any): Uint8ClampedArray<ArrayBuffer>;
    static "__#30@#guessThreshold"(histogram: any): number;
    static "__#30@#getGrayPixels"(bitmap: any): any[];
    static extractContoursFromText(text: any, { fontFamily, fontStyle, fontWeight }: {
        fontFamily: any;
        fontStyle: any;
        fontWeight: any;
    }, pageWidth: any, pageHeight: any, rotation: any, innerMargin: any): {
        outline: InkDrawOutline;
        newCurves: any[];
        areContours: any;
        thickness: any;
        width: any;
        height: any;
    } | null;
    static process(bitmap: any, pageWidth: any, pageHeight: any, rotation: any, innerMargin: any): {
        outline: InkDrawOutline;
        newCurves: any[];
        areContours: any;
        thickness: any;
        width: any;
        height: any;
    } | null;
    static processDrawnLines({ lines, pageWidth, pageHeight, rotation, innerMargin, mustSmooth, areContours, }: {
        lines: any;
        pageWidth: any;
        pageHeight: any;
        rotation: any;
        innerMargin: any;
        mustSmooth: any;
        areContours: any;
    }): {
        outline: InkDrawOutline;
        newCurves: any[];
        areContours: any;
        thickness: any;
        width: any;
        height: any;
    } | null;
    static compressSignature({ outlines, areContours, thickness, width, height, }: {
        outlines: any;
        areContours: any;
        thickness: any;
        width: any;
        height: any;
    }): Promise<any>;
    static decompressSignature(signatureData: any): Promise<{
        areContours: boolean;
        thickness: number;
        outlines: Float32Array<ArrayBuffer>[];
        width: number;
        height: number;
    } | null>;
}
import { InkDrawOutline } from "./inkdraw.js";
