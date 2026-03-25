import { escapeForWithinString, getStringFromStrOrFunc } from "./utils/string_utils.js";
/** @internal */
var CommentChar;
(function (CommentChar) {
    CommentChar[CommentChar["Line"] = 0] = "Line";
    CommentChar[CommentChar["Star"] = 1] = "Star";
})(CommentChar || (CommentChar = {}));
// Using the char codes is a performance improvement (about 5.5% faster when writing because it eliminates additional string allocations).
const CHARS = {
    BACK_SLASH: "\\".charCodeAt(0),
    FORWARD_SLASH: "/".charCodeAt(0),
    NEW_LINE: "\n".charCodeAt(0),
    CARRIAGE_RETURN: "\r".charCodeAt(0),
    ASTERISK: "*".charCodeAt(0),
    DOUBLE_QUOTE: "\"".charCodeAt(0),
    SINGLE_QUOTE: "'".charCodeAt(0),
    BACK_TICK: "`".charCodeAt(0),
    OPEN_BRACE: "{".charCodeAt(0),
    CLOSE_BRACE: "}".charCodeAt(0),
    DOLLAR_SIGN: "$".charCodeAt(0),
    SPACE: " ".charCodeAt(0),
    TAB: "\t".charCodeAt(0),
};
const isCharToHandle = new Set([
    CHARS.BACK_SLASH,
    CHARS.FORWARD_SLASH,
    CHARS.NEW_LINE,
    CHARS.CARRIAGE_RETURN,
    CHARS.ASTERISK,
    CHARS.DOUBLE_QUOTE,
    CHARS.SINGLE_QUOTE,
    CHARS.BACK_TICK,
    CHARS.OPEN_BRACE,
    CHARS.CLOSE_BRACE,
]);
/**
 * Code writer that assists with formatting and visualizing blocks of JavaScript or TypeScript code.
 */
class CodeBlockWriter {
    /**
     * Constructor.
     * @param opts - Options for the writer.
     */
    constructor(opts = {}) {
        /** @internal */
        Object.defineProperty(this, "_indentationText", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** @internal */
        Object.defineProperty(this, "_newLine", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** @internal */
        Object.defineProperty(this, "_useTabs", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** @internal */
        Object.defineProperty(this, "_quoteChar", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** @internal */
        Object.defineProperty(this, "_indentNumberOfSpaces", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** @internal */
        Object.defineProperty(this, "_currentIndentation", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** @internal */
        Object.defineProperty(this, "_queuedIndentation", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** @internal */
        Object.defineProperty(this, "_queuedOnlyIfNotBlock", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: void 0
        });
        /** @internal */
        Object.defineProperty(this, "_length", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: 0
        });
        /** @internal */
        Object.defineProperty(this, "_newLineOnNextWrite", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        /** @internal */
        Object.defineProperty(this, "_currentCommentChar", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: undefined
        });
        /** @internal */
        Object.defineProperty(this, "_stringCharStack", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        /** @internal */
        Object.defineProperty(this, "_isInRegEx", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: false
        });
        /** @internal */
        Object.defineProperty(this, "_isOnFirstLineOfBlock", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: true
        });
        // An array of strings is used rather than a single string because it was
        // found to be ~11x faster when printing a 10K line file (~11s to ~1s).
        /** @internal */
        Object.defineProperty(this, "_texts", {
            enumerable: true,
            configurable: true,
            writable: true,
            value: []
        });
        this._newLine = opts.newLine || "\n";
        this._useTabs = opts.useTabs || false;
        this._indentNumberOfSpaces = opts.indentNumberOfSpaces || 4;
        this._indentationText = getIndentationText(this._useTabs, this._indentNumberOfSpaces);
        this._quoteChar = opts.useSingleQuote ? "'" : `"`;
    }
    /**
     * Gets the options.
     */
    getOptions() {
        return {
            indentNumberOfSpaces: this._indentNumberOfSpaces,
            newLine: this._newLine,
            useTabs: this._useTabs,
            useSingleQuote: this._quoteChar === "'",
        };
    }
    queueIndentationLevel(countOrText) {
        this._queuedIndentation = this._getIndentationLevelFromArg(countOrText);
        this._queuedOnlyIfNotBlock = undefined;
        return this;
    }
    /**
     * Writes the text within the provided action with hanging indentation.
     * @param action - Action to perform with hanging indentation.
     */
    hangingIndent(action) {
        return this._withResetIndentation(() => this.queueIndentationLevel(this.getIndentationLevel() + 1), action);
    }
    /**
     * Writes the text within the provided action with hanging indentation unless writing a block.
     * @param action - Action to perform with hanging indentation unless a block is written.
     */
    hangingIndentUnlessBlock(action) {
        return this._withResetIndentation(() => {
            this.queueIndentationLevel(this.getIndentationLevel() + 1);
            this._queuedOnlyIfNotBlock = true;
        }, action);
    }
    setIndentationLevel(countOrText) {
        this._currentIndentation = this._getIndentationLevelFromArg(countOrText);
        return this;
    }
    withIndentationLevel(countOrText, action) {
        return this._withResetIndentation(() => this.setIndentationLevel(countOrText), action);
    }
    /** @internal */
    _withResetIndentation(setStateAction, writeAction) {
        const previousState = this._getIndentationState();
        setStateAction();
        try {
            writeAction();
        }
        finally {
            this._setIndentationState(previousState);
        }
        return this;
    }
    /**
     * Gets the current indentation level.
     */
    getIndentationLevel() {
        return this._currentIndentation;
    }
    /**
     * Writes a block using braces.
     * @param block - Write using the writer within this block.
     */
    block(block) {
        this._newLineIfNewLineOnNextWrite();
        if (this.getLength() > 0 && !this.isLastNewLine()) {
            this.spaceIfLastNot();
        }
        this.inlineBlock(block);
        this._newLineOnNextWrite = true;
        return this;
    }
    /**
     * Writes an inline block with braces.
     * @param block - Write using the writer within this block.
     */
    inlineBlock(block) {
        this._newLineIfNewLineOnNextWrite();
        this.write("{");
        this._indentBlockInternal(block);
        this.newLineIfLastNot().write("}");
        return this;
    }
    indent(timesOrBlock = 1) {
        if (typeof timesOrBlock === "number") {
            this._newLineIfNewLineOnNextWrite();
            return this.write(this._indentationText.repeat(timesOrBlock));
        }
        else {
            this._indentBlockInternal(timesOrBlock);
            if (!this.isLastNewLine()) {
                this._newLineOnNextWrite = true;
            }
            return this;
        }
    }
    /** @internal */
    _indentBlockInternal(block) {
        if (this.getLastChar() != null) {
            this.newLineIfLastNot();
        }
        this._currentIndentation++;
        this._isOnFirstLineOfBlock = true;
        if (block != null) {
            block();
        }
        this._isOnFirstLineOfBlock = false;
        this._currentIndentation = Math.max(0, this._currentIndentation - 1);
    }
    conditionalWriteLine(condition, strOrFunc) {
        if (condition) {
            this.writeLine(getStringFromStrOrFunc(strOrFunc));
        }
        return this;
    }
    /**
     * Writes a line of text.
     * @param text - String to write.
     */
    writeLine(text) {
        this._newLineIfNewLineOnNextWrite();
        if (this.getLastChar() != null) {
            this.newLineIfLastNot();
        }
        this._writeIndentingNewLines(text);
        this.newLine();
        return this;
    }
    /**
     * Writes a newline if the last line was not a newline.
     */
    newLineIfLastNot() {
        this._newLineIfNewLineOnNextWrite();
        if (!this.isLastNewLine()) {
            this.newLine();
        }
        return this;
    }
    /**
     * Writes a blank line if the last written text was not a blank line.
     */
    blankLineIfLastNot() {
        if (!this.isLastBlankLine()) {
            this.blankLine();
        }
        return this;
    }
    /**
     * Writes a blank line if the condition is true.
     * @param condition - Condition to evaluate.
     */
    conditionalBlankLine(condition) {
        if (condition) {
            this.blankLine();
        }
        return this;
    }
    /**
     * Writes a blank line.
     */
    blankLine() {
        return this.newLineIfLastNot().newLine();
    }
    /**
     * Writes a newline if the condition is true.
     * @param condition - Condition to evaluate.
     */
    conditionalNewLine(condition) {
        if (condition) {
            this.newLine();
        }
        return this;
    }
    /**
     * Writes a newline.
     */
    newLine() {
        this._newLineOnNextWrite = false;
        this._baseWriteNewline();
        return this;
    }
    quote(text) {
        this._newLineIfNewLineOnNextWrite();
        this._writeIndentingNewLines(text == null ? this._quoteChar : this._quoteChar + escapeForWithinString(text, this._quoteChar) + this._quoteChar);
        return this;
    }
    /**
     * Writes a space if the last character was not a space.
     */
    spaceIfLastNot() {
        this._newLineIfNewLineOnNextWrite();
        if (!this.isLastSpace()) {
            this._writeIndentingNewLines(" ");
        }
        return this;
    }
    /**
     * Writes a space.
     * @param times - Number of times to write a space.
     */
    space(times = 1) {
        this._newLineIfNewLineOnNextWrite();
        this._writeIndentingNewLines(" ".repeat(times));
        return this;
    }
    /**
     * Writes a tab if the last character was not a tab.
     */
    tabIfLastNot() {
        this._newLineIfNewLineOnNextWrite();
        if (!this.isLastTab()) {
            this._writeIndentingNewLines("\t");
        }
        return this;
    }
    /**
     * Writes a tab.
     * @param times - Number of times to write a tab.
     */
    tab(times = 1) {
        this._newLineIfNewLineOnNextWrite();
        this._writeIndentingNewLines("\t".repeat(times));
        return this;
    }
    conditionalWrite(condition, textOrFunc) {
        if (condition) {
            this.write(getStringFromStrOrFunc(textOrFunc));
        }
        return this;
    }
    /**
     * Writes the provided text.
     * @param text - Text to write.
     */
    write(text) {
        this._newLineIfNewLineOnNextWrite();
        this._writeIndentingNewLines(text);
        return this;
    }
    /**
     * Writes text to exit a comment if in a comment.
     */
    closeComment() {
        const commentChar = this._currentCommentChar;
        switch (commentChar) {
            case CommentChar.Line:
                this.newLine();
                break;
            case CommentChar.Star:
                if (!this.isLastNewLine()) {
                    this.spaceIfLastNot();
                }
                this.write("*/");
                break;
            default: {
                const _assertUndefined = commentChar;
                break;
            }
        }
        return this;
    }
    /**
     * Inserts text at the provided position.
     *
     * This method is "unsafe" because it won't update the state of the writer unless
     * inserting at the end position. It is biased towards being fast at inserting closer
     * to the start or end, but slower to insert in the middle. Only use this if
     * absolutely necessary.
     * @param pos - Position to insert at.
     * @param text - Text to insert.
     */
    unsafeInsert(pos, text) {
        const textLength = this._length;
        const texts = this._texts;
        verifyInput();
        if (pos === textLength) {
            return this.write(text);
        }
        updateInternalArray();
        this._length += text.length;
        return this;
        function verifyInput() {
            if (pos < 0) {
                throw new Error(`Provided position of '${pos}' was less than zero.`);
            }
            if (pos > textLength) {
                throw new Error(`Provided position of '${pos}' was greater than the text length of '${textLength}'.`);
            }
        }
        function updateInternalArray() {
            const { index, localIndex } = getArrayIndexAndLocalIndex();
            if (localIndex === 0) {
                texts.splice(index, 0, text);
            }
            else if (localIndex === texts[index].length) {
                texts.splice(index + 1, 0, text);
            }
            else {
                const textItem = texts[index];
                const startText = textItem.substring(0, localIndex);
                const endText = textItem.substring(localIndex);
                texts.splice(index, 1, startText, text, endText);
            }
        }
        function getArrayIndexAndLocalIndex() {
            if (pos < textLength / 2) {
                // start searching from the front
                let endPos = 0;
                for (let i = 0; i < texts.length; i++) {
                    const textItem = texts[i];
                    const startPos = endPos;
                    endPos += textItem.length;
                    if (endPos >= pos) {
                        return { index: i, localIndex: pos - startPos };
                    }
                }
            }
            else {
                // start searching from the back
                let startPos = textLength;
                for (let i = texts.length - 1; i >= 0; i--) {
                    const textItem = texts[i];
                    startPos -= textItem.length;
                    if (startPos <= pos) {
                        return { index: i, localIndex: pos - startPos };
                    }
                }
            }
            throw new Error("Unhandled situation inserting. This should never happen.");
        }
    }
    /**
     * Gets the length of the string in the writer.
     */
    getLength() {
        return this._length;
    }
    /**
     * Gets if the writer is currently in a comment.
     */
    isInComment() {
        return this._currentCommentChar !== undefined;
    }
    /**
     * Gets if the writer is currently at the start of the first line of the text, block, or indentation block.
     */
    isAtStartOfFirstLineOfBlock() {
        return this.isOnFirstLineOfBlock() && (this.isLastNewLine() || this.getLastChar() == null);
    }
    /**
     * Gets if the writer is currently on the first line of the text, block, or indentation block.
     */
    isOnFirstLineOfBlock() {
        return this._isOnFirstLineOfBlock;
    }
    /**
     * Gets if the writer is currently in a string.
     */
    isInString() {
        return this._stringCharStack.length > 0 && this._stringCharStack[this._stringCharStack.length - 1] !== CHARS.OPEN_BRACE;
    }
    /**
     * Gets if the last chars written were for a newline.
     */
    isLastNewLine() {
        const lastChar = this.getLastChar();
        return lastChar === "\n" || lastChar === "\r";
    }
    /**
     * Gets if the last chars written were for a blank line.
     */
    isLastBlankLine() {
        let foundCount = 0;
        // todo: consider extracting out iterating over past characters, but don't use
        // an iterator because it will be slow.
        for (let i = this._texts.length - 1; i >= 0; i--) {
            const currentText = this._texts[i];
            for (let j = currentText.length - 1; j >= 0; j--) {
                const currentChar = currentText.charCodeAt(j);
                if (currentChar === CHARS.NEW_LINE) {
                    foundCount++;
                    if (foundCount === 2) {
                        return true;
                    }
                }
                else if (currentChar !== CHARS.CARRIAGE_RETURN) {
                    return false;
                }
            }
        }
        return false;
    }
    /**
     * Gets if the last char written was a space.
     */
    isLastSpace() {
        return this.getLastChar() === " ";
    }
    /**
     * Gets if the last char written was a tab.
     */
    isLastTab() {
        return this.getLastChar() === "\t";
    }
    /**
     * Gets the last char written.
     */
    getLastChar() {
        const charCode = this._getLastCharCodeWithOffset(0);
        return charCode == null ? undefined : String.fromCharCode(charCode);
    }
    /**
     * Gets if the writer ends with the provided text.
     * @param text - Text to check if the writer ends with the provided text.
     */
    endsWith(text) {
        const length = this._length;
        return this.iterateLastCharCodes((charCode, index) => {
            const offset = length - index;
            const textIndex = text.length - offset;
            if (text.charCodeAt(textIndex) !== charCode) {
                return false;
            }
            return textIndex === 0 ? true : undefined;
        }) || false;
    }
    /**
     * Iterates over the writer characters in reverse order. The iteration stops when a non-null or
     * undefined value is returned from the action. The returned value is then returned by the method.
     *
     * @remarks It is much more efficient to use this method rather than `#toString()` since `#toString()`
     * will combine the internal array into a string.
     */
    iterateLastChars(action) {
        return this.iterateLastCharCodes((charCode, index) => action(String.fromCharCode(charCode), index));
    }
    /**
     * Iterates over the writer character char codes in reverse order. The iteration stops when a non-null or
     * undefined value is returned from the action. The returned value is then returned by the method.
     *
     * @remarks It is much more efficient to use this method rather than `#toString()` since `#toString()`
     * will combine the internal array into a string. Additionally, this is slightly more efficient that
     * `iterateLastChars` as this won't allocate a string per character.
     */
    iterateLastCharCodes(action) {
        let index = this._length;
        for (let i = this._texts.length - 1; i >= 0; i--) {
            const currentText = this._texts[i];
            for (let j = currentText.length - 1; j >= 0; j--) {
                index--;
                const result = action(currentText.charCodeAt(j), index);
                if (result != null) {
                    return result;
                }
            }
        }
        return undefined;
    }
    /**
     * Gets the writer's text.
     */
    toString() {
        if (this._texts.length > 1) {
            const text = this._texts.join("");
            this._texts.length = 0;
            this._texts.push(text);
        }
        return this._texts[0] || "";
    }
    /** @internal */
    _writeIndentingNewLines(text) {
        text = text || "";
        if (text.length === 0) {
            writeIndividual(this, "");
            return;
        }
        const items = text.split(CodeBlockWriter._newLineRegEx);
        items.forEach((s, i) => {
            if (i > 0) {
                this._baseWriteNewline();
            }
            if (s.length === 0) {
                return;
            }
            writeIndividual(this, s);
        });
        function writeIndividual(writer, s) {
            if (!writer.isInString()) {
                const isAtStartOfLine = writer.isLastNewLine() || writer.getLastChar() == null;
                if (isAtStartOfLine) {
                    writer._writeIndentation();
                }
            }
            writer._updateInternalState(s);
            writer._internalWrite(s);
        }
    }
    /** @internal */
    _baseWriteNewline() {
        if (this._currentCommentChar === CommentChar.Line) {
            this._currentCommentChar = undefined;
        }
        const lastStringCharOnStack = this._stringCharStack[this._stringCharStack.length - 1];
        if ((lastStringCharOnStack === CHARS.DOUBLE_QUOTE || lastStringCharOnStack === CHARS.SINGLE_QUOTE) && this._getLastCharCodeWithOffset(0) !== CHARS.BACK_SLASH) {
            this._stringCharStack.pop();
        }
        this._internalWrite(this._newLine);
        this._isOnFirstLineOfBlock = false;
        this._dequeueQueuedIndentation();
    }
    /** @internal */
    _dequeueQueuedIndentation() {
        if (this._queuedIndentation == null) {
            return;
        }
        if (this._queuedOnlyIfNotBlock && wasLastBlock(this)) {
            this._queuedIndentation = undefined;
            this._queuedOnlyIfNotBlock = undefined;
        }
        else {
            this._currentIndentation = this._queuedIndentation;
            this._queuedIndentation = undefined;
        }
        function wasLastBlock(writer) {
            let foundNewLine = false;
            return writer.iterateLastCharCodes(charCode => {
                switch (charCode) {
                    case CHARS.NEW_LINE:
                        if (foundNewLine) {
                            return false;
                        }
                        else {
                            foundNewLine = true;
                        }
                        break;
                    case CHARS.CARRIAGE_RETURN:
                        return undefined;
                    case CHARS.OPEN_BRACE:
                        return true;
                    default:
                        return false;
                }
            });
        }
    }
    /** @internal */
    _updateInternalState(str) {
        for (let i = 0; i < str.length; i++) {
            const currentChar = str.charCodeAt(i);
            // This is a performance optimization to short circuit all the checks below. If the current char
            // is not in this set then it won't change any internal state so no need to continue and do
            // so many other checks (this made it 3x faster in one scenario I tested).
            if (!isCharToHandle.has(currentChar)) {
                continue;
            }
            const pastChar = i === 0 ? this._getLastCharCodeWithOffset(0) : str.charCodeAt(i - 1);
            const pastPastChar = i === 0 ? this._getLastCharCodeWithOffset(1) : i === 1 ? this._getLastCharCodeWithOffset(0) : str.charCodeAt(i - 2);
            // handle regex
            if (this._isInRegEx) {
                if (pastChar === CHARS.FORWARD_SLASH && pastPastChar !== CHARS.BACK_SLASH || pastChar === CHARS.NEW_LINE) {
                    this._isInRegEx = false;
                }
                else {
                    continue;
                }
            }
            else if (!this.isInString() && !this.isInComment() && isRegExStart(currentChar, pastChar, pastPastChar)) {
                this._isInRegEx = true;
                continue;
            }
            // handle comments
            if (!this.isInString()) {
                if (this._currentCommentChar == null && pastChar === CHARS.FORWARD_SLASH && currentChar === CHARS.FORWARD_SLASH) {
                    this._currentCommentChar = CommentChar.Line;
                }
                else if (this._currentCommentChar == null && pastChar === CHARS.FORWARD_SLASH && currentChar === CHARS.ASTERISK) {
                    this._currentCommentChar = CommentChar.Star;
                }
                else if (this._currentCommentChar === CommentChar.Star && pastChar === CHARS.ASTERISK && currentChar === CHARS.FORWARD_SLASH) {
                    this._currentCommentChar = undefined;
                }
            }
            if (this.isInComment()) {
                continue;
            }
            // handle strings
            const lastStringCharOnStack = this._stringCharStack.length === 0 ? undefined : this._stringCharStack[this._stringCharStack.length - 1];
            if (pastChar !== CHARS.BACK_SLASH && (currentChar === CHARS.DOUBLE_QUOTE || currentChar === CHARS.SINGLE_QUOTE || currentChar === CHARS.BACK_TICK)) {
                if (lastStringCharOnStack === currentChar) {
                    this._stringCharStack.pop();
                }
                else if (lastStringCharOnStack === CHARS.OPEN_BRACE || lastStringCharOnStack === undefined) {
                    this._stringCharStack.push(currentChar);
                }
            }
            else if (pastPastChar !== CHARS.BACK_SLASH && pastChar === CHARS.DOLLAR_SIGN && currentChar === CHARS.OPEN_BRACE && lastStringCharOnStack === CHARS.BACK_TICK) {
                this._stringCharStack.push(currentChar);
            }
            else if (currentChar === CHARS.CLOSE_BRACE && lastStringCharOnStack === CHARS.OPEN_BRACE) {
                this._stringCharStack.pop();
            }
        }
    }
    /** @internal - This is private, but exposed for testing. */
    _getLastCharCodeWithOffset(offset) {
        if (offset >= this._length || offset < 0) {
            return undefined;
        }
        for (let i = this._texts.length - 1; i >= 0; i--) {
            const currentText = this._texts[i];
            if (offset >= currentText.length) {
                offset -= currentText.length;
            }
            else {
                return currentText.charCodeAt(currentText.length - 1 - offset);
            }
        }
        return undefined;
    }
    /** @internal */
    _writeIndentation() {
        const flooredIndentation = Math.floor(this._currentIndentation);
        this._internalWrite(this._indentationText.repeat(flooredIndentation));
        const overflow = this._currentIndentation - flooredIndentation;
        if (this._useTabs) {
            if (overflow > 0.5) {
                this._internalWrite(this._indentationText);
            }
        }
        else {
            const portion = Math.round(this._indentationText.length * overflow);
            // build up the string first, then append it for performance reasons
            let text = "";
            for (let i = 0; i < portion; i++) {
                text += this._indentationText[i];
            }
            this._internalWrite(text);
        }
    }
    /** @internal */
    _newLineIfNewLineOnNextWrite() {
        if (!this._newLineOnNextWrite) {
            return;
        }
        this._newLineOnNextWrite = false;
        this.newLine();
    }
    /** @internal */
    _internalWrite(text) {
        if (text.length === 0) {
            return;
        }
        this._texts.push(text);
        this._length += text.length;
    }
    /** @internal */
    _getIndentationLevelFromArg(countOrText) {
        if (typeof countOrText === "number") {
            if (countOrText < 0) {
                throw new Error("Passed in indentation level should be greater than or equal to 0.");
            }
            return countOrText;
        }
        else if (typeof countOrText === "string") {
            if (!CodeBlockWriter._spacesOrTabsRegEx.test(countOrText)) {
                throw new Error("Provided string must be empty or only contain spaces or tabs.");
            }
            const { spacesCount, tabsCount } = getSpacesAndTabsCount(countOrText);
            return tabsCount + spacesCount / this._indentNumberOfSpaces;
        }
        else {
            throw new Error("Argument provided must be a string or number.");
        }
    }
    /** @internal */
    _setIndentationState(state) {
        this._currentIndentation = state.current;
        this._queuedIndentation = state.queued;
        this._queuedOnlyIfNotBlock = state.queuedOnlyIfNotBlock;
    }
    /** @internal */
    _getIndentationState() {
        return {
            current: this._currentIndentation,
            queued: this._queuedIndentation,
            queuedOnlyIfNotBlock: this._queuedOnlyIfNotBlock,
        };
    }
}
/** @internal */
Object.defineProperty(CodeBlockWriter, "_newLineRegEx", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: /\r?\n/
});
/** @internal */
Object.defineProperty(CodeBlockWriter, "_spacesOrTabsRegEx", {
    enumerable: true,
    configurable: true,
    writable: true,
    value: /^[ \t]*$/
});
export default CodeBlockWriter;
function isRegExStart(currentChar, pastChar, pastPastChar) {
    return pastChar === CHARS.FORWARD_SLASH
        && currentChar !== CHARS.FORWARD_SLASH
        && currentChar !== CHARS.ASTERISK
        && pastPastChar !== CHARS.ASTERISK
        && pastPastChar !== CHARS.FORWARD_SLASH;
}
function getIndentationText(useTabs, numberSpaces) {
    if (useTabs) {
        return "\t";
    }
    return Array(numberSpaces + 1).join(" ");
}
function getSpacesAndTabsCount(str) {
    let spacesCount = 0;
    let tabsCount = 0;
    for (let i = 0; i < str.length; i++) {
        const charCode = str.charCodeAt(i);
        if (charCode === CHARS.SPACE) {
            spacesCount++;
        }
        else if (charCode === CHARS.TAB) {
            tabsCount++;
        }
    }
    return { spacesCount, tabsCount };
}
