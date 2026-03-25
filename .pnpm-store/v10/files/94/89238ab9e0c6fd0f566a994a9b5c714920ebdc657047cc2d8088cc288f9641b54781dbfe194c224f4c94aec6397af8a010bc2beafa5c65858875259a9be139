export function processOptions (value) {
	let options
	if (typeof value === 'function') {
		// Simple options (callback-only)
		options = {
			callback: value,
		}
	} else {
		// Options object
		options = value
	}
	return options
}

export function throttle (callback, delay, options = {}) {
	let timeout
	let lastState
	let currentArgs
	const throttled = (state, ...args) => {
		currentArgs = args
		if (timeout && state === lastState) return
		let leading = options.leading
		if (typeof leading === 'function') {
			leading = leading(state, lastState)
		}
		if ((!timeout || (state !== lastState)) && leading) {
			callback(state, ...currentArgs)
		}
		lastState = state
		clearTimeout(timeout)
		timeout = setTimeout(() => {
			callback(state, ...currentArgs)
			timeout = 0
		}, delay)
	}
	throttled._clear = () => {
		clearTimeout(timeout)
		timeout = null
	}
	return throttled
}

export function deepEqual (val1, val2) {
	if (val1 === val2) return true
	if (typeof val1 === 'object') {
		for (const key in val1) {
			if (!deepEqual(val1[key], val2[key])) {
				return false
			}
		}
		return true
	}
	return false
}
