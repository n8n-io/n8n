/**
 * Basic editor in order to generate an Stamp annotation annotation containing
 * a signature drawing.
 */
export class SignatureEditor extends DrawingEditor {
    static _type: string;
    static _editorType: number;
    static _defaultDrawingOptions: null;
    /** @inheritdoc */
    static initialize(l10n: any, uiManager: any): void;
    /** @inheritdoc */
    static getDefaultDrawingOptions(options: any): any;
    static get typesMap(): any;
    static computeTelemetryFinalData(data: any): {
        hasAltText: any;
        hasNoAltText: any;
    };
    /** @inheritdoc */
    static deserializeDraw(pageX: any, pageY: any, pageWidth: any, pageHeight: any, innerMargin: any, data: any): any;
    defaultL10nId: string;
    /** @inheritdoc */
    get telemetryFinalData(): {
        type: string;
        hasDescription: boolean;
    };
    setUuid(uuid: any): void;
    getUuid(): null;
    set description(description: null);
    get description(): null;
    getSignaturePreview(): {
        areContours: any;
        outline: InkDrawOutline;
    };
    addSignature(data: any, heightInPage: any, description: any, uuid: any): void;
    getFromImage(bitmap: any): {
        outline: InkDrawOutline;
        newCurves: any[];
        areContours: any;
        thickness: any;
        width: any;
        height: any;
    } | null;
    getFromText(text: any, fontInfo: any): {
        outline: InkDrawOutline;
        newCurves: any[];
        areContours: any;
        thickness: any;
        width: any;
        height: any;
    } | null;
    getDrawnSignature(curves: any): {
        outline: InkDrawOutline;
        newCurves: any[];
        areContours: any;
        thickness: any;
        width: any;
        height: any;
    } | null;
    /** @inheritdoc */
    createDrawingOptions({ areContours, thickness }: {
        areContours: any;
        thickness: any;
    }): void;
    _drawingOptions: any;
    /** @inheritdoc */
    serialize(isForCopying?: boolean): {
        annotationType: number;
        isSignature: boolean;
        areContours: boolean;
        color: number[];
        thickness: any;
        pageIndex: number;
        rect: any;
        rotation: number;
        structTreeParentId: any;
    } | null;
    #private;
}
import { DrawingEditor } from "./draw.js";
import { InkDrawOutline } from "./drawers/inkdraw.js";
