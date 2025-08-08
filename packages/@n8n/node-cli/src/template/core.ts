import glob from 'fast-glob';
import handlebars from 'handlebars';
import fs from 'node:fs/promises';
import path from 'node:path';

import { copyFolder } from '../utils/filesystem';

export type TemplateData<Config extends object = object> = {
	path: string;
	nodeName: string;
	user?: Partial<{
		name: string;
		email: string;
	}>;
	packageManager: {
		name: 'npm' | 'yarn' | 'pnpm';
		installCommand: string;
	};
	config: Config;
};

type Require<T, K extends keyof T> = T & { [P in K]-?: T[P] };
export type Template<Config extends object = object> = {
	name: string;
	description: string;
	path: string;
	prompts?: () => Promise<Config>;
	run?: (data: TemplateData<Config>) => Promise<void>;
};

export type TemplateWithRun<Config extends object = object> = Require<Template<Config>, 'run'>;

export async function copyTemplateFilesToDestination(template: Template, data: TemplateData) {
	await copyFolder({
		source: template.path,
		destination: data.path,
		ignore: ['dist', 'node_modules'],
	});
}

export async function copyDefaultTemplateFilesToDestination(data: TemplateData) {
	await copyFolder({
		source: path.resolve(__dirname, 'templates/shared/default'),
		destination: data.path,
		ignore: ['dist', 'node_modules'],
	});
}

export async function templateStaticFiles(data: TemplateData) {
	const files = await glob('**/*.{md,json,yml}', {
		ignore: ['tsconfig.json', 'tsconfig.build.json'],
		cwd: data.path,
		absolute: true,
		dot: true,
	});

	await Promise.all(
		files.map(async (file) => {
			const content = await fs.readFile(file, 'utf-8');
			const newContent = handlebars.compile(content)(data);

			if (newContent !== content) {
				await fs.writeFile(file, newContent);
			}
		}),
	);
}

export function createTemplate(template: Template): TemplateWithRun {
	return {
		...template,
		run: async (data) => {
			await copyDefaultTemplateFilesToDestination(data);
			await copyTemplateFilesToDestination(template, data);
			await templateStaticFiles(data);
			await template.run?.(data);
		},
	};
}
