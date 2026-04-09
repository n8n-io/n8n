import { stringWidth } from "../string-width/index.js";
import { stripAnsi } from "../strip-ansi/index.js";
import { ansiStyles } from "../ansi-styles/index.js";
const ESCAPES = new Set(["\u001B", "\u009B"]);
const END_CODE = 39;
const ANSI_ESCAPE_BELL = "\u0007";
const ANSI_CSI = "[";
const ANSI_OSC = "]";
const ANSI_SGR_TERMINATOR = "m";
const ANSI_ESCAPE_LINK = `${ANSI_OSC}8;;`;
const wrapAnsiCode = (code) => `${ESCAPES.values().next().value}${ANSI_CSI}${code}${ANSI_SGR_TERMINATOR}`;
const wrapAnsiHyperlink = (uri) => `${ESCAPES.values().next().value}${ANSI_ESCAPE_LINK}${uri}${ANSI_ESCAPE_BELL}`;
// Calculate the length of words split on ' ', ignoring
// the extra characters added by ansi escape codes
const wordLengths = (str) => str.split(" ").map((character) => stringWidth(character));
// Wrap a long word across multiple rows
// Ansi escape codes do not count towards length
const wrapWord = (rows, word, columns) => {
    const characters = [...word];
    let isInsideEscape = false;
    let isInsideLinkEscape = false;
    let visible = stringWidth(stripAnsi(String(rows[rows.length - 1])));
    for (const [index, character] of characters.entries()) {
        const characterLength = stringWidth(character);
        if (visible + characterLength <= columns) {
            rows[rows.length - 1] += character;
        }
        else {
            rows.push(character);
            visible = 0;
        }
        if (ESCAPES.has(character)) {
            isInsideEscape = true;
            isInsideLinkEscape = characters
                .slice(index + 1)
                .join("")
                .startsWith(ANSI_ESCAPE_LINK);
        }
        if (isInsideEscape) {
            if (isInsideLinkEscape) {
                if (character === ANSI_ESCAPE_BELL) {
                    isInsideEscape = false;
                    isInsideLinkEscape = false;
                }
            }
            else if (character === ANSI_SGR_TERMINATOR) {
                isInsideEscape = false;
            }
            continue;
        }
        visible += characterLength;
        if (visible === columns && index < characters.length - 1) {
            rows.push("");
            visible = 0;
        }
    }
    // It's possible that the last row we copy over is only
    // ansi escape characters, handle this edge-case
    if (!visible && String(rows[rows.length - 1]).length > 0 && rows.length > 1) {
        rows[rows.length - 2] = String(rows[rows.length - 1]) + rows.pop();
    }
};
// Trims spaces from a string ignoring invisible sequences
const stringVisibleTrimSpacesRight = (str) => {
    const words = str.split(" ");
    let last = words.length;
    while (last > 0) {
        if (stringWidth(String(words[last - 1])) > 0) {
            break;
        }
        last--;
    }
    if (last === words.length) {
        return str;
    }
    return words.slice(0, last).join(" ") + words.slice(last).join("");
};
const exec = (str, columns, options = {}) => {
    if (options.trim !== false && str.trim() === "") {
        return "";
    }
    let returnValue = "";
    let escapeCode;
    let escapeUrl;
    const lengths = wordLengths(str);
    let rows = [""];
    for (const [index, word] of str.split(" ").entries()) {
        if (options.trim !== false) {
            rows[rows.length - 1] = String(rows[rows.length - 1]).trimStart();
        }
        let rowLength = stringWidth(String(rows[rows.length - 1]));
        if (index !== 0) {
            if (rowLength >= columns &&
                (options.wordWrap === false || options.trim === false)) {
                // If we start with a new word but the current row length equals the length of the columns, add a new row
                rows.push("");
                rowLength = 0;
            }
            if (rowLength > 0 || options.trim === false) {
                rows[rows.length - 1] += " ";
                rowLength++;
            }
        }
        // In 'hard' wrap mode, the length of a line is never allowed to extend past 'columns'
        const len = Number(lengths[index]);
        if (options.hard && len > columns) {
            const remainingColumns = columns - rowLength;
            const breaksStartingThisLine = 1 + Math.floor((len - remainingColumns - 1) / columns);
            const breaksStartingNextLine = Math.floor((len - 1) / columns);
            if (breaksStartingNextLine < breaksStartingThisLine) {
                rows.push("");
            }
            wrapWord(rows, word, columns);
            continue;
        }
        if (rowLength + len > columns && rowLength > 0 && len > 0) {
            if (options.wordWrap === false && rowLength < columns) {
                wrapWord(rows, word, columns);
                continue;
            }
            rows.push("");
        }
        if (rowLength + len > columns && options.wordWrap === false) {
            wrapWord(rows, word, columns);
            continue;
        }
        rows[rows.length - 1] += word;
    }
    if (options.trim !== false) {
        rows = rows.map((row) => stringVisibleTrimSpacesRight(row));
    }
    const pre = [...rows.join("\n")];
    for (const [index, character] of pre.entries()) {
        returnValue += character;
        if (ESCAPES.has(character)) {
            const { groups } = (new RegExp(`(?:\\${ANSI_CSI}(?<code>\\d+)m|\\${ANSI_ESCAPE_LINK}(?<uri>.*)${ANSI_ESCAPE_BELL})`).exec(pre.slice(index).join("")) || { groups: {} });
            if (groups.code !== undefined) {
                const code = Number.parseFloat(groups.code);
                escapeCode = code === END_CODE ? undefined : code;
            }
            else if (groups.uri !== undefined) {
                escapeUrl = groups.uri.length === 0 ? undefined : groups.uri;
            }
        }
        const code = ansiStyles.codes.get(Number(escapeCode));
        if (pre[index + 1] === "\n") {
            if (escapeUrl) {
                returnValue += wrapAnsiHyperlink("");
            }
            if (escapeCode && code) {
                returnValue += wrapAnsiCode(code);
            }
        }
        else if (character === "\n") {
            if (escapeCode && code) {
                returnValue += wrapAnsiCode(escapeCode);
            }
            if (escapeUrl) {
                returnValue += wrapAnsiHyperlink(escapeUrl);
            }
        }
    }
    return returnValue;
};
// For each newline, invoke the method separately
export const wrap = (str, columns, options) => String(str)
    .normalize()
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => exec(line, columns, options))
    .join("\n");
//# sourceMappingURL=index.js.map