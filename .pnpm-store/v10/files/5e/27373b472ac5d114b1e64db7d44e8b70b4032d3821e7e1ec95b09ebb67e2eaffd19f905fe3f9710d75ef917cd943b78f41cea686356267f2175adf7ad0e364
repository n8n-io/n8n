import fs from 'node:fs';
import debug from 'debug';
import { SourceCode } from 'eslint';
import { getTsconfigWithContext } from 'eslint-import-context';
import { stableHash } from 'stable-hash-x';
import { cjsRequire } from '../require.js';
import { getValue } from './get-value.js';
import { hasValidExtension, ignore } from './ignore.js';
import { lazy, defineLazyProperty } from './lazy-value.js';
import { parse } from './parse.js';
import { relative, resolve } from './resolve.js';
import { isMaybeUnambiguousModule, isUnambiguousModule } from './unambiguous.js';
import { visit } from './visit.js';
const log = debug('eslint-plugin-import-x:ExportMap');
const exportCache = new Map();
const declTypes = new Set([
    'VariableDeclaration',
    'ClassDeclaration',
    'TSDeclareFunction',
    'TSEnumDeclaration',
    'TSTypeAliasDeclaration',
    'TSInterfaceDeclaration',
    'TSAbstractClassDeclaration',
    'TSModuleDeclaration',
]);
const fixup = new Set(['deprecated', 'module']);
let parseComment_;
const parseComment = (comment) => {
    parseComment_ ??= cjsRequire('comment-parser').parse;
    const restored = `/**${comment.split(/\r?\n/).reduce((acc, line) => {
        line = line.trim();
        return line && line !== '*' ? acc + '\n  ' + line : acc;
    }, '')}
  */`;
    const [doc] = parseComment_(restored);
    return {
        ...doc,
        tags: doc.tags.map(t => t.name && fixup.has(t.tag)
            ? { ...t, description: `${t.name} ${t.description}` }
            : t),
    };
};
export class ExportMap {
    static for(context) {
        const filepath = context.path;
        const cacheKey = context.cacheKey;
        let exportMap = exportCache.get(cacheKey);
        const stats = lazy(() => fs.statSync(filepath));
        if (exportCache.has(cacheKey)) {
            const exportMap = exportCache.get(cacheKey);
            if (exportMap === null) {
                return null;
            }
            if (exportMap != null &&
                exportMap.mtime - stats().mtime.valueOf() === 0) {
                return exportMap;
            }
        }
        if (!hasValidExtension(filepath, context)) {
            exportCache.set(cacheKey, null);
            return null;
        }
        if (ignore(filepath, context, true)) {
            log('ignored path due to ignore settings:', filepath);
            exportCache.set(cacheKey, null);
            return null;
        }
        const content = fs.readFileSync(filepath, { encoding: 'utf8' });
        if (!isMaybeUnambiguousModule(content)) {
            log('ignored path due to unambiguous regex:', filepath);
            exportCache.set(cacheKey, null);
            return null;
        }
        log('cache miss', cacheKey, 'for path', filepath);
        exportMap = ExportMap.parse(filepath, content, context);
        if (exportMap === null) {
            log('ignored path due to ambiguous parse:', filepath);
            exportCache.set(cacheKey, null);
            return null;
        }
        exportMap.mtime = stats().mtime.valueOf();
        if (exportMap.visitorKeys) {
            exportCache.set(cacheKey, exportMap);
        }
        return exportMap;
    }
    static get(source, context) {
        const path = resolve(source, context);
        if (path == null) {
            return null;
        }
        return ExportMap.for(childContext(path, context));
    }
    static parse(filepath, content, context) {
        const m = new ExportMap(filepath);
        const tsconfig = lazy(() => getTsconfigWithContext(context));
        const isEsModuleInteropTrue = lazy(() => tsconfig()?.compilerOptions?.esModuleInterop ?? false);
        let ast;
        let visitorKeys;
        try {
            ;
            ({ ast, visitorKeys } = parse(filepath, content, context));
        }
        catch (error) {
            m.errors.push(error);
            return m;
        }
        m.visitorKeys = visitorKeys;
        let hasDynamicImports = false;
        function processDynamicImport(source) {
            hasDynamicImports = true;
            if (source.type !== 'Literal') {
                return null;
            }
            const p = remotePath(source.value);
            if (p == null) {
                return null;
            }
            const getter = thunkFor(p, context);
            m.imports.set(p, {
                getter,
                declarations: new Set([
                    {
                        source: {
                            value: source.value,
                            loc: source.loc,
                        },
                        importedSpecifiers: new Set(['ImportNamespaceSpecifier']),
                        dynamic: true,
                    },
                ]),
            });
        }
        visit(ast, visitorKeys, {
            ImportExpression(node) {
                processDynamicImport(node.source);
            },
            CallExpression(_node) {
                const node = _node;
                if (node.callee.type === 'Import') {
                    processDynamicImport(node.arguments[0]);
                }
            },
        });
        const unambiguouslyESM = lazy(() => isUnambiguousModule(ast));
        if (!hasDynamicImports && !unambiguouslyESM()) {
            return null;
        }
        const docStyles = (context.settings &&
            context.settings['import-x/docstyle']) || ['jsdoc'];
        const docStyleParsers = {};
        for (const style of docStyles) {
            docStyleParsers[style] = availableDocStyleParsers[style];
        }
        const namespaces = new Map();
        function remotePath(value) {
            return relative(value, filepath, context.settings, context);
        }
        function resolveImport(value) {
            const rp = remotePath(value);
            if (rp == null) {
                return null;
            }
            return ExportMap.for(childContext(rp, context));
        }
        function getNamespace(namespace) {
            if (!namespaces.has(namespace)) {
                return;
            }
            return function () {
                return resolveImport(namespaces.get(namespace));
            };
        }
        function addNamespace(object, identifier) {
            const nsfn = getNamespace(getValue(identifier));
            if (nsfn) {
                Object.defineProperty(object, 'namespace', { get: nsfn });
            }
            return object;
        }
        function processSpecifier(s, n, m) {
            const nsource = ('source' in n &&
                n.source &&
                n.source.value);
            const exportMeta = {};
            let local;
            switch (s.type) {
                case 'ExportDefaultSpecifier': {
                    if (!nsource) {
                        return;
                    }
                    local = 'default';
                    break;
                }
                case 'ExportNamespaceSpecifier': {
                    m.exports.set(s.exported.name, n);
                    m.namespace.set(s.exported.name, Object.defineProperty(exportMeta, 'namespace', {
                        get() {
                            return resolveImport(nsource);
                        },
                    }));
                    return;
                }
                case 'ExportAllDeclaration': {
                    m.exports.set(getValue(s.exported), n);
                    m.namespace.set(getValue(s.exported), addNamespace(exportMeta, s.exported));
                    return;
                }
                case 'ExportSpecifier': {
                    if (!('source' in n && n.source)) {
                        m.exports.set(getValue(s.exported), n);
                        m.namespace.set(getValue(s.exported), addNamespace(exportMeta, s.local));
                        return;
                    }
                }
                default: {
                    if ('local' in s) {
                        local = getValue(s.local);
                    }
                    else {
                        throw new Error('Unknown export specifier type');
                    }
                    break;
                }
            }
            if ('exported' in s) {
                m.reexports.set(getValue(s.exported), {
                    local,
                    getImport: () => resolveImport(nsource),
                });
            }
        }
        function captureDependencyWithSpecifiers(n) {
            const declarationIsType = 'importKind' in n &&
                (n.importKind === 'type' ||
                    n.importKind === 'typeof');
            let specifiersOnlyImportingTypes = n.specifiers.length > 0;
            const importedSpecifiers = new Set();
            for (const specifier of n.specifiers) {
                if (specifier.type === 'ImportSpecifier') {
                    importedSpecifiers.add(getValue(specifier.imported));
                }
                else if (supportedImportTypes.has(specifier.type)) {
                    importedSpecifiers.add(specifier.type);
                }
                specifiersOnlyImportingTypes =
                    specifiersOnlyImportingTypes &&
                        'importKind' in specifier &&
                        (specifier.importKind === 'type' ||
                            specifier.importKind === 'typeof');
            }
            captureDependency(n, declarationIsType || specifiersOnlyImportingTypes, importedSpecifiers);
        }
        function captureDependency({ source, }, isOnlyImportingTypes, importedSpecifiers = new Set()) {
            if (source == null) {
                return null;
            }
            const p = remotePath(source.value);
            if (p == null) {
                return null;
            }
            const declarationMetadata = {
                source: {
                    value: source.value,
                    loc: source.loc,
                },
                isOnlyImportingTypes,
                importedSpecifiers,
            };
            const existing = m.imports.get(p);
            if (existing != null) {
                existing.declarations.add(declarationMetadata);
                return existing.getter;
            }
            const getter = thunkFor(p, context);
            m.imports.set(p, { getter, declarations: new Set([declarationMetadata]) });
            return getter;
        }
        const source = new SourceCode({ text: content, ast: ast });
        for (const n of ast.body) {
            if (n.type === 'ExportDefaultDeclaration') {
                const exportMeta = captureDoc(source, docStyleParsers, n);
                if (n.declaration.type === 'Identifier') {
                    addNamespace(exportMeta, n.declaration);
                }
                m.exports.set('default', n);
                m.namespace.set('default', exportMeta);
                continue;
            }
            if (n.type === 'ExportAllDeclaration') {
                if (n.exported) {
                    namespaces.set(n.exported.name, n.source.value);
                    processSpecifier(n, n.exported, m);
                }
                else {
                    const getter = captureDependency(n, n.exportKind === 'type');
                    if (getter) {
                        m.dependencies.add(getter);
                    }
                }
                continue;
            }
            if (n.type === 'ImportDeclaration') {
                captureDependencyWithSpecifiers(n);
                const ns = n.specifiers.find(s => s.type === 'ImportNamespaceSpecifier');
                if (ns) {
                    namespaces.set(ns.local.name, n.source.value);
                }
                continue;
            }
            if (n.type === 'ExportNamedDeclaration') {
                captureDependencyWithSpecifiers(n);
                if (n.declaration != null) {
                    switch (n.declaration.type) {
                        case 'FunctionDeclaration':
                        case 'ClassDeclaration':
                        case 'TypeAlias':
                        case 'InterfaceDeclaration':
                        case 'DeclareFunction':
                        case 'TSDeclareFunction':
                        case 'TSEnumDeclaration':
                        case 'TSTypeAliasDeclaration':
                        case 'TSInterfaceDeclaration':
                        case 'TSAbstractClassDeclaration':
                        case 'TSModuleDeclaration': {
                            m.exports.set(n.declaration.id.name, n);
                            m.namespace.set(n.declaration.id.name, captureDoc(source, docStyleParsers, n));
                            break;
                        }
                        case 'VariableDeclaration': {
                            for (const d of n.declaration.declarations) {
                                recursivePatternCapture(d.id, id => {
                                    m.exports.set(id.name, n);
                                    m.namespace.set(id.name, captureDoc(source, docStyleParsers, d, n));
                                });
                            }
                            break;
                        }
                        default:
                    }
                }
                for (const s of n.specifiers) {
                    processSpecifier(s, n, m);
                }
            }
            const exports = ['TSExportAssignment'];
            if (isEsModuleInteropTrue()) {
                exports.push('TSNamespaceExportDeclaration');
            }
            if (exports.includes(n.type)) {
                const exportedName = n.type === 'TSNamespaceExportDeclaration'
                    ? (n.id ||
                        n.name).name
                    : ('expression' in n &&
                        n.expression &&
                        (('name' in n.expression && n.expression.name) ||
                            ('id' in n.expression &&
                                n.expression.id &&
                                n.expression.id.name))) ||
                        null;
                const getRoot = (node) => {
                    if (node.left.type === 'TSQualifiedName') {
                        return getRoot(node.left);
                    }
                    return node.left;
                };
                const exportedDecls = ast.body.filter(node => {
                    return (declTypes.has(node.type) &&
                        (('id' in node &&
                            node.id &&
                            ('name' in node.id
                                ? node.id.name === exportedName
                                : 'left' in node.id &&
                                    getRoot(node.id).name === exportedName)) ||
                            ('declarations' in node &&
                                node.declarations.find(d => 'name' in d.id && d.id.name === exportedName))));
                });
                if (exportedDecls.length === 0) {
                    m.exports.set('default', n);
                    m.namespace.set('default', captureDoc(source, docStyleParsers, n));
                    continue;
                }
                if (isEsModuleInteropTrue() &&
                    !m.namespace.has('default')) {
                    m.exports.set('default', n);
                    m.namespace.set('default', {});
                }
                for (const decl of exportedDecls) {
                    if (decl.type === 'TSModuleDeclaration') {
                        const type = decl.body?.type;
                        if (type === 'TSModuleDeclaration') {
                            m.exports.set(decl.body.id.name, n);
                            m.namespace.set(decl.body.id.name, captureDoc(source, docStyleParsers, decl.body));
                            continue;
                        }
                        else if (type === 'TSModuleBlock' && decl.kind === 'namespace') {
                            const metadata = captureDoc(source, docStyleParsers, decl.body);
                            if ('name' in decl.id) {
                                m.namespace.set(decl.id.name, metadata);
                            }
                            else {
                                m.namespace.set(decl.id.right.name, metadata);
                            }
                        }
                        if (decl.body?.body) {
                            for (const moduleBlockNode of decl.body.body) {
                                const namespaceDecl = moduleBlockNode.type === 'ExportNamedDeclaration'
                                    ? moduleBlockNode.declaration
                                    : moduleBlockNode;
                                if (!namespaceDecl) {
                                }
                                else if (namespaceDecl.type === 'VariableDeclaration') {
                                    for (const d of namespaceDecl.declarations)
                                        recursivePatternCapture(d.id, id => {
                                            m.exports.set(id.name, n);
                                            m.namespace.set(id.name, captureDoc(source, docStyleParsers, decl, namespaceDecl, moduleBlockNode));
                                        });
                                }
                                else if ('id' in namespaceDecl) {
                                    m.exports.set(namespaceDecl.id.name, n);
                                    m.namespace.set(namespaceDecl.id.name, captureDoc(source, docStyleParsers, moduleBlockNode));
                                }
                            }
                        }
                    }
                    else {
                        m.exports.set('default', n);
                        m.namespace.set('default', captureDoc(source, docStyleParsers, decl));
                    }
                }
            }
        }
        defineLazyProperty(m, 'doc', () => {
            if (!ast.comments?.length) {
                return;
            }
            for (const c of ast.comments) {
                if (c.type !== 'Block') {
                    continue;
                }
                try {
                    const doc = parseComment(c.value);
                    if (doc.tags.some(t => t.tag === 'module')) {
                        return doc;
                    }
                }
                catch {
                }
            }
        });
        if (isEsModuleInteropTrue() &&
            m.namespace.size > 0 &&
            !m.namespace.has('default')) {
            m.exports.set('default', ast.body[0]);
            m.namespace.set('default', {});
        }
        const prevParseGoal = m.parseGoal;
        defineLazyProperty(m, 'parseGoal', () => {
            if (prevParseGoal !== 'Module' && unambiguouslyESM()) {
                return 'Module';
            }
            return prevParseGoal;
        });
        return m;
    }
    constructor(path) {
        this.path = path;
        this.namespace = new Map();
        this.reexports = new Map();
        this.dependencies = new Set();
        this.imports = new Map();
        this.exports = new Map();
        this.errors = [];
        this.parseGoal = 'ambiguous';
    }
    get hasDefault() {
        return this.get('default') != null;
    }
    get size() {
        let size = this.namespace.size + this.reexports.size;
        for (const dep of this.dependencies) {
            const d = dep();
            if (d == null) {
                continue;
            }
            size += d.size;
        }
        return size;
    }
    has(name) {
        if (this.namespace.has(name)) {
            return true;
        }
        if (this.reexports.has(name)) {
            return true;
        }
        if (name !== 'default') {
            for (const dep of this.dependencies) {
                const innerMap = dep();
                if (!innerMap) {
                    continue;
                }
                if (innerMap.has(name)) {
                    return true;
                }
            }
        }
        return false;
    }
    hasDeep(name) {
        if (this.namespace.has(name)) {
            return { found: true, path: [this] };
        }
        if (this.reexports.has(name)) {
            const reexports = this.reexports.get(name);
            const imported = reexports.getImport();
            if (imported == null) {
                return { found: true, path: [this] };
            }
            if (imported.path === this.path && reexports.local === name) {
                return { found: false, path: [this] };
            }
            const deep = imported.hasDeep(reexports.local);
            deep.path.unshift(this);
            return deep;
        }
        if (name !== 'default') {
            for (const dep of this.dependencies) {
                const innerMap = dep();
                if (innerMap == null) {
                    return { found: true, path: [this] };
                }
                if (!innerMap) {
                    continue;
                }
                if (innerMap.path === this.path) {
                    continue;
                }
                const innerValue = innerMap.hasDeep(name);
                if (innerValue.found) {
                    innerValue.path.unshift(this);
                    return innerValue;
                }
            }
        }
        return { found: false, path: [this] };
    }
    get(name) {
        if (this.namespace.has(name)) {
            return this.namespace.get(name);
        }
        if (this.reexports.has(name)) {
            const reexports = this.reexports.get(name);
            const imported = reexports.getImport();
            if (imported == null) {
                return null;
            }
            if (imported.path === this.path && reexports.local === name) {
                return undefined;
            }
            return imported.get(reexports.local);
        }
        if (name !== 'default') {
            for (const dep of this.dependencies) {
                const innerMap = dep();
                if (!innerMap) {
                    continue;
                }
                if (innerMap.path === this.path) {
                    continue;
                }
                const innerValue = innerMap.get(name);
                if (innerValue !== undefined) {
                    return innerValue;
                }
            }
        }
    }
    $forEach(callback, thisArg) {
        for (const [n, v] of this.namespace.entries()) {
            callback.call(thisArg, v, n, this);
        }
        for (const [name, reexports] of this.reexports.entries()) {
            const reexported = reexports.getImport();
            callback.call(thisArg, reexported?.get(reexports.local), name, this);
        }
        this.dependencies.forEach(dep => {
            const d = dep();
            if (d == null) {
                return;
            }
            d.$forEach((v, n) => {
                if (n !== 'default') {
                    callback.call(thisArg, v, n, this);
                }
            });
        });
    }
    reportErrors(context, declaration) {
        if (!declaration.source) {
            throw new Error('declaration.source is null');
        }
        const msg = this.errors
            .map(err => `${err.message} (${err.lineNumber}:${err.column})`)
            .join(', ');
        context.report({
            node: declaration.source,
            message: `Parse errors in imported module '${declaration.source.value}': ${msg}`,
        });
    }
}
function captureDoc(source, docStyleParsers, ...nodes) {
    const metadata = {};
    defineLazyProperty(metadata, 'doc', () => {
        for (let i = 0, len = nodes.length; i < len; i++) {
            const n = nodes[i];
            if (!n) {
                continue;
            }
            try {
                let leadingComments;
                if ('leadingComments' in n && Array.isArray(n.leadingComments)) {
                    leadingComments = n.leadingComments;
                }
                else if (n.range) {
                    leadingComments = source.getCommentsBefore(n);
                }
                if (!leadingComments || leadingComments.length === 0) {
                    continue;
                }
                for (const parser of Object.values(docStyleParsers)) {
                    const doc = parser(leadingComments);
                    if (doc) {
                        return doc;
                    }
                }
                return;
            }
            catch {
                continue;
            }
        }
    });
    return metadata;
}
const availableDocStyleParsers = {
    jsdoc: captureJsDoc,
    tomdoc: captureTomDoc,
};
function captureJsDoc(comments) {
    for (let i = comments.length - 1; i >= 0; i--) {
        const comment = comments[i];
        if (comment.type !== 'Block') {
            continue;
        }
        try {
            return parseComment(comment.value);
        }
        catch {
        }
    }
}
function captureTomDoc(comments) {
    const lines = [];
    for (const comment of comments) {
        if (/^\s*$/.test(comment.value)) {
            break;
        }
        lines.push(comment.value.trim());
    }
    const statusMatch = lines
        .join(' ')
        .match(/^(Public|Internal|Deprecated):\s*(.+)/);
    if (statusMatch) {
        return {
            description: statusMatch[2],
            tags: [
                {
                    tag: statusMatch[1].toLowerCase(),
                    description: statusMatch[2],
                },
            ],
        };
    }
}
const supportedImportTypes = new Set([
    'ImportDefaultSpecifier',
    'ImportNamespaceSpecifier',
]);
function thunkFor(p, context) {
    return () => ExportMap.for(childContext(p, context));
}
export function recursivePatternCapture(pattern, callback) {
    switch (pattern.type) {
        case 'Identifier': {
            callback(pattern);
            break;
        }
        case 'ObjectPattern': {
            for (const p of pattern.properties) {
                if (p.type === 'ExperimentalRestProperty' ||
                    p.type === 'RestElement') {
                    callback(p.argument);
                    continue;
                }
                recursivePatternCapture(p.value, callback);
            }
            break;
        }
        case 'ArrayPattern': {
            for (const element of pattern.elements) {
                if (element == null) {
                    continue;
                }
                if (element.type === 'ExperimentalRestProperty' ||
                    element.type === 'RestElement') {
                    callback(element.argument);
                    continue;
                }
                recursivePatternCapture(element, callback);
            }
            break;
        }
        case 'AssignmentPattern': {
            callback(pattern.left);
            break;
        }
        default:
    }
}
function childContext(path, context) {
    const { settings, parserOptions, parserPath, languageOptions, cwd, filename, physicalFilename, } = context;
    return {
        cacheKey: makeContextCacheKey(context) + '\0' + path,
        settings,
        parserOptions,
        parserPath,
        languageOptions,
        path,
        cwd,
        filename,
        physicalFilename,
    };
}
export function makeContextCacheKey(context) {
    const { settings, parserPath, parserOptions, languageOptions, cwd } = context;
    let hash = cwd +
        '\0' +
        stableHash(settings) +
        '\0' +
        stableHash(languageOptions?.parserOptions ?? parserOptions);
    if (languageOptions) {
        hash +=
            '\0' +
                String(languageOptions.ecmaVersion) +
                '\0' +
                String(languageOptions.sourceType);
    }
    hash +=
        '\0' +
            stableHash(parserPath ?? languageOptions?.parser?.meta ?? languageOptions?.parser);
    return hash;
}
//# sourceMappingURL=export-map.js.map