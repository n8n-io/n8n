import { getIndentUnit } from '@codemirror/language';
import { Facet, combineConfig, RangeSetBuilder } from '@codemirror/state';
import { ViewPlugin, EditorView, Decoration } from '@codemirror/view';

/**
 * Gets the visible lines in the editor. Lines will not be repeated.
 *
 * @param view - The editor view to get the visible lines from.
 * @param state - The editor state. Defaults to the view's current one.
 */
function getVisibleLines(view, state = view.state) {
    const lines = new Set();
    for (const { from, to } of view.visibleRanges) {
        let pos = from;
        while (pos <= to) {
            const line = state.doc.lineAt(pos);
            if (!lines.has(line)) {
                lines.add(line);
            }
            pos = line.to + 1;
        }
    }
    return lines;
}
/**
 * Gets the line at the position of the primary cursor.
 *
 * @param state - The editor state from which to extract the line.
 */
function getCurrentLine(state) {
    const currentPos = state.selection.main.head;
    return state.doc.lineAt(currentPos);
}
/**
 * Returns the number of columns that a string is indented, controlling for
 * tabs. This is useful for determining the indentation level of a line.
 *
 * Note that this only returns the number of _visible_ columns, not the number
 * of whitespace characters at the start of the string.
 *
 * @param str - The string to check.
 * @param tabSize - The size of a tab character. Usually 2 or 4.
 */
function numColumns(str, tabSize) {
    // as far as I can tell, this is pretty much the fastest way to do this,
    // at least involving iteration. `str.length - str.trimStart().length` is
    // much faster, but it has some edge cases that are hard to deal with.
    let col = 0;
    // eslint-disable-next-line no-restricted-syntax
    loop: for (let i = 0; i < str.length; i++) {
        switch (str[i]) {
            case ' ':
            case '\u00A0': {
                col += 1;
                continue loop;
            }
            case '\t': {
                // if the current column is a multiple of the tab size, we can just
                // add the tab size to the column. otherwise, we need to add the
                // difference between the tab size and the current column.
                col += tabSize - (col % tabSize);
                continue loop;
            }
            case '\r': {
                continue loop;
            }
            default: {
                break loop;
            }
        }
    }
    return col;
}

const indentationMarkerConfig = /*@__PURE__*/Facet.define({
    combine(configs) {
        return combineConfig(configs, {
            highlightActiveBlock: true,
            hideFirstIndent: false,
            markerType: "fullScope",
            thickness: 1,
        });
    }
});

/**
 * Indentation map for a set of lines.
 *
 * This map will contain the indentation for lines that are not a part of the given set,
 * but this is because calculating the indentation for those lines was necessary to
 * calculate the indentation for the lines provided to the constructor.
 *
 * @see {@link IndentEntry}
 */
class IndentationMap {
    /**
     * @param lines - The set of lines to get the indentation map for.
     * @param state - The {@link EditorState} to derive the indentation map from.
     * @param unitWidth - The width of the editor's indent unit.
     * @param markerType - The type of indentation to use (terminate at end of scope vs last line of code in scope)
     */
    constructor(lines, state, unitWidth, markerType) {
        this.lines = lines;
        this.state = state;
        this.map = new Map();
        this.unitWidth = unitWidth;
        this.markerType = markerType;
        for (const line of this.lines) {
            this.add(line);
        }
        if (this.state.facet(indentationMarkerConfig).highlightActiveBlock) {
            this.findAndSetActiveLines();
        }
    }
    /**
     * Checks if the indentation map has an entry for the given line.
     *
     * @param line - The {@link Line} or line number to check for.
     */
    has(line) {
        return this.map.has(typeof line === 'number' ? line : line.number);
    }
    /**
     * Returns the {@link IndentEntry} for the given line.
     *
     * Note that this function will throw an error if the line does not exist in the map.
     *
     * @param line - The {@link Line} or line number to get the entry for.
     */
    get(line) {
        const entry = this.map.get(typeof line === 'number' ? line : line.number);
        if (!entry) {
            throw new Error('Line not found in indentation map');
        }
        return entry;
    }
    /**
     * Sets the {@link IndentEntry} for the given line.
     *
     * @param line - The {@link Line} to set the entry for.
     * @param col - The visual beginning whitespace width of the line.
     * @param level - The indentation level of the line.
     */
    set(line, col, level) {
        const empty = !line.text.trim().length;
        const entry = { line, col, level, empty };
        this.map.set(entry.line.number, entry);
        return entry;
    }
    /**
     * Adds a line to the indentation map.
     *
     * @param line - The {@link Line} to add to the map.
     */
    add(line) {
        if (this.has(line)) {
            return this.get(line);
        }
        // empty lines continue their indentation from surrounding lines
        if (!line.length || !line.text.trim().length) {
            // the very first line, if empty, is just ignored and set as a 0 indent level
            if (line.number === 1) {
                return this.set(line, 0, 0);
            }
            // if we're at the end, we'll just use the previous line's indentation
            if (line.number === this.state.doc.lines) {
                const prev = this.closestNonEmpty(line, -1);
                return this.set(line, 0, prev.level);
            }
            const prev = this.closestNonEmpty(line, -1);
            const next = this.closestNonEmpty(line, 1);
            // if the next line ends the block and the marker type is not set to codeOnly,
            // we'll just use the previous line's indentation
            if (prev.level >= next.level && this.markerType !== "codeOnly") {
                return this.set(line, 0, prev.level);
            }
            // having an indent marker that starts from an empty line looks weird
            if (prev.empty && prev.level === 0 && next.level !== 0) {
                return this.set(line, 0, 0);
            }
            // if the next indentation level is greater than the previous,
            // we'll only increment up to the next indentation level. this prevents
            // a weirdly "backwards propagating" indentation.
            if (next.level > prev.level) {
                return this.set(line, 0, prev.level + 1);
            }
            // else, we default to the next line's indentation
            return this.set(line, 0, next.level);
        }
        const col = numColumns(line.text, this.state.tabSize);
        const level = Math.floor(col / this.unitWidth);
        return this.set(line, col, level);
    }
    /**
     * Finds the closest non-empty line, starting from the given line.
     *
     * @param from - The {@link Line} to start from.
     * @param dir - The direction to search in. Either `1` or `-1`.
     */
    closestNonEmpty(from, dir) {
        let lineNo = from.number + dir;
        while (dir === -1 ? lineNo >= 1 : lineNo <= this.state.doc.lines) {
            if (this.has(lineNo)) {
                const entry = this.get(lineNo);
                if (!entry.empty) {
                    return entry;
                }
            }
            // we can check if the line is empty, if it's not, we can
            // just create a new entry for it and return it.
            // this prevents us from hitting the beginning/end of the document unnecessarily.
            const line = this.state.doc.line(lineNo);
            if (line.text.trim().length) {
                const col = numColumns(line.text, this.state.tabSize);
                const level = Math.floor(col / this.unitWidth);
                return this.set(line, col, level);
            }
            lineNo += dir;
        }
        // if we're here, we didn't find anything.
        // that means we're at the beginning/end of the document,
        // and the first/last line is empty.
        const line = this.state.doc.line(dir === -1 ? 1 : this.state.doc.lines);
        return this.set(line, 0, 0);
    }
    /**
     * Finds the state's active block (via the current selection) and sets all
     * the active indent level for the lines in the block.
     */
    findAndSetActiveLines() {
        const currentLine = getCurrentLine(this.state);
        if (!this.has(currentLine)) {
            return;
        }
        let current = this.get(currentLine);
        // check if the current line is starting a new block, if yes, we want to
        // start from inside the block.
        if (this.has(current.line.number + 1)) {
            const next = this.get(current.line.number + 1);
            if (next.level > current.level) {
                current = next;
            }
        }
        // same, but if the current line is ending a block
        if (this.has(current.line.number - 1)) {
            const prev = this.get(current.line.number - 1);
            if (prev.level > current.level) {
                current = prev;
            }
        }
        if (current.level === 0) {
            return;
        }
        current.active = current.level;
        let start;
        let end;
        // iterate to the start of the block
        for (start = current.line.number; start > 1; start--) {
            if (!this.has(start - 1)) {
                continue;
            }
            const prev = this.get(start - 1);
            if (prev.level < current.level) {
                break;
            }
            prev.active = current.level;
        }
        // iterate to the end of the block
        for (end = current.line.number; end < this.state.doc.lines; end++) {
            if (!this.has(end + 1)) {
                continue;
            }
            const next = this.get(end + 1);
            if (next.level < current.level) {
                break;
            }
            next.active = current.level;
        }
    }
}

// CSS classes:
// - .cm-indent-markers
function indentTheme(colorOptions) {
    const defaultColors = {
        light: '#F0F1F2',
        dark: '#2B3245',
        activeLight: '#E4E5E6',
        activeDark: '#3C445C',
    };
    let colors = defaultColors;
    if (colorOptions) {
        colors = Object.assign(Object.assign({}, defaultColors), colorOptions);
    }
    return EditorView.baseTheme({
        '&light': {
            '--indent-marker-bg-color': colors.light,
            '--indent-marker-active-bg-color': colors.activeLight,
        },
        '&dark': {
            '--indent-marker-bg-color': colors.dark,
            '--indent-marker-active-bg-color': colors.activeDark,
        },
        '.cm-line': {
            position: 'relative',
        },
        // this pseudo-element is used to draw the indent markers,
        // while still allowing the line to have its own background.
        '.cm-indent-markers::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            // .cm-line has a padding of 2px 
            // https://github.com/codemirror/view/blob/1c0a0880fc904714339f059658f3ba3a88bb8e6e/src/theme.ts#L85
            left: `2px`,
            right: 0,
            bottom: 0,
            background: 'var(--indent-markers)',
            pointerEvents: 'none',
            zIndex: '-1',
        },
    });
}
function createGradient(markerCssProperty, thickness, indentWidth, startOffset, columns) {
    const gradient = `repeating-linear-gradient(to right, var(${markerCssProperty}) 0 ${thickness}px, transparent ${thickness}px ${indentWidth}ch)`;
    // Subtract one pixel from the background width to get rid of artifacts of pixel rounding
    return `${gradient} ${startOffset * indentWidth}.5ch/calc(${indentWidth * columns}ch - 1px) no-repeat`;
}
function makeBackgroundCSS(entry, indentWidth, hideFirstIndent, thickness, activeThickness) {
    const { level, active } = entry;
    activeThickness = activeThickness !== null && activeThickness !== void 0 ? activeThickness : thickness;
    if (hideFirstIndent && level === 0) {
        return [];
    }
    const startAt = hideFirstIndent ? 1 : 0;
    const backgrounds = [];
    if (active !== undefined) {
        const markersBeforeActive = active - startAt - 1;
        if (markersBeforeActive > 0) {
            backgrounds.push(createGradient('--indent-marker-bg-color', thickness, indentWidth, startAt, markersBeforeActive));
        }
        backgrounds.push(createGradient('--indent-marker-active-bg-color', activeThickness, indentWidth, active - 1, 1));
        if (active !== level) {
            backgrounds.push(createGradient('--indent-marker-bg-color', thickness, indentWidth, active, level - active));
        }
    }
    else {
        backgrounds.push(createGradient('--indent-marker-bg-color', thickness, indentWidth, startAt, level - startAt));
    }
    return backgrounds.join(',');
}
class IndentMarkersClass {
    constructor(view) {
        this.view = view;
        this.unitWidth = getIndentUnit(view.state);
        this.currentLineNumber = getCurrentLine(view.state).number;
        this.generate(view.state);
    }
    update(update) {
        const unitWidth = getIndentUnit(update.state);
        const unitWidthChanged = unitWidth !== this.unitWidth;
        if (unitWidthChanged) {
            this.unitWidth = unitWidth;
        }
        const lineNumber = getCurrentLine(update.state).number;
        const lineNumberChanged = lineNumber !== this.currentLineNumber;
        this.currentLineNumber = lineNumber;
        const activeBlockUpdateRequired = update.state.facet(indentationMarkerConfig).highlightActiveBlock && lineNumberChanged;
        if (update.docChanged ||
            update.viewportChanged ||
            unitWidthChanged ||
            activeBlockUpdateRequired) {
            this.generate(update.state);
        }
    }
    generate(state) {
        const builder = new RangeSetBuilder();
        const lines = getVisibleLines(this.view, state);
        const { hideFirstIndent, markerType, thickness, activeThickness } = state.facet(indentationMarkerConfig);
        const map = new IndentationMap(lines, state, this.unitWidth, markerType);
        for (const line of lines) {
            const entry = map.get(line.number);
            if (!(entry === null || entry === void 0 ? void 0 : entry.level)) {
                continue;
            }
            const backgrounds = makeBackgroundCSS(entry, this.unitWidth, hideFirstIndent, thickness, activeThickness);
            builder.add(line.from, line.from, Decoration.line({
                class: 'cm-indent-markers',
                attributes: {
                    style: `--indent-markers: ${backgrounds}`,
                },
            }));
        }
        this.decorations = builder.finish();
    }
}
function indentationMarkers(config = {}) {
    return [
        indentationMarkerConfig.of(config),
        indentTheme(config.colors),
        ViewPlugin.fromClass(IndentMarkersClass, {
            decorations: (v) => v.decorations,
        }),
    ];
}

export { indentationMarkers };
