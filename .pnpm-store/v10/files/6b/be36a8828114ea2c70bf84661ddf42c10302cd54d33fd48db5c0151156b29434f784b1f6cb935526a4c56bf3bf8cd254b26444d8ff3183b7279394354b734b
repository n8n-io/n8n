export type AnnotationEditorLayer = import("./annotation_editor_layer.js").AnnotationEditorLayer;
/**
 * Basic text editor in order to create a FreeTex annotation.
 */
export class FreeTextEditor extends AnnotationEditor {
    static _freeTextDefaultContent: string;
    static _internalPadding: number;
    static _defaultColor: null;
    static _defaultFontSize: number;
    static get _keyboardManager(): any;
    static _type: string;
    static _editorType: number;
    /** @inheritdoc */
    static initialize(l10n: any, uiManager: any): void;
    /** @inheritdoc */
    static updateDefaultParams(type: any, value: any): void;
    /** @inheritdoc */
    static get defaultPropertiesToUpdate(): any[][];
    static "__#18@#getNodeContent"(node: any): any;
    static "__#18@#deserializeContent"(content: any): any;
    /** @inheritdoc */
    static deserialize(data: any, parent: any, uiManager: any): Promise<AnnotationEditor | null>;
    constructor(params: any);
    /** @inheritdoc */
    updateParams(type: any, value: any): void;
    /** @inheritdoc */
    get propertiesToUpdate(): any[][];
    /**
     * Helper to translate the editor with the keyboard when it's empty.
     * @param {number} x in page units.
     * @param {number} y in page units.
     */
    _translateEmpty(x: number, y: number): void;
    /** @inheritdoc */
    onceAdded(focus: any): void;
    /**
     * Commit the content we have in this editor.
     * @returns {undefined}
     */
    commit(): undefined;
    /** @inheritdoc */
    keydown(event: any): void;
    editorDivKeydown(event: any): void;
    editorDivFocus(event: any): void;
    editorDivBlur(event: any): void;
    editorDivInput(event: any): void;
    editorDiv: HTMLDivElement | undefined;
    overlayDiv: HTMLDivElement | undefined;
    editorDivPaste(event: any): void;
    /** @inheritdoc */
    serialize(isForCopying?: boolean): Object | null;
    /** @inheritdoc */
    renderAnnotationElement(annotation: any): HTMLElement | null;
    #private;
}
import { AnnotationEditor } from "./editor.js";
