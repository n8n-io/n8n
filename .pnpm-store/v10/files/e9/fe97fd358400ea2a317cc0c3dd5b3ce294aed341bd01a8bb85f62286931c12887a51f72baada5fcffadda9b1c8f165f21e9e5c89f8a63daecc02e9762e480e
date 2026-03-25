/* eslint-disable no-control-regex */

// used to make CSS selectors remain scoped properly
export default function scoper(css: string, suffix: string) {
	const re = /([^\r\n,{}]+)(,(?=[^}]*{)|s*{)/g

	// `after` is going to contain eithe a comma or an opening curly bracket
	css = css.replace(re, function (full: string, selector: string, after: string) {
		// if non-rule delimiter
		if (selector.match(/^\s*(@media|@keyframes|to|from|@font-face)/)) {
			return selector + after
		}

		// don't scope the part of the selector after ::v-deep
		const arrayDeep = /(.*)(::v-deep|>>>|\/deep\/)(.*)/g.exec(selector)
		if (arrayDeep) {
			const [, beforeVDeep, , afterVDeep] = arrayDeep
			selector = beforeVDeep
			after = (afterVDeep + after).trim()
		}

		// deal with :scope pseudo selectors
		if (selector && selector.match(/:scope/)) {
			selector = selector.replace(/([^\s]*):scope/, function (ful: string, cutSelector: string) {
				if (cutSelector === '') {
					return '> *'
				}
				return '> ' + cutSelector
			})
		}

		selector = selector.split(/\s+/).filter(part => !!part).map(part => {
			// combinators
			if (/^[>~+]$/.test(part)) {
				return part
			}

			// deal with other pseudo selectors
			const [main, ...rest] = part.split(/:{1,2}/)
			let pseudo = rest.map(piece => `:${piece}`).join('')
			return main + suffix + pseudo
		}).join(' ')

		return selector + ' ' + after
	})

	return css
}
