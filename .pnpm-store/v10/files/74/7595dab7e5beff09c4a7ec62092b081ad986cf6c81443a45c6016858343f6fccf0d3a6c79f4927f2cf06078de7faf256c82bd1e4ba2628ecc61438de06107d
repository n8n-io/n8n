import * as path from "node:path";
import * as expressHandlebars from "../lib/index";
import type {
	TemplateDelegateObject,
	EngineOptions,
} from "../types";

function fixturePath (filePath = "") {
	return path.resolve(__dirname, "./fixtures", filePath);
}

describe("express-handlebars", () => {
	test("ExpressHandlebars instance", () => {
		const exphbs = new expressHandlebars.ExpressHandlebars();
		expect(exphbs).toBeDefined();
	});

	test("should nomalize extname", () => {
		const exphbs1 = expressHandlebars.create({ extname: "ext" });
		const exphbs2 = expressHandlebars.create({ extname: ".ext" });
		expect(exphbs1.extname).toBe(".ext");
		expect(exphbs2.extname).toBe(".ext");
	});

	describe("getPartials", () => {
		test("should throw if partialsDir is not correct type", async () => {
			// @ts-expect-error partialsDir is invalid
			const exphbs = expressHandlebars.create({ partialsDir: 1 });
			let error: Error | undefined;
			try {
				await exphbs.getPartials();
			} catch (e) {
				error = e;
			}
			expect(error).toEqual(expect.any(Error));
			expect(error?.message).toBe("A partials dir must be a string or config object");
		});

		test("should return empty object if no partialsDir is defined", async () => {
			const exphbs = expressHandlebars.create();
			const partials = await exphbs.getPartials();
			expect(partials).toEqual({});
		});

		test("should return empty object partialsDir does not exist", async () => {
			const exphbs = expressHandlebars.create({ partialsDir: "does-not-exist" });
			const partials = await exphbs.getPartials();
			expect(partials).toEqual({});
		});

		test("should return partials on string", async () => {
			const exphbs = expressHandlebars.create({ partialsDir: fixturePath("partials") });
			const partials = await exphbs.getPartials();
			expect(partials).toEqual({
				partial: expect.any(Function),
				"partial-latin1": expect.any(Function),
				"subdir/partial-subdir": expect.any(Function),
			});
		});

		test("should return partials on array", async () => {
			const exphbs = expressHandlebars.create({ partialsDir: [fixturePath("partials")] });
			const partials = await exphbs.getPartials();
			expect(partials).toEqual({
				partial: expect.any(Function),
				"partial-latin1": expect.any(Function),
				"subdir/partial-subdir": expect.any(Function),
			});
		});

		test("should return partials on object", async () => {
			const fn = jest.fn();
			const exphbs = expressHandlebars.create({
				partialsDir: {
					templates: { "partial template": fn },
					namespace: "partial namespace",
					dir: fixturePath("partials"),
				},
			});
			const partials = await exphbs.getPartials();
			expect(partials).toEqual({
				"partial namespace/partial template": fn,
			});
		});

		test("should return renamed partials with rename function", async () => {
			const fn = jest.fn();
			const exphbs = expressHandlebars.create({
				partialsDir: {
					templates: { "partial/template": fn },
					namespace: "partial namespace",
					dir: fixturePath("partials"),
					rename: (filePath, namespace) => {
						return `${namespace}/${filePath.split("/")[0]}`;
					},
				},
			});
			const partials = await exphbs.getPartials();
			expect(partials).toEqual({
				"partial namespace/partial": fn,
			});
		});

		test("should return partials on path relative to cwd", async () => {
			const exphbs = expressHandlebars.create({ partialsDir: "spec/fixtures/partials" });
			const partials = await exphbs.getPartials();
			expect(partials).toEqual({
				partial: expect.any(Function),
				"partial-latin1": expect.any(Function),
				"subdir/partial-subdir": expect.any(Function),
			});
		});

		test("should return template function", async () => {
			const exphbs = expressHandlebars.create({ partialsDir: "spec/fixtures/partials" });
			const partials = await exphbs.getPartials() as TemplateDelegateObject;
			const html = partials.partial({ text: "test text" });
			expect(html).toBe("partial test text");
		});

		test("should return a template with encoding", async () => {
			const exphbs = expressHandlebars.create({ partialsDir: "spec/fixtures/partials" });
			const partials = await exphbs.getPartials({ encoding: "latin1" }) as TemplateDelegateObject;
			const html = partials["partial-latin1"]({});
			expect(html).toContain("ñáéíóú");
		});

		test("should return a template with default encoding", async () => {
			const exphbs = expressHandlebars.create({
				encoding: "latin1",
				partialsDir: "spec/fixtures/partials",
			});
			const partials = await exphbs.getPartials() as TemplateDelegateObject;
			const html = partials["partial-latin1"]({});
			expect(html).toContain("ñáéíóú");
		});
	});

	describe("getTemplate", () => {
		test("should return cached template", async () => {
			const exphbs = expressHandlebars.create();
			const filePath = fixturePath("templates/template.handlebars");
			const compiledCachedFunction = (() => "compiled") as Handlebars.TemplateDelegate;
			exphbs.compiled[filePath] = Promise.resolve(compiledCachedFunction);
			const precompiledCachedFunction = (() => "precompiled") as TemplateSpecification;
			exphbs.precompiled[filePath] = Promise.resolve(precompiledCachedFunction);
			const template = await exphbs.getTemplate(filePath, { cache: true });
			expect(template).toBe(compiledCachedFunction);
		});

		test("should return precompiled cached template", async () => {
			const exphbs = expressHandlebars.create();
			const filePath = fixturePath("templates/template.handlebars");
			const compiledCachedFunction = (() => "compiled") as Handlebars.TemplateDelegate;
			exphbs.compiled[filePath] = Promise.resolve(compiledCachedFunction);
			const precompiledCachedFunction = (() => "precompiled") as TemplateSpecification;
			exphbs.precompiled[filePath] = Promise.resolve(precompiledCachedFunction);
			const template = await exphbs.getTemplate(filePath, { precompiled: true, cache: true });
			expect(template).toBe(precompiledCachedFunction);
		});

		test("should store in precompiled cache", async () => {
			const exphbs = expressHandlebars.create();
			const filePath = fixturePath("templates/template.handlebars");
			expect(exphbs.compiled[filePath]).toBeUndefined();
			expect(exphbs.precompiled[filePath]).toBeUndefined();
			await exphbs.getTemplate(filePath, { precompiled: true });
			expect(exphbs.compiled[filePath]).toBeUndefined();
			expect(exphbs.precompiled[filePath]).toBeDefined();
		});

		test("should store in compiled cache", async () => {
			const exphbs = expressHandlebars.create();
			const filePath = fixturePath("templates/template.handlebars");
			expect(exphbs.compiled[filePath]).toBeUndefined();
			expect(exphbs.precompiled[filePath]).toBeUndefined();
			await exphbs.getTemplate(filePath);
			expect(exphbs.compiled[filePath]).toBeDefined();
			expect(exphbs.precompiled[filePath]).toBeUndefined();
		});

		test("should return a template", async () => {
			const exphbs = expressHandlebars.create();
			const filePath = fixturePath("templates/template.handlebars");
			const template = await exphbs.getTemplate(filePath) as HandlebarsTemplateDelegate;
			const html = template({ text: "test text" });
			expect(html).toBe("<p>test text</p>");
		});

		test("should return a template with encoding", async () => {
			const exphbs = expressHandlebars.create();
			const filePath = fixturePath("templates/template-latin1.handlebars");
			const template = await exphbs.getTemplate(filePath, { encoding: "latin1" }) as HandlebarsTemplateDelegate;
			const html = template({});
			expect(html).toContain("ñáéíóú");
		});

		test("should return a template with default encoding", async () => {
			const exphbs = expressHandlebars.create({ encoding: "latin1" });
			const filePath = fixturePath("templates/template-latin1.handlebars");
			const template = await exphbs.getTemplate(filePath) as HandlebarsTemplateDelegate;
			const html = template({});
			expect(html).toContain("ñáéíóú");
		});

		test("should not store in cache on error", async () => {
			const exphbs = expressHandlebars.create();
			const filePath = "does-not-exist";
			expect(exphbs.compiled[filePath]).toBeUndefined();
			let error: Error | undefined;
			try {
				await exphbs.getTemplate(filePath);
			} catch (e) {
				error = e;
			}
			expect(error?.message).toEqual(expect.stringContaining("no such file or directory"));
			expect(exphbs.compiled[filePath]).toBeUndefined();
		});
	});

	describe("getTemplates", () => {
		test("should return cached templates", async () => {
			const exphbs = expressHandlebars.create();
			const dirPath = fixturePath("templates");
			const fsCache = Promise.resolve([]);
			exphbs._fsCache[dirPath] = fsCache;
			const templates = await exphbs.getTemplates(dirPath, { cache: true });
			expect(templates).toEqual({});
		});

		test("should return templates", async () => {
			const exphbs = expressHandlebars.create();
			const dirPath = fixturePath("templates");
			const templates = await exphbs.getTemplates(dirPath);
			const html = templates["template.handlebars"]({ text: "test text" });
			expect(html).toBe("<p>test text</p>");
		});

		test("should get templates in sub directories", async () => {
			const exphbs = expressHandlebars.create();
			const dirPath = fixturePath("templates");
			const templates = await exphbs.getTemplates(dirPath);
			const paths = Object.keys(templates);
			expect(paths).toEqual([
				"template.handlebars",
				"template-latin1.handlebars",
				"subdir/template.handlebars",
			]);
		});
	});

	describe("render", () => {
		test("should return cached templates", async () => {
			const exphbs = expressHandlebars.create();
			const filePath = fixturePath("render-cached.handlebars");
			exphbs.compiled[filePath] = Promise.resolve(() => "cached");
			const html = await exphbs.render(filePath, undefined, { cache: true });
			expect(html).toBe("cached");
		});

		test("should use helpers", async () => {
			const exphbs = expressHandlebars.create({
				helpers: {
					help: () => "help",
				},
			});
			const filePath = fixturePath("render-helper.handlebars");
			const html = await exphbs.render(filePath, { text: "test text" });
			expect(html).toBe("<p>help</p>");
		});

		test("should override helpers", async () => {
			const exphbs = expressHandlebars.create({
				helpers: {
					help: () => "help",
				},
			});
			const filePath = fixturePath("render-helper.handlebars");
			const html = await exphbs.render(filePath, { text: "test text" }, {
				helpers: {
					help: (text: string) => text,
				},
			});
			expect(html).toBe("<p>test text</p>");
		});

		test("should return html", async () => {
			const exphbs = expressHandlebars.create();
			const filePath = fixturePath("render-text.handlebars");
			const html = await exphbs.render(filePath, { text: "test text" });
			expect(html).toBe("<p>test text</p>");
		});

		test("should return html with encoding", async () => {
			const exphbs = expressHandlebars.create({
				partialsDir: fixturePath("partials"),
			});
			const filePath = fixturePath("render-latin1.handlebars");
			const html = await exphbs.render(filePath, undefined, { encoding: "latin1" });
			expect(html).toContain("partial ñáéíóú");
			expect(html).toContain("render ñáéíóú");
		});

		test("should return html with default encoding", async () => {
			const exphbs = expressHandlebars.create({
				encoding: "latin1",
				partialsDir: fixturePath("partials"),
			});
			const filePath = fixturePath("render-latin1.handlebars");
			const html = await exphbs.render(filePath);
			expect(html).toContain("partial ñáéíóú");
			expect(html).toContain("render ñáéíóú");
		});

		test("should render with partial", async () => {
			const exphbs = expressHandlebars.create({
				partialsDir: fixturePath("partials"),
			});
			const filePath = fixturePath("render-partial.handlebars");
			const html = await exphbs.render(filePath, { text: "test text" });
			expect(html.replace(/\r/g, "")).toBe("<h1>partial test text</h1>\n<p>test text</p>");
		});

		test("should render with subdir/partial", async () => {
			const exphbs = expressHandlebars.create({
				partialsDir: fixturePath("partials"),
			});
			const filePath = fixturePath("render-subdir-partial.handlebars");
			const html = await exphbs.render(filePath, { text: "test text" });
			expect(html.replace(/\r/g, "")).toBe("<h1>subdir partial test text</h1>\n<p>test text</p>");
		});

		test("should render with runtimeOptions", async () => {
			const exphbs = expressHandlebars.create({
				runtimeOptions: { allowProtoPropertiesByDefault: true },
			});
			const filePath = fixturePath("test");
			const spy = jest.fn(() => { return "test"; }) as Handlebars.TemplateDelegate;
			exphbs.compiled[filePath] = Promise.resolve(spy);
			await exphbs.render(filePath, undefined, { cache: true });
			expect(spy).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ allowProtoPropertiesByDefault: true }));
		});

		test("should override runtimeOptions", async () => {
			const exphbs = expressHandlebars.create({
				runtimeOptions: { allowProtoPropertiesByDefault: true },
			});
			const filePath = fixturePath("test");
			const spy = jest.fn(() => { return "test"; }) as Handlebars.TemplateDelegate;
			exphbs.compiled[filePath] = Promise.resolve(spy);
			await exphbs.render(filePath, undefined, {
				cache: true,
				runtimeOptions: { allowProtoPropertiesByDefault: false },
			});
			expect(spy).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ allowProtoPropertiesByDefault: false }));
		});
	});

	describe("engine", () => {
		test("should call renderView", async () => {
			jest.spyOn(expressHandlebars.ExpressHandlebars.prototype, "renderView").mockImplementation(() => Promise.resolve(null));
			const exphbs = expressHandlebars.create();
			const cb = () => { /* empty */ };
			exphbs.engine("view", {}, cb);
			expect(expressHandlebars.ExpressHandlebars.prototype.renderView).toHaveBeenCalledWith("view", {}, cb);
		});

		test("should call engine", async () => {
			jest.spyOn(expressHandlebars.ExpressHandlebars.prototype, "renderView").mockImplementation(() => Promise.resolve(null));
			const cb = () => { /* empty */ };
			expressHandlebars.engine()("view", {}, cb);
			expect(expressHandlebars.ExpressHandlebars.prototype.renderView).toHaveBeenCalledWith("view", {}, cb);
		});

		test("should render html", async () => {
			const renderView = expressHandlebars.engine({ defaultLayout: undefined });
			const viewPath = fixturePath("render-text.handlebars");
			const html = await renderView(viewPath, { text: "test text" } as EngineOptions);
			expect(html).toBe("<p>test text</p>");
		});
	});

	describe("renderView", () => {
		test("should use settings.views", async () => {
			const exphbs = expressHandlebars.create();
			const viewPath = fixturePath("render-partial.handlebars");
			const viewsPath = fixturePath();
			const html = await exphbs.renderView(viewPath, {
				text: "test text",
				settings: { views: viewsPath },
			});
			expect(html.replace(/\r/g, "")).toBe("<body>\n<h1>partial test text</h1>\n<p>test text</p>\n</body>");
		});

		test("should use settings.views array", async () => {
			const exphbs = expressHandlebars.create();
			const viewPath = fixturePath("render-partial.handlebars");
			const viewsPath = fixturePath();
			const html = await exphbs.renderView(viewPath, {
				text: "test text",
				settings: { views: [viewsPath] },
			});
			expect(html.replace(/\r/g, "")).toBe("<body>\n<h1>partial test text</h1>\n<p>test text</p>\n</body>");
		});

		test("should not use settings.views array when no parent found", async () => {
			const exphbs = expressHandlebars.create({ defaultLayout: undefined });
			const viewPath = fixturePath("render-text.handlebars");
			const viewsPath = "does-not-exist";
			const html = await exphbs.renderView(viewPath, {
				text: "test text",
				settings: { views: [viewsPath] },
			});
			expect(html).toBe("<p>test text</p>");
		});

		test("should use settings.views when it changes", async () => {
			const exphbs = expressHandlebars.create();
			const viewPath = fixturePath("render-partial.handlebars");
			const viewsPath = fixturePath();
			const html = await exphbs.renderView(viewPath, {
				text: "test text",
				settings: { views: viewsPath },
			});
			expect(html.replace(/\r/g, "")).toBe("<body>\n<h1>partial test text</h1>\n<p>test text</p>\n</body>");
			const otherViewsPath = fixturePath("other-views");
			const otherhtml = await exphbs.renderView(viewPath, {
				text: "test text",
				settings: { views: otherViewsPath },
			});
			expect(otherhtml.replace(/\r/g, "")).toBe("<body>\nother layout\n<h1>other partial test text</h1>\n<p>test text</p>\n</body>");
		});

		test("should not overwrite config with settings.views", async () => {
			const exphbs = expressHandlebars.create({
				layoutsDir: fixturePath("layouts"),
				partialsDir: fixturePath("partials"),
			});
			const viewPath = fixturePath("render-partial.handlebars");
			const viewsPath = fixturePath("other-views");
			const html = await exphbs.renderView(viewPath, {
				text: "test text",
				settings: { views: viewsPath },
			});
			expect(html.replace(/\r/g, "")).toBe("<body>\n<h1>partial test text</h1>\n<p>test text</p>\n</body>");
		});

		test("should merge helpers", async () => {
			const exphbs = expressHandlebars.create({
				defaultLayout: undefined,
				helpers: {
					help: () => "help",
				},
			});
			const viewPath = fixturePath("render-helper.handlebars");
			const html = await exphbs.renderView(viewPath, {
				text: "test text",
				helpers: {
					help: (text: string) => text,
				},
			});
			expect(html).toBe("<p>test text</p>");
		});

		test("should use layout option", async () => {
			const exphbs = expressHandlebars.create({ defaultLayout: undefined });
			const layoutPath = fixturePath("layouts/main.handlebars");
			const viewPath = fixturePath("render-text.handlebars");
			const html = await exphbs.renderView(viewPath, {
				text: "test text",
				layout: layoutPath,
			});
			expect(html.replace(/\r/g, "")).toBe("<body>\n<p>test text</p>\n</body>");
		});

		test("should render html", async () => {
			const exphbs = expressHandlebars.create({ defaultLayout: undefined });
			const viewPath = fixturePath("render-text.handlebars");
			const html = await exphbs.renderView(viewPath, { text: "test text" });
			expect(html).toBe("<p>test text</p>");
		});

		test("should render html with encoding", async () => {
			const exphbs = expressHandlebars.create({
				defaultLayout: "main-latin1",
				partialsDir: fixturePath("partials"),
				layoutsDir: fixturePath("layouts"),
			});
			const viewPath = fixturePath("render-latin1.handlebars");
			const html = await exphbs.renderView(viewPath, { encoding: "latin1" });
			expect(html).toContain("layout ñáéíóú");
			expect(html).toContain("partial ñáéíóú");
			expect(html).toContain("render ñáéíóú");
		});

		test("should render html with default encoding", async () => {
			const exphbs = expressHandlebars.create({
				encoding: "latin1",
				defaultLayout: "main-latin1",
				partialsDir: fixturePath("partials"),
				layoutsDir: fixturePath("layouts"),
			});
			const viewPath = fixturePath("render-latin1.handlebars");
			const html = await exphbs.renderView(viewPath);
			expect(html).toContain("layout ñáéíóú");
			expect(html).toContain("partial ñáéíóú");
			expect(html).toContain("render ñáéíóú");
		});

		test("should call callback with html", (done) => {
			const exphbs = expressHandlebars.create({ defaultLayout: undefined });
			const viewPath = fixturePath("render-text.handlebars");
			exphbs.renderView(viewPath, { text: "test text" }, (err: Error|null, html: string|undefined) => {
				expect(err).toBe(null);
				expect(html).toBe("<p>test text</p>");
				done();
			});
		});

		test("should call callback as second parameter", (done) => {
			const exphbs = expressHandlebars.create({ defaultLayout: undefined });
			const viewPath = fixturePath("render-text.handlebars");
			exphbs.renderView(viewPath, (err: Error|null, html: string|undefined) => {
				expect(err).toBe(null);
				expect(html).toBe("<p></p>");
				done();
			});
		});

		test("should call callback with error", (done) => {
			const exphbs = expressHandlebars.create({ defaultLayout: undefined });
			const viewPath = "does-not-exist";
			exphbs.renderView(viewPath, {}, (err: Error|null, html: string | undefined) => {
				expect(err?.message).toEqual(expect.stringContaining("no such file or directory"));
				expect(html).toBeUndefined();
				done();
			});
		});

		test("should reject with error", async () => {
			const exphbs = expressHandlebars.create({ defaultLayout: undefined });
			const viewPath = "does-not-exist";
			let error: Error | undefined;
			try {
				await exphbs.renderView(viewPath);
			} catch (e) {
				error = e;
			}
			expect(error?.message).toEqual(expect.stringContaining("no such file or directory"));
		});

		test("should use runtimeOptions", async () => {
			const exphbs = expressHandlebars.create({ defaultLayout: undefined });
			const filePath = fixturePath("test");
			const spy = jest.fn(() => { return "test"; }) as Handlebars.TemplateDelegate;
			exphbs.compiled[filePath] = Promise.resolve(spy);
			await exphbs.renderView(filePath, {
				cache: true,
				runtimeOptions: { allowProtoPropertiesByDefault: true },
			});
			expect(spy).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ allowProtoPropertiesByDefault: true }));
		});
	});

	describe("resetCache", () => {
		test("should reset all cache", async () => {
			const exphbs = expressHandlebars.create();
			const dirPath = fixturePath("templates");
			const template = fixturePath("templates/template.handlebars");
			await exphbs.getTemplates(dirPath);
			expect(exphbs._fsCache[template]).toBeDefined();
			exphbs.resetCache();
			expect(exphbs._fsCache).toEqual({});
		});

		test("should reset all cache with undefined", async () => {
			const exphbs = expressHandlebars.create();
			const dirPath = fixturePath("templates");
			const template = fixturePath("templates/template.handlebars");
			await exphbs.getTemplates(dirPath);
			expect(exphbs._fsCache[template]).toBeDefined();
			let undef: undefined;
			exphbs.resetCache(undef);
			expect(exphbs._fsCache).toEqual({});
		});

		test("should reset cached file path", async () => {
			const exphbs = expressHandlebars.create();
			const dirPath = fixturePath("templates");
			const template = fixturePath("templates/template.handlebars");
			await exphbs.getTemplates(dirPath);
			expect(Object.keys(exphbs._fsCache).length).toEqual(4);
			expect(exphbs._fsCache[template]).toBeDefined();
			exphbs.resetCache(template);
			expect(Object.keys(exphbs._fsCache).length).toEqual(3);
			expect(exphbs._fsCache[template]).toBeUndefined();
		});

		test("should reset cached file paths", async () => {
			const exphbs = expressHandlebars.create();
			const dirPath = fixturePath("templates");
			const template = fixturePath("templates/template.handlebars");
			const templateLatin1 = fixturePath("templates/template-latin1.handlebars");
			await exphbs.getTemplates(dirPath);
			expect(Object.keys(exphbs._fsCache).length).toEqual(4);
			expect(exphbs._fsCache[template]).toBeDefined();
			expect(exphbs._fsCache[templateLatin1]).toBeDefined();
			exphbs.resetCache([template, templateLatin1]);
			expect(Object.keys(exphbs._fsCache).length).toEqual(2);
			expect(exphbs._fsCache[template]).toBeUndefined();
			expect(exphbs._fsCache[templateLatin1]).toBeUndefined();
		});

		test("should reset cached file based on filter", async () => {
			const exphbs = expressHandlebars.create();
			const dirPath = fixturePath("templates");
			const templateLatin1 = fixturePath("templates/template-latin1.handlebars");
			await exphbs.getTemplates(dirPath);
			expect(Object.keys(exphbs._fsCache).length).toEqual(4);
			expect(exphbs._fsCache[templateLatin1]).toBeDefined();
			exphbs.resetCache((f) => f.includes("latin1"));
			expect(Object.keys(exphbs._fsCache).length).toEqual(3);
			expect(exphbs._fsCache[templateLatin1]).toBeUndefined();
		});

		test("should not error on invalid file path", async () => {
			const exphbs = expressHandlebars.create();
			const dirPath = fixturePath("templates");
			const template = fixturePath("templates/invalid.handlebars");
			await exphbs.getTemplates(dirPath);
			expect(Object.keys(exphbs._fsCache).length).toEqual(4);
			expect(exphbs._fsCache[template]).toBeUndefined();
			exphbs.resetCache(template);
			expect(Object.keys(exphbs._fsCache).length).toEqual(4);
			expect(exphbs._fsCache[template]).toBeUndefined();
		});
	});

	describe("hooks", () => {
		describe("_compileTemplate", () => {
			test("should call template with context and options", () => {
				const exphbs = expressHandlebars.create();
				// @ts-expect-error empty function
				jest.spyOn(exphbs.handlebars, "compile").mockImplementation(() => {});
				const template = "template";
				const options = {};
				exphbs["_compileTemplate"](template, options);
				expect(exphbs.handlebars.compile).toHaveBeenCalledWith(template, options);
			});

			test("should trim template", () => {
				const exphbs = expressHandlebars.create();
				// @ts-expect-error empty function
				jest.spyOn(exphbs.handlebars, "compile").mockImplementation(() => {});
				const template = " template\n";
				const options = {};
				exphbs["_compileTemplate"](template, options);
				expect(exphbs.handlebars.compile).toHaveBeenCalledWith("template", options);
			});
		});

		describe("_precompileTemplate", () => {
			test("should call template with context and options", () => {
				const exphbs = expressHandlebars.create();
				// @ts-expect-error empty function
				jest.spyOn(exphbs.handlebars, "precompile").mockImplementation(() => {});
				const template = "template";
				const options = {};
				exphbs["_precompileTemplate"](template, options);
				expect(exphbs.handlebars.precompile).toHaveBeenCalledWith(template, options);
			});

			test("should trim template", () => {
				const exphbs = expressHandlebars.create();
				// @ts-expect-error empty function
				jest.spyOn(exphbs.handlebars, "precompile").mockImplementation(() => {});
				const template = " template\n";
				const options = {};
				exphbs["_precompileTemplate"](template, options);
				expect(exphbs.handlebars.precompile).toHaveBeenCalledWith("template", options);
			});
		});

		describe("_renderTemplate", () => {
			test("should call template with context and options", () => {
				const exphbs = expressHandlebars.create();
				const template = jest.fn(() => "");
				const context = {};
				const options = {};
				exphbs["_renderTemplate"](template, context, options);
				expect(template).toHaveBeenCalledWith(context, options);
			});

			test("should trim html", () => {
				const exphbs = expressHandlebars.create();
				const template = () => " \n";
				const html = exphbs["_renderTemplate"](template);
				expect(html).toBe("");
			});
		});

		describe("_getDir", () => {
			test("should get from cache", async () => {
				const exphbs = expressHandlebars.create();
				const filePath = fixturePath("test");
				exphbs._fsCache[filePath] = Promise.resolve(["test"]);
				const file = await exphbs["_getDir"](filePath, { cache: true });
				expect(file).toEqual(["test"]);
			});

			test("should store in cache", async () => {
				const exphbs = expressHandlebars.create();
				const filePath = fixturePath("templates");
				expect(exphbs._fsCache[filePath]).toBeUndefined();
				const expected = await exphbs["_getDir"](filePath);
				expect(exphbs._fsCache[filePath]).toBeInstanceOf(Promise);
				expect(await exphbs._fsCache[filePath]).toEqual(expected);
			});

			test("should not store in cache on error", async () => {
				const exphbs = expressHandlebars.create();
				const filePath = "test";
				expect(exphbs._fsCache[filePath]).toBeUndefined();
				let error: Error | undefined;
				try {
					await exphbs["_getDir"](filePath, {
						// @ts-expect-error Add this just for testing
						_throwTestError: true,
					});
				} catch (e) {
					error = e;
				}
				expect(error).toBeTruthy();
				expect(exphbs._fsCache[filePath]).toBeUndefined();
			});
		});

		describe("_getFile", () => {
			test("should get from cache", async () => {
				const exphbs = expressHandlebars.create();
				const filePath = fixturePath("test");
				exphbs._fsCache[filePath] = "test";
				const file = await exphbs["_getFile"](filePath, { cache: true });
				expect(file).toBe("test");
			});

			test("should store in cache", async () => {
				const exphbs = expressHandlebars.create();
				const filePath = fixturePath("render-text.handlebars");
				expect(exphbs._fsCache[filePath]).toBeUndefined();
				await exphbs["_getFile"](filePath);
				expect(exphbs._fsCache[filePath]).toBeDefined();
			});

			test("should not store in cache on error", async () => {
				const exphbs = expressHandlebars.create();
				const filePath = "does-not-exist";
				expect(exphbs._fsCache[filePath]).toBeUndefined();
				let error: Error | undefined;
				try {
					await exphbs["_getFile"](filePath);
				} catch (e) {
					error = e;
				}
				expect(error?.message).toEqual(expect.stringContaining("no such file or directory"));
				expect(exphbs._fsCache[filePath]).toBeUndefined();
			});

			test("should read as utf8", async () => {
				const exphbs = expressHandlebars.create();
				const filePath = fixturePath("render-text.handlebars");
				const text = await exphbs["_getFile"](filePath);
				expect(text.trim()).toBe("<p>{{text}}</p>");
			});

			test("should read as utf8 by default", async () => {
				const exphbs = expressHandlebars.create({ encoding: undefined });
				const filePath = fixturePath("render-text.handlebars");
				const text = await exphbs["_getFile"](filePath);
				expect(text.trim()).toBe("<p>{{text}}</p>");
			});

			test("should read as latin1", async () => {
				const exphbs = expressHandlebars.create();
				const filePath = fixturePath("render-latin1.handlebars");
				const text = await exphbs["_getFile"](filePath, { encoding: "latin1" });
				expect(text).toContain("ñáéíóú");
			});

			test("should read as default encoding", async () => {
				const exphbs = expressHandlebars.create({ encoding: "latin1" });
				const filePath = fixturePath("render-latin1.handlebars");
				const text = await exphbs["_getFile"](filePath);
				expect(text).toContain("ñáéíóú");
			});
		});

		describe("_getTemplateName", () => {
			test("should remove extension", () => {
				const exphbs = expressHandlebars.create();
				const name = exphbs["_getTemplateName"]("filePath.handlebars");
				expect(name).toBe("filePath");
			});

			test("should leave if no extension", () => {
				const exphbs = expressHandlebars.create();
				const name = exphbs["_getTemplateName"]("filePath");
				expect(name).toBe("filePath");
			});

			test("should add namespace", () => {
				const exphbs = expressHandlebars.create();
				const name = exphbs["_getTemplateName"]("filePath.handlebars", "namespace");
				expect(name).toBe("namespace/filePath");
			});
		});

		describe("_resolveViewsPath", () => {
			test("should return closest parent", () => {
				const file = "/root/views/file.hbs";
				const exphbs = expressHandlebars.create();
				const viewsPath = exphbs["_resolveViewsPath"]([
					"/root",
					"/root/views",
					"/root/views/file",
				], file);
				expect(viewsPath).toBe("/root/views");
			});

			test("should return string views", () => {
				const exphbs = expressHandlebars.create();
				const viewsPath = exphbs["_resolveViewsPath"]("./views", "filePath.hbs");
				expect(viewsPath).toBe("./views");
			});

			test("should return null views", () => {
				const exphbs = expressHandlebars.create();
				// @ts-expect-error shouldn't expect null parameter
				const viewsPath = exphbs["_resolveViewsPath"](null, "filePath.hbs");
				expect(viewsPath).toBe(null);
			});

			test("should return null if not found", () => {
				const file = "/file.hbs";
				const exphbs = expressHandlebars.create();
				const viewsPath = exphbs["_resolveViewsPath"]([
					"/views",
				], file);
				expect(viewsPath).toBe(null);
			});
		});

		describe("_resolveLayoutPath", () => {
			test("should add extension", () => {
				const exphbs = expressHandlebars.create();
				const layoutPath = exphbs["_resolveLayoutPath"]("filePath");
				expect(layoutPath).toEqual(expect.stringMatching(/filePath\.handlebars$/));
			});

			test("should use layoutsDir", () => {
				const layoutsDir = fixturePath("layouts");
				const filePath = "filePath.handlebars";
				const exphbs = expressHandlebars.create({ layoutsDir });
				const layoutPath = exphbs["_resolveLayoutPath"](filePath);
				expect(layoutPath).toBe(path.resolve(layoutsDir, filePath));
			});

			test("should return null", () => {
				const exphbs = expressHandlebars.create();
				// @ts-expect-error shouldn't expect null parameter
				const layoutPath = exphbs["_resolveLayoutPath"](null);
				expect(layoutPath).toBe(null);
			});
		});
	});
});
