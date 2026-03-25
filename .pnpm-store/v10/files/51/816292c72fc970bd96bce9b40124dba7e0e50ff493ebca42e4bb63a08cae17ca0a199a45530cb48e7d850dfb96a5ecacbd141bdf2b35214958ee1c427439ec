/*
 * Copyright (c) 2015, Yahoo Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */

import * as Handlebars from "handlebars";
import * as fs from "graceful-fs";
import * as path from "node:path";
import { promisify } from "node:util";
import { glob } from "glob";
import type {
	UnknownObject,
	HelperDelegateObject,
	ConfigOptions,
	Engine,
	TemplateSpecificationObject,
	TemplateDelegateObject,
	FsCache,
	PartialTemplateOptions,
	PartialsDirObject,
	RenderOptions,
	RenderViewOptions,
	RenderCallback,
	HandlebarsImport,
	CompiledCache,
	PrecompiledCache,
	RenameFunction,
} from "../types";

const readFile = promisify(fs.readFile);

// -----------------------------------------------------------------------------

const defaultConfig: ConfigOptions = {
	handlebars: Handlebars,
	extname: ".handlebars",
	encoding: "utf8",
	layoutsDir: undefined, // Default layouts directory is relative to `express settings.view` + `layouts/`
	partialsDir: undefined, // Default partials directory is relative to `express settings.view` + `partials/`
	defaultLayout: "main",
	helpers: undefined,
	compilerOptions: undefined,
	runtimeOptions: undefined,
};

export default class ExpressHandlebars {
	config: ConfigOptions;
	engine: Engine;
	encoding: BufferEncoding;
	layoutsDir: string;
	extname: string;
	compiled: CompiledCache;
	precompiled: PrecompiledCache;
	_fsCache: FsCache;
	partialsDir: string|PartialsDirObject|(string|PartialsDirObject)[];
	compilerOptions: CompileOptions;
	runtimeOptions: RuntimeOptions;
	helpers: HelperDelegateObject;
	defaultLayout: string;
	handlebars: HandlebarsImport;

	constructor (config: ConfigOptions = {}) {
		// Config properties with defaults.
		Object.assign(this, defaultConfig, config);

		// save given config to override other settings.
		this.config = config;

		// Express view engine integration point.
		this.engine = this.renderView.bind(this);

		// Normalize `extname`.
		if (this.extname.charAt(0) !== ".") {
			this.extname = "." + this.extname;
		}

		// Internal caches of compiled and precompiled templates.
		this.compiled = {};
		this.precompiled = {};

		// Private internal file system cache.
		this._fsCache = {};
	}

	async getPartials (options: PartialTemplateOptions = {}): Promise<TemplateSpecificationObject|TemplateDelegateObject> {
		if (typeof this.partialsDir === "undefined") {
			return {};
		}
		const partialsDirs = Array.isArray(this.partialsDir) ? this.partialsDir : [this.partialsDir];

		const dirs = await Promise.all(partialsDirs.map(async dir => {
			let dirPath: string;
			let dirTemplates: TemplateDelegateObject;
			let dirNamespace: string;
			let dirRename: RenameFunction;

			// Support `partialsDir` collection with object entries that contain a
			// templates promise and a namespace.
			if (typeof dir === "string") {
				dirPath = dir;
			} else if (typeof dir === "object") {
				dirTemplates = dir.templates;
				dirNamespace = dir.namespace;
				dirRename = dir.rename;
				dirPath = dir.dir;
			}

			// We must have some path to templates, or templates themselves.
			if (!dirPath && !dirTemplates) {
				throw new Error("A partials dir must be a string or config object");
			}

			const templates: HandlebarsTemplateDelegate|TemplateSpecification = dirTemplates || await this.getTemplates(dirPath, options);

			return {
				templates: templates as HandlebarsTemplateDelegate|TemplateSpecification,
				namespace: dirNamespace,
				rename: dirRename,
			};
		}));

		const partials: TemplateDelegateObject|TemplateSpecificationObject = {};

		for (const dir of dirs) {
			const { templates, namespace, rename } = dir;
			const filePaths = Object.keys(templates);

			const getTemplateNameFn = typeof rename === "function"
				? rename
				: this._getTemplateName.bind(this);

			for (const filePath of filePaths) {
				const partialName = getTemplateNameFn(filePath, namespace);
				partials[partialName] = templates[filePath];
			}
		}

		return partials;
	}

	async getTemplate (filePath: string, options: PartialTemplateOptions = {}): Promise<HandlebarsTemplateDelegate|TemplateSpecification> {
		filePath = path.resolve(filePath);

		const encoding = options.encoding || this.encoding;
		const cache: PrecompiledCache|CompiledCache = options.precompiled ? this.precompiled : this.compiled;
		const template: Promise<HandlebarsTemplateDelegate|TemplateSpecification> = options.cache && cache[filePath];

		if (template) {
			return template;
		}

		// Optimistically cache template promise to reduce file system I/O, but
		// remove from cache if there was a problem.
		try {
			cache[filePath] = this._getFile(filePath, { cache: options.cache, encoding })
				.then((file: string) => {
					const compileTemplate: (file: string, options: RuntimeOptions) => TemplateSpecification|HandlebarsTemplateDelegate = (options.precompiled ? this._precompileTemplate : this._compileTemplate).bind(this);
					return compileTemplate(file, this.compilerOptions);
				});
			return await cache[filePath];
		} catch (err) {
			delete cache[filePath];
			throw err;
		}
	}

	async getTemplates (dirPath: string, options: PartialTemplateOptions = {}): Promise<HandlebarsTemplateDelegate|TemplateSpecification> {
		const cache = options.cache;

		const filePaths = await this._getDir(dirPath, { cache });
		const templates = await Promise.all(filePaths.map(filePath => {
			return this.getTemplate(path.join(dirPath, filePath), options);
		}));

		const hash = {};
		for (let i = 0; i < filePaths.length; i++) {
			hash[filePaths[i]] = templates[i];
		}
		return hash;
	}

	async render (filePath: string, context: UnknownObject = {}, options: RenderOptions = {}): Promise<string> {
		const encoding = options.encoding || this.encoding;
		const [template, partials] = await Promise.all([
			this.getTemplate(filePath, { cache: options.cache, encoding }) as Promise<HandlebarsTemplateDelegate>,
			(options.partials || this.getPartials({ cache: options.cache, encoding })) as Promise<TemplateDelegateObject>,
		]);
		const helpers: HelperDelegateObject = { ...this.helpers, ...options.helpers };
		const runtimeOptions = { ...this.runtimeOptions, ...options.runtimeOptions };

		// Add ExpressHandlebars metadata to the data channel so that it's
		// accessible within the templates and helpers, namespaced under:
		// `@exphbs.*`
		const data = {
			...options.data,
			exphbs: {
				...options,
				filePath,
				helpers,
				partials,
				runtimeOptions,
			},
		};

		const html = this._renderTemplate(template, context, {
			...runtimeOptions,
			data,
			helpers,
			partials,
		});

		return html;
	}

	async renderView (viewPath: string): Promise<string>;
	async renderView (viewPath: string, options: RenderViewOptions): Promise<string>;
	async renderView (viewPath: string, callback: RenderCallback): Promise<null>;
	async renderView (viewPath: string, options: RenderViewOptions, callback: RenderCallback): Promise<null>;
	async renderView (viewPath: string, options: RenderViewOptions|RenderCallback = {}, callback: RenderCallback|null = null): Promise<string|null> {
		if (typeof options === "function") {
			callback = options;
			options = {};
		}

		const context = options as UnknownObject;

		let promise: Promise<string>|null = null;
		if (!callback) {
			promise = new Promise((resolve, reject) => {
				callback = (err, value) => {
					if (err !== null) {
						reject(err);
					} else {
						resolve(value);
					};
				};
			});
		}

		// Express provides `settings.views` which is the path to the views dir that
		// the developer set on the Express app. When this value exists, it's used
		// to compute the view's name. Layouts and Partials directories are relative
		// to `settings.view` path
		let view: string;
		const views = options.settings && options.settings.views;
		const viewsPath = this._resolveViewsPath(views, viewPath);
		if (viewsPath) {
			view = this._getTemplateName(path.relative(viewsPath, viewPath));
			this.partialsDir = this.config.partialsDir || path.join(viewsPath, "partials/");
			this.layoutsDir = this.config.layoutsDir || path.join(viewsPath, "layouts/");
		}

		const encoding = options.encoding || this.encoding;

		// Merge render-level and instance-level helpers together.
		const helpers = { ...this.helpers, ...options.helpers };

		// Merge render-level and instance-level partials together.
		const partials: TemplateDelegateObject = {
			...await this.getPartials({ cache: options.cache, encoding }) as TemplateDelegateObject,
			...(options.partials || {}),
		};

		// Pluck-out ExpressHandlebars-specific options and Handlebars-specific
		// rendering options.
		const renderOptions = {
			cache: options.cache,
			encoding,
			view,
			layout: "layout" in options ? options.layout : this.defaultLayout,
			data: options.data,
			helpers,
			partials,
			runtimeOptions: options.runtimeOptions,
		};

		try {
			let html = await this.render(viewPath, context, renderOptions);
			const layoutPath = this._resolveLayoutPath(renderOptions.layout);

			if (layoutPath) {
				html = await this.render(
					layoutPath,
					{ ...context, body: html },
					{ ...renderOptions, layout: undefined },
				);
			}
			callback(null, html);
		} catch (err) {
			callback(err);
		}

		return promise;
	}

	resetCache (filePathsOrFilter?: string | string[] | ((template: string) => boolean)) {
		let filePaths: string[] = [];

		if (typeof filePathsOrFilter === "undefined") {
			filePaths = Object.keys(this._fsCache);
		} else if (typeof filePathsOrFilter === "string") {
			filePaths = [filePathsOrFilter];
		} else if (typeof filePathsOrFilter === "function") {
			filePaths = Object.keys(this._fsCache).filter(filePathsOrFilter);
		} else if (Array.isArray(filePathsOrFilter)) {
			filePaths = filePathsOrFilter;
		}

		for (const filePath of filePaths) {
			delete this._fsCache[filePath];
		}
	}

	// -- Protected Hooks ----------------------------------------------------------

	protected _compileTemplate (template: string, options: RuntimeOptions = {}): HandlebarsTemplateDelegate {
		return this.handlebars.compile(template.trim(), options);
	}

	protected _precompileTemplate (template: string, options: RuntimeOptions = {}): TemplateSpecification {
		return this.handlebars.precompile(template.trim(), options);
	}

	protected _renderTemplate (template: HandlebarsTemplateDelegate, context: UnknownObject = {}, options: RuntimeOptions = {}): string {
		return template(context, options).trim();
	}

	// -- Private ------------------------------------------------------------------

	private async _getDir (dirPath: string, options: PartialTemplateOptions = {}): Promise<string[]> {
		dirPath = path.resolve(dirPath);

		const cache = this._fsCache;
		let dir = options.cache && (cache[dirPath] as Promise<string[]>);

		if (dir) {
			return [...await dir];
		}

		const pattern = "**/*" + this.extname;

		// Optimistically cache dir promise to reduce file system I/O, but remove
		// from cache if there was a problem.

		try {
			dir = cache[dirPath] = glob(pattern, {
				cwd: dirPath,
				follow: true,
				posix: true,
			});
			// @ts-expect-error FIXME: not sure how to throw error in glob for test coverage
			if (options._throwTestError) {
				throw new Error("test");
			}

			return [...await dir];
		} catch (err) {
			delete cache[dirPath];
			throw err;
		}
	}

	private async _getFile (filePath: string, options: PartialTemplateOptions = {}): Promise<string> {
		filePath = path.resolve(filePath);

		const cache = this._fsCache;
		const encoding = options.encoding || this.encoding;
		const file = options.cache && (cache[filePath] as Promise<string>);

		if (file) {
			return file;
		}

		// Optimistically cache file promise to reduce file system I/O, but remove
		// from cache if there was a problem.
		try {
			cache[filePath] = readFile(filePath, { encoding: encoding || "utf8" });
			return await cache[filePath] as string;
		} catch (err) {
			delete cache[filePath];
			throw err;
		}
	}

	private _getTemplateName (filePath: string, namespace: string = null): string {
		let name = filePath;

		if (name.endsWith(this.extname)) {
			name = name.substring(0, name.length - this.extname.length);
		}

		if (namespace) {
			name = namespace + "/" + name;
		}

		return name;
	}

	private _resolveViewsPath (views: string|string[], file: string): string|null {
		if (!Array.isArray(views)) {
			return views;
		}

		let lastDir = path.resolve(file);
		let dir = path.dirname(lastDir);
		const absoluteViews = views.map(v => path.resolve(v));

		// find the closest parent
		while (dir !== lastDir) {
			const index = absoluteViews.indexOf(dir);
			if (index >= 0) {
				return views[index];
			}
			lastDir = dir;
			dir = path.dirname(lastDir);
		}

		// cannot resolve view
		return null;
	}

	private _resolveLayoutPath (layoutPath: string): string|null {
		if (!layoutPath) {
			return null;
		}

		if (!path.extname(layoutPath)) {
			layoutPath += this.extname;
		}

		return path.resolve(this.layoutsDir || "", layoutPath);
	}
}
