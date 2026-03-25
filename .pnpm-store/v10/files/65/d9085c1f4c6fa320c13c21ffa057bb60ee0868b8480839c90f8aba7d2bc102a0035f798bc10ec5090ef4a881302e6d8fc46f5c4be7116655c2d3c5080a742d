import { lex, addToken } from './lexer'
import { tokenTypes, Token, createTokens } from './token'
import { toPostfix } from './postfix'
import { postfixEval, Constants } from './postfix_evaluator'
import { createMathFunctions } from './functions'
;('use strict')
// var Mexp = function (parsed) {
//   this.value = parsed
// }
class Mexp {
	static TOKEN_TYPES = tokenTypes
	static tokenTypes = tokenTypes
	tokens!: Token[]
	toPostfix = toPostfix
	addToken = addToken
	lex = lex
	postfixEval = postfixEval
	eval(string: string, tokens?: Token[], Constants?: Constants) {
		return this.postfixEval(this.toPostfix(this.lex(string, tokens)), Constants)
	}
	math!: ReturnType<typeof createMathFunctions>
	constructor() {
		this.math = createMathFunctions(this)
		this.tokens = createTokens(this)
	}

	// static Exception =   function (message) {
	//   this.message = message
	// }
}
export default Mexp
