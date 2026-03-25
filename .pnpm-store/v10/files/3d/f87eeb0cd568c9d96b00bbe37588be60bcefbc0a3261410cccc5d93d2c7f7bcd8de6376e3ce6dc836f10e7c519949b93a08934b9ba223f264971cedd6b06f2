import { PropDescriptor, ComponentDoc } from './types'
import cleanName from './cleanName'

function getDefaultText(): string {
	return 'Default Example Usage'
}

function getDefaultNumber(): string {
	return '42'
}

function getDefaultBoolean(): string {
	return 'true'
}

function getDefaultArray(): string {
	return '[1, 2, 3]'
}

function getDefaultFunction(): string {
	return '() => void'
}

function getDefaultDate(): string {
	return 'new Date(\'2012-12-12\')'
}

function getDefaultObject(): string {
	return '{}'
}

function getDefault(prop: PropDescriptor): string {
	if (!prop || !prop.type) {
		return getDefaultText()
	} else if (prop.values && prop.values.length) {
		return prop.values[0]
	} else if (prop.type.name === 'string') {
		return getDefaultText()
	} else if (prop.type.name === 'number') {
		return getDefaultNumber()
	} else if (prop.type.name === 'boolean') {
		return getDefaultBoolean()
	} else if (prop.type.name === 'object') {
		return getDefaultObject()
	} else if (prop.type.name === 'array') {
		return getDefaultArray()
	} else if (prop.type.name === 'func') {
		return getDefaultFunction()
	} else if (prop.type.name === 'date') {
		return getDefaultDate()
	}
	return getDefaultText()
}

export default (doc: ComponentDoc): string => {
	const { displayName, props, slots } = doc
	const cleanedName = cleanName(displayName)
	const propsAttr: string[] = props
		? props
				.filter(p => p.required)
				.map(
					p =>
						` ${!p || !p.type || p.type.name === 'string' ? '' : ':'}${p.name}="${getDefault(p)}"`
				)
		: []
	return `<${cleanedName}${propsAttr.join(' ')}${
		!slots || !slots.filter(s => s.name === 'default')
			? ' />'
			: `>${getDefaultText()}</${cleanedName}>`
	}`
}
