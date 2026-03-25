const { createHash } = require('crypto');
const { template } = require('@babel/core');
const { defaults } = require('@istanbuljs/schema');
const { SourceCoverage } = require('./source-coverage');
const { SHA, MAGIC_KEY, MAGIC_VALUE } = require('./constants');

// pattern for istanbul to ignore a section
const COMMENT_RE = /^\s*istanbul\s+ignore\s+(if|else|next)(?=\W|$)/;
// pattern for istanbul to ignore the whole file
const COMMENT_FILE_RE = /^\s*istanbul\s+ignore\s+(file)(?=\W|$)/;
// source map URL pattern
const SOURCE_MAP_RE = /[#@]\s*sourceMappingURL=(.*)\s*$/m;

// generate a variable name from hashing the supplied file path
function genVar(filename) {
    const hash = createHash(SHA);
    hash.update(filename);
    return 'cov_' + parseInt(hash.digest('hex').substr(0, 12), 16).toString(36);
}

// VisitState holds the state of the visitor, provides helper functions
// and is the `this` for the individual coverage visitors.
class VisitState {
    constructor(
        types,
        sourceFilePath,
        inputSourceMap,
        ignoreClassMethods = [],
        reportLogic = false
    ) {
        this.varName = genVar(sourceFilePath);
        this.attrs = {};
        this.nextIgnore = null;
        this.cov = new SourceCoverage(sourceFilePath);

        if (typeof inputSourceMap !== 'undefined') {
            this.cov.inputSourceMap(inputSourceMap);
        }
        this.ignoreClassMethods = ignoreClassMethods;
        this.types = types;
        this.sourceMappingURL = null;
        this.reportLogic = reportLogic;
    }

    // should we ignore the node? Yes, if specifically ignoring
    // or if the node is generated.
    shouldIgnore(path) {
        return this.nextIgnore || !path.node.loc;
    }

    // extract the ignore comment hint (next|if|else) or null
    hintFor(node) {
        let hint = null;
        if (node.leadingComments) {
            node.leadingComments.forEach(c => {
                const v = (
                    c.value || /* istanbul ignore next: paranoid check */ ''
                ).trim();
                const groups = v.match(COMMENT_RE);
                if (groups) {
                    hint = groups[1];
                }
            });
        }
        return hint;
    }

    // extract a source map URL from comments and keep track of it
    maybeAssignSourceMapURL(node) {
        const extractURL = comments => {
            if (!comments) {
                return;
            }
            comments.forEach(c => {
                const v = (
                    c.value || /* istanbul ignore next: paranoid check */ ''
                ).trim();
                const groups = v.match(SOURCE_MAP_RE);
                if (groups) {
                    this.sourceMappingURL = groups[1];
                }
            });
        };
        extractURL(node.leadingComments);
        extractURL(node.trailingComments);
    }

    // for these expressions the statement counter needs to be hoisted, so
    // function name inference can be preserved
    counterNeedsHoisting(path) {
        return (
            path.isFunctionExpression() ||
            path.isArrowFunctionExpression() ||
            path.isClassExpression()
        );
    }

    // all the generic stuff that needs to be done on enter for every node
    onEnter(path) {
        const n = path.node;

        this.maybeAssignSourceMapURL(n);

        // if already ignoring, nothing more to do
        if (this.nextIgnore !== null) {
            return;
        }
        // check hint to see if ignore should be turned on
        const hint = this.hintFor(n);
        if (hint === 'next') {
            this.nextIgnore = n;
            return;
        }
        // else check custom node attribute set by a prior visitor
        if (this.getAttr(path.node, 'skip-all') !== null) {
            this.nextIgnore = n;
        }

        // else check for ignored class methods
        if (
            path.isFunctionExpression() &&
            this.ignoreClassMethods.some(
                name => path.node.id && name === path.node.id.name
            )
        ) {
            this.nextIgnore = n;
            return;
        }
        if (
            path.isClassMethod() &&
            this.ignoreClassMethods.some(name => name === path.node.key.name)
        ) {
            this.nextIgnore = n;
            return;
        }
    }

    // all the generic stuff on exit of a node,
    // including reseting ignores and custom node attrs
    onExit(path) {
        // restore ignore status, if needed
        if (path.node === this.nextIgnore) {
            this.nextIgnore = null;
        }
        // nuke all attributes for the node
        delete path.node.__cov__;
    }

    // set a node attribute for the supplied node
    setAttr(node, name, value) {
        node.__cov__ = node.__cov__ || {};
        node.__cov__[name] = value;
    }

    // retrieve a node attribute for the supplied node or null
    getAttr(node, name) {
        const c = node.__cov__;
        if (!c) {
            return null;
        }
        return c[name];
    }

    //
    increase(type, id, index) {
        const T = this.types;
        const wrap =
            index !== null
                ? // If `index` present, turn `x` into `x[index]`.
                  x => T.memberExpression(x, T.numericLiteral(index), true)
                : x => x;
        return T.updateExpression(
            '++',
            wrap(
                T.memberExpression(
                    T.memberExpression(
                        T.callExpression(T.identifier(this.varName), []),
                        T.identifier(type)
                    ),
                    T.numericLiteral(id),
                    true
                )
            )
        );
    }

    // Reads the logic expression conditions and conditionally increments truthy counter.
    increaseTrue(type, id, index, node) {
        const T = this.types;
        const tempName = `${this.varName}_temp`;

        return T.sequenceExpression([
            T.assignmentExpression(
                '=',
                T.memberExpression(
                    T.callExpression(T.identifier(this.varName), []),
                    T.identifier(tempName)
                ),
                node // Only evaluates once.
            ),
            T.parenthesizedExpression(
                T.conditionalExpression(
                    this.validateTrueNonTrivial(T, tempName),
                    this.increase(type, id, index),
                    T.nullLiteral()
                )
            ),
            T.memberExpression(
                T.callExpression(T.identifier(this.varName), []),
                T.identifier(tempName)
            )
        ]);
    }

    validateTrueNonTrivial(T, tempName) {
        return T.logicalExpression(
            '&&',
            T.memberExpression(
                T.callExpression(T.identifier(this.varName), []),
                T.identifier(tempName)
            ),
            T.logicalExpression(
                '&&',
                T.parenthesizedExpression(
                    T.logicalExpression(
                        '||',
                        T.unaryExpression(
                            '!',
                            T.callExpression(
                                T.memberExpression(
                                    T.identifier('Array'),
                                    T.identifier('isArray')
                                ),
                                [
                                    T.memberExpression(
                                        T.callExpression(
                                            T.identifier(this.varName),
                                            []
                                        ),
                                        T.identifier(tempName)
                                    )
                                ]
                            )
                        ),
                        T.memberExpression(
                            T.memberExpression(
                                T.callExpression(
                                    T.identifier(this.varName),
                                    []
                                ),
                                T.identifier(tempName)
                            ),
                            T.identifier('length')
                        )
                    )
                ),
                T.parenthesizedExpression(
                    T.logicalExpression(
                        '||',
                        T.binaryExpression(
                            '!==',
                            T.callExpression(
                                T.memberExpression(
                                    T.identifier('Object'),
                                    T.identifier('getPrototypeOf')
                                ),
                                [
                                    T.memberExpression(
                                        T.callExpression(
                                            T.identifier(this.varName),
                                            []
                                        ),
                                        T.identifier(tempName)
                                    )
                                ]
                            ),
                            T.memberExpression(
                                T.identifier('Object'),
                                T.identifier('prototype')
                            )
                        ),
                        T.memberExpression(
                            T.callExpression(
                                T.memberExpression(
                                    T.identifier('Object'),
                                    T.identifier('values')
                                ),
                                [
                                    T.memberExpression(
                                        T.callExpression(
                                            T.identifier(this.varName),
                                            []
                                        ),
                                        T.identifier(tempName)
                                    )
                                ]
                            ),
                            T.identifier('length')
                        )
                    )
                )
            )
        );
    }

    insertCounter(path, increment) {
        const T = this.types;
        if (path.isBlockStatement()) {
            path.node.body.unshift(T.expressionStatement(increment));
        } else if (path.isStatement()) {
            path.insertBefore(T.expressionStatement(increment));
        } else if (
            this.counterNeedsHoisting(path) &&
            T.isVariableDeclarator(path.parentPath)
        ) {
            // make an attempt to hoist the statement counter, so that
            // function names are maintained.
            const parent = path.parentPath.parentPath;
            if (parent && T.isExportNamedDeclaration(parent.parentPath)) {
                parent.parentPath.insertBefore(
                    T.expressionStatement(increment)
                );
            } else if (
                parent &&
                (T.isProgram(parent.parentPath) ||
                    T.isBlockStatement(parent.parentPath))
            ) {
                parent.insertBefore(T.expressionStatement(increment));
            } else {
                path.replaceWith(T.sequenceExpression([increment, path.node]));
            }
        } /* istanbul ignore else: not expected */ else if (
            path.isExpression()
        ) {
            path.replaceWith(T.sequenceExpression([increment, path.node]));
        } else {
            console.error(
                'Unable to insert counter for node type:',
                path.node.type
            );
        }
    }

    insertStatementCounter(path) {
        /* istanbul ignore if: paranoid check */
        if (!(path.node && path.node.loc)) {
            return;
        }
        const index = this.cov.newStatement(path.node.loc);
        const increment = this.increase('s', index, null);
        this.insertCounter(path, increment);
    }

    insertFunctionCounter(path) {
        const T = this.types;
        /* istanbul ignore if: paranoid check */
        if (!(path.node && path.node.loc)) {
            return;
        }
        const n = path.node;

        let dloc = null;
        // get location for declaration
        switch (n.type) {
            case 'FunctionDeclaration':
            case 'FunctionExpression':
                /* istanbul ignore else: paranoid check */
                if (n.id) {
                    dloc = n.id.loc;
                }
                break;
        }
        if (!dloc) {
            dloc = {
                start: n.loc.start,
                end: { line: n.loc.start.line, column: n.loc.start.column + 1 }
            };
        }

        const name = path.node.id ? path.node.id.name : path.node.name;
        const index = this.cov.newFunction(name, dloc, path.node.body.loc);
        const increment = this.increase('f', index, null);
        const body = path.get('body');
        /* istanbul ignore else: not expected */
        if (body.isBlockStatement()) {
            body.node.body.unshift(T.expressionStatement(increment));
        } else {
            console.error(
                'Unable to process function body node type:',
                path.node.type
            );
        }
    }

    getBranchIncrement(branchName, loc) {
        const index = this.cov.addBranchPath(branchName, loc);
        return this.increase('b', branchName, index);
    }

    getBranchLogicIncrement(path, branchName, loc) {
        const index = this.cov.addBranchPath(branchName, loc);
        return [
            this.increase('b', branchName, index),
            this.increaseTrue('bT', branchName, index, path.node)
        ];
    }

    insertBranchCounter(path, branchName, loc) {
        const increment = this.getBranchIncrement(
            branchName,
            loc || path.node.loc
        );
        this.insertCounter(path, increment);
    }

    findLeaves(node, accumulator, parent, property) {
        if (!node) {
            return;
        }
        if (node.type === 'LogicalExpression') {
            const hint = this.hintFor(node);
            if (hint !== 'next') {
                this.findLeaves(node.left, accumulator, node, 'left');
                this.findLeaves(node.right, accumulator, node, 'right');
            }
        } else {
            accumulator.push({
                node,
                parent,
                property
            });
        }
    }
}

// generic function that takes a set of visitor methods and
// returns a visitor object with `enter` and `exit` properties,
// such that:
//
// * standard entry processing is done
// * the supplied visitors are called only when ignore is not in effect
//   This relieves them from worrying about ignore states and generated nodes.
// * standard exit processing is done
//
function entries(...enter) {
    // the enter function
    const wrappedEntry = function(path, node) {
        this.onEnter(path);
        if (this.shouldIgnore(path)) {
            return;
        }
        enter.forEach(e => {
            e.call(this, path, node);
        });
    };
    const exit = function(path, node) {
        this.onExit(path, node);
    };
    return {
        enter: wrappedEntry,
        exit
    };
}

function coverStatement(path) {
    this.insertStatementCounter(path);
}

/* istanbul ignore next: no node.js support */
function coverAssignmentPattern(path) {
    const n = path.node;
    const b = this.cov.newBranch('default-arg', n.loc);
    this.insertBranchCounter(path.get('right'), b);
}

function coverFunction(path) {
    this.insertFunctionCounter(path);
}

function coverVariableDeclarator(path) {
    this.insertStatementCounter(path.get('init'));
}

function coverClassPropDeclarator(path) {
    this.insertStatementCounter(path.get('value'));
}

function makeBlock(path) {
    const T = this.types;
    if (!path.node) {
        path.replaceWith(T.blockStatement([]));
    }
    if (!path.isBlockStatement()) {
        path.replaceWith(T.blockStatement([path.node]));
        path.node.loc = path.node.body[0].loc;
        path.node.body[0].leadingComments = path.node.leadingComments;
        path.node.leadingComments = undefined;
    }
}

function blockProp(prop) {
    return function(path) {
        makeBlock.call(this, path.get(prop));
    };
}

function makeParenthesizedExpressionForNonIdentifier(path) {
    const T = this.types;
    if (path.node && !path.isIdentifier()) {
        path.replaceWith(T.parenthesizedExpression(path.node));
    }
}

function parenthesizedExpressionProp(prop) {
    return function(path) {
        makeParenthesizedExpressionForNonIdentifier.call(this, path.get(prop));
    };
}

function convertArrowExpression(path) {
    const n = path.node;
    const T = this.types;
    if (!T.isBlockStatement(n.body)) {
        const bloc = n.body.loc;
        if (n.expression === true) {
            n.expression = false;
        }
        n.body = T.blockStatement([T.returnStatement(n.body)]);
        // restore body location
        n.body.loc = bloc;
        // set up the location for the return statement so it gets
        // instrumented
        n.body.body[0].loc = bloc;
    }
}

function coverIfBranches(path) {
    const n = path.node;
    const hint = this.hintFor(n);
    const ignoreIf = hint === 'if';
    const ignoreElse = hint === 'else';
    const branch = this.cov.newBranch('if', n.loc);

    if (ignoreIf) {
        this.setAttr(n.consequent, 'skip-all', true);
    } else {
        this.insertBranchCounter(path.get('consequent'), branch, n.loc);
    }
    if (ignoreElse) {
        this.setAttr(n.alternate, 'skip-all', true);
    } else {
        this.insertBranchCounter(path.get('alternate'), branch);
    }
}

function createSwitchBranch(path) {
    const b = this.cov.newBranch('switch', path.node.loc);
    this.setAttr(path.node, 'branchName', b);
}

function coverSwitchCase(path) {
    const T = this.types;
    const b = this.getAttr(path.parentPath.node, 'branchName');
    /* istanbul ignore if: paranoid check */
    if (b === null) {
        throw new Error('Unable to get switch branch name');
    }
    const increment = this.getBranchIncrement(b, path.node.loc);
    path.node.consequent.unshift(T.expressionStatement(increment));
}

function coverTernary(path) {
    const n = path.node;
    const branch = this.cov.newBranch('cond-expr', path.node.loc);
    const cHint = this.hintFor(n.consequent);
    const aHint = this.hintFor(n.alternate);

    if (cHint !== 'next') {
        this.insertBranchCounter(path.get('consequent'), branch);
    }
    if (aHint !== 'next') {
        this.insertBranchCounter(path.get('alternate'), branch);
    }
}

function coverLogicalExpression(path) {
    const T = this.types;
    if (path.parentPath.node.type === 'LogicalExpression') {
        return; // already processed
    }
    const leaves = [];
    this.findLeaves(path.node, leaves);
    const b = this.cov.newBranch(
        'binary-expr',
        path.node.loc,
        this.reportLogic
    );
    for (let i = 0; i < leaves.length; i += 1) {
        const leaf = leaves[i];
        const hint = this.hintFor(leaf.node);
        if (hint === 'next') {
            continue;
        }

        if (this.reportLogic) {
            const increment = this.getBranchLogicIncrement(
                leaf,
                b,
                leaf.node.loc
            );
            if (!increment[0]) {
                continue;
            }
            leaf.parent[leaf.property] = T.sequenceExpression([
                increment[0],
                increment[1]
            ]);
            continue;
        }

        const increment = this.getBranchIncrement(b, leaf.node.loc);
        if (!increment) {
            continue;
        }
        leaf.parent[leaf.property] = T.sequenceExpression([
            increment,
            leaf.node
        ]);
    }
}

const codeVisitor = {
    ArrowFunctionExpression: entries(convertArrowExpression, coverFunction),
    AssignmentPattern: entries(coverAssignmentPattern),
    BlockStatement: entries(), // ignore processing only
    ExportDefaultDeclaration: entries(), // ignore processing only
    ExportNamedDeclaration: entries(), // ignore processing only
    ClassMethod: entries(coverFunction),
    ClassDeclaration: entries(parenthesizedExpressionProp('superClass')),
    ClassProperty: entries(coverClassPropDeclarator),
    ClassPrivateProperty: entries(coverClassPropDeclarator),
    ObjectMethod: entries(coverFunction),
    ExpressionStatement: entries(coverStatement),
    BreakStatement: entries(coverStatement),
    ContinueStatement: entries(coverStatement),
    DebuggerStatement: entries(coverStatement),
    ReturnStatement: entries(coverStatement),
    ThrowStatement: entries(coverStatement),
    TryStatement: entries(coverStatement),
    VariableDeclaration: entries(), // ignore processing only
    VariableDeclarator: entries(coverVariableDeclarator),
    IfStatement: entries(
        blockProp('consequent'),
        blockProp('alternate'),
        coverStatement,
        coverIfBranches
    ),
    ForStatement: entries(blockProp('body'), coverStatement),
    ForInStatement: entries(blockProp('body'), coverStatement),
    ForOfStatement: entries(blockProp('body'), coverStatement),
    WhileStatement: entries(blockProp('body'), coverStatement),
    DoWhileStatement: entries(blockProp('body'), coverStatement),
    SwitchStatement: entries(createSwitchBranch, coverStatement),
    SwitchCase: entries(coverSwitchCase),
    WithStatement: entries(blockProp('body'), coverStatement),
    FunctionDeclaration: entries(coverFunction),
    FunctionExpression: entries(coverFunction),
    LabeledStatement: entries(coverStatement),
    ConditionalExpression: entries(coverTernary),
    LogicalExpression: entries(coverLogicalExpression)
};
const globalTemplateAlteredFunction = template(`
        var Function = (function(){}).constructor;
        var global = (new Function(GLOBAL_COVERAGE_SCOPE))();
`);
const globalTemplateFunction = template(`
        var global = (new Function(GLOBAL_COVERAGE_SCOPE))();
`);
const globalTemplateVariable = template(`
        var global = GLOBAL_COVERAGE_SCOPE;
`);
// the template to insert at the top of the program.
const coverageTemplate = template(
    `
    function COVERAGE_FUNCTION () {
        var path = PATH;
        var hash = HASH;
        GLOBAL_COVERAGE_TEMPLATE
        var gcv = GLOBAL_COVERAGE_VAR;
        var coverageData = INITIAL;
        var coverage = global[gcv] || (global[gcv] = {});
        if (!coverage[path] || coverage[path].hash !== hash) {
            coverage[path] = coverageData;
        }

        var actualCoverage = coverage[path];
        {
            // @ts-ignore
            COVERAGE_FUNCTION = function () {
                return actualCoverage;
            }
        }

        return actualCoverage;
    }
`,
    { preserveComments: true }
);
// the rewire plugin (and potentially other babel middleware)
// may cause files to be instrumented twice, see:
// https://github.com/istanbuljs/babel-plugin-istanbul/issues/94
// we should only instrument code for coverage the first time
// it's run through istanbul-lib-instrument.
function alreadyInstrumented(path, visitState) {
    return path.scope.hasBinding(visitState.varName);
}
function shouldIgnoreFile(programNode) {
    return (
        programNode.parent &&
        programNode.parent.comments.some(c => COMMENT_FILE_RE.test(c.value))
    );
}

/**
 * programVisitor is a `babel` adaptor for instrumentation.
 * It returns an object with two methods `enter` and `exit`.
 * These should be assigned to or called from `Program` entry and exit functions
 * in a babel visitor.
 * These functions do not make assumptions about the state set by Babel and thus
 * can be used in a context other than a Babel plugin.
 *
 * The exit function returns an object that currently has the following keys:
 *
 * `fileCoverage` - the file coverage object created for the source file.
 * `sourceMappingURL` - any source mapping URL found when processing the file.
 *
 * @param {Object} types - an instance of babel-types.
 * @param {string} sourceFilePath - the path to source file.
 * @param {Object} opts - additional options.
 * @param {string} [opts.coverageVariable=__coverage__] the global coverage variable name.
 * @param {boolean} [opts.reportLogic=false] report boolean value of logical expressions.
 * @param {string} [opts.coverageGlobalScope=this] the global coverage variable scope.
 * @param {boolean} [opts.coverageGlobalScopeFunc=true] use an evaluated function to find coverageGlobalScope.
 * @param {Array} [opts.ignoreClassMethods=[]] names of methods to ignore by default on classes.
 * @param {object} [opts.inputSourceMap=undefined] the input source map, that maps the uninstrumented code back to the
 * original code.
 */
function programVisitor(types, sourceFilePath = 'unknown.js', opts = {}) {
    const T = types;
    opts = {
        ...defaults.instrumentVisitor,
        ...opts
    };
    const visitState = new VisitState(
        types,
        sourceFilePath,
        opts.inputSourceMap,
        opts.ignoreClassMethods,
        opts.reportLogic
    );
    return {
        enter(path) {
            if (shouldIgnoreFile(path.find(p => p.isProgram()))) {
                return;
            }
            if (alreadyInstrumented(path, visitState)) {
                return;
            }
            path.traverse(codeVisitor, visitState);
        },
        exit(path) {
            if (alreadyInstrumented(path, visitState)) {
                return;
            }
            visitState.cov.freeze();
            const coverageData = visitState.cov.toJSON();
            if (shouldIgnoreFile(path.find(p => p.isProgram()))) {
                return {
                    fileCoverage: coverageData,
                    sourceMappingURL: visitState.sourceMappingURL
                };
            }
            coverageData[MAGIC_KEY] = MAGIC_VALUE;
            const hash = createHash(SHA)
                .update(JSON.stringify(coverageData))
                .digest('hex');
            coverageData.hash = hash;
            if (
                coverageData.inputSourceMap &&
                Object.getPrototypeOf(coverageData.inputSourceMap) !==
                    Object.prototype
            ) {
                coverageData.inputSourceMap = {
                    ...coverageData.inputSourceMap
                };
            }
            const coverageNode = T.valueToNode(coverageData);
            delete coverageData[MAGIC_KEY];
            delete coverageData.hash;
            let gvTemplate;
            if (opts.coverageGlobalScopeFunc) {
                if (path.scope.getBinding('Function')) {
                    gvTemplate = globalTemplateAlteredFunction({
                        GLOBAL_COVERAGE_SCOPE: T.stringLiteral(
                            'return ' + opts.coverageGlobalScope
                        )
                    });
                } else {
                    gvTemplate = globalTemplateFunction({
                        GLOBAL_COVERAGE_SCOPE: T.stringLiteral(
                            'return ' + opts.coverageGlobalScope
                        )
                    });
                }
            } else {
                gvTemplate = globalTemplateVariable({
                    GLOBAL_COVERAGE_SCOPE: opts.coverageGlobalScope
                });
            }
            const cv = coverageTemplate({
                GLOBAL_COVERAGE_VAR: T.stringLiteral(opts.coverageVariable),
                GLOBAL_COVERAGE_TEMPLATE: gvTemplate,
                COVERAGE_FUNCTION: T.identifier(visitState.varName),
                PATH: T.stringLiteral(sourceFilePath),
                INITIAL: coverageNode,
                HASH: T.stringLiteral(hash)
            });
            // explicitly call this.varName to ensure coverage is always initialized
            path.node.body.unshift(
                T.expressionStatement(
                    T.callExpression(T.identifier(visitState.varName), [])
                )
            );
            path.node.body.unshift(cv);
            return {
                fileCoverage: coverageData,
                sourceMappingURL: visitState.sourceMappingURL
            };
        }
    };
}

module.exports = programVisitor;
