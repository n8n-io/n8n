import { EditorState, Line } from '@codemirror/state';
import { EditorView } from '@codemirror/view';

/**
 * Gets the visible lines in the editor. Lines will not be repeated.
 *
 * @param view - The editor view to get the visible lines from.
 * @param state - The editor state. Defaults to the view's current one.
 */
export function getVisibleLines(view: EditorView, state = view.state) {
  const lines = new Set<Line>();

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
export function getCurrentLine(state: EditorState) {
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
export function numColumns(str: string, tabSize: number) {
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
