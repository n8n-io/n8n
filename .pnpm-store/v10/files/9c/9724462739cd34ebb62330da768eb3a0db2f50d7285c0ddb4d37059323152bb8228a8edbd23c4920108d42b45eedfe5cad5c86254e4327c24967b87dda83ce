import Mexp from './index'
export type Token = {
	type: tokenTypes
	value: any
	token: string
	numberOfArguments?: number
	show: string
	precedence: number
}

type RawToken = Omit<Token, 'precedence'>
export type ParsedToken = Omit<Token, 'token'> & { hasDec?: true }

export const preced: { [key in tokenTypes]: number } = {
	0: 11,
	1: 0,
	2: 3,
	3: 0,
	4: 0,
	5: 0,
	6: 0,
	7: 11,
	8: 11,
	9: 1,
	10: 10,
	11: 0,
	12: 11,
	13: 0,
	14: -1,
} // stores precedence by types

export const createTokens = (mexp: Mexp) => {
	var rawTokens: RawToken[] = [
		{ token: 'sin', show: 'sin', type: 0, value: mexp.math.sin },
		{ token: 'cos', show: 'cos', type: 0, value: mexp.math.cos },
		{ token: 'tan', show: 'tan', type: 0, value: mexp.math.tan },
		{ token: 'pi', show: '&pi;', type: 3, value: 'PI' },
		{ token: '(', show: '(', type: 4, value: '(' },
		{ token: ')', show: ')', type: 5, value: ')' },
		{ token: 'P', show: 'P', type: 10, value: mexp.math.P },
		{ token: 'C', show: 'C', type: 10, value: mexp.math.C },
		{ token: ' ', show: ' ', type: 14, value: ' '.anchor },
		{ token: 'asin', show: 'asin', type: 0, value: mexp.math.asin },
		{ token: 'acos', show: 'acos', type: 0, value: mexp.math.acos },
		{ token: 'atan', show: 'atan', type: 0, value: mexp.math.atan },
		{ token: '7', show: '7', type: 1, value: '7' },
		{ token: '8', show: '8', type: 1, value: '8' },
		{ token: '9', show: '9', type: 1, value: '9' },
		{ token: 'int', show: 'Int', type: 0, value: Math.floor },
		{ token: 'cosh', show: 'cosh', type: 0, value: mexp.math.cosh },
		{ token: 'acosh', show: 'acosh', type: 0, value: mexp.math.acosh },
		{ token: 'ln', show: ' ln', type: 0, value: Math.log },
		{ token: '^', show: '^', type: 10, value: Math.pow },
		{ token: 'root', show: 'root', type: 0, value: Math.sqrt },
		{ token: '4', show: '4', type: 1, value: '4' },
		{ token: '5', show: '5', type: 1, value: '5' },
		{ token: '6', show: '6', type: 1, value: '6' },
		{ token: '/', show: '&divide;', type: 2, value: mexp.math.div },
		{ token: '!', show: '!', type: 7, value: mexp.math.fact },
		{ token: 'tanh', show: 'tanh', type: 0, value: mexp.math.tanh },
		{ token: 'atanh', show: 'atanh', type: 0, value: mexp.math.atanh },
		{ token: 'Mod', show: ' Mod ', type: 2, value: mexp.math.mod },
		{ token: '1', show: '1', type: 1, value: '1' },
		{ token: '2', show: '2', type: 1, value: '2' },
		{ token: '3', show: '3', type: 1, value: '3' },
		{ token: '*', show: '&times;', type: 2, value: mexp.math.mul },
		{ token: 'sinh', show: 'sinh', type: 0, value: mexp.math.sinh },
		{ token: 'asinh', show: 'asinh', type: 0, value: mexp.math.asinh },
		{ token: 'e', show: 'e', type: 3, value: 'E' },
		{ token: 'log', show: ' log', type: 0, value: mexp.math.log },
		{ token: '0', show: '0', type: 1, value: '0' },
		{ token: '.', show: '.', type: 6, value: '.' },
		{ token: '+', show: '+', type: 9, value: mexp.math.add },
		{ token: '-', show: '-', type: 9, value: mexp.math.sub },
		{ token: ',', show: ',', type: 11, value: ',' },
		{ token: 'Sigma', show: '&Sigma;', type: 12, value: mexp.math.sigma },
		{ token: 'n', show: 'n', type: 13, value: 'n' },
		{ token: 'Pi', show: '&Pi;', type: 12, value: mexp.math.Pi },
		{ token: 'pow', show: 'pow', type: 8, value: Math.pow, numberOfArguments: 2 },
		{ token: '&', show: '&', type: 9, value: mexp.math.and },
	]
	return rawTokens.map((rawToken) => ({
		...rawToken,
		precedence: preced[rawToken.type],
	}))
}
export enum tokenTypes {
	FUNCTION_WITH_ONE_ARG = 0,
	NUMBER = 1,
	BINARY_OPERATOR_HIGH_PRECENDENCE = 2,
	CONSTANT = 3,
	OPENING_PARENTHESIS = 4,
	CLOSING_PARENTHESIS = 5,
	DECIMAL = 6,
	POSTFIX_FUNCTION_WITH_ONE_ARG = 7,
	FUNCTION_WITH_N_ARGS = 8,
	BINARY_OPERATOR_LOW_PRECENDENCE = 9,
	BINARY_OPERATOR_PERMUTATION = 10,
	COMMA = 11,
	EVALUATED_FUNCTION = 12,
	EVALUATED_FUNCTION_PARAMETER = 13,
	SPACE = 14,
}
