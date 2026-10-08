import importXPlugin from 'eslint-plugin-import-x';

interface OxlintJsPlugin {
	meta: {
		name: string;
		version?: string;
	};
	rules: Record<string, unknown>;
}

const importXAlias: OxlintJsPlugin = {
	...importXPlugin,
	meta: {
		...importXPlugin.meta,
		name: 'import-x-alias',
	},
};

export default importXAlias;
