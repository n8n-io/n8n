const { parseSync, traverse } = require('@babel/core');
const { defaults } = require('@istanbuljs/schema');
const { MAGIC_KEY, MAGIC_VALUE } = require('./constants');

function getAst(code) {
    if (typeof code === 'object' && typeof code.type === 'string') {
        // Assume code is already a babel ast.
        return code;
    }

    if (typeof code !== 'string') {
        throw new Error('Code must be a string');
    }

    // Parse as leniently as possible
    return parseSync(code, {
        babelrc: false,
        configFile: false,
        parserOpts: {
            allowAwaitOutsideFunction: true,
            allowImportExportEverywhere: true,
            allowReturnOutsideFunction: true,
            allowSuperOutsideMethod: true,
            sourceType: 'script',
            plugins: defaults.instrumenter.parserPlugins
        }
    });
}

module.exports = function readInitialCoverage(code) {
    const ast = getAst(code);

    let covScope;
    traverse(ast, {
        ObjectProperty(path) {
            const { node } = path;
            if (
                !node.computed &&
                path.get('key').isIdentifier() &&
                node.key.name === MAGIC_KEY
            ) {
                const magicValue = path.get('value').evaluate();
                if (!magicValue.confident || magicValue.value !== MAGIC_VALUE) {
                    return;
                }
                covScope =
                    path.scope.getFunctionParent() ||
                    path.scope.getProgramParent();
                path.stop();
            }
        }
    });

    if (!covScope) {
        return null;
    }

    const result = {};

    for (const key of ['path', 'hash', 'gcv', 'coverageData']) {
        const binding = covScope.getOwnBinding(key);
        if (!binding) {
            return null;
        }
        const valuePath = binding.path.get('init');
        const value = valuePath.evaluate();
        if (!value.confident) {
            return null;
        }
        result[key] = value.value;
    }

    delete result.coverageData[MAGIC_KEY];
    delete result.coverageData.hash;

    return result;
};
