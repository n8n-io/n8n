import { within } from '@testing-library/vue';
import { createTestingPinia } from '@pinia/testing';
import type { INodeProperties, INodeTypeDescription } from 'n8n-workflow';
import { createTestNode } from '@/__tests__/mocks';
import { createComponentRenderer } from '@/__tests__/render';
import { useNodeTypesStore } from '@/app/stores/nodeTypes.store';
import { MASK } from '@/app/utils/maskSecret';
import type { NodeVersionChange } from '@/features/ndv/shared/ndv.types';
import NodeVersionChangeBanner from './NodeVersionChangeBanner.vue';

const NODE_TYPE = 'n8n-nodes-base.versionedNode';

const describeVersion = (version: number, properties: INodeProperties[]): INodeTypeDescription => ({
	displayName: 'Versioned Node',
	name: NODE_TYPE,
	group: ['transform'],
	description: '',
	version,
	defaults: { name: 'Versioned Node' },
	inputs: ['main'],
	outputs: ['main'],
	properties,
});

const typeV1 = describeVersion(1, [
	{
		displayName: 'Mode',
		name: 'mode',
		type: 'options',
		default: 'a',
		options: [
			{ name: 'Alpha (old)', value: 'a' },
			{ name: 'Beta (old)', value: 'b' },
		],
	},
	{ displayName: 'Verbose', name: 'verbose', type: 'boolean', default: false },
	{
		displayName: 'Auth',
		name: 'auth',
		type: 'collection',
		default: {},
		options: [
			{ displayName: 'User', name: 'user', type: 'string', default: '' },
			{
				displayName: 'Password',
				name: 'password',
				type: 'string',
				typeOptions: { password: true },
				default: '',
			},
		],
	},
]);

const typeV2 = describeVersion(2, [
	{
		displayName: 'Mode',
		name: 'mode',
		type: 'options',
		default: 'b',
		options: [
			{ name: 'Alpha (new)', value: 'a' },
			{ name: 'Beta (new)', value: 'b' },
		],
	},
	{ displayName: 'Verbose', name: 'verbose', type: 'boolean', default: true },
	{ displayName: 'Token', name: 'token', type: 'string', default: '', required: true },
]);

const setAside: NodeVersionChange['setAside'] = [
	{ name: 'legacyField', path: ['legacyField'], displayName: 'Legacy Field', value: 'abc' },
	{
		name: 'rules.values[0].kind',
		path: ['rules', 'values', 0, 'kind'],
		displayName: 'Kind',
		value: 'x',
	},
	{
		name: 'rules.values[1].kind',
		path: ['rules', 'values', 1, 'kind'],
		displayName: 'Kind',
		value: 'y',
	},
];

const changedDefaults: NodeVersionChange['changedDefaults'] = [
	{ name: 'mode', displayName: 'Mode', oldDefault: 'a', newDefault: 'b' },
	{ name: 'verbose', displayName: 'Verbose', oldDefault: false, newDefault: true },
];

const RED_HEADLINE = 'Updated to version 2. Set the highlighted parameters below.';
const GREEN_HEADLINE = 'Updated to version 2. All parameters are set.';
const CLOSING_LINE =
	'This version can also change how the node behaves. No notes for this version yet.';

const renderComponent = createComponentRenderer(NodeVersionChangeBanner);

const renderBanner = (
	change: Partial<NodeVersionChange> = {},
	nodeOverrides: Parameters<typeof createTestNode>[0] = {},
) => {
	const pinia = createTestingPinia({ stubActions: false });
	useNodeTypesStore(pinia).setNodeTypes([typeV1, typeV2]);

	return renderComponent({
		pinia,
		props: {
			node: createTestNode({
				type: NODE_TYPE,
				typeVersion: 2,
				parameters: { token: 'set' },
				...nodeOverrides,
			}),
			nodeType: typeV2,
			change: { setAside: [], changedDefaults: [], fromVersion: 1, ...change },
		},
	});
};

/** The label and the value chips of each row. */
const rowTexts = (bucket: HTMLElement) =>
	within(bucket)
		.getAllByRole('listitem')
		.map((row) => Array.from(row.children, (part) => part.textContent));

describe('NodeVersionChangeBanner', () => {
	it('lists the values that did not carry over and the defaults that changed', () => {
		const { getByTestId } = renderBanner({ setAside, changedDefaults });

		const setAsideBucket = getByTestId('node-version-change-set-aside');
		expect(setAsideBucket.querySelector('summary')).toHaveTextContent("3 values didn't carry over");
		expect(setAsideBucket).toHaveTextContent("Didn't carry over. Old values:");
		// Two rows share the label "Kind", so a nested row shows its full name.
		expect(rowTexts(setAsideBucket)).toEqual([
			['Legacy Field', 'abc'],
			['rules.values[0].kind', 'x'],
			['rules.values[1].kind', 'y'],
		]);

		const defaultsBucket = getByTestId('node-version-change-defaults');
		expect(defaultsBucket.querySelector('summary')).toHaveTextContent('2 defaults changed');
		expect(defaultsBucket).toHaveTextContent('Default changed. Old → new:');
		// Each option label comes from the description of its own version.
		expect(rowTexts(defaultsBucket)).toEqual([
			['Mode', 'Alpha (old)', '→', 'Beta (new)'],
			['Verbose', 'Off', '→', 'On'],
		]);
	});

	it('shows only the bucket that has entries', () => {
		const { getByTestId, queryByTestId } = renderBanner({
			changedDefaults: changedDefaults.slice(0, 1),
		});

		expect(getByTestId('node-version-change-defaults').querySelector('summary')).toHaveTextContent(
			'1 default changed',
		);
		expect(queryByTestId('node-version-change-set-aside')).not.toBeInTheDocument();
	});

	it('shows no bucket when everything carried over', () => {
		const { getByTestId } = renderBanner();

		const banner = getByTestId('node-version-change-banner');
		expect(banner).toHaveTextContent(GREEN_HEADLINE);
		expect(banner.querySelector('details')).toBeNull();
	});

	it('keeps the buckets and the closing line when all parameters are set', () => {
		const { getByTestId } = renderBanner({ setAside, changedDefaults });

		const banner = getByTestId('node-version-change-banner');
		expect(banner).toHaveTextContent(GREEN_HEADLINE);
		expect(banner).toHaveTextContent(CLOSING_LINE);
		expect(banner.querySelectorAll('details')).toHaveLength(2);
	});

	it('asks for the highlighted parameters while a required parameter is empty', () => {
		const { getByTestId } = renderBanner({}, { parameters: { token: '' } });

		const banner = getByTestId('node-version-change-banner');
		expect(banner).toHaveTextContent(RED_HEADLINE);
		expect(banner).toHaveTextContent(CLOSING_LINE);
	});

	it('still asks for the highlighted parameters on a disabled node', () => {
		const { getByTestId } = renderBanner({}, { parameters: { token: '' }, disabled: true });

		expect(getByTestId('node-version-change-banner')).toHaveTextContent(RED_HEADLINE);
	});

	it('masks a password inside a collection that did not carry over', () => {
		const { getByTestId, queryByText } = renderBanner({
			setAside: [
				{
					name: 'auth',
					path: ['auth'],
					displayName: 'Auth',
					value: { user: 'bob', password: 'hunter2' },
				},
			],
		});

		const bucket = getByTestId('node-version-change-set-aside');
		expect(bucket.querySelector('summary')).toHaveTextContent("1 value didn't carry over");
		expect(rowTexts(bucket)).toEqual([['Auth', `{"user":"bob","password":"${MASK}"}`]]);
		expect(queryByText(/hunter2/)).not.toBeInTheDocument();
	});

	it('masks every value that did not carry over when the old version has no description', () => {
		const { getByTestId, queryByText } = renderBanner({ setAside, fromVersion: 9 });

		expect(rowTexts(getByTestId('node-version-change-set-aside'))).toEqual([
			['Legacy Field', MASK],
			['rules.values[0].kind', MASK],
			['rules.values[1].kind', MASK],
		]);
		expect(queryByText('abc')).not.toBeInTheDocument();
	});
});
