import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

import Handlebars from 'handlebars';

import { TEMPLATES_DIR } from '@/constants';

/**
 * Compiled here rather than through `res.render` so rendering does not depend on
 * express's view engine being configured on whichever app serves the route. Its
 * own environment, so App partials stay out of the global Handlebars registry.
 */
const env = Handlebars.create();

const PARTIALS_DIR = 'partials';
const APP_PARTIAL_PREFIX = 'app-';
const TEMPLATE_EXTENSION = '.handlebars';

/** `app-page-menu` → `appPageMenu`, the name templates use in `{{> appPageMenu}}`. */
const partialName = (fileName: string) =>
	fileName
		.slice(0, -TEMPLATE_EXTENSION.length)
		.replace(/-([a-z0-9])/g, (_, char: string) => char.toUpperCase());

const readTemplate = async (...pathSegments: string[]) =>
	await readFile(join(TEMPLATES_DIR, ...pathSegments), 'utf8');

let partials: Promise<void> | undefined;

const registerPartials = async () => {
	partials ??= (async () => {
		const files = await readdir(join(TEMPLATES_DIR, PARTIALS_DIR));
		for (const file of files) {
			if (!file.startsWith(APP_PARTIAL_PREFIX) || !file.endsWith(TEMPLATE_EXTENSION)) continue;
			env.registerPartial(partialName(file), await readTemplate(PARTIALS_DIR, file));
		}
	})();
	await partials;
};

const cache = new Map<string, HandlebarsTemplateDelegate>();

const template = async (name: string) => {
	let compiled = cache.get(name);
	if (!compiled) {
		await registerPartials();
		compiled = env.compile(await readTemplate(`${name}${TEMPLATE_EXTENSION}`));
		cache.set(name, compiled);
	}
	return compiled;
};

/** Renders `templates/<name>.handlebars`; every `templates/partials/app-*.handlebars` is available to it. */
export const renderTemplate = async (name: string, data: unknown): Promise<string> =>
	(await template(name))(data);

/** Renders `templates/partials/app-<name>.handlebars` on its own, for block renderers. */
export const renderPartial = async (name: string, data: unknown): Promise<string> =>
	await renderTemplate(join(PARTIALS_DIR, `${APP_PARTIAL_PREFIX}${name}`), data);
