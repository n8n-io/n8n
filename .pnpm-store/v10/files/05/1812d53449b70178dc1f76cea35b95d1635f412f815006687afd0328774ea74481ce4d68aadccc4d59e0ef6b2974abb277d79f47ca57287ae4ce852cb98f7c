export type BlockTag = ParamTag | Tag

export interface Module {
	name: string
	path: string
}

export interface EvaluableComponent {
	script: string
	template?: string
	style?: string
	setup: boolean
  scopeId?: string
}

/**
 * Universal model to display origin
 */
export interface Descriptor {
	extends?: Module
	mixin?: Module
}

export interface ParamType {
	name: string
	elements?: ParamType[]
}

export interface UnnamedParam {
	type?: ParamType
	description?: string | boolean
}

export interface Param extends UnnamedParam {
	name?: string
}

interface RootTag {
	title: string
}

export interface Tag extends RootTag {
	content: string | boolean
}

export interface ParamTag extends RootTag, Param {}

export interface DocBlockTags {
	description?: string
	tags?: (ParamTag | Tag)[]
}

interface EventType {
	names: string[]
	elements?: ParamType[]
}

interface EventProperty {
	type: EventType
	name?: string
	description?: string | boolean
}

export interface EventDescriptor extends DocBlockTags, Descriptor {
	name: string
	type?: EventType
	properties?: EventProperty[]
}

export interface ExposeDescriptor extends DocBlockTags, Descriptor {
	name: string
}

export interface PropDescriptor extends Descriptor {
	type?: { name: string; func?: boolean }
	description?: string
	required?: boolean
	defaultValue?: { value: string; func?: boolean }
	tags?: { [title: string]: BlockTag[] }
	values?: string[]
	name: string
}

export interface MethodDescriptor extends Descriptor {
	name: string
	description?: string
	returns?: UnnamedParam
	throws?: UnnamedParam
	tags?: { [key: string]: BlockTag[] }
	params?: Param[]
	modifiers?: string[]
	[key: string]: any
}

export interface SlotDescriptor extends Descriptor {
	name: string
	description?: string
	bindings?: ParamTag[]
	scoped?: boolean
	tags?: { [key: string]: BlockTag[] }
}

export interface ComponentDoc {
	displayName: string
	exportName: string
	description?: string
	props?: PropDescriptor[]
	methods?: MethodDescriptor[]
	slots?: SlotDescriptor[]
	events?: EventDescriptor[]
	expose?: ExposeDescriptor[]
	tags: { [key: string]: BlockTag[] }
	docsBlocks?: string[]
	sourceFiles?: string[]
	[key: string]: any
}
