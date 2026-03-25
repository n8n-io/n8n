import { ParsedToken } from './token'
import Mexp from './index'
export const createMathFunctions = (mexp: Mexp) => ({
	isDegree: true, // mode of calculator
	acos: function (x: number) {
		return mexp.math.isDegree ? (180 / Math.PI) * Math.acos(x) : Math.acos(x)
	},
	add: function (a: number, b: number) {
		return a + b
	},
	asin: function (x: number) {
		return mexp.math.isDegree ? (180 / Math.PI) * Math.asin(x) : Math.asin(x)
	},
	atan: function (x: number) {
		return mexp.math.isDegree ? (180 / Math.PI) * Math.atan(x) : Math.atan(x)
	},
	acosh: function (x: number) {
		return Math.log(x + Math.sqrt(x * x - 1))
	},
	asinh: function (x: number) {
		return Math.log(x + Math.sqrt(x * x + 1))
	},
	atanh: function (x: number) {
		return Math.log((1 + x) / (1 - x))
	},
	C: function (n: number, r: number) {
		var pro = 1
		var other = n - r
		var choice = r
		if (choice < other) {
			choice = other
			other = r
		}
		for (var i = choice + 1; i <= n; i++) {
			pro *= i
		}
		const temp = mexp.math.fact(other)
		if (temp === 'NaN') return 'NaN'
		return pro / temp
	},
	changeSign: function (x: number) {
		return -x
	},
	cos: function (x: number) {
		if (mexp.math.isDegree) x = mexp.math.toRadian(x)
		return Math.cos(x)
	},
	cosh: function (x: number) {
		return (Math.pow(Math.E, x) + Math.pow(Math.E, -1 * x)) / 2
	},
	div: function (a: number, b: number) {
		return a / b
	},
	fact: function (n: number) {
		if (n % 1 !== 0) return 'NaN'
		var pro = 1
		for (var i = 2; i <= n; i++) {
			pro *= i
		}
		return pro
	},
	inverse: function (x: number) {
		return 1 / x
	},
	log: function (i: number) {
		return Math.log(i) / Math.log(10)
	},
	mod: function (a: number, b: number) {
		return a % b
	},
	mul: function (a: number, b: number) {
		return a * b
	},
	P: function (n: number, r: number) {
		var pro = 1
		for (var i = Math.floor(n) - Math.floor(r) + 1; i <= Math.floor(n); i++) {
			pro *= i
		}
		return pro
	},
	Pi: function (low: number, high: number, ex: ParsedToken[]) {
		var pro = 1
		for (var i = low; i <= high; i++) {
			pro *= Number(
				mexp.postfixEval(ex, {
					n: i,
				})
			)
		}
		return pro
	},
	pow10x: function (e: number) {
		var x = 1
		while (e--) {
			x *= 10
		}
		return x
	},
	sigma: function (low: number, high: number, ex: ParsedToken[]) {
		var sum = 0
		for (var i = low; i <= high; i++) {
			sum += Number(
				mexp.postfixEval(ex, {
					n: i,
				})
			)
		}
		return sum
	},
	sin: function (x: number) {
		if (mexp.math.isDegree) x = mexp.math.toRadian(x)
		return Math.sin(x)
	},
	sinh: function (x: number) {
		return (Math.pow(Math.E, x) - Math.pow(Math.E, -1 * x)) / 2
	},
	sub: function (a: number, b: number) {
		return a - b
	},
	tan: function (x: number) {
		if (mexp.math.isDegree) x = mexp.math.toRadian(x)
		return Math.tan(x)
	},
	tanh: function (x: number) {
		return mexp.math.sinh(x) / mexp.math.cosh(x)
	},
	toRadian: function (x: number) {
		return (x * Math.PI) / 180
	},
	and: function (a: number, b: number) {
		return a & b
	},
})
