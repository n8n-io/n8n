/**
 * Basic draw editor.
 */
export class DrawingEditor extends AnnotationEditor {
    static _currentDrawId: number;
    static _currentParent: null;
    static "__#26@#currentDraw": null;
    static "__#26@#currentDrawingAC": null;
    static "__#26@#currentDrawingOptions": null;
    static "__#26@#currentPointerId": number;
    static "__#26@#currentPointerType": null;
    static "__#26@#currentPointerIds": null;
    static "__#26@#currentMoveTimestamp": number;
    static _INNER_MARGIN: number;
    static _mergeSVGProperties(p1: any, p2: any): any;
    /**
     * @param {Object} options
     * @return {DrawingOptions} the default options to use for a new editor.
     */
    static getDefaultDrawingOptions(_options: any): DrawingOptions;
    /**
     * @return {Map<AnnotationEditorParamsType, string>} a map between the
     *   parameter types and the name of the options.
     */
    static get typesMap(): Map<{
        RESIZE: number;
        CREATE: number;
        FREETEXT_SIZE: number;
        FREETEXT_COLOR: number;
        FREETEXT_OPACITY: number;
        INK_COLOR: number;
        INK_THICKNESS: number;
        INK_OPACITY: number;
        HIGHLIGHT_COLOR: number;
        HIGHLIGHT_DEFAULT_COLOR: number;
        HIGHLIGHT_THICKNESS: number;
        HIGHLIGHT_FREE: number;
        HIGHLIGHT_SHOW_ALL: number;
        DRAW_STEP: number;
    }, string>;
    /**
     * @returns {boolean} `true` if several drawings can be added to the
     * annotation.
     */
    static get supportMultipleDrawings(): boolean;
    /** @inheritdoc */
    static updateDefaultParams(type: any, value: any): void;
    /** @inheritdoc */
    static get defaultPropertiesToUpdate(): any[][];
    static onScaleChangingWhenDrawing(): void;
    /**
     * Create a new drawer instance.
     * @param {number} x - The x coordinate of the event.
     * @param {number} y - The y coordinate of the event.
     * @param {number} parentWidth - The parent width.
     * @param {number} parentHeight - The parent height.
     * @param {number} rotation - The parent rotation.
     */
    static createDrawerInstance(_x: any, _y: any, _parentWidth: any, _parentHeight: any, _rotation: any): void;
    static startDrawing(parent: any, uiManager: any, _isLTR: any, event: any): void;
    static _drawMove(event: any): void;
    static _cleanup(all: any): void;
    static _endDraw(event: any): void;
    static endDrawing(isAborted: any): any;
    /**
     * Deserialize the drawing outlines.
     * @param {number} pageX - The x coordinate of the page.
     * @param {number} pageY - The y coordinate of the page.
     * @param {number} pageWidth - The width of the page.
     * @param {number} pageHeight - The height of the page.
     * @param {number} innerWidth - The inner width.
     * @param {Object} data - The data to deserialize.
     * @returns {Object} The deserialized outlines.
     */
    static deserializeDraw(_pageX: any, _pageY: any, _pageWidth: any, _pageHeight: any, _innerWidth: any, _data: any): Object;
    /** @inheritdoc */
    static deserialize(data: any, parent: any, uiManager: any): Promise<AnnotationEditor | null>;
    constructor(params: any);
    _drawId: null;
    _addOutlines(params: any): void;
    /** @inheritdoc */
    updateParams(type: any, value: any): void;
    /** @inheritdoc */
    get propertiesToUpdate(): any[][];
    /**
     * Update a property and make this action undoable.
     * @param {string} color
     */
    _updateProperty(type: any, name: any, value: any): void;
    /** @inheritdoc */
    _onTranslating(_x: any, _y: any): void;
    /** @inheritdoc */
    _onTranslated(): void;
    /** @inheritdoc */
    onceAdded(focus: any): void;
    /** @inheritdoc */
    rotate(): void;
    onScaleChanging(): void;
    /**
     * Create the drawing options.
     * @param {Object} _data
     */
    createDrawingOptions(_data: Object): void;
    serializeDraw(isForCopying: any): any;
    /** @inheritdoc */
    renderAnnotationElement(annotation: any): null;
    #private;
}
export class DrawingOptions {
    updateProperty(name: any, value: any): void;
    updateProperties(properties: any): void;
    updateSVGProperty(name: any, value: any): void;
    toSVGProperties(): {
        root: any;
    };
    reset(): void;
    updateAll(options?: this): void;
    clone(): void;
    #private;
}
import { AnnotationEditor } from "./editor.js";
