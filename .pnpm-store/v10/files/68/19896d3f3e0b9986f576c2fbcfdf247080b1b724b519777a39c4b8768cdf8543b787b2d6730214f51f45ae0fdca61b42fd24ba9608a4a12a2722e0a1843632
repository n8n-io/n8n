import { EditorState, Line } from '@codemirror/state';
import { getCurrentLine, numColumns } from './utils';
import {indentationMarkerConfig} from "./config";

export interface IndentEntry {
  line: Line;
  col: number;
  level: number;
  empty: boolean;
  active?: number;
}

/**
 * Indentation map for a set of lines.
 *
 * This map will contain the indentation for lines that are not a part of the given set,
 * but this is because calculating the indentation for those lines was necessary to
 * calculate the indentation for the lines provided to the constructor.
 *
 * @see {@link IndentEntry}
 */
export class IndentationMap {
  /** The {@link EditorState} indentation is derived from. */
  private state: EditorState;

  /** The set of lines that are used as an entrypoint. */
  private lines: Set<Line>;

  /** The internal mapping of line numbers to {@link IndentEntry} objects. */
  private map: Map<number, IndentEntry>;

  /** The width of the editor's indent unit. */
  private unitWidth: number;

  /** The type of indentation to use (terminate at end of scope vs last non-empty line in scope) */
  private markerType: "fullScope" | "codeOnly";

  /**
   * @param lines - The set of lines to get the indentation map for.
   * @param state - The {@link EditorState} to derive the indentation map from.
   * @param unitWidth - The width of the editor's indent unit.
   * @param markerType - The type of indentation to use (terminate at end of scope vs last line of code in scope)
   */
  constructor(lines: Set<Line>, state: EditorState, unitWidth: number, markerType: "fullScope" | "codeOnly") {
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
  has(line: Line | number) {
    return this.map.has(typeof line === 'number' ? line : line.number);
  }

  /**
   * Returns the {@link IndentEntry} for the given line.
   *
   * Note that this function will throw an error if the line does not exist in the map.
   *
   * @param line - The {@link Line} or line number to get the entry for.
   */
  get(line: Line | number) {
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
  private set(line: Line, col: number, level: number) {
    const empty = !line.text.trim().length;
    const entry: IndentEntry = { line, col, level, empty };
    this.map.set(entry.line.number, entry);

    return entry;
  }

  /**
   * Adds a line to the indentation map.
   *
   * @param line - The {@link Line} to add to the map.
   */
  private add(line: Line) {
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
      if (prev.level >= next.level && this.markerType !== "codeOnly" ) {
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
  private closestNonEmpty(from: Line, dir: -1 | 1) {
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
  private findAndSetActiveLines() {
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

    let start: number;
    let end: number;

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
