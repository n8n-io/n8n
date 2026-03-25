import scoper from './styleScoper'

describe('styleScoper', () => {
	it('should scope css selectors', () => {
		const scopedCSS = scoper(`.bonjour{color:blue;}`, '[test]')
		expect(scopedCSS).toBe('.bonjour[test] {color:blue;}')
	})

	it('should scope css pseudo selectors', () => {
		const scopedCSS = scoper(`.bonjour:before, .hello:hover::after{color:blue;}`, '[test]')
		expect(scopedCSS).toBe('.bonjour[test]:before ,.hello[test]:hover:after {color:blue;}')
	})

	it('should scope multiple css selectors', () => {
		const scopedCSS = scoper(`.bonjour, .hello{color:blue;}`, '[test]')
		expect(scopedCSS).toBe('.bonjour[test] ,.hello[test] {color:blue;}')
	})

	it('should scope multiple chained css selectors', () => {
		const scopedCSS = scoper(`.bonjour .hello{color:blue;}`, '[test]')
		expect(scopedCSS).toBe('.bonjour[test] .hello[test] {color:blue;}')
	})

	it.each(['::v-deep', '>>>', '/deep/'])('should not scope deep selector : %s', selector => {
		const scopedCSS = scoper(
			`.bonjour .hello ${selector} .deepClass, .salut .goodbye ${selector} .deepClass{color:blue;}`,
			'[test]'
		)
		expect(scopedCSS).toBe(
			'.bonjour[test] .hello[test] .deepClass,.salut[test] .goodbye[test] .deepClass{color:blue;}'
		)
	})

	it('should scope css with selector combinators', () => {
		const scopedCSS = scoper(`.bonjour > .hello + .salut ~ .goodbye {color:blue;}`, '[test]')
		expect(scopedCSS).toBe(
			'.bonjour[test] > .hello[test] + .salut[test] ~ .goodbye[test] {color:blue;}'
		)
	})
})
