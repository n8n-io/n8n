export const inputProxy = new Proxy(
	{},
	{
		ownKeys() {
			return ['all', 'context', 'first', 'item', 'last', 'params'];
		},
		get(_, property) {
			if (property === 'all') return [];
			if (property === 'context') return {};
			if (property === 'first') return {};
			if (property === 'item') return {};
			if (property === 'last') return {};
			if (property === 'params') return {};

			return undefined;
		},
	},
);

export const nodeSelectorProxy = new Proxy(
	{},
	{
		ownKeys() {
			return ['all', 'context', 'first', 'item', 'last', 'params', 'pairedItem', 'itemMatching'];
		},
		get(_, property) {
			if (property === 'all') return [];
			if (property === 'context') return {};
			if (property === 'first') return {};
			if (property === 'item') return {};
			if (property === 'last') return {};
			if (property === 'params') return {};
			if (property === 'pairedItem') return {};
			if (property === 'itemMatching') return {};

			return undefined;
		},
	},
);

export const itemProxy = new Proxy(
	{ json: {}, pairedItem: {} },
	{
		get(_, property) {
			if (property === 'json') return {};

			return undefined;
		},
	},
);

export const prevNodeProxy = new Proxy(
	{},
	{
		ownKeys() {
			return ['name', 'outputIndex', 'runIndex'];
		},
		get(_, property) {
			if (property === 'name') return '';
			if (property === 'outputIndex') return 0;
			if (property === 'runIndex') return 0;

			return undefined;
		},
	},
);

export const executionProxy = new Proxy(
	{},
	{
		ownKeys() {
			return ['id', 'mode', 'resumeUrl'];
		},
		get(_, property) {
			if (property === 'id') return '';
			if (property === 'mode') return '';
			if (property === 'resumeUrl') return '';

			return undefined;
		},
	},
);

export const workflowProxy = new Proxy(
	{},
	{
		ownKeys() {
			return ['active', 'id', 'name'];
		},
		get(_, property) {
			if (property === 'active') return false;
			if (property === 'id') return '';
			if (property === 'name') return '';

			return undefined;
		},
	},
);
