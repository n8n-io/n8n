import * as _codemirror_state from '@codemirror/state';
import { Text, Extension, StateCommand, EditorState, SelectionRange, StateEffect } from '@codemirror/state';
import { Command, KeyBinding, EditorView, Panel } from '@codemirror/view';

/**
A search cursor provides an iterator over text matches in a
document.
*/
declare class SearchCursor implements Iterator<{
    from: number;
    to: number;
}> {
    private test?;
    private iter;
    /**
    The current match (only holds a meaningful value after
    [`next`](https://codemirror.net/6/docs/ref/#search.SearchCursor.next) has been called and when
    `done` is false).
    */
    value: {
        from: number;
        to: number;
    };
    /**
    Whether the end of the iterated region has been reached.
    */
    done: boolean;
    private matches;
    private buffer;
    private bufferPos;
    private bufferStart;
    private normalize;
    private query;
    /**
    Create a text cursor. The query is the search string, `from` to
    `to` provides the region to search.
    
    When `normalize` is given, it will be called, on both the query
    string and the content it is matched against, before comparing.
    You can, for example, create a case-insensitive search by
    passing `s => s.toLowerCase()`.
    
    Text is always normalized with
    [`.normalize("NFKD")`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/normalize)
    (when supported).
    */
    constructor(text: Text, query: string, from?: number, to?: number, normalize?: (string: string) => string, test?: ((from: number, to: number, buffer: string, bufferPos: number) => boolean) | undefined);
    private peek;
    /**
    Look for the next match. Updates the iterator's
    [`value`](https://codemirror.net/6/docs/ref/#search.SearchCursor.value) and
    [`done`](https://codemirror.net/6/docs/ref/#search.SearchCursor.done) properties. Should be called
    at least once before using the cursor.
    */
    next(): this;
    /**
    The `next` method will ignore matches that partially overlap a
    previous match. This method behaves like `next`, but includes
    such matches.
    */
    nextOverlapping(): this;
    private match;
    [Symbol.iterator]: () => Iterator<{
        from: number;
        to: number;
    }>;
}

interface RegExpCursorOptions {
    ignoreCase?: boolean;
    test?: (from: number, to: number, match: RegExpExecArray) => boolean;
}
/**
This class is similar to [`SearchCursor`](https://codemirror.net/6/docs/ref/#search.SearchCursor)
but searches for a regular expression pattern instead of a plain
string.
*/
declare class RegExpCursor implements Iterator<{
    from: number;
    to: number;
    match: RegExpExecArray;
}> {
    private text;
    private to;
    private iter;
    private re;
    private test?;
    private curLine;
    private curLineStart;
    private matchPos;
    /**
    Set to `true` when the cursor has reached the end of the search
    range.
    */
    done: boolean;
    /**
    Will contain an object with the extent of the match and the
    match object when [`next`](https://codemirror.net/6/docs/ref/#search.RegExpCursor.next)
    sucessfully finds a match.
    */
    value: {
        from: number;
        to: number;
        match: RegExpExecArray;
    };
    /**
    Create a cursor that will search the given range in the given
    document. `query` should be the raw pattern (as you'd pass it to
    `new RegExp`).
    */
    constructor(text: Text, query: string, options?: RegExpCursorOptions, from?: number, to?: number);
    private getLine;
    private nextLine;
    /**
    Move to the next match, if there is one.
    */
    next(): this;
    [Symbol.iterator]: () => Iterator<{
        from: number;
        to: number;
        match: RegExpExecArray;
    }>;
}

/**
Command that shows a dialog asking the user for a line number, and
when a valid position is provided, moves the cursor to that line.

Supports line numbers, relative line offsets prefixed with `+` or
`-`, document percentages suffixed with `%`, and an optional
column position by adding `:` and a second number after the line
number.
*/
declare const gotoLine: Command;

type HighlightOptions = {
    /**
    Determines whether, when nothing is selected, the word around
    the cursor is matched instead. Defaults to false.
    */
    highlightWordAroundCursor?: boolean;
    /**
    The minimum length of the selection before it is highlighted.
    Defaults to 1 (always highlight non-cursor selections).
    */
    minSelectionLength?: number;
    /**
    The amount of matches (in the viewport) at which to disable
    highlighting. Defaults to 100.
    */
    maxMatches?: number;
    /**
    Whether to only highlight whole words.
    */
    wholeWords?: boolean;
};
/**
This extension highlights text that matches the selection. It uses
the `"cm-selectionMatch"` class for the highlighting. When
`highlightWordAroundCursor` is enabled, the word at the cursor
itself will be highlighted with `"cm-selectionMatch-main"`.
*/
declare function highlightSelectionMatches(options?: HighlightOptions): Extension;
/**
Select next occurrence of the current selection. Expand selection
to the surrounding word when the selection is empty.
*/
declare const selectNextOccurrence: StateCommand;

interface SearchConfig {
    /**
    Whether to position the search panel at the top of the editor
    (the default is at the bottom).
    */
    top?: boolean;
    /**
    Whether to enable case sensitivity by default when the search
    panel is activated (defaults to false).
    */
    caseSensitive?: boolean;
    /**
    Whether to treat string searches literally by default (defaults to false).
    */
    literal?: boolean;
    /**
    Controls whether the default query has by-word matching enabled.
    Defaults to false.
    */
    wholeWord?: boolean;
    /**
    Used to turn on regular expression search in the default query.
    Defaults to false.
    */
    regexp?: boolean;
    /**
    Can be used to override the way the search panel is implemented.
    Should create a [Panel](https://codemirror.net/6/docs/ref/#view.Panel) that contains a form
    which lets the user:
    
    - See the [current](https://codemirror.net/6/docs/ref/#search.getSearchQuery) search query.
    - Manipulate the [query](https://codemirror.net/6/docs/ref/#search.SearchQuery) and
      [update](https://codemirror.net/6/docs/ref/#search.setSearchQuery) the search state with a new
      query.
    - Notice external changes to the query by reacting to the
      appropriate [state effect](https://codemirror.net/6/docs/ref/#search.setSearchQuery).
    - Run some of the search commands.
    
    The field that should be focused when opening the panel must be
    tagged with a `main-field=true` DOM attribute.
    */
    createPanel?: (view: EditorView) => Panel;
    /**
    By default, matches are scrolled into view using the default
    behavior of
    [`EditorView.scrollIntoView`](https://codemirror.net/6/docs/ref/#view.EditorView^scrollIntoView).
    This option allows you to pass a custom function to produce the
    scroll effect.
    */
    scrollToMatch?: (range: SelectionRange, view: EditorView) => StateEffect<unknown>;
}
/**
Add search state to the editor configuration, and optionally
configure the search extension.
([`openSearchPanel`](https://codemirror.net/6/docs/ref/#search.openSearchPanel) will automatically
enable this if it isn't already on).
*/
declare function search(config?: SearchConfig): Extension;
/**
A search query. Part of the editor's search state.
*/
declare class SearchQuery {
    /**
    The search string (or regular expression).
    */
    readonly search: string;
    /**
    Indicates whether the search is case-sensitive.
    */
    readonly caseSensitive: boolean;
    /**
    By default, string search will replace `\n`, `\r`, and `\t` in
    the query with newline, return, and tab characters. When this
    is set to true, that behavior is disabled.
    */
    readonly literal: boolean;
    /**
    When true, the search string is interpreted as a regular
    expression.
    */
    readonly regexp: boolean;
    /**
    The replace text, or the empty string if no replace text has
    been given.
    */
    readonly replace: string;
    /**
    Whether this query is non-empty and, in case of a regular
    expression search, syntactically valid.
    */
    readonly valid: boolean;
    /**
    When true, matches that contain words are ignored when there are
    further word characters around them.
    */
    readonly wholeWord: boolean;
    /**
    Create a query object.
    */
    constructor(config: {
        /**
        The search string.
        */
        search: string;
        /**
        Controls whether the search should be case-sensitive.
        */
        caseSensitive?: boolean;
        /**
        By default, string search will replace `\n`, `\r`, and `\t` in
        the query with newline, return, and tab characters. When this
        is set to true, that behavior is disabled.
        */
        literal?: boolean;
        /**
        When true, interpret the search string as a regular expression.
        */
        regexp?: boolean;
        /**
        The replace text.
        */
        replace?: string;
        /**
        Enable whole-word matching.
        */
        wholeWord?: boolean;
    });
    /**
    Compare this query to another query.
    */
    eq(other: SearchQuery): boolean;
    /**
    Get a search cursor for this query, searching through the given
    range in the given state.
    */
    getCursor(state: EditorState | Text, from?: number, to?: number): Iterator<{
        from: number;
        to: number;
    }>;
}
/**
A state effect that updates the current search query. Note that
this only has an effect if the search state has been initialized
(by including [`search`](https://codemirror.net/6/docs/ref/#search.search) in your configuration or
by running [`openSearchPanel`](https://codemirror.net/6/docs/ref/#search.openSearchPanel) at least
once).
*/
declare const setSearchQuery: _codemirror_state.StateEffectType<SearchQuery>;
/**
Get the current search query from an editor state.
*/
declare function getSearchQuery(state: EditorState): SearchQuery;
/**
Query whether the search panel is open in the given editor state.
*/
declare function searchPanelOpen(state: EditorState): boolean;
/**
Open the search panel if it isn't already open, and move the
selection to the first match after the current main selection.
Will wrap around to the start of the document when it reaches the
end.
*/
declare const findNext: Command;
/**
Move the selection to the previous instance of the search query,
before the current main selection. Will wrap past the start
of the document to start searching at the end again.
*/
declare const findPrevious: Command;
/**
Select all instances of the search query.
*/
declare const selectMatches: Command;
/**
Select all instances of the currently selected text.
*/
declare const selectSelectionMatches: StateCommand;
/**
Replace the current match of the search query.
*/
declare const replaceNext: Command;
/**
Replace all instances of the search query with the given
replacement.
*/
declare const replaceAll: Command;
/**
Make sure the search panel is open and focused.
*/
declare const openSearchPanel: Command;
/**
Close the search panel.
*/
declare const closeSearchPanel: Command;
/**
Default search-related key bindings.

 - Mod-f: [`openSearchPanel`](https://codemirror.net/6/docs/ref/#search.openSearchPanel)
 - F3, Mod-g: [`findNext`](https://codemirror.net/6/docs/ref/#search.findNext)
 - Shift-F3, Shift-Mod-g: [`findPrevious`](https://codemirror.net/6/docs/ref/#search.findPrevious)
 - Mod-Alt-g: [`gotoLine`](https://codemirror.net/6/docs/ref/#search.gotoLine)
 - Mod-d: [`selectNextOccurrence`](https://codemirror.net/6/docs/ref/#search.selectNextOccurrence)
*/
declare const searchKeymap: readonly KeyBinding[];

export { RegExpCursor, SearchCursor, SearchQuery, closeSearchPanel, findNext, findPrevious, getSearchQuery, gotoLine, highlightSelectionMatches, openSearchPanel, replaceAll, replaceNext, search, searchKeymap, searchPanelOpen, selectMatches, selectNextOccurrence, selectSelectionMatches, setSearchQuery };
