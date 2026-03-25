import { addToken } from './lexer';
import { tokenTypes, Token } from './token';
import { toPostfix } from './postfix';
import { postfixEval, Constants } from './postfix_evaluator';
import { createMathFunctions } from './functions';
declare class Mexp {
    static TOKEN_TYPES: typeof tokenTypes;
    static tokenTypes: typeof tokenTypes;
    tokens: Token[];
    toPostfix: typeof toPostfix;
    addToken: typeof addToken;
    lex: (this: Mexp, inp: string, tokens?: Token[] | undefined) => import("./token").ParsedToken[];
    postfixEval: typeof postfixEval;
    eval(string: string, tokens?: Token[], Constants?: Constants): number;
    math: ReturnType<typeof createMathFunctions>;
    constructor();
}
export default Mexp;
//# sourceMappingURL=index.d.ts.map