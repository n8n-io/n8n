import nodePath from 'node:path';
import debug from 'debug';
import { moduleRequire } from './module-require.js';
function withoutProjectParserOptions(opts) {
    const { EXPERIMENTAL_useProjectService, project, projectService, ...rest } = opts;
    return rest;
}
const log = debug('eslint-plugin-import-x:parse');
function keysFromParser(_parserPath, parserInstance, parsedResult) {
    if (parsedResult && parsedResult.visitorKeys) {
        return parsedResult.visitorKeys;
    }
    if (parserInstance &&
        'VisitorKeys' in parserInstance &&
        parserInstance.VisitorKeys) {
        return parserInstance.VisitorKeys;
    }
    return null;
}
function makeParseReturn(ast, visitorKeys) {
    return {
        ast,
        visitorKeys,
    };
}
function stripUnicodeBOM(text) {
    return text.codePointAt(0) === 0xfe_ff ? text.slice(1) : text;
}
function transformHashbang(text) {
    return text.replace(/^#!([^\r\n]+)/u, (_, captured) => `//${captured}`);
}
export function parse(path, content, context) {
    if (context == null) {
        throw new Error('need context to parse properly');
    }
    let parserOptions = context.languageOptions?.parserOptions || context.parserOptions;
    const parserOrPath = getParserOrPath(path, context);
    if (!parserOrPath) {
        throw new Error('parserPath or languageOptions.parser is required!');
    }
    parserOptions = { ...parserOptions };
    parserOptions.ecmaFeatures = { ...parserOptions.ecmaFeatures };
    parserOptions.comment = true;
    parserOptions.attachComment = true;
    parserOptions.tokens = true;
    parserOptions.loc = true;
    parserOptions.range = true;
    parserOptions.filePath = path;
    parserOptions = withoutProjectParserOptions(parserOptions);
    parserOptions.ecmaVersion ??= context.languageOptions?.ecmaVersion;
    parserOptions.sourceType ??= context.languageOptions?.sourceType;
    const parser = typeof parserOrPath === 'string'
        ? moduleRequire(parserOrPath, context.physicalFilename)
        : parserOrPath;
    content = transformHashbang(stripUnicodeBOM(String(content)));
    if ('parseForESLint' in parser &&
        typeof parser.parseForESLint === 'function') {
        let ast;
        try {
            const parserRaw = parser.parseForESLint(content, parserOptions);
            ast = parserRaw.ast;
            return makeParseReturn(ast, keysFromParser(parserOrPath, parser, parserRaw));
        }
        catch (error_) {
            const error = error_;
            console.warn(`Error while parsing ${parserOptions.filePath}`);
            console.warn(`Line ${error.lineNumber}, column ${error.column}: ${error.message}`);
        }
        if (!ast || typeof ast !== 'object') {
            console.warn(`\`parseForESLint\` from parser \`${typeof parserOrPath === 'string' ? parserOrPath : 'context.languageOptions.parser'}\` is invalid and will just be ignored`, { content, parserMeta: parser.meta });
        }
        else {
            return makeParseReturn(ast, keysFromParser(parserOrPath, parser));
        }
    }
    if ('parse' in parser) {
        const ast = parser.parse(content, parserOptions);
        return makeParseReturn(ast, keysFromParser(parserOrPath, parser));
    }
    throw new Error('Parser must expose a `parse` or `parseForESLint` method');
}
function getParserOrPath(path, context) {
    const parsers = context.settings['import-x/parsers'];
    if (parsers != null) {
        const extension = nodePath.extname(path);
        for (const parserPath in parsers) {
            if (parsers[parserPath].includes(extension)) {
                log('using alt parser:', parserPath);
                return parserPath;
            }
        }
    }
    if ('parserPath' in context && context.parserPath) {
        log('using context.parserPath:', context.parserPath);
        return context.parserPath;
    }
    const parser = 'languageOptions' in context && context.languageOptions?.parser;
    if (parser &&
        typeof parser !== 'string' &&
        (('parse' in parser && typeof parser.parse === 'function') ||
            ('parseForESLint' in parser &&
                typeof parser.parseForESLint === 'function'))) {
        return parser;
    }
    return null;
}
//# sourceMappingURL=parse.js.map