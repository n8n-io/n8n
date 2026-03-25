export type AnnotationEditorLayer = import("./annotation_editor_layer.js").AnnotationEditorLayer;
export type AnnotationEditorParameters = {
    /**
     * - the global manager
     */
    uiManager: AnnotationEditorUIManager;
    /**
     * - the layer containing this editor
     */
    parent: AnnotationEditorLayer;
    /**
     * - editor id
     */
    id: string;
    /**
     * - x-coordinate
     */
    x: number;
    /**
     * - y-coordinate
     */
    y: number;
};
/**
 * @typedef {Object} AnnotationEditorParameters
 * @property {AnnotationEditorUIManager} uiManager - the global manager
 * @property {AnnotationEditorLayer} parent - the layer containing this editor
 * @property {string} id - editor id
 * @property {number} x - x-coordinate
 * @property {number} y - y-coordinate
 */
/**
 * Base class for editors.
 */
export class AnnotationEditor {
    static _l10n: null;
    static _l10nResizer: null;
    static _borderLineWidth: number;
    static _colorManager: ColorManager;
    static _zIndex: number;
    static _telemetryTimeout: number;
    static get _resizerKeyboardManager(): any;
    static get isDrawer(): boolean;
    static get _defaultLineColor(): any;
    static deleteAnnotationElement(editor: any): void;
    /**
     * Initialize the l10n stuff for this type of editor.
     * @param {Object} l10n
     */
    static initialize(l10n: Object, _uiManager: any): void;
    /**
     * Update the default parameters for this type of editor.
     * @param {number} _type
     * @param {*} _value
     */
    static updateDefaultParams(_type: number, _value: any): void;
    /**
     * Get the default properties to set in the UI for this type of editor.
     * @returns {Array}
     */
    static get defaultPropertiesToUpdate(): any[];
    /**
     * Check if this kind of editor is able to handle the given mime type for
     * pasting.
     * @param {string} mime
     * @returns {boolean}
     */
    static isHandlingMimeForPasting(mime: string): boolean;
    /**
     * Extract the data from the clipboard item and delegate the creation of the
     * editor to the parent.
     * @param {DataTransferItem} item
     * @param {AnnotationEditorLayer} parent
     */
    static paste(item: DataTransferItem, parent: AnnotationEditorLayer): void;
    static "__#42@#rotatePoint"(x: any, y: any, angle: any): any[];
    static _round(x: any): number;
    /**
     * Deserialize the editor.
     * The result of the deserialization is a new editor.
     *
     * @param {Object} data
     * @param {AnnotationEditorLayer} parent
     * @param {AnnotationEditorUIManager} uiManager
     * @returns {Promise<AnnotationEditor | null>}
     */
    static deserialize(data: Object, parent: AnnotationEditorLayer, uiManager: AnnotationEditorUIManager): Promise<AnnotationEditor | null>;
    static get MIN_SIZE(): number;
    static canCreateNewEmptyEditor(): boolean;
    /**
     * @param {AnnotationEditorParameters} parameters
     */
    constructor(parameters: AnnotationEditorParameters);
    isSelected: boolean;
    _isCopy: boolean;
    _editToolbar: null;
    _initialOptions: any;
    _initialData: null;
    _isVisible: boolean;
    _uiManager: null;
    _focusEventsAllowed: boolean;
    parent: import("./annotation_editor_layer.js").AnnotationEditorLayer;
    id: string;
    width: any;
    height: any;
    pageIndex: number;
    name: any;
    div: HTMLDivElement | null;
    annotationElementId: any;
    _willKeepAspectRatio: boolean;
    _structTreeParentId: any;
    rotation: number;
    pageRotation: number;
    pageDimensions: any[];
    pageTranslation: any[];
    x: number;
    y: number;
    isAttachedToDOM: boolean;
    deleted: boolean;
    get editorType(): any;
    /**
     * Get the properties to update in the UI for this editor.
     * @returns {Array}
     */
    get propertiesToUpdate(): any[];
    set _isDraggable(value: boolean);
    get _isDraggable(): boolean;
    /**
     * @returns {boolean} true if the editor handles the Enter key itself.
     */
    get isEnterHandled(): boolean;
    center(): void;
    /**
     * Add some commands into the CommandManager (undo/redo stuff).
     * @param {Object} params
     */
    addCommands(params: Object): void;
    get currentLayer(): any;
    /**
     * This editor will be behind the others.
     */
    setInBackground(): void;
    /**
     * This editor will be in the foreground.
     */
    setInForeground(): void;
    setParent(parent: any): void;
    /**
     * onfocus callback.
     */
    focusin(event: any): void;
    /**
     * onblur callback.
     * @param {FocusEvent} event
     */
    focusout(event: FocusEvent): void;
    commitOrRemove(): void;
    /**
     * Commit the data contained in this editor.
     */
    commit(): void;
    addToAnnotationStorage(): void;
    /**
     * Set the editor position within its parent.
     * @param {number} x
     * @param {number} y
     * @param {number} tx - x-translation in screen coordinates.
     * @param {number} ty - y-translation in screen coordinates.
     */
    setAt(x: number, y: number, tx: number, ty: number): void;
    _moveAfterPaste(baseX: any, baseY: any): void;
    /**
     * Translate the editor position within its parent.
     * @param {number} x - x-translation in screen coordinates.
     * @param {number} y - y-translation in screen coordinates.
     */
    translate(x: number, y: number): void;
    /**
     * Translate the editor position within its page and adjust the scroll
     * in order to have the editor in the view.
     * @param {number} x - x-translation in page coordinates.
     * @param {number} y - y-translation in page coordinates.
     */
    translateInPage(x: number, y: number): void;
    translationDone(): void;
    drag(tx: any, ty: any): void;
    /**
     * Called when the editor is being translated.
     * @param {number} x - in page coordinates.
     * @param {number} y - in page coordinates.
     */
    _onTranslating(x: number, y: number): void;
    /**
     * Called when the editor has been translated.
     * @param {number} x - in page coordinates.
     * @param {number} y - in page coordinates.
     */
    _onTranslated(x: number, y: number): void;
    get _hasBeenMoved(): boolean;
    get _hasBeenResized(): boolean;
    /**
     * Get the translation to take into account the editor border.
     * The CSS engine positions the element by taking the border into account so
     * we must apply the opposite translation to have the editor in the right
     * position.
     * @returns {Array<number>}
     */
    getBaseTranslation(): Array<number>;
    /**
     * @returns {boolean} true if position must be fixed (i.e. make the x and y
     * living in the page).
     */
    get _mustFixPosition(): boolean;
    /**
     * Fix the position of the editor in order to keep it inside its parent page.
     * @param {number} [rotation] - the rotation of the page.
     */
    fixAndSetPosition(rotation?: number): void;
    /**
     * Convert a screen translation into a page one.
     * @param {number} x
     * @param {number} y
     */
    screenToPageTranslation(x: number, y: number): any[];
    /**
     * Convert a page translation into a screen one.
     * @param {number} x
     * @param {number} y
     */
    pageTranslationToScreen(x: number, y: number): any[];
    get parentScale(): any;
    get parentRotation(): number;
    get parentDimensions(): number[];
    /**
     * Set the dimensions of this editor.
     * @param {number} width
     * @param {number} height
     */
    setDims(width: number, height: number): void;
    fixDims(): void;
    /**
     * Get the translation used to position this editor when it's created.
     * @returns {Array<number>}
     */
    getInitialTranslation(): Array<number>;
    /**
     * Called when the editor has been resized.
     */
    _onResized(): void;
    /**
     * Called when the editor is being resized.
     */
    _onResizing(): void;
    /**
     * Called when the alt text dialog is closed.
     */
    altTextFinish(): void;
    /**
     * Add a toolbar for this editor.
     * @returns {Promise<EditorToolbar|null>}
     */
    addEditToolbar(): Promise<EditorToolbar | null>;
    removeEditToolbar(): void;
    addContainer(container: any): void;
    getClientDimensions(): DOMRect;
    addAltTextButton(): Promise<void>;
    /**
     * Set the alt text data.
     */
    set altTextData(data: any);
    get altTextData(): any;
    get guessedAltText(): any;
    setGuessedAltText(text: any): Promise<void>;
    serializeAltText(isForCopying: any): any;
    hasAltText(): boolean;
    hasAltTextData(): any;
    /**
     * Render this editor in a div.
     * @returns {HTMLDivElement | null}
     */
    render(): HTMLDivElement | null;
    /**
     * Onpointerdown callback.
     * @param {PointerEvent} event
     */
    pointerdown(event: PointerEvent): void;
    _onStartDragging(): void;
    _onStopDragging(): void;
    moveInDOM(): void;
    _setParentAndPosition(parent: any, x: any, y: any): void;
    /**
     * Convert the current rect into a page one.
     * @param {number} tx - x-translation in screen coordinates.
     * @param {number} ty - y-translation in screen coordinates.
     * @param {number} [rotation] - the rotation of the page.
     */
    getRect(tx: number, ty: number, rotation?: number): any[];
    getRectInCurrentCoords(rect: any, pageHeight: any): any[];
    /**
     * Executed once this editor has been rendered.
     * @param {boolean} focus - true if the editor should be focused.
     */
    onceAdded(focus: boolean): void;
    /**
     * Check if the editor contains something.
     * @returns {boolean}
     */
    isEmpty(): boolean;
    /**
     * Enable edit mode.
     * @returns {boolean} - true if the edit mode has been enabled.
     */
    enableEditMode(): boolean;
    /**
     * Disable edit mode.
     * @returns {boolean} - true if the edit mode has been disabled.
     */
    disableEditMode(): boolean;
    /**
     * Check if the editor is edited.
     * @returns {boolean}
     */
    isInEditMode(): boolean;
    /**
     * If it returns true, then this editor handles the keyboard
     * events itself.
     * @returns {boolean}
     */
    shouldGetKeyboardEvents(): boolean;
    /**
     * Check if this editor needs to be rebuilt or not.
     * @returns {boolean}
     */
    needsToBeRebuilt(): boolean;
    get isOnScreen(): boolean;
    /**
     * Rebuild the editor in case it has been removed on undo.
     *
     * To implement in subclasses.
     */
    rebuild(): void;
    /**
     * Rotate the editor when the page is rotated.
     * @param {number} angle
     */
    rotate(_angle: any): void;
    /**
     * Resize the editor when the page is resized.
     */
    resize(): void;
    /**
     * Serialize the editor when it has been deleted.
     * @returns {Object}
     */
    serializeDeleted(): Object;
    /**
     * Serialize the editor.
     * The result of the serialization will be used to construct a
     * new annotation to add to the pdf document.
     *
     * To implement in subclasses.
     * @param {boolean} [isForCopying]
     * @param {Object | null} [context]
     * @returns {Object | null}
     */
    serialize(isForCopying?: boolean, context?: Object | null): Object | null;
    /**
     * Check if an existing annotation associated with this editor has been
     * modified.
     * @returns {boolean}
     */
    get hasBeenModified(): boolean;
    /**
     * Remove this editor.
     * It's used on ctrl+backspace action.
     */
    remove(): void;
    /**
     * @returns {boolean} true if this editor can be resized.
     */
    get isResizable(): boolean;
    /**
     * Add the resizers to this editor.
     */
    makeResizable(): void;
    get toolbarPosition(): null;
    /**
     * onkeydown callback.
     * @param {KeyboardEvent} event
     */
    keydown(event: KeyboardEvent): void;
    _resizeWithKeyboard(x: any, y: any): void;
    _stopResizingWithKeyboard(): void;
    /**
     * Select this editor.
     */
    select(): void;
    /**
     * Unselect this editor.
     */
    unselect(): void;
    /**
     * Update some parameters which have been changed through the UI.
     * @param {number} type
     * @param {*} value
     */
    updateParams(type: number, value: any): void;
    /**
     * When the user disables the editing mode some editors can change some of
     * their properties.
     */
    disableEditing(): void;
    /**
     * When the user enables the editing mode some editors can change some of
     * their properties.
     */
    enableEditing(): void;
    /**
     * Check if the content of this editor can be changed.
     * For example, a FreeText editor can be changed (the user can change the
     * text), but a Stamp editor cannot.
     * @returns {boolean}
     */
    get canChangeContent(): boolean;
    /**
     * The editor is about to be edited.
     */
    enterInEditMode(): void;
    /**
     * ondblclick callback.
     * @param {MouseEvent} event
     */
    dblclick(event: MouseEvent): void;
    /**
     * @returns {HTMLElement | null} the element requiring an alt text.
     */
    getElementForAltText(): HTMLElement | null;
    /**
     * Get the div which really contains the displayed content.
     * @returns {HTMLDivElement | undefined}
     */
    get contentDiv(): HTMLDivElement | undefined;
    /**
     * When set to true, it means that this editor is currently edited.
     * @param {boolean} value
     */
    set isEditing(value: boolean);
    /**
     * If true then the editor is currently edited.
     * @type {boolean}
     */
    get isEditing(): boolean;
    /**
     * Set the aspect ratio to use when resizing.
     * @param {number} width
     * @param {number} height
     */
    setAspectRatio(width: number, height: number): void;
    /**
     * Get the data to report to the telemetry when the editor is added.
     * @returns {Object}
     */
    get telemetryInitialData(): Object;
    /**
     * The telemetry data to use when saving/printing.
     * @returns {Object|null}
     */
    get telemetryFinalData(): Object | null;
    _reportTelemetry(data: any, mustWait?: boolean): void;
    /**
     * Show or hide this editor.
     * @param {boolean|undefined} visible
     */
    show(visible?: boolean | undefined): void;
    enable(): void;
    disable(): void;
    /**
     * Render an annotation in the annotation layer.
     * @param {Object} annotation
     * @returns {HTMLElement|null}
     */
    renderAnnotationElement(annotation: Object): HTMLElement | null;
    resetAnnotationElement(annotation: any): void;
    #private;
}
import { AnnotationEditorUIManager } from "./tools.js";
import { EditorToolbar } from "./toolbar.js";
import { ColorManager } from "./tools.js";
