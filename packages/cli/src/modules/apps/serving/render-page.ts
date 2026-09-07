import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import Handlebars from 'handlebars';

import type { PageRenderContext } from './app-serving.service';

import { TEMPLATES_DIR } from '@/constants';

/**
 * Compiled here rather than through `res.render` so rendering does not depend on
 * express's view engine being configured on whichever app serves the route. Its
 * own environment, so the recursive menu partial stays out of the global
 * Handlebars registry.
 */
const env = Handlebars.create();

const readTemplate = async (...pathSegments: string[]) =>
	await readFile(join(TEMPLATES_DIR, ...pathSegments), 'utf8');

const cache = new Map<string, HandlebarsTemplateDelegate>();

let partials: Promise<void> | undefined;

const registerPartials = async () => {
	partials ??= readTemplate('partials', 'app-page-menu.handlebars').then((markup) =>
		env.registerPartial('appPageMenu', markup),
	);
	await partials;
};

const template = async (name: string) => {
	let compiled = cache.get(name);
	if (!compiled) {
		await registerPartials();
		compiled = env.compile(await readTemplate(`${name}.handlebars`));
		cache.set(name, compiled);
	}
	return compiled;
};

export const renderAppPage = async (context: PageRenderContext) =>
	(await template('app-page'))(context);

export const renderAppPageNotFound = async () => (await template('app-page-404'))({});
