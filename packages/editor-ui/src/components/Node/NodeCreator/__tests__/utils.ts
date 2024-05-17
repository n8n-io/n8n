import type {
	SimplifiedNodeType,
	ActionTypeDescription,
	SubcategoryItemProps,
	ViewItemProps,
	LabelItemProps,
	NodeCreateElement,
	SubcategoryCreateElement,
	ViewCreateElement,
	LabelCreateElement,
	ActionCreateElement,
	SectionCreateElement,
} from '@/Interface';
import { v4 as uuidv4 } from 'uuid';

export const mockSimplifiedNodeType = (
	overrides?: Partial<SimplifiedNodeType>,
): SimplifiedNodeType => ({
	displayName: 'Sample DisplayName',
	name: 'sampleName',
	icon: 'sampleIcon',
	iconUrl: 'https://example.com/icon.png',
	group: ['group1', 'group2'],
	description: 'Sample description',
	codex: {
		categories: ['category1', 'category2'],
		subcategories: {
			category1: ['subcategory1', 'subcategory2'],
			category2: ['subcategory3', 'subcategory4'],
		},
		alias: ['alias1', 'alias2'],
	},
	defaults: {
		color: '#ffffff',
	},
	outputs: [],
	...overrides,
});

export const mockActionTypeDescription = (
	overrides?: Partial<ActionTypeDescription>,
): ActionTypeDescription => ({
	...mockSimplifiedNodeType(),
	values: { value1: 'test', value2: 123 },
	actionKey: 'sampleActionKey',
	codex: {
		label: 'Sample Label',
		categories: ['category1', 'category2'],
	},
	...overrides,
});

const mockSubcategoryItemProps = (
	overrides?: Partial<SubcategoryItemProps>,
): SubcategoryItemProps => ({
	description: 'Sample description',
	iconType: 'sampleIconType',
	icon: 'sampleIcon',
	title: 'Sample title',
	subcategory: 'sampleSubcategory',
	defaults: { color: '#ffffff' },
	forceIncludeNodes: ['node1', 'node2'],
	...overrides,
});

const mockViewItemProps = (overrides?: Partial<ViewItemProps>): ViewItemProps => ({
	title: 'Sample title',
	description: 'Sample description',
	icon: 'sampleIcon',
	...overrides,
});

const mockLabelItemProps = (overrides?: Partial<LabelItemProps>): LabelItemProps => ({
	key: uuidv4(),
	...overrides,
});

export const mockNodeCreateElement = (
	overrides?: Partial<NodeCreateElement>,
	nodeTypeOverrides?: Partial<SimplifiedNodeType>,
): NodeCreateElement => ({
	uuid: uuidv4(),
	key: uuidv4(),
	type: 'node',
	subcategory: 'sampleSubcategory',
	properties: mockSimplifiedNodeType(nodeTypeOverrides),
	...overrides,
});

export const mockSubcategoryCreateElement = (
	overrides?: Partial<SubcategoryItemProps>,
): SubcategoryCreateElement => ({
	uuid: uuidv4(),
	key: uuidv4(),
	type: 'subcategory',
	properties: mockSubcategoryItemProps(overrides),
});

export const mockSectionCreateElement = (
	overrides?: Partial<SectionCreateElement>,
): SectionCreateElement => ({
	uuid: uuidv4(),
	key: 'popular',
	type: 'section',
	title: 'Popular',
	children: [mockNodeCreateElement(), mockNodeCreateElement()],
	...overrides,
});

export const mockViewCreateElement = (
	overrides?: Partial<ViewCreateElement>,
): ViewCreateElement => ({
	uuid: uuidv4(),
	key: uuidv4(),
	type: 'view',
	properties: mockViewItemProps(),
	...overrides,
});

export const mockLabelCreateElement = (
	subcategory?: string,
	overrides?: Partial<LabelItemProps>,
): LabelCreateElement => ({
	uuid: uuidv4(),
	key: uuidv4(),
	type: 'label',
	subcategory: subcategory ?? 'sampleSubcategory',
	properties: mockLabelItemProps(overrides),
});

export const mockActionCreateElement = (
	subcategory?: string,
	overrides?: Partial<ActionTypeDescription>,
): ActionCreateElement => ({
	uuid: uuidv4(),
	key: uuidv4(),
	type: 'action',
	subcategory: subcategory ?? 'sampleSubcategory',
	properties: mockActionTypeDescription(overrides),
});
