"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseResolver = exports.YamlParseError = exports.ResolveError = exports.Source = void 0;
exports.makeRefId = makeRefId;
exports.makeDocumentFromString = makeDocumentFromString;
exports.resolveDocument = resolveDocument;
const fs = require("fs");
const path = require("path");
const ref_utils_1 = require("./ref-utils");
const types_1 = require("./types");
const utils_1 = require("./utils");
class Source {
    constructor(absoluteRef, body, mimeType) {
        this.absoluteRef = absoluteRef;
        this.body = body;
        this.mimeType = mimeType;
    }
    // pass safeLoad as argument to separate it from browser bundle
    getAst(safeLoad) {
        if (this._ast === undefined) {
            this._ast = safeLoad(this.body, { filename: this.absoluteRef }) ?? undefined;
            // fix ast representation of file with newlines only
            if (this._ast &&
                this._ast.kind === 0 && // KIND.scalar = 0
                this._ast.value === '' &&
                this._ast.startPosition !== 1) {
                this._ast.startPosition = 1;
                this._ast.endPosition = 1;
            }
        }
        return this._ast;
    }
    getLines() {
        if (this._lines === undefined) {
            this._lines = this.body.split(/\r\n|[\n\r]/g);
        }
        return this._lines;
    }
}
exports.Source = Source;
class ResolveError extends Error {
    constructor(originalError) {
        super(originalError.message);
        this.originalError = originalError;
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, ResolveError.prototype);
    }
}
exports.ResolveError = ResolveError;
const jsYamlErrorLineColRegexp = /\((\d+):(\d+)\)$/;
class YamlParseError extends Error {
    constructor(originalError, source) {
        super(originalError.message.split('\n')[0]);
        this.originalError = originalError;
        this.source = source;
        // Set the prototype explicitly.
        Object.setPrototypeOf(this, YamlParseError.prototype);
        const [, line, col] = this.message.match(jsYamlErrorLineColRegexp) || [];
        this.line = parseInt(line, 10);
        this.col = parseInt(col, 10);
    }
}
exports.YamlParseError = YamlParseError;
function makeRefId(absoluteRef, pointer) {
    return absoluteRef + '::' + pointer;
}
function makeDocumentFromString(sourceString, absoluteRef) {
    const source = new Source(absoluteRef, sourceString);
    try {
        return {
            source,
            parsed: (0, utils_1.parseYaml)(sourceString, { filename: absoluteRef }),
        };
    }
    catch (e) {
        throw new YamlParseError(e, source);
    }
}
class BaseResolver {
    constructor(config = { http: { headers: [] } }) {
        this.config = config;
        this.cache = new Map();
    }
    getFiles() {
        return new Set(Array.from(this.cache.keys()));
    }
    resolveExternalRef(base, ref) {
        if ((0, ref_utils_1.isAbsoluteUrl)(ref)) {
            return ref;
        }
        if (base && (0, ref_utils_1.isAbsoluteUrl)(base)) {
            return new URL(ref, base).href;
        }
        return path.resolve(base ? path.dirname(base) : process.cwd(), ref);
    }
    async loadExternalRef(absoluteRef) {
        try {
            if ((0, ref_utils_1.isAbsoluteUrl)(absoluteRef)) {
                const { body, mimeType } = await (0, utils_1.readFileFromUrl)(absoluteRef, this.config.http);
                return new Source(absoluteRef, body, mimeType);
            }
            else {
                if (fs.lstatSync(absoluteRef).isDirectory()) {
                    throw new Error(`Expected a file but received a folder at ${absoluteRef}.`);
                }
                const content = await fs.promises.readFile(absoluteRef, 'utf-8');
                // In some cases file have \r\n line delimeters like on windows, we should skip it.
                return new Source(absoluteRef, content.replace(/\r\n/g, '\n'));
            }
        }
        catch (error) {
            error.message = error.message.replace(', lstat', '');
            throw new ResolveError(error);
        }
    }
    parseDocument(source, isRoot = false) {
        const ext = source.absoluteRef.substr(source.absoluteRef.lastIndexOf('.'));
        if (!['.json', '.json', '.yml', '.yaml'].includes(ext) &&
            !source.mimeType?.match(/(json|yaml|openapi)/) &&
            !isRoot // always parse root
        ) {
            return { source, parsed: source.body };
        }
        try {
            return {
                source,
                parsed: (0, utils_1.parseYaml)(source.body, { filename: source.absoluteRef }),
            };
        }
        catch (e) {
            throw new YamlParseError(e, source);
        }
    }
    async resolveDocument(base, ref, isRoot = false) {
        const absoluteRef = this.resolveExternalRef(base, ref);
        const cachedDocument = this.cache.get(absoluteRef);
        if (cachedDocument) {
            return cachedDocument;
        }
        const doc = this.loadExternalRef(absoluteRef).then((source) => {
            return this.parseDocument(source, isRoot);
        });
        this.cache.set(absoluteRef, doc);
        return doc;
    }
}
exports.BaseResolver = BaseResolver;
function pushRef(head, node) {
    return {
        prev: head,
        node,
    };
}
function hasRef(head, node) {
    while (head) {
        if (head.node === node) {
            return true;
        }
        head = head.prev;
    }
    return false;
}
const unknownType = { name: 'unknown', properties: {} };
const resolvableScalarType = { name: 'scalar', properties: {} };
async function resolveDocument(opts) {
    const { rootDocument, externalRefResolver, rootType } = opts;
    const resolvedRefMap = new Map();
    const seenNodes = new Set(); // format "${type}::${absoluteRef}${pointer}"
    const resolvePromises = [];
    resolveRefsInParallel(rootDocument.parsed, rootDocument, '#/', rootType);
    let resolved;
    do {
        resolved = await Promise.all(resolvePromises);
    } while (resolvePromises.length !== resolved.length);
    return resolvedRefMap;
    function resolveRefsInParallel(rootNode, rootNodeDocument, rootNodePointer, type) {
        const rootNodeDocAbsoluteRef = rootNodeDocument.source.absoluteRef;
        const anchorRefsMap = new Map();
        walk(rootNode, type, rootNodeDocAbsoluteRef + rootNodePointer);
        function walk(node, type, nodeAbsoluteRef) {
            if (typeof node !== 'object' || node === null) {
                return;
            }
            const nodeId = `${type.name}::${nodeAbsoluteRef}`;
            if (seenNodes.has(nodeId)) {
                return;
            }
            seenNodes.add(nodeId);
            const [_, anchor] = Object.entries(node).find(([key]) => key === '$anchor') || [];
            if (anchor) {
                anchorRefsMap.set(`#${anchor}`, node);
            }
            if (Array.isArray(node)) {
                const itemsType = type.items;
                // we continue resolving unknown types, but stop early on known scalars
                if (itemsType === undefined && type !== unknownType && type !== types_1.SpecExtension) {
                    return;
                }
                const isTypeAFunction = typeof itemsType === 'function';
                for (let i = 0; i < node.length; i++) {
                    const itemType = isTypeAFunction
                        ? itemsType(node[i], (0, ref_utils_1.joinPointer)(nodeAbsoluteRef, i))
                        : itemsType;
                    // we continue resolving unknown types, but stop early on known scalars
                    if (itemType === undefined && type !== unknownType && type !== types_1.SpecExtension) {
                        continue;
                    }
                    walk(node[i], (0, types_1.isNamedType)(itemType) ? itemType : unknownType, (0, ref_utils_1.joinPointer)(nodeAbsoluteRef, i));
                }
                return;
            }
            for (const propName of Object.keys(node)) {
                let propValue = node[propName];
                let propType = type.properties[propName];
                if (propType === undefined)
                    propType = type.additionalProperties;
                if (typeof propType === 'function')
                    propType = propType(propValue, propName);
                if (propType === undefined)
                    propType = unknownType;
                if (type.extensionsPrefix &&
                    propName.startsWith(type.extensionsPrefix) &&
                    propType === unknownType) {
                    propType = types_1.SpecExtension;
                }
                if (!(0, types_1.isNamedType)(propType) && propType?.directResolveAs) {
                    propType = propType.directResolveAs;
                    propValue = { $ref: propValue };
                }
                if (propType && propType.name === undefined && propType.resolvable !== false) {
                    propType = resolvableScalarType;
                }
                if (!(0, types_1.isNamedType)(propType) || typeof propValue !== 'object') {
                    continue;
                }
                walk(propValue, propType, (0, ref_utils_1.joinPointer)(nodeAbsoluteRef, (0, ref_utils_1.escapePointer)(propName)));
            }
            if ((0, ref_utils_1.isRef)(node)) {
                const promise = followRef(rootNodeDocument, node, {
                    prev: null,
                    node,
                }).then((resolvedRef) => {
                    if (resolvedRef.resolved) {
                        resolveRefsInParallel(resolvedRef.node, resolvedRef.document, resolvedRef.nodePointer, type);
                    }
                });
                resolvePromises.push(promise);
            }
            // handle example.externalValue as reference
            if ((0, ref_utils_1.isExternalValue)(node)) {
                const promise = followRef(rootNodeDocument, { $ref: node.externalValue }, {
                    prev: null,
                    node,
                }).then((resolvedRef) => {
                    if (resolvedRef.resolved) {
                        resolveRefsInParallel(resolvedRef.node, resolvedRef.document, resolvedRef.nodePointer, type);
                    }
                });
                resolvePromises.push(promise);
            }
        }
        async function followRef(document, ref, refStack) {
            if (hasRef(refStack.prev, ref)) {
                throw new Error('Self-referencing circular pointer');
            }
            if ((0, ref_utils_1.isAnchor)(ref.$ref)) {
                // Wait for all anchors in the document to be collected firstly.
                await (0, utils_1.nextTick)();
                const resolvedRef = {
                    resolved: true,
                    isRemote: false,
                    node: anchorRefsMap.get(ref.$ref),
                    document,
                    nodePointer: ref.$ref,
                };
                const refId = makeRefId(document.source.absoluteRef, ref.$ref);
                resolvedRefMap.set(refId, resolvedRef);
                return resolvedRef;
            }
            const { uri, pointer } = (0, ref_utils_1.parseRef)(ref.$ref);
            const isRemote = uri !== null;
            let targetDoc;
            try {
                targetDoc = isRemote
                    ? (await externalRefResolver.resolveDocument(document.source.absoluteRef, uri))
                    : document;
            }
            catch (error) {
                const resolvedRef = {
                    resolved: false,
                    isRemote,
                    document: undefined,
                    error: error,
                };
                const refId = makeRefId(document.source.absoluteRef, ref.$ref);
                resolvedRefMap.set(refId, resolvedRef);
                return resolvedRef;
            }
            let resolvedRef = {
                resolved: true,
                document: targetDoc,
                isRemote,
                node: document.parsed,
                nodePointer: '#/',
            };
            let target = targetDoc.parsed;
            const segments = pointer;
            for (const segment of segments) {
                if (typeof target !== 'object') {
                    target = undefined;
                    break;
                }
                else if (target[segment] !== undefined) {
                    target = target[segment];
                    resolvedRef.nodePointer = (0, ref_utils_1.joinPointer)(resolvedRef.nodePointer, (0, ref_utils_1.escapePointer)(segment));
                }
                else if ((0, ref_utils_1.isRef)(target)) {
                    resolvedRef = await followRef(targetDoc, target, pushRef(refStack, target));
                    targetDoc = resolvedRef.document || targetDoc;
                    if (typeof resolvedRef.node !== 'object') {
                        target = undefined;
                        break;
                    }
                    target = resolvedRef.node[segment];
                    resolvedRef.nodePointer = (0, ref_utils_1.joinPointer)(resolvedRef.nodePointer, (0, ref_utils_1.escapePointer)(segment));
                }
                else {
                    target = undefined;
                    break;
                }
            }
            resolvedRef.node = target;
            resolvedRef.document = targetDoc;
            const refId = makeRefId(document.source.absoluteRef, ref.$ref);
            if (resolvedRef.document && (0, ref_utils_1.isRef)(target)) {
                resolvedRef = await followRef(resolvedRef.document, target, pushRef(refStack, target));
            }
            resolvedRefMap.set(refId, resolvedRef);
            return { ...resolvedRef };
        }
    }
}
