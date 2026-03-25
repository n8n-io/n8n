"use strict";
/*
 * Copyright (c) 2015, Yahoo Inc. All rights reserved.
 * Copyrights licensed under the New BSD License.
 * See the accompanying LICENSE file for terms.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const Handlebars = require("handlebars");
const fs = require("graceful-fs");
const path = require("node:path");
const node_util_1 = require("node:util");
const glob_1 = require("glob");
const readFile = (0, node_util_1.promisify)(fs.readFile);
// -----------------------------------------------------------------------------
const defaultConfig = {
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
class ExpressHandlebars {
    constructor(config = {}) {
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
    getPartials() {
        return __awaiter(this, arguments, void 0, function* (options = {}) {
            if (typeof this.partialsDir === "undefined") {
                return {};
            }
            const partialsDirs = Array.isArray(this.partialsDir) ? this.partialsDir : [this.partialsDir];
            const dirs = yield Promise.all(partialsDirs.map((dir) => __awaiter(this, void 0, void 0, function* () {
                let dirPath;
                let dirTemplates;
                let dirNamespace;
                let dirRename;
                // Support `partialsDir` collection with object entries that contain a
                // templates promise and a namespace.
                if (typeof dir === "string") {
                    dirPath = dir;
                }
                else if (typeof dir === "object") {
                    dirTemplates = dir.templates;
                    dirNamespace = dir.namespace;
                    dirRename = dir.rename;
                    dirPath = dir.dir;
                }
                // We must have some path to templates, or templates themselves.
                if (!dirPath && !dirTemplates) {
                    throw new Error("A partials dir must be a string or config object");
                }
                const templates = dirTemplates || (yield this.getTemplates(dirPath, options));
                return {
                    templates: templates,
                    namespace: dirNamespace,
                    rename: dirRename,
                };
            })));
            const partials = {};
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
        });
    }
    getTemplate(filePath_1) {
        return __awaiter(this, arguments, void 0, function* (filePath, options = {}) {
            filePath = path.resolve(filePath);
            const encoding = options.encoding || this.encoding;
            const cache = options.precompiled ? this.precompiled : this.compiled;
            const template = options.cache && cache[filePath];
            if (template) {
                return template;
            }
            // Optimistically cache template promise to reduce file system I/O, but
            // remove from cache if there was a problem.
            try {
                cache[filePath] = this._getFile(filePath, { cache: options.cache, encoding })
                    .then((file) => {
                    const compileTemplate = (options.precompiled ? this._precompileTemplate : this._compileTemplate).bind(this);
                    return compileTemplate(file, this.compilerOptions);
                });
                return yield cache[filePath];
            }
            catch (err) {
                delete cache[filePath];
                throw err;
            }
        });
    }
    getTemplates(dirPath_1) {
        return __awaiter(this, arguments, void 0, function* (dirPath, options = {}) {
            const cache = options.cache;
            const filePaths = yield this._getDir(dirPath, { cache });
            const templates = yield Promise.all(filePaths.map(filePath => {
                return this.getTemplate(path.join(dirPath, filePath), options);
            }));
            const hash = {};
            for (let i = 0; i < filePaths.length; i++) {
                hash[filePaths[i]] = templates[i];
            }
            return hash;
        });
    }
    render(filePath_1) {
        return __awaiter(this, arguments, void 0, function* (filePath, context = {}, options = {}) {
            const encoding = options.encoding || this.encoding;
            const [template, partials] = yield Promise.all([
                this.getTemplate(filePath, { cache: options.cache, encoding }),
                (options.partials || this.getPartials({ cache: options.cache, encoding })),
            ]);
            const helpers = Object.assign(Object.assign({}, this.helpers), options.helpers);
            const runtimeOptions = Object.assign(Object.assign({}, this.runtimeOptions), options.runtimeOptions);
            // Add ExpressHandlebars metadata to the data channel so that it's
            // accessible within the templates and helpers, namespaced under:
            // `@exphbs.*`
            const data = Object.assign(Object.assign({}, options.data), { exphbs: Object.assign(Object.assign({}, options), { filePath,
                    helpers,
                    partials,
                    runtimeOptions }) });
            const html = this._renderTemplate(template, context, Object.assign(Object.assign({}, runtimeOptions), { data,
                helpers,
                partials }));
            return html;
        });
    }
    renderView(viewPath_1) {
        return __awaiter(this, arguments, void 0, function* (viewPath, options = {}, callback = null) {
            if (typeof options === "function") {
                callback = options;
                options = {};
            }
            const context = options;
            let promise = null;
            if (!callback) {
                promise = new Promise((resolve, reject) => {
                    callback = (err, value) => {
                        if (err !== null) {
                            reject(err);
                        }
                        else {
                            resolve(value);
                        }
                        ;
                    };
                });
            }
            // Express provides `settings.views` which is the path to the views dir that
            // the developer set on the Express app. When this value exists, it's used
            // to compute the view's name. Layouts and Partials directories are relative
            // to `settings.view` path
            let view;
            const views = options.settings && options.settings.views;
            const viewsPath = this._resolveViewsPath(views, viewPath);
            if (viewsPath) {
                view = this._getTemplateName(path.relative(viewsPath, viewPath));
                this.partialsDir = this.config.partialsDir || path.join(viewsPath, "partials/");
                this.layoutsDir = this.config.layoutsDir || path.join(viewsPath, "layouts/");
            }
            const encoding = options.encoding || this.encoding;
            // Merge render-level and instance-level helpers together.
            const helpers = Object.assign(Object.assign({}, this.helpers), options.helpers);
            // Merge render-level and instance-level partials together.
            const partials = Object.assign(Object.assign({}, yield this.getPartials({ cache: options.cache, encoding })), (options.partials || {}));
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
                let html = yield this.render(viewPath, context, renderOptions);
                const layoutPath = this._resolveLayoutPath(renderOptions.layout);
                if (layoutPath) {
                    html = yield this.render(layoutPath, Object.assign(Object.assign({}, context), { body: html }), Object.assign(Object.assign({}, renderOptions), { layout: undefined }));
                }
                callback(null, html);
            }
            catch (err) {
                callback(err);
            }
            return promise;
        });
    }
    resetCache(filePathsOrFilter) {
        let filePaths = [];
        if (typeof filePathsOrFilter === "undefined") {
            filePaths = Object.keys(this._fsCache);
        }
        else if (typeof filePathsOrFilter === "string") {
            filePaths = [filePathsOrFilter];
        }
        else if (typeof filePathsOrFilter === "function") {
            filePaths = Object.keys(this._fsCache).filter(filePathsOrFilter);
        }
        else if (Array.isArray(filePathsOrFilter)) {
            filePaths = filePathsOrFilter;
        }
        for (const filePath of filePaths) {
            delete this._fsCache[filePath];
        }
    }
    // -- Protected Hooks ----------------------------------------------------------
    _compileTemplate(template, options = {}) {
        return this.handlebars.compile(template.trim(), options);
    }
    _precompileTemplate(template, options = {}) {
        return this.handlebars.precompile(template.trim(), options);
    }
    _renderTemplate(template, context = {}, options = {}) {
        return template(context, options).trim();
    }
    // -- Private ------------------------------------------------------------------
    _getDir(dirPath_1) {
        return __awaiter(this, arguments, void 0, function* (dirPath, options = {}) {
            dirPath = path.resolve(dirPath);
            const cache = this._fsCache;
            let dir = options.cache && cache[dirPath];
            if (dir) {
                return [...yield dir];
            }
            const pattern = "**/*" + this.extname;
            // Optimistically cache dir promise to reduce file system I/O, but remove
            // from cache if there was a problem.
            try {
                dir = cache[dirPath] = (0, glob_1.glob)(pattern, {
                    cwd: dirPath,
                    follow: true,
                    posix: true,
                });
                // @ts-expect-error FIXME: not sure how to throw error in glob for test coverage
                if (options._throwTestError) {
                    throw new Error("test");
                }
                return [...yield dir];
            }
            catch (err) {
                delete cache[dirPath];
                throw err;
            }
        });
    }
    _getFile(filePath_1) {
        return __awaiter(this, arguments, void 0, function* (filePath, options = {}) {
            filePath = path.resolve(filePath);
            const cache = this._fsCache;
            const encoding = options.encoding || this.encoding;
            const file = options.cache && cache[filePath];
            if (file) {
                return file;
            }
            // Optimistically cache file promise to reduce file system I/O, but remove
            // from cache if there was a problem.
            try {
                cache[filePath] = readFile(filePath, { encoding: encoding || "utf8" });
                return yield cache[filePath];
            }
            catch (err) {
                delete cache[filePath];
                throw err;
            }
        });
    }
    _getTemplateName(filePath, namespace = null) {
        let name = filePath;
        if (name.endsWith(this.extname)) {
            name = name.substring(0, name.length - this.extname.length);
        }
        if (namespace) {
            name = namespace + "/" + name;
        }
        return name;
    }
    _resolveViewsPath(views, file) {
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
    _resolveLayoutPath(layoutPath) {
        if (!layoutPath) {
            return null;
        }
        if (!path.extname(layoutPath)) {
            layoutPath += this.extname;
        }
        return path.resolve(this.layoutsDir || "", layoutPath);
    }
}
exports.default = ExpressHandlebars;
//# sourceMappingURL=express-handlebars.js.map