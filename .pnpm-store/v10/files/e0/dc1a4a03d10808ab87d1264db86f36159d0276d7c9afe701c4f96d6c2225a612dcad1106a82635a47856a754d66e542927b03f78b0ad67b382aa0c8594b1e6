"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.biggestWordInSentence = exports.textWithPadding = exports.splitTextIntoTextsOfMinLen = void 0;
const console_utils_1 = require("./console-utils");
// ("How are you?",10) => ["How are ", "you?"]
const splitTextIntoTextsOfMinLen = (inpStr, width, charLength) => {
    const ret = [];
    const lines = inpStr.split(/[\n\r]/);
    lines.forEach((line) => {
        const spaceSeparatedStrings = line.split(' ');
        let now = [];
        let cnt = 0;
        spaceSeparatedStrings.forEach((strWithoutSpace) => {
            const consoleWidth = (0, console_utils_1.findWidthInConsole)(strWithoutSpace, charLength);
            if (cnt + consoleWidth <= width) {
                cnt += consoleWidth + 1; // 1 for the space
                now.push(strWithoutSpace);
            }
            else {
                if (now.length > 0)
                    ret.push(now.join(' '));
                now = [strWithoutSpace];
                cnt = consoleWidth + 1;
            }
        });
        ret.push(now.join(' '));
    });
    return ret;
};
exports.splitTextIntoTextsOfMinLen = splitTextIntoTextsOfMinLen;
// ("How are you?",center, 20) => "    How are you?    "
// ("How are you?",right, 20)  => "        How are you?"
// ("How are you?",center, 4)  => "How\nare\nyou?"
const textWithPadding = (text, alignment, columnLen, charLength) => {
    const curTextSize = (0, console_utils_1.findWidthInConsole)(text, charLength);
    // alignments for center padding case
    const leftPadding = Math.floor((columnLen - curTextSize) / 2);
    const rightPadding = columnLen - leftPadding - curTextSize;
    // handle edge cases where the text size is larger than the column length
    if (columnLen < curTextSize) {
        const splittedLines = (0, exports.splitTextIntoTextsOfMinLen)(text, columnLen);
        if (splittedLines.length === 1) {
            return text;
        }
        return splittedLines
            .map((singleLine) => (0, exports.textWithPadding)(singleLine, alignment, columnLen, charLength))
            .join('\n');
    }
    // console.log(text, columnLen, curTextSize);
    switch (alignment) {
        case 'left':
            return text.concat(' '.repeat(columnLen - curTextSize));
        case 'center':
            return ' '
                .repeat(leftPadding)
                .concat(text)
                .concat(' '.repeat(rightPadding));
        case 'right':
        default:
            return ' '.repeat(columnLen - curTextSize).concat(text);
    }
};
exports.textWithPadding = textWithPadding;
// ("How are you?",10) => ["How are ", "you?"]
const biggestWordInSentence = (inpStr, charLength) => inpStr
    .split(' ')
    .reduce((a, b) => Math.max(a, (0, console_utils_1.findWidthInConsole)(b, charLength)), 0);
exports.biggestWordInSentence = biggestWordInSentence;
