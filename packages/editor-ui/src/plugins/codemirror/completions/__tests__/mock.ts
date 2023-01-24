const inputProxy = new Proxy(
	{},
	{
		ownKeys() {
			return ['all', 'context', 'first', 'item', 'last', 'params'];
		},
		get(_, property) {
			if (property === 'isMockProxy') return true;

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

const nodeSelectorProxy = new Proxy(
	{},
	{
		ownKeys() {
			return ['all', 'context', 'first', 'item', 'last', 'params', 'itemMatching'];
		},
		get(_, property) {
			if (property === 'isMockProxy') return true;

			if (property === 'all') return [];
			if (property === 'context') return {};
			if (property === 'first') return {};
			if (property === 'item') return {};
			if (property === 'last') return {};
			if (property === 'params') return {};
			if (property === 'itemMatching') return {};

			return undefined;
		},
	},
);

const item = {
	json: { __isMockObject: true, str: 'abc', num: 123, arr: [1, 2, 3], obj: { a: 123 } },
	pairedItem: { item: 0, input: 0 },
};

Object.defineProperty(item, '__isMockObject', {
	enumerable: false,
});

Object.defineProperty(item.json, '__isMockObject', {
	enumerable: false,
});

export const mock = {
	inputProxy,
	nodeSelectorProxy,
	item,
};
