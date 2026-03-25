export type EventBus = import("./event_utils").EventBus;
export type PDFFindController = import("./pdf_find_controller").PDFFindController;
export type TextHighlighterOptions = {
    findController: PDFFindController;
    /**
     * - The application event bus.
     */
    eventBus: EventBus;
    /**
     * - The page index.
     */
    pageIndex: number;
};
/** @typedef {import("./event_utils").EventBus} EventBus */
/** @typedef {import("./pdf_find_controller").PDFFindController} PDFFindController */
/**
 * @typedef {Object} TextHighlighterOptions
 * @property {PDFFindController} findController
 * @property {EventBus} eventBus - The application event bus.
 * @property {number} pageIndex - The page index.
 */
/**
 * TextHighlighter handles highlighting matches from the FindController in
 * either the text layer or XFA layer depending on the type of document.
 */
export class TextHighlighter {
    /**
     * @param {TextHighlighterOptions} options
     */
    constructor({ findController, eventBus, pageIndex }: TextHighlighterOptions);
    findController: import("./pdf_find_controller").PDFFindController;
    matches: any[];
    eventBus: import("./event_utils").EventBus;
    pageIdx: number;
    textDivs: Node[] | null;
    textContentItemsStr: string[] | null;
    enabled: boolean;
    /**
     * Store two arrays that will map DOM nodes to text they should contain.
     * The arrays should be of equal length and the array element at each index
     * should correspond to the other. e.g.
     * `items[0] = "<span>Item 0</span>" and texts[0] = "Item 0";
     *
     * @param {Array<Node>} divs
     * @param {Array<string>} texts
     */
    setTextMapping(divs: Array<Node>, texts: Array<string>): void;
    /**
     * Start listening for events to update the highlighter and check if there are
     * any current matches that need be highlighted.
     */
    enable(): void;
    disable(): void;
    _convertMatches(matches: any, matchesLength: any): {
        begin: {
            divIdx: number;
            offset: number;
        };
    }[];
    _renderMatches(matches: any): void;
    _updateMatches(reset?: boolean): void;
    #private;
}
