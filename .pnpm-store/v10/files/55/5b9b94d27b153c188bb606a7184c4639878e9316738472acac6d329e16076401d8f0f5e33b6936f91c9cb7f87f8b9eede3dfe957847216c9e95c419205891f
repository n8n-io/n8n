import { isDigit, Delim, Number as NumberToken } from '../../tokenizer/index.js';

const SOLIDUS = 0x002F;  // U+002F SOLIDUS (/)
const FULLSTOP = 0x002E; // U+002E FULL STOP (.)

// Terms of <ratio> should be a positive numbers (not zero or negative)
// (see https://drafts.csswg.org/mediaqueries-3/#values)
// However, -o-min-device-pixel-ratio takes fractional values as a ratio's term
// and this is using by various sites. Therefore we relax checking on parse
// to test a term is unsigned number without an exponent part.
// Additional checking may be applied on lexer validation.
function consumeNumber() {
    this.skipSC();

    const value = this.consume(NumberToken);

    for (let i = 0; i < value.length; i++) {
        const code = value.charCodeAt(i);
        if (!isDigit(code) && code !== FULLSTOP) {
            this.error('Unsigned number is expected', this.tokenStart - value.length + i);
        }
    }

    if (Number(value) === 0) {
        this.error('Zero number is not allowed', this.tokenStart - value.length);
    }

    return value;
}

export const name = 'Ratio';
export const structure = {
    left: String,
    right: String
};

// <positive-integer> S* '/' S* <positive-integer>
export function parse() {
    const start = this.tokenStart;
    const left = consumeNumber.call(this);
    let right;

    this.skipSC();
    this.eatDelim(SOLIDUS);
    right = consumeNumber.call(this);

    return {
        type: 'Ratio',
        loc: this.getLocation(start, this.tokenStart),
        left,
        right
    };
}

export function generate(node) {
    this.token(NumberToken, node.left);
    this.token(Delim, '/');
    this.token(NumberToken, node.right);
}
