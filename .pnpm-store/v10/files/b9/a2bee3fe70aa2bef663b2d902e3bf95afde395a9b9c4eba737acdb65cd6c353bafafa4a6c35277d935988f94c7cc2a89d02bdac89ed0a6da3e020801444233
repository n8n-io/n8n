export function moduleVisitor(visitor, options) {
    const ignore = options?.ignore;
    const amd = !!options?.amd;
    const commonjs = !!options?.commonjs;
    const esmodule = !!{ esmodule: true, ...options }.esmodule;
    const ignoreRegExps = ignore == null ? [] : ignore.map(p => new RegExp(p));
    function checkSourceValue(source, importer) {
        if (source == null) {
            return;
        }
        if (ignoreRegExps.some(re => re.test(String(source.value)))) {
            return;
        }
        visitor(source, importer);
    }
    function checkSource(node) {
        checkSourceValue(node.source, node);
    }
    function checkImportCall(node) {
        let modulePath;
        if (node.type === 'ImportExpression') {
            modulePath = node.source;
        }
        else if (node.type === 'CallExpression') {
            if (node.callee.type !== 'Import') {
                return;
            }
            if (node.arguments.length !== 1) {
                return;
            }
            modulePath = node.arguments[0];
        }
        else {
            throw new TypeError('this should be unreachable');
        }
        if (modulePath.type !== 'Literal') {
            return;
        }
        if (typeof modulePath.value !== 'string') {
            return;
        }
        checkSourceValue(modulePath, node);
    }
    function checkCommon(call) {
        if (call.callee.type !== 'Identifier') {
            return;
        }
        if (call.callee.name !== 'require') {
            return;
        }
        if (call.arguments.length !== 1) {
            return;
        }
        const modulePath = call.arguments[0];
        if (modulePath.type !== 'Literal') {
            return;
        }
        if (typeof modulePath.value !== 'string') {
            return;
        }
        checkSourceValue(modulePath, call);
    }
    function checkAMD(call) {
        if (call.callee.type !== 'Identifier') {
            return;
        }
        if (call.callee.name !== 'require' && call.callee.name !== 'define') {
            return;
        }
        if (call.arguments.length !== 2) {
            return;
        }
        const modules = call.arguments[0];
        if (modules.type !== 'ArrayExpression') {
            return;
        }
        for (const element of modules.elements) {
            if (!element) {
                continue;
            }
            if (element.type !== 'Literal') {
                continue;
            }
            if (typeof element.value !== 'string') {
                continue;
            }
            if (element.value === 'require' || element.value === 'exports') {
                continue;
            }
            checkSourceValue(element, element);
        }
    }
    const visitors = {};
    if (esmodule) {
        Object.assign(visitors, {
            ImportDeclaration: checkSource,
            ExportNamedDeclaration: checkSource,
            ExportAllDeclaration: checkSource,
            CallExpression: checkImportCall,
            ImportExpression: checkImportCall,
        });
    }
    if (commonjs || amd) {
        const currentCallExpression = visitors.CallExpression;
        visitors.CallExpression = function (call) {
            if (currentCallExpression) {
                currentCallExpression(call);
            }
            if (commonjs) {
                checkCommon(call);
            }
            if (amd) {
                checkAMD(call);
            }
        };
    }
    return visitors;
}
export function makeOptionsSchema(additionalProperties) {
    const base = {
        type: 'object',
        properties: {
            commonjs: { type: 'boolean' },
            amd: { type: 'boolean' },
            esmodule: { type: 'boolean' },
            ignore: {
                type: 'array',
                minItems: 1,
                items: { type: 'string' },
                uniqueItems: true,
            },
        },
        additionalProperties: false,
    };
    if (additionalProperties) {
        for (const key in additionalProperties) {
            base.properties[key] = additionalProperties[key];
        }
    }
    return base;
}
export const optionsSchema = makeOptionsSchema();
//# sourceMappingURL=module-visitor.js.map