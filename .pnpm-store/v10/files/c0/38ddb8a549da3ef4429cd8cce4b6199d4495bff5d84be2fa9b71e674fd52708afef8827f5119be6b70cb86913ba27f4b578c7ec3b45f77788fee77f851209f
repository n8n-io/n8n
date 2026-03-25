import { toPostfix } from './postfix'
import { tokenTypes, ParsedToken } from './token'
export type Constants = Record<string, number>
export function postfixEval(arr: ReturnType<typeof toPostfix>, Constants?: Constants) {
	Constants = Constants || {}
	Constants.PI = Math.PI
	Constants.E = Math.E
	type Item = {
		value: any
		type: tokenTypes
	}
	var stack: (Item | ParsedToken[])[] = [],
		pop1: Item | undefined | ParsedToken[],
		pop2: Item | undefined | ParsedToken[],
		pop3: Item | undefined | ParsedToken[]
	var isRunningUnderSigmaOrPi = typeof Constants.n !== 'undefined'
	for (var i = 0; i < arr.length; i++) {
		if (arr[i].type === 1) {
			stack.push({ value: arr[i].value, type: 1 })
		} else if (arr[i].type === 3) {
			stack.push({ value: Constants[arr[i].value], type: 1 })
		} else if (arr[i].type === 0) {
			const top = stack[stack.length - 1]
			if (Array.isArray(top)) {
				top.push(arr[i])
			} else top.value = arr[i].value(top.value)
		} else if (arr[i].type === 7) {
			const top = stack[stack.length - 1]

			if (Array.isArray(top)) {
				top.push(arr[i])
			} else top.value = arr[i].value(top.value)
		} else if (arr[i].type === 8) {
			var popped = []
			// @ts-ignore
			for (var x = 0; x < arr[i].numberOfArguments; x++) {
				const p = stack.pop()
				// @ts-ignore
				if (p) popped.push(p.value)
			}
			stack.push({ type: 1, value: arr[i].value.apply(arr[i], popped.reverse()) })
		} else if (arr[i].type === 10) {
			pop1 = stack.pop()
			pop2 = stack.pop()
			if (Array.isArray(pop2)) {
				// @ts-ignore
				pop2 = pop2.concat(pop1)
				pop2.push(arr[i])
				stack.push(pop2)
			} else if (Array.isArray(pop1)) {
				// @ts-ignore
				pop1.unshift(pop2)
				pop1.push(arr[i])
				stack.push(pop1)
			} else {
				// @ts-ignore
				stack.push({ type: 1, value: arr[i].value(pop2.value, pop1.value) })
			}
		} else if (arr[i].type === 2 || arr[i].type === 9) {
			pop1 = stack.pop()
			pop2 = stack.pop()
			if (Array.isArray(pop2)) {
				//@ts-ignore
				pop2 = pop2.concat(pop1)
				pop2.push(arr[i])
				stack.push(pop2)
			} else if (Array.isArray(pop1)) {
				//@ts-ignore
				pop1.unshift(pop2)
				pop1.push(arr[i])
				stack.push(pop1)
			} else {
				// @ts-ignore
				stack.push({ type: 1, value: arr[i].value(pop2.value, pop1.value) })
			}
		} else if (arr[i].type === 12) {
			pop1 = stack.pop()
			let pop: Item[]
			if (!Array.isArray(pop1) && pop1) {
				pop = [pop1]
			} else if (pop1) pop = pop1
			else pop = []
			pop2 = stack.pop()
			pop3 = stack.pop()
			// @ts-ignore
			stack.push({ type: 1, value: arr[i].value(pop3.value, pop2.value, pop) })
		} else if (arr[i].type === 13) {
			if (isRunningUnderSigmaOrPi) {
				stack.push({ value: Constants[arr[i].value], type: 3 })
			} else stack.push([arr[i]])
		}
	}
	if (stack.length > 1) {
		throw new Error('Uncaught Syntax error')
	}
	// @ts-ignore
	return parseFloat(stack[0].value.toFixed(15))
}
