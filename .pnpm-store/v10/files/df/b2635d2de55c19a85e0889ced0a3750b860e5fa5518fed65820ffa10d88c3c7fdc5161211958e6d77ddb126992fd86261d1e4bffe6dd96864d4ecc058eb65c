const {EOL} = require('os');
const {addInspection, messageGap} = require('./utils');

const parsingErrorCode = {
    unclosedMLC: 0, // Unclosed multi-line comment.
    unclosedText: 1, // Unclosed text block.
    unclosedQI: 2, // Unclosed quoted identifier.
    multiLineQI: 3 // Multi-line quoted identifiers are not supported.
};

Object.freeze(parsingErrorCode);

const errorMessages = [
    {name: 'unclosedMLC', message: 'Unclosed multi-line comment.'},
    {name: 'unclosedText', message: 'Unclosed text block.'},
    {name: 'unclosedQI', message: 'Unclosed quoted identifier.'},
    {name: 'multiLineQI', message: 'Multi-line quoted identifiers are not supported.'}
];

class SQLParsingError extends Error {
    constructor(code, position) {
        const err = errorMessages[code].message;
        const message = `Error parsing SQL at {line:${position.line},col:${position.column}}: ${err}`;
        super(message);
        this.name = this.constructor.name;
        this.error = err;
        this.code = code;
        this.position = position;
        Error.captureStackTrace(this, this.constructor);
    }
}

SQLParsingError.prototype.toString = function (level) {
    level = level > 0 ? parseInt(level) : 0;
    const gap = messageGap(level + 1);
    const lines = [
        'SQLParsingError {',
        `${gap}code: parsingErrorCode.${errorMessages[this.code].name}`,
        `${gap}error: "${this.error}"`,
        `${gap}position: {line: ${this.position.line}, col: ${this.position.column}}`,
        `${messageGap(level)}}`
    ];
    return lines.join(EOL);
};

addInspection(SQLParsingError.prototype, function () {
    return this.toString();
});

module.exports = {
    SQLParsingError,
    parsingErrorCode
};
