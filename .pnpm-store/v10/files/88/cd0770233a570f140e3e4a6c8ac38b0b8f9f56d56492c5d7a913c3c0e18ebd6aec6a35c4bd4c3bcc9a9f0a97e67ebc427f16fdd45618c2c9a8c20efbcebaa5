import { lex } from './lexer'
import { ParsedToken } from './token'
export function toPostfix(arr: ReturnType<typeof lex>) {
	'use strict'
	var post: ParsedToken[] = [],
		elem,
		popped,
		previousPrecedence = -1,
		precedence = -1,
		ele
	var stack: ParsedToken[] = [{ value: '(', type: 4, precedence: 0, show: '(' }]
	for (var i = 1; i < arr.length; i++) {
		if (arr[i].type === 1 || arr[i].type === 3 || arr[i].type === 13) {
			//if token is number,constant,or n(which is also a special constant in our case)
			if (arr[i].type === 1) arr[i].value = Number(arr[i].value)
			post.push(arr[i])
		} else if (arr[i].type === 4) {
			stack.push(arr[i])
		} else if (arr[i].type === 5) {
			while ((popped = stack.pop())?.type !== 4) {
				if (popped) post.push(popped)
			}
		} else if (arr[i].type === 11) {
			while ((popped = stack.pop())?.type !== 4) {
				if (popped) post.push(popped)
			}
			// @ts-ignore
			stack.push(popped)
		} else {
			elem = arr[i]
			precedence = elem.precedence
			ele = stack[stack.length - 1]
			previousPrecedence = ele.precedence
			var flag = ele.value == 'Math.pow' && elem.value == 'Math.pow'
			if (precedence > previousPrecedence) stack.push(elem)
			else {
				while ((previousPrecedence >= precedence && !flag) || (flag && precedence < previousPrecedence)) {
					popped = stack.pop()
					ele = stack[stack.length - 1]
					if (popped) post.push(popped)
					previousPrecedence = ele.precedence
					flag = elem.value == 'Math.pow' && ele.value == 'Math.pow'
				}
				stack.push(elem)
			}
		}
	}
	return post
}
