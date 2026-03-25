import {MS, MOZ, WEBKIT, RULESET, KEYFRAMES, DECLARATION} from './Enum.js'
import {match, charat, substr, strlen, sizeof, replace, combine, filter, assign} from './Utility.js'
import {copy, lift, tokenize} from './Tokenizer.js'
import {serialize} from './Serializer.js'
import {prefix} from './Prefixer.js'

/**
 * @param {function[]} collection
 * @return {function}
 */
export function middleware (collection) {
	var length = sizeof(collection)

	return function (element, index, children, callback) {
		var output = ''

		for (var i = 0; i < length; i++)
			output += collection[i](element, index, children, callback) || ''

		return output
	}
}

/**
 * @param {function} callback
 * @return {function}
 */
export function rulesheet (callback) {
	return function (element) {
		if (!element.root)
			if (element = element.return)
				callback(element)
	}
}

/**
 * @param {object} element
 * @param {number} index
 * @param {object[]} children
 * @param {function} callback
 */
export function prefixer (element, index, children, callback) {
	if (element.length > -1)
		if (!element.return)
			switch (element.type) {
				case DECLARATION: element.return = prefix(element.value, element.length, children)
					return
				case KEYFRAMES:
					return serialize([copy(element, {value: replace(element.value, '@', '@' + WEBKIT)})], callback)
				case RULESET:
					if (element.length)
						return combine(children = element.props, function (value) {
							switch (match(value, callback = /(::plac\w+|:read-\w+)/)) {
								// :read-(only|write)
								case ':read-only': case ':read-write':
									lift(copy(element, {props: [replace(value, /:(read-\w+)/, ':' + MOZ + '$1')]}))
									lift(copy(element, {props: [value]}))
									assign(element, {props: filter(children, callback)})
									break
								// :placeholder
								case '::placeholder':
									lift(copy(element, {props: [replace(value, /:(plac\w+)/, ':' + WEBKIT + 'input-$1')]}))
									lift(copy(element, {props: [replace(value, /:(plac\w+)/, ':' + MOZ + '$1')]}))
									lift(copy(element, {props: [replace(value, /:(plac\w+)/, MS + 'input-$1')]}))
									lift(copy(element, {props: [value]}))
									assign(element, {props: filter(children, callback)})
									break
							}

							return ''
						})
			}
}

/**
 * @param {object} element
 * @param {number} index
 * @param {object[]} children
 */
export function namespace (element) {
	switch (element.type) {
		case RULESET:
			element.props = element.props.map(function (value) {
				return combine(tokenize(value), function (value, index, children) {
					switch (charat(value, 0)) {
						// \f
						case 12:
							return substr(value, 1, strlen(value))
						// \0 ( + > ~
						case 0: case 40: case 43: case 62: case 126:
							return value
						// :
						case 58:
							if (children[++index] === 'global')
								children[index] = '', children[++index] = '\f' + substr(children[index], index = 1, -1)
						// \s
						case 32:
							return index === 1 ? '' : value
						default:
							switch (index) {
								case 0: element = value
									return sizeof(children) > 1 ? '' : value
								case index = sizeof(children) - 1: case 2:
									return index === 2 ? value + element + element : value + element
								default:
									return value
							}
					}
				})
			})
	}
}
