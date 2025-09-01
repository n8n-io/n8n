import * as glob from 'fast-glob';
import handlebars from 'handlebars';
import * as fs from 'node:fs/promises';

import {
	copyTemplateFilesToDestination,
	templateStaticFiles,
	createTemplate,
	type TemplateData,
} from './core';
import { copyFolder } from '../utils/filesystem';

vi.mock('node:fs/promises');
vi.mock('fast-glob');
vi.mock('handlebars');
vi.mock('../utils/filesystem');

const mockFs = vi.mocked(fs);
const mockGlob = vi.mocked(glob);
const mockHandlebars = vi.mocked(handlebars);
const mockCopyFolder = vi.mocked(copyFolder);

const baseData: TemplateData = {
	destinationPath: '/dest',
	nodePackageName: 'MyNode',
	packageManager: {
		name: 'npm',
		installCommand: 'npm ci',
	},
	config: {},
	user: {
		name: 'Alice',
		email: 'alice@example.com',
	},
};

describe('Templates > core', () => {
	describe('copyTemplateFilesToDestination', () => {
		it('copies template folder with ignore rules', async () => {
			const template = {
				path: '/template',
				name: 'MyTemplate',
				description: 'desc',
			};

			await copyTemplateFilesToDestination(template, baseData);

			expect(mockCopyFolder).toHaveBeenCalledWith({
				source: '/template',
				destination: '/dest',
				ignore: ['dist', 'node_modules'],
			});
		});
	});

	describe('templateStaticFiles', () => {
		beforeEach(() => {
			vi.clearAllMocks();
		});

		it('renders and writes changed content', async () => {
			mockGlob.default.mockResolvedValue(['/dest/file.md']);
			mockFs.readFile.mockResolvedValue('Hello {{nodePackageName}}');
			mockHandlebars.compile.mockReturnValue(() => 'Hello MyNode');
			mockFs.writeFile.mockResolvedValue();

			await templateStaticFiles(baseData);

			expect(mockFs.readFile).toHaveBeenCalledWith('/dest/file.md', 'utf-8');
			expect(mockFs.writeFile).toHaveBeenCalledWith('/dest/file.md', 'Hello MyNode');
		});

		it('skips writing if content unchanged', async () => {
			mockGlob.default.mockResolvedValue(['/dest/file.md']);
			mockFs.readFile.mockResolvedValue('Hello MyNode');
			mockHandlebars.compile.mockReturnValue(() => 'Hello MyNode');

			await templateStaticFiles(baseData);

			expect(mockFs.writeFile).not.toHaveBeenCalled();
		});
	});

	describe('createTemplate', () => {
		it('adds run function that invokes sub-steps and original run', async () => {
			const originalRun = vi.fn().mockResolvedValue(undefined);
			const template = {
				name: 'MyTemplate',
				description: '',
				path: '/template',
				run: originalRun,
			};

			mockCopyFolder.mockResolvedValue();
			mockGlob.default.mockResolvedValue([]);
			mockFs.readFile.mockResolvedValue('');
			mockHandlebars.compile.mockReturnValue(() => '');
			mockFs.writeFile.mockResolvedValue();

			const wrapped = createTemplate(template);
			await wrapped.run(baseData);

			expect(mockCopyFolder).toHaveBeenCalledWith({
				source: '/template',
				destination: '/dest',
				ignore: ['dist', 'node_modules'],
			});
			expect(originalRun).toHaveBeenCalledWith(baseData);
		});
	});
});
