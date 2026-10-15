import type { Plugin, format, formatWithCursor } from 'prettier';

export type PrettierModules = {
	format: typeof format;
	formatWithCursor: typeof formatWithCursor;
	plugins: {
		babel: Plugin;
		estree: Plugin;
		html: Plugin;
		postcss: Plugin;
	};
};

export async function loadPrettier(): Promise<PrettierModules> {
	const [core, babel, estree, html, postcss] = await Promise.all([
		import('prettier'),
		import('prettier/plugins/babel'),
		import('prettier/plugins/estree'),
		import('prettier/plugins/html'),
		import('prettier/plugins/postcss'),
	]);

	return {
		format: core.format,
		formatWithCursor: core.formatWithCursor,
		plugins: { babel, estree, html, postcss },
	};
}
