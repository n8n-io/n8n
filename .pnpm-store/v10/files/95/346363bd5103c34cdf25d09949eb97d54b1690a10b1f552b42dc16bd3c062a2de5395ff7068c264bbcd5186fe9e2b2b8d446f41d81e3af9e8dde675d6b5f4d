import scoper from './styleScoper'

const noop = () => {}

/**
 * Adds a style block to the head to load the styles.
 * uses the suffix to scope the styles
 * @param {string} css css code to add the the head
 * @param {string} suffix string to add to each selector as a scoped style to avoid conflicts
 * @returns a function that discard the added style element (if there is one)
 */
export default function addScopedStyle(css: string, suffix: string): () => void {
	// protect server side rendering
	if (typeof document === 'undefined') {
		return noop
	}
	const head = document.head || document.getElementsByTagName('head')[0]
	const newstyle = document.createElement('style')
	newstyle.dataset.cssscoper = 'true'
	const csses = scoper(css, `[data-${suffix}]`)
	const styleany = newstyle as any
	if (styleany.styleSheet) {
		styleany.styleSheet.cssText = csses
	} else {
		newstyle.appendChild(document.createTextNode(csses))
	}
	head.appendChild(newstyle)

	return () => {
		head.removeChild(newstyle)
	}
}
