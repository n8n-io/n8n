import { IExecuteFunctions } from '../../../../core/dist/src/Interfaces';
import { INodePropertyCollection, INodeProperties } from '../../../../workflow/dist/src/Interfaces';

export const createFields = (fields: INodeProperties[]) => {
	return (overrideProperties: Partial<INodeProperties>) => {
		return fields.map(field => ({ ...field, ...overrideProperties }))
	}
}

/**
 * Linking to resources
 */

export const createResourceLink = (name: string, href: string, urlPrefix?: string) => {
	if (urlPrefix && !href.startsWith(urlPrefix)) {
		href = `${urlPrefix}${href}`
	}
	return {
		_links: { [name]: {	href } }
	}
}

/**
 * Listing resources
 */

export const createListOperations = createFields([
	{
		displayName: 'Include API Metadata',
		description: "Disable for data in a list. Enable for pagination or API metadata.",
		name: 'include_metadata',
		type: 'boolean',
		default: false,
	},
	{
		displayName: 'Limit (max 25)',
		name: 'per_page',
		type: 'number',
		default: 25,
	},
	{
		displayName: 'Page',
		name: 'page',
		type: 'number',
		default: 1,
	}
])

export const createPaginationProperties = (node: IExecuteFunctions, i: number) => {
	const page = node.getNodeParameter('page', i, 1) as string;
	const per_page = Math.max(1, Math.min(25, node.getNodeParameter('per_page', i) as number));
	return { page, per_page }
}

/**
 * OData filtering
 * Docs: https://actionnetwork.org/docs/v2#odata
 */
export const createFilterFields = ({ properties, ...options }: { properties: string[] } & Partial<INodeProperties>) => createFields([
	{
		displayName: 'Filter Logic',
		name: 'filter_logic',
		type: 'options',
		required: false,
		options: [
			{ value: 'and', name: "All" },
			{ value: 'or', name: "Any" }
		],
		default: 'and',
	},
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'fixedCollection',
		default: '',
		placeholder: 'Add Filter',
		typeOptions: {
			multipleValues: true,
		},
		options: [
			{
				name: 'filters',
				displayName: 'Filters',
				values: [
					{
						displayName: 'Filter Property',
						name: 'property',
						type: 'options',
						default: '',
						options: properties.map(p => ({ name: p, value: p }))
					},
					{
						displayName: 'Operation',
						name: 'operation',
						type: 'options',
						options: [
							{
								name: 'eq',
								value: 'eq',
							},
							{
								name: 'lt',
								value: 'lt',
							},
							{
								name: 'gt',
								value: 'gt',
							},
						],
						default: 'eq',
					},
					{
						displayName: 'Matching Term',
						name: 'search_term',
						type: 'string',
						default: '',
					},
				]
			}
		] as INodePropertyCollection[]
	}
])(options)

type FilterObj = { property: string, operation: string, search_term: string }

export function createFilterProperties(node: IExecuteFunctions, i: number) {
	let obj = {}
	const { filters } = node.getNodeParameter('filters', i, []) as any;
	if (filters) {
		const filter_logic = node.getNodeParameter('filter_logic', i, 'and') as string;
		obj = {
			filter: constructODIFilterString(filters, filter_logic)
		}
	}
	return obj
}

export function constructODIFilterString (filters: FilterObj[], filter_logic: string) {
	return (filters as any).map(constructODIFilterPhrase).join(` ${filter_logic} `)
}

export function constructODIFilterPhrase ({ property, operation, search_term }: FilterObj) {
	return `${property} ${operation} '${search_term}'`
}
