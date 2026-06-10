import { safeJoinPath } from '@n8n/backend-common';
import glob from 'fast-glob';
import { jsonParse } from 'n8n-workflow';
import { readFile as fsReadFile } from 'node:fs/promises';

import type { GitResourceReader } from './git-resource-reader.interface';

export interface ProjectGitResource {
	id: string;
	name: string;
	description: string | null;
	icon: { type: 'emoji' | 'icon'; value: string } | null;
}

export class ProjectReader implements GitResourceReader<ProjectGitResource> {
	readonly resourceType = 'project';

	constructor(private readonly projectFolder: string) {}

	async list(): Promise<ProjectGitResource[]> {
		let projectFiles: string[];

		try {
			projectFiles = await glob('*.json', {
				cwd: this.projectFolder,
				absolute: true,
			});
		} catch {
			return [];
		}

		const projects = await Promise.all(projectFiles.map(async (file) => await this.readFile(file)));

		return projects.filter((project) => project !== undefined);
	}

	async read(id: string): Promise<ProjectGitResource | undefined> {
		try {
			return await this.readFile(safeJoinPath(this.projectFolder, `${id}.json`));
		} catch {
			return undefined;
		}
	}

	private async readFile(file: string): Promise<ProjectGitResource | undefined> {
		try {
			const parsed = jsonParse<unknown>(await fsReadFile(file, { encoding: 'utf8' }));

			if (!isProjectGitResource(parsed)) {
				return undefined;
			}

			return {
				id: parsed.id,
				name: parsed.name,
				description: parsed.description ?? null,
				icon: parsed.icon ?? null,
			};
		} catch {
			return undefined;
		}
	}
}

function isProjectGitResource(value: unknown): value is ProjectGitResource {
	if (!isRecord(value)) return false;

	const { id, name, description, icon } = value;

	return (
		typeof id === 'string' &&
		typeof name === 'string' &&
		(description === undefined || description === null || typeof description === 'string') &&
		(icon === undefined || icon === null || isProjectIcon(icon))
	);
}

function isProjectIcon(value: unknown): value is ProjectGitResource['icon'] {
	if (!isRecord(value)) return false;

	return (value.type === 'emoji' || value.type === 'icon') && typeof value.value === 'string';
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === 'object' && !Array.isArray(value);
}
