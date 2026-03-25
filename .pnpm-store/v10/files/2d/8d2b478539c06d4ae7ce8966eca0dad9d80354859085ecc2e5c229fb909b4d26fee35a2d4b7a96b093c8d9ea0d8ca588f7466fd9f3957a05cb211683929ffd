const {parsingErrorCode, SQLParsingError} = require('./error');
const {getIndexPos} = require('./utils');

// symbols that need no spaces around them:
const compressors = '.,;:()[]=<>+-*/|!?@#';

////////////////////////////////////////////
// Parses and minimizes a PostgreSQL script.
function minify(sql, options) {

    if (typeof sql !== 'string') {
        throw new TypeError('Input SQL must be a text string.');
    }

    if (!sql.length) {
        return '';
    }

    sql = sql.replace(/\r\n/g, '\n');

    options = options || {};

    let idx = 0, // current index
        result = '', // resulting sql
        space = false; // add a space on the next step

    const len = sql.length;

    do {
        const s = sql[idx], // current symbol;
            s1 = sql[idx + 1]; // next symbol;

        if (isGap(s)) {
            while (++idx < len && isGap(sql[idx])) ;
            if (idx < len) {
                space = true;
            }
            idx--;
            continue;
        }

        if (s === '-' && s1 === '-') {
            const lb = sql.indexOf('\n', idx + 2);
            if (lb < 0) {
                break;
            }
            idx = lb - 1;
            skipGaps();
            continue;
        }

        if (s === '/' && s1 === '*') {
            let c = idx + 1, open = 0, close = 0, lastOpen, lastClose;
            while (++c < len - 1 && close <= open) {
                if (sql[c] === '/' && sql[c + 1] === '*') {
                    lastOpen = c;
                    open++;
                    c++;
                } else {
                    if (sql[c] === '*' && sql[c + 1] === '/') {
                        lastClose = c;
                        close++;
                        c++;
                    }
                }
            }
            if (close <= open) {
                idx = lastOpen;
                throwError(parsingErrorCode.unclosedMLC);
            }
            if (sql[idx + 2] === '!' && !options.removeAll) {
                if (options.compress) {
                    space = false;
                }
                addSpace();
                result += sql.substring(idx, lastClose + 2)
                    .replace(/\n/g, '\r\n');
            }
            idx = lastClose + 1;
            skipGaps();
            continue;
        }

        let closeIdx, text;

        if (s === '"') {
            closeIdx = sql.indexOf('"', idx + 1);
            if (closeIdx < 0) {
                throwError(parsingErrorCode.unclosedQI);
            }
            text = sql.substring(idx, closeIdx + 1);
            if (text.indexOf('\n') > 0) {
                throwError(parsingErrorCode.multiLineQI);
            }
            if (options.compress) {
                space = false;
            }
            addSpace();
            result += text;
            idx = closeIdx;
            skipGaps();
            continue;
        }

        if (s === '\'') {
            closeIdx = idx;
            do {
                closeIdx = sql.indexOf('\'', closeIdx + 1);
                if (closeIdx > 0) {
                    let i = closeIdx;
                    while (sql[--i] === '\\') ;
                    if ((closeIdx - i) % 2) {
                        let step = closeIdx;
                        while (++step < len && sql[step] === '\'') ;
                        if ((step - closeIdx) % 2) {
                            closeIdx = step - 1;
                            break;
                        }
                        closeIdx = step === len ? -1 : step;
                    }
                }
            } while (closeIdx > 0);
            if (closeIdx < 0) {
                throwError(parsingErrorCode.unclosedText);
            }
            if (options.compress) {
                space = false;
            }
            addSpace();
            text = sql.substring(idx, closeIdx + 1);
            const hasLB = text.indexOf('\n') > 0;
            if (hasLB) {
                text = text.split('\n').map(m => {
                    return m.replace(/^\s+|\s+$/g, '');
                }).join('\\n');
            }
            const hasTabs = text.indexOf('\t') > 0;
            if (hasLB || hasTabs) {
                const prev = idx ? sql[idx - 1] : '';
                if (prev !== 'E' && prev !== 'e') {
                    const r = result ? result[result.length - 1] : '';
                    if (r && r !== ' ' && compressors.indexOf(r) < 0) {
                        result += ' ';
                    }
                    result += 'E';
                }
                if (hasTabs) {
                    text = text.replace(/\t/g, '\\t');
                }
            }
            result += text;
            idx = closeIdx;
            skipGaps();
            continue;
        }

        if (options.compress && compressors.indexOf(s) >= 0) {
            space = false;
            skipGaps();
        }

        addSpace();
        result += s;

    } while (++idx < len);

    return result;

    function skipGaps() {
        if (options.compress) {
            while (idx < len - 1 && isGap(sql[idx + 1]) && idx++) ;
        }
    }

    function addSpace() {
        if (space) {
            if (result.length) {
                result += ' ';
            }
            space = false;
        }
    }

    function throwError(code) {
        const position = getIndexPos(sql, idx);
        throw new SQLParsingError(code, position);
    }
}

////////////////////////////////////
// Identifies a gap / empty symbol.
function isGap(s) {
    return s === ' ' || s === '\t' || s === '\r' || s === '\n';
}

module.exports = minify;
