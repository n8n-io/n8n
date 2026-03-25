import debug from 'debug';
import { minimatch } from 'minimatch';
import { getValue, importType, isStaticRequire, createRule, } from '../utils/index.js';
const log = debug('eslint-plugin-import-x:rules:order');
const groupBy = (array, grouper) => array.reduce((acc, curr, index) => {
    const key = grouper(curr, index);
    (acc[key] ||= []).push(curr);
    return acc;
}, {});
const categories = {
    named: 'named',
    import: 'import',
    exports: 'exports',
};
const defaultGroups = [
    'builtin',
    'external',
    'parent',
    'sibling',
    'index',
];
function reverse(array) {
    return array.map(v => ({ ...v, rank: -v.rank })).reverse();
}
function getTokensOrCommentsAfter(sourceCode, node, count) {
    let currentNodeOrToken = node;
    const result = [];
    for (let i = 0; i < count; i++) {
        currentNodeOrToken = sourceCode.getTokenAfter(currentNodeOrToken, {
            includeComments: true,
        });
        if (currentNodeOrToken == null) {
            break;
        }
        result.push(currentNodeOrToken);
    }
    return result;
}
function getTokensOrCommentsBefore(sourceCode, node, count) {
    let currentNodeOrToken = node;
    const result = [];
    for (let i = 0; i < count; i++) {
        currentNodeOrToken = sourceCode.getTokenBefore(currentNodeOrToken, {
            includeComments: true,
        });
        if (currentNodeOrToken == null) {
            break;
        }
        result.push(currentNodeOrToken);
    }
    return result.reverse();
}
function takeTokensAfterWhile(sourceCode, node, condition) {
    const tokens = getTokensOrCommentsAfter(sourceCode, node, 100);
    const result = [];
    for (const token of tokens) {
        if (condition(token)) {
            result.push(token);
        }
        else {
            break;
        }
    }
    return result;
}
function takeTokensBeforeWhile(sourceCode, node, condition) {
    const tokens = getTokensOrCommentsBefore(sourceCode, node, 100);
    const result = [];
    for (let i = tokens.length - 1; i >= 0; i--) {
        if (condition(tokens[i])) {
            result.push(tokens[i]);
        }
        else {
            break;
        }
    }
    return result.reverse();
}
function findOutOfOrder(imported) {
    if (imported.length === 0) {
        return [];
    }
    let maxSeenRankNode = imported[0];
    return imported.filter(function (importedModule) {
        const res = importedModule.rank < maxSeenRankNode.rank;
        if (maxSeenRankNode.rank < importedModule.rank) {
            maxSeenRankNode = importedModule;
        }
        return res;
    });
}
function findRootNode(node) {
    let parent = node;
    while (parent.parent != null &&
        (!('body' in parent.parent) || parent.parent.body == null)) {
        parent = parent.parent;
    }
    return parent;
}
function findEndOfLineWithComments(sourceCode, node) {
    const tokensToEndOfLine = takeTokensAfterWhile(sourceCode, node, commentOnSameLineAs(node));
    const endOfTokens = tokensToEndOfLine.length > 0
        ? tokensToEndOfLine[tokensToEndOfLine.length - 1].range[1]
        : node.range[1];
    let result = endOfTokens;
    for (let i = endOfTokens; i < sourceCode.text.length; i++) {
        if (sourceCode.text[i] === '\n') {
            result = i + 1;
            break;
        }
        if (sourceCode.text[i] !== ' ' &&
            sourceCode.text[i] !== '\t' &&
            sourceCode.text[i] !== '\r') {
            break;
        }
        result = i + 1;
    }
    return result;
}
function commentOnSameLineAs(node) {
    return (token) => (token.type === 'Block' || token.type === 'Line') &&
        token.loc.start.line === token.loc.end.line &&
        token.loc.end.line === node.loc.end.line;
}
function findStartOfLineWithComments(sourceCode, node) {
    const tokensToEndOfLine = takeTokensBeforeWhile(sourceCode, node, commentOnSameLineAs(node));
    const startOfTokens = tokensToEndOfLine.length > 0 ? tokensToEndOfLine[0].range[0] : node.range[0];
    let result = startOfTokens;
    for (let i = startOfTokens - 1; i > 0; i--) {
        if (sourceCode.text[i] !== ' ' && sourceCode.text[i] !== '\t') {
            break;
        }
        result = i;
    }
    return result;
}
function findSpecifierStart(sourceCode, node) {
    let token;
    do {
        token = sourceCode.getTokenBefore(node);
    } while (token.value !== ',' && token.value !== '{');
    return token.range[1];
}
function findSpecifierEnd(sourceCode, node) {
    let token;
    do {
        token = sourceCode.getTokenAfter(node);
    } while (token.value !== ',' && token.value !== '}');
    return token.range[0];
}
function isRequireExpression(expr) {
    return (expr != null &&
        expr.type === 'CallExpression' &&
        expr.callee != null &&
        'name' in expr.callee &&
        expr.callee.name === 'require' &&
        expr.arguments != null &&
        expr.arguments.length === 1 &&
        expr.arguments[0].type === 'Literal');
}
function isSupportedRequireModule(node) {
    if (node.type !== 'VariableDeclaration') {
        return false;
    }
    if (node.declarations.length !== 1) {
        return false;
    }
    const decl = node.declarations[0];
    const isPlainRequire = decl.id &&
        (decl.id.type === 'Identifier' || decl.id.type === 'ObjectPattern') &&
        isRequireExpression(decl.init);
    const isRequireWithMemberExpression = decl.id &&
        (decl.id.type === 'Identifier' || decl.id.type === 'ObjectPattern') &&
        decl.init != null &&
        decl.init.type === 'CallExpression' &&
        decl.init.callee != null &&
        decl.init.callee.type === 'MemberExpression' &&
        isRequireExpression(decl.init.callee.object);
    return isPlainRequire || isRequireWithMemberExpression;
}
function isPlainImportModule(node) {
    return (node.type === 'ImportDeclaration' &&
        node.specifiers != null &&
        node.specifiers.length > 0);
}
function isPlainImportEquals(node) {
    return (node.type === 'TSImportEqualsDeclaration' &&
        'expression' in node.moduleReference &&
        !!node.moduleReference.expression);
}
function isCJSExports(context, node) {
    if (node.type === 'MemberExpression' &&
        node.object.type === 'Identifier' &&
        node.property.type === 'Identifier' &&
        node.object.name === 'module' &&
        node.property.name === 'exports') {
        return !context.sourceCode
            .getScope(node)
            .variables.some(variable => variable.name === 'module');
    }
    if (node.type === 'Identifier' && node.name === 'exports') {
        return !context.sourceCode
            .getScope(node)
            .variables.some(variable => variable.name === 'exports');
    }
}
function getNamedCJSExports(context, node) {
    if (node.type !== 'MemberExpression') {
        return;
    }
    const result = [];
    let root = node;
    let parent;
    while (root.type === 'MemberExpression') {
        if (root.property.type !== 'Identifier') {
            return;
        }
        result.unshift(root.property.name);
        parent = root;
        root = root.object;
    }
    if (isCJSExports(context, root)) {
        return result;
    }
    if (isCJSExports(context, parent)) {
        return result.slice(1);
    }
}
function canCrossNodeWhileReorder(node) {
    return (isSupportedRequireModule(node) ||
        isPlainImportModule(node) ||
        isPlainImportEquals(node));
}
function canReorderItems(firstNode, secondNode) {
    const parent = firstNode.parent;
    if (!parent || !('body' in parent) || !Array.isArray(parent.body)) {
        return false;
    }
    const body = parent.body;
    const [firstIndex, secondIndex] = [
        body.indexOf(firstNode),
        body.indexOf(secondNode),
    ].sort();
    const nodesBetween = parent.body.slice(firstIndex, secondIndex + 1);
    for (const nodeBetween of nodesBetween) {
        if (!canCrossNodeWhileReorder(nodeBetween)) {
            return false;
        }
    }
    return true;
}
function makeImportDescription(node) {
    if (node.type === 'export') {
        if (node.node.exportKind === 'type') {
            return 'type export';
        }
        return 'export';
    }
    if (node.node.importKind === 'type') {
        return 'type import';
    }
    if (node.node.importKind === 'typeof') {
        return 'typeof import';
    }
    return 'import';
}
function fixOutOfOrder(context, firstNode, secondNode, order, category) {
    const isNamed = category === categories.named;
    const isExports = category === categories.exports;
    const { sourceCode } = context;
    const { firstRoot, secondRoot } = isNamed
        ? { firstRoot: firstNode.node, secondRoot: secondNode.node }
        : {
            firstRoot: findRootNode(firstNode.node),
            secondRoot: findRootNode(secondNode.node),
        };
    const { firstRootStart, firstRootEnd, secondRootStart, secondRootEnd } = isNamed
        ? {
            firstRootStart: findSpecifierStart(sourceCode, firstRoot),
            firstRootEnd: findSpecifierEnd(sourceCode, firstRoot),
            secondRootStart: findSpecifierStart(sourceCode, secondRoot),
            secondRootEnd: findSpecifierEnd(sourceCode, secondRoot),
        }
        : {
            firstRootStart: findStartOfLineWithComments(sourceCode, firstRoot),
            firstRootEnd: findEndOfLineWithComments(sourceCode, firstRoot),
            secondRootStart: findStartOfLineWithComments(sourceCode, secondRoot),
            secondRootEnd: findEndOfLineWithComments(sourceCode, secondRoot),
        };
    if (firstNode.displayName === secondNode.displayName) {
        if (firstNode.alias) {
            firstNode.displayName = `${firstNode.displayName} as ${firstNode.alias}`;
        }
        if (secondNode.alias) {
            secondNode.displayName = `${secondNode.displayName} as ${secondNode.alias}`;
        }
    }
    const firstDesc = makeImportDescription(firstNode);
    const secondDesc = makeImportDescription(secondNode);
    if (firstNode.displayName === secondNode.displayName &&
        firstDesc === secondDesc) {
        log(firstNode.displayName, firstNode.node.loc, secondNode.displayName, secondNode.node.loc);
        return;
    }
    const firstImport = `${firstDesc} of \`${firstNode.displayName}\``;
    const secondImport = `\`${secondNode.displayName}\` ${secondDesc}`;
    const messageOptions = {
        messageId: 'order',
        data: { firstImport, secondImport, order },
    };
    if (isNamed) {
        const firstCode = sourceCode.text.slice(firstRootStart, firstRoot.range[1]);
        const firstTrivia = sourceCode.text.slice(firstRoot.range[1], firstRootEnd);
        const secondCode = sourceCode.text.slice(secondRootStart, secondRoot.range[1]);
        const secondTrivia = sourceCode.text.slice(secondRoot.range[1], secondRootEnd);
        if (order === 'before') {
            const trimmedTrivia = secondTrivia.trimEnd();
            const gapCode = sourceCode.text.slice(firstRootEnd, secondRootStart - 1);
            const whitespaces = secondTrivia.slice(trimmedTrivia.length);
            context.report({
                node: secondNode.node,
                ...messageOptions,
                fix: fixer => fixer.replaceTextRange([firstRootStart, secondRootEnd], `${secondCode},${trimmedTrivia}${firstCode}${firstTrivia}${gapCode}${whitespaces}`),
            });
        }
        else if (order === 'after') {
            const trimmedTrivia = firstTrivia.trimEnd();
            const gapCode = sourceCode.text.slice(secondRootEnd + 1, firstRootStart);
            const whitespaces = firstTrivia.slice(trimmedTrivia.length);
            context.report({
                node: secondNode.node,
                ...messageOptions,
                fix: fixes => fixes.replaceTextRange([secondRootStart, firstRootEnd], `${gapCode}${firstCode},${trimmedTrivia}${secondCode}${whitespaces}`),
            });
        }
    }
    else {
        const canFix = isExports || canReorderItems(firstRoot, secondRoot);
        let newCode = sourceCode.text.slice(secondRootStart, secondRootEnd);
        if (newCode[newCode.length - 1] !== '\n') {
            newCode = `${newCode}\n`;
        }
        if (order === 'before') {
            context.report({
                node: secondNode.node,
                ...messageOptions,
                fix: canFix
                    ? fixer => fixer.replaceTextRange([firstRootStart, secondRootEnd], newCode +
                        sourceCode.text.slice(firstRootStart, secondRootStart))
                    : null,
            });
        }
        else if (order === 'after') {
            context.report({
                node: secondNode.node,
                ...messageOptions,
                fix: canFix
                    ? fixer => fixer.replaceTextRange([secondRootStart, firstRootEnd], sourceCode.text.slice(secondRootEnd, firstRootEnd) + newCode)
                    : null,
            });
        }
    }
}
function reportOutOfOrder(context, imported, outOfOrder, order, category) {
    for (const imp of outOfOrder) {
        fixOutOfOrder(context, imported.find(importedItem => importedItem.rank > imp.rank), imp, order, category);
    }
}
function makeOutOfOrderReport(context, imported, category) {
    const outOfOrder = findOutOfOrder(imported);
    if (outOfOrder.length === 0) {
        return;
    }
    const reversedImported = reverse(imported);
    const reversedOrder = findOutOfOrder(reversedImported);
    if (reversedOrder.length < outOfOrder.length) {
        reportOutOfOrder(context, reversedImported, reversedOrder, 'after', category);
        return;
    }
    reportOutOfOrder(context, imported, outOfOrder, 'before', category);
}
const compareString = (a, b) => {
    if (a < b) {
        return -1;
    }
    if (a > b) {
        return 1;
    }
    return 0;
};
const DEFAULT_IMPORT_KIND = 'value';
const getNormalizedValue = (node, toLowerCase) => {
    const value = String(node.value);
    return toLowerCase ? value.toLowerCase() : value;
};
const RELATIVE_DOTS = new Set(['.', '..']);
function getSorter(alphabetizeOptions) {
    const multiplier = alphabetizeOptions.order === 'asc' ? 1 : -1;
    const orderImportKind = alphabetizeOptions.orderImportKind;
    const multiplierImportKind = orderImportKind !== 'ignore' &&
        (alphabetizeOptions.orderImportKind === 'asc' ? 1 : -1);
    return function importsSorter(nodeA, nodeB) {
        const importA = getNormalizedValue(nodeA, alphabetizeOptions.caseInsensitive);
        const importB = getNormalizedValue(nodeB, alphabetizeOptions.caseInsensitive);
        let result = 0;
        if (!importA.includes('/') && !importB.includes('/')) {
            result = compareString(importA, importB);
        }
        else {
            const A = importA.split('/');
            const B = importB.split('/');
            const a = A.length;
            const b = B.length;
            for (let i = 0; i < Math.min(a, b); i++) {
                const x = A[i];
                const y = B[i];
                if (i === 0 && RELATIVE_DOTS.has(x) && RELATIVE_DOTS.has(y)) {
                    if (x !== y) {
                        break;
                    }
                    continue;
                }
                result = compareString(x, y);
                if (result) {
                    break;
                }
            }
            if (!result && a !== b) {
                result = a < b ? -1 : 1;
            }
        }
        result = result * multiplier;
        if (!result && multiplierImportKind) {
            result =
                multiplierImportKind *
                    compareString(nodeA.node.importKind || DEFAULT_IMPORT_KIND, nodeB.node.importKind || DEFAULT_IMPORT_KIND);
        }
        return result;
    };
}
function mutateRanksToAlphabetize(imported, alphabetizeOptions) {
    const groupedByRanks = groupBy(imported, item => item.rank);
    const sorterFn = getSorter(alphabetizeOptions);
    const groupRanks = Object.keys(groupedByRanks).sort((a, b) => +a - +b);
    for (const groupRank of groupRanks) {
        groupedByRanks[groupRank].sort(sorterFn);
    }
    let newRank = 0;
    const alphabetizedRanks = groupRanks.reduce((acc, groupRank) => {
        for (const importedItem of groupedByRanks[groupRank]) {
            acc[`${importedItem.value}|${importedItem.node.importKind}`] =
                Number.parseInt(groupRank, 10) + newRank;
            newRank += 1;
        }
        return acc;
    }, {});
    for (const importedItem of imported) {
        importedItem.rank =
            alphabetizedRanks[`${importedItem.value}|${importedItem.node.importKind}`];
    }
}
function computePathRank(ranks, pathGroups, path, maxPosition) {
    for (const { pattern, patternOptions, group, position = 1 } of pathGroups) {
        if (minimatch(path, pattern, patternOptions || { nocomment: true })) {
            return ranks[group] + position / maxPosition;
        }
    }
}
function computeRank(context, ranks, importEntry, excludedImportTypes, isSortingTypesGroup) {
    let impType;
    let rank;
    const isTypeGroupInGroups = !ranks.omittedTypes.includes('type');
    const isTypeOnlyImport = importEntry.node.importKind === 'type';
    const isExcludedFromPathRank = isTypeOnlyImport && isTypeGroupInGroups && excludedImportTypes.has('type');
    if (importEntry.type === 'import:object') {
        impType = 'object';
    }
    else if (isTypeOnlyImport && isTypeGroupInGroups && !isSortingTypesGroup) {
        impType = 'type';
    }
    else {
        impType = importType(importEntry.value, context);
    }
    if (!excludedImportTypes.has(impType) && !isExcludedFromPathRank) {
        rank =
            typeof importEntry.value === 'string'
                ? computePathRank(ranks.groups, ranks.pathGroups, importEntry.value, ranks.maxPosition)
                : undefined;
    }
    if (rank === undefined) {
        rank = ranks.groups[impType];
        if (rank === undefined) {
            return -1;
        }
    }
    if (isTypeOnlyImport && isSortingTypesGroup) {
        rank = ranks.groups.type + rank / 10;
    }
    if (importEntry.type !== 'import' &&
        !importEntry.type.startsWith('import:')) {
        rank += 100;
    }
    return rank;
}
function registerNode(context, importEntry, ranks, imported, excludedImportTypes, isSortingTypesGroup) {
    const rank = computeRank(context, ranks, importEntry, excludedImportTypes, isSortingTypesGroup);
    if (rank !== -1) {
        let importNode = importEntry.node;
        if (importEntry.type === 'require' &&
            importNode.parent?.parent?.type === 'VariableDeclaration') {
            importNode = importNode.parent.parent;
        }
        imported.push({
            ...importEntry,
            rank,
            isMultiline: importNode.loc.end.line !== importNode.loc.start.line,
        });
    }
}
function getRequireBlock(node) {
    let n = node;
    while ((n.parent?.type === 'MemberExpression' && n.parent.object === n) ||
        (n.parent?.type === 'CallExpression' && n.parent.callee === n)) {
        n = n.parent;
    }
    if (n.parent?.type === 'VariableDeclarator' &&
        n.parent.parent.type === 'VariableDeclaration' &&
        n.parent.parent.parent.type === 'Program') {
        return n.parent.parent.parent;
    }
}
const types = [
    'builtin',
    'external',
    'internal',
    'unknown',
    'parent',
    'sibling',
    'index',
    'object',
    'type',
];
function convertGroupsToRanks(groups) {
    const rankObject = groups.reduce((res, group, index) => {
        for (const groupItem of [group].flat()) {
            if (!types.includes(groupItem)) {
                throw new Error(`Incorrect configuration of the rule: Unknown type \`${JSON.stringify(groupItem)}\``);
            }
            if (res[groupItem] !== undefined) {
                throw new Error(`Incorrect configuration of the rule: \`${groupItem}\` is duplicated`);
            }
            res[groupItem] = index * 2;
        }
        return res;
    }, {});
    const omittedTypes = types.filter(type => rankObject[type] === undefined);
    const ranks = omittedTypes.reduce(function (res, type) {
        res[type] = groups.length * 2;
        return res;
    }, rankObject);
    return { groups: ranks, omittedTypes };
}
function convertPathGroupsForRanks(pathGroups) {
    const after = {};
    const before = {};
    const transformed = pathGroups.map((pathGroup, index) => {
        const { group, position: positionString } = pathGroup;
        let position = 0;
        if (positionString === 'after') {
            if (!after[group]) {
                after[group] = 1;
            }
            position = after[group]++;
        }
        else if (positionString === 'before') {
            if (!before[group]) {
                before[group] = [];
            }
            before[group].push(index);
        }
        return { ...pathGroup, position };
    });
    let maxPosition = 1;
    for (const group of Object.keys(before)) {
        const groupLength = before[group].length;
        for (const [index, groupIndex] of before[group].entries()) {
            transformed[groupIndex].position = -1 * (groupLength - index);
        }
        maxPosition = Math.max(maxPosition, groupLength);
    }
    for (const key of Object.keys(after)) {
        const groupNextPosition = after[key];
        maxPosition = Math.max(maxPosition, groupNextPosition - 1);
    }
    return {
        pathGroups: transformed,
        maxPosition: maxPosition > 10 ? Math.pow(10, Math.ceil(Math.log10(maxPosition))) : 10,
    };
}
function fixNewLineAfterImport(context, previousImport) {
    const prevRoot = findRootNode(previousImport.node);
    const tokensToEndOfLine = takeTokensAfterWhile(context.sourceCode, prevRoot, commentOnSameLineAs(prevRoot));
    let endOfLine = prevRoot.range[1];
    if (tokensToEndOfLine.length > 0) {
        endOfLine = tokensToEndOfLine[tokensToEndOfLine.length - 1].range[1];
    }
    return (fixer) => fixer.insertTextAfterRange([prevRoot.range[0], endOfLine], '\n');
}
function removeNewLineAfterImport(context, currentImport, previousImport) {
    const { sourceCode } = context;
    const prevRoot = findRootNode(previousImport.node);
    const currRoot = findRootNode(currentImport.node);
    const rangeToRemove = [
        findEndOfLineWithComments(sourceCode, prevRoot),
        findStartOfLineWithComments(sourceCode, currRoot),
    ];
    if (/^\s*$/.test(sourceCode.text.slice(rangeToRemove[0], rangeToRemove[1]))) {
        return (fixer) => fixer.removeRange(rangeToRemove);
    }
    return;
}
function makeNewlinesBetweenReport(context, imported, newlinesBetweenImports_, newlinesBetweenTypeOnlyImports_, distinctGroup, isSortingTypesGroup, isConsolidatingSpaceBetweenImports) {
    const getNumberOfEmptyLinesBetween = (currentImport, previousImport) => {
        return context.sourceCode.lines
            .slice(previousImport.node.loc.end.line, currentImport.node.loc.start.line - 1)
            .filter(line => line.trim().length === 0).length;
    };
    const getIsStartOfDistinctGroup = (currentImport, previousImport) => currentImport.rank - 1 >= previousImport.rank;
    let previousImport = imported[0];
    for (const currentImport of imported.slice(1)) {
        const emptyLinesBetween = getNumberOfEmptyLinesBetween(currentImport, previousImport);
        const isStartOfDistinctGroup = getIsStartOfDistinctGroup(currentImport, previousImport);
        const isTypeOnlyImport = currentImport.node.importKind === 'type';
        const isPreviousImportTypeOnlyImport = previousImport.node.importKind === 'type';
        const isNormalImportNextToTypeOnlyImportAndRelevant = isTypeOnlyImport !== isPreviousImportTypeOnlyImport && isSortingTypesGroup;
        const isTypeOnlyImportAndRelevant = isTypeOnlyImport && isSortingTypesGroup;
        const newlinesBetweenImports = isSortingTypesGroup &&
            isConsolidatingSpaceBetweenImports &&
            (previousImport.isMultiline || currentImport.isMultiline) &&
            newlinesBetweenImports_ === 'never'
            ? 'always-and-inside-groups'
            : newlinesBetweenImports_;
        const newlinesBetweenTypeOnlyImports = isSortingTypesGroup &&
            isConsolidatingSpaceBetweenImports &&
            (isNormalImportNextToTypeOnlyImportAndRelevant ||
                previousImport.isMultiline ||
                currentImport.isMultiline) &&
            newlinesBetweenTypeOnlyImports_ === 'never'
            ? 'always-and-inside-groups'
            : newlinesBetweenTypeOnlyImports_;
        const isNotIgnored = (isTypeOnlyImportAndRelevant &&
            newlinesBetweenTypeOnlyImports !== 'ignore') ||
            (!isTypeOnlyImportAndRelevant && newlinesBetweenImports !== 'ignore');
        if (isNotIgnored) {
            const shouldAssertNewlineBetweenGroups = ((isTypeOnlyImportAndRelevant ||
                isNormalImportNextToTypeOnlyImportAndRelevant) &&
                (newlinesBetweenTypeOnlyImports === 'always' ||
                    newlinesBetweenTypeOnlyImports === 'always-and-inside-groups')) ||
                (!isTypeOnlyImportAndRelevant &&
                    !isNormalImportNextToTypeOnlyImportAndRelevant &&
                    (newlinesBetweenImports === 'always' ||
                        newlinesBetweenImports === 'always-and-inside-groups'));
            const shouldAssertNoNewlineWithinGroup = ((isTypeOnlyImportAndRelevant ||
                isNormalImportNextToTypeOnlyImportAndRelevant) &&
                newlinesBetweenTypeOnlyImports !== 'always-and-inside-groups') ||
                (!isTypeOnlyImportAndRelevant &&
                    !isNormalImportNextToTypeOnlyImportAndRelevant &&
                    newlinesBetweenImports !== 'always-and-inside-groups');
            const shouldAssertNoNewlineBetweenGroup = !isSortingTypesGroup ||
                !isNormalImportNextToTypeOnlyImportAndRelevant ||
                newlinesBetweenTypeOnlyImports === 'never';
            const isTheNewlineBetweenImportsInTheSameGroup = (distinctGroup && currentImport.rank === previousImport.rank) ||
                (!distinctGroup && !isStartOfDistinctGroup);
            let alreadyReported = false;
            if (shouldAssertNewlineBetweenGroups) {
                if (currentImport.rank !== previousImport.rank &&
                    emptyLinesBetween === 0) {
                    if (distinctGroup || isStartOfDistinctGroup) {
                        alreadyReported = true;
                        context.report({
                            node: previousImport.node,
                            messageId: 'oneLineBetweenGroups',
                            fix: fixNewLineAfterImport(context, previousImport),
                        });
                    }
                }
                else if (emptyLinesBetween > 0 &&
                    shouldAssertNoNewlineWithinGroup &&
                    isTheNewlineBetweenImportsInTheSameGroup) {
                    alreadyReported = true;
                    context.report({
                        node: previousImport.node,
                        messageId: 'noLineWithinGroup',
                        fix: removeNewLineAfterImport(context, currentImport, previousImport),
                    });
                }
            }
            else if (emptyLinesBetween > 0 && shouldAssertNoNewlineBetweenGroup) {
                alreadyReported = true;
                context.report({
                    node: previousImport.node,
                    messageId: 'noLineBetweenGroups',
                    fix: removeNewLineAfterImport(context, currentImport, previousImport),
                });
            }
            if (!alreadyReported && isConsolidatingSpaceBetweenImports) {
                if (emptyLinesBetween === 0 && currentImport.isMultiline) {
                    context.report({
                        node: previousImport.node,
                        messageId: 'oneLineBetweenTheMultiLineImport',
                        fix: fixNewLineAfterImport(context, previousImport),
                    });
                }
                else if (emptyLinesBetween === 0 && previousImport.isMultiline) {
                    context.report({
                        node: previousImport.node,
                        messageId: 'oneLineBetweenThisMultiLineImport',
                        fix: fixNewLineAfterImport(context, previousImport),
                    });
                }
                else if (emptyLinesBetween > 0 &&
                    !previousImport.isMultiline &&
                    !currentImport.isMultiline &&
                    isTheNewlineBetweenImportsInTheSameGroup) {
                    context.report({
                        node: previousImport.node,
                        messageId: 'noLineBetweenSingleLineImport',
                        fix: removeNewLineAfterImport(context, currentImport, previousImport),
                    });
                }
            }
        }
        previousImport = currentImport;
    }
}
function getAlphabetizeConfig(options) {
    const alphabetize = options.alphabetize || {};
    const order = alphabetize.order || 'ignore';
    const orderImportKind = alphabetize.orderImportKind || 'ignore';
    const caseInsensitive = alphabetize.caseInsensitive || false;
    return { order, orderImportKind, caseInsensitive };
}
const defaultDistinctGroup = true;
export default createRule({
    name: 'order',
    meta: {
        type: 'suggestion',
        docs: {
            category: 'Style guide',
            description: 'Enforce a convention in module import order.',
        },
        fixable: 'code',
        schema: [
            {
                type: 'object',
                properties: {
                    groups: {
                        type: 'array',
                    },
                    pathGroupsExcludedImportTypes: {
                        type: 'array',
                    },
                    distinctGroup: {
                        type: 'boolean',
                        default: defaultDistinctGroup,
                    },
                    pathGroups: {
                        type: 'array',
                        items: {
                            type: 'object',
                            properties: {
                                pattern: {
                                    type: 'string',
                                },
                                patternOptions: {
                                    type: 'object',
                                },
                                group: {
                                    type: 'string',
                                    enum: types,
                                },
                                position: {
                                    type: 'string',
                                    enum: ['after', 'before'],
                                },
                            },
                            additionalProperties: false,
                            required: ['pattern', 'group'],
                        },
                    },
                    'newlines-between': {
                        type: 'string',
                        enum: ['ignore', 'always', 'always-and-inside-groups', 'never'],
                    },
                    'newlines-between-types': {
                        type: 'string',
                        enum: ['ignore', 'always', 'always-and-inside-groups', 'never'],
                    },
                    consolidateIslands: {
                        type: 'string',
                        enum: ['inside-groups', 'never'],
                    },
                    sortTypesGroup: {
                        type: 'boolean',
                        default: false,
                    },
                    named: {
                        default: false,
                        oneOf: [
                            {
                                type: 'boolean',
                            },
                            {
                                type: 'object',
                                properties: {
                                    enabled: { type: 'boolean' },
                                    import: { type: 'boolean' },
                                    export: { type: 'boolean' },
                                    require: { type: 'boolean' },
                                    cjsExports: { type: 'boolean' },
                                    types: {
                                        type: 'string',
                                        enum: ['mixed', 'types-first', 'types-last'],
                                    },
                                },
                                additionalProperties: false,
                            },
                        ],
                    },
                    alphabetize: {
                        type: 'object',
                        properties: {
                            caseInsensitive: {
                                type: 'boolean',
                                default: false,
                            },
                            order: {
                                type: 'string',
                                enum: ['ignore', 'asc', 'desc'],
                                default: 'ignore',
                            },
                            orderImportKind: {
                                type: 'string',
                                enum: ['ignore', 'asc', 'desc'],
                                default: 'ignore',
                            },
                        },
                        additionalProperties: false,
                    },
                    warnOnUnassignedImports: {
                        type: 'boolean',
                        default: false,
                    },
                },
                additionalProperties: false,
                dependencies: {
                    'newlines-between-types': {
                        type: 'object',
                        properties: {
                            sortTypesGroup: {
                                type: 'boolean',
                                enum: [true],
                            },
                        },
                        required: ['sortTypesGroup'],
                    },
                    consolidateIslands: {
                        anyOf: [
                            {
                                type: 'object',
                                properties: {
                                    'newlines-between': {
                                        type: 'string',
                                        enum: ['always-and-inside-groups'],
                                    },
                                },
                                required: ['newlines-between'],
                            },
                            {
                                type: 'object',
                                properties: {
                                    'newlines-between-types': {
                                        type: 'string',
                                        enum: ['always-and-inside-groups'],
                                    },
                                },
                                required: ['newlines-between-types'],
                            },
                        ],
                    },
                },
            },
        ],
        messages: {
            error: '{{error}}',
            noLineWithinGroup: 'There should be no empty line within import group',
            noLineBetweenGroups: 'There should be no empty line between import groups',
            oneLineBetweenGroups: 'There should be at least one empty line between import groups',
            order: '{{secondImport}} should occur {{order}} {{firstImport}}',
            oneLineBetweenTheMultiLineImport: 'There should be at least one empty line between this import and the multi-line import that follows it',
            oneLineBetweenThisMultiLineImport: 'There should be at least one empty line between this multi-line import and the import that follows it',
            noLineBetweenSingleLineImport: 'There should be no empty lines between this single-line import and the single-line import that follows it',
        },
    },
    defaultOptions: [],
    create(context) {
        const options = context.options[0] || {};
        const newlinesBetweenImports = options['newlines-between'] || 'ignore';
        const newlinesBetweenTypeOnlyImports = options['newlines-between-types'] || newlinesBetweenImports;
        const pathGroupsExcludedImportTypes = new Set(options.pathGroupsExcludedImportTypes ||
            ['builtin', 'external', 'object']);
        const sortTypesGroup = options.sortTypesGroup;
        const consolidateIslands = options.consolidateIslands || 'never';
        const named = {
            types: 'mixed',
            ...(typeof options.named === 'object'
                ? {
                    ...options.named,
                    import: 'import' in options.named
                        ? options.named.import
                        : options.named.enabled,
                    export: 'export' in options.named
                        ? options.named.export
                        : options.named.enabled,
                    require: 'require' in options.named
                        ? options.named.require
                        : options.named.enabled,
                    cjsExports: 'cjsExports' in options.named
                        ? options.named.cjsExports
                        : options.named.enabled,
                }
                : {
                    import: options.named,
                    export: options.named,
                    require: options.named,
                    cjsExports: options.named,
                }),
        };
        const namedGroups = named.types === 'mixed'
            ? []
            : named.types === 'types-last'
                ? ['value']
                : ['type'];
        const alphabetize = getAlphabetizeConfig(options);
        const distinctGroup = options.distinctGroup == null
            ? defaultDistinctGroup
            : !!options.distinctGroup;
        let ranks;
        try {
            const { pathGroups, maxPosition } = convertPathGroupsForRanks(options.pathGroups || []);
            const { groups, omittedTypes } = convertGroupsToRanks(options.groups || defaultGroups);
            ranks = {
                groups,
                omittedTypes,
                pathGroups,
                maxPosition,
            };
        }
        catch (error) {
            return {
                Program(node) {
                    context.report({
                        node,
                        messageId: 'error',
                        data: {
                            error: error.message,
                        },
                    });
                },
            };
        }
        const importMap = new Map();
        const exportMap = new Map();
        const isTypeGroupInGroups = !ranks.omittedTypes.includes('type');
        const isSortingTypesGroup = isTypeGroupInGroups && sortTypesGroup;
        function getBlockImports(node) {
            let blockImports = importMap.get(node);
            if (!blockImports) {
                importMap.set(node, (blockImports = []));
            }
            return blockImports;
        }
        function getBlockExports(node) {
            let blockExports = exportMap.get(node);
            if (!blockExports) {
                exportMap.set(node, (blockExports = []));
            }
            return blockExports;
        }
        function makeNamedOrderReport(context, namedImports) {
            if (namedImports.length > 1) {
                const imports = namedImports.map(namedImport => {
                    const kind = namedImport.kind || 'value';
                    const rank = namedGroups.indexOf(kind);
                    return {
                        displayName: namedImport.value,
                        rank: rank === -1 ? namedGroups.length : rank,
                        ...namedImport,
                        value: `${namedImport.value}:${namedImport.alias || ''}`,
                    };
                });
                if (alphabetize.order !== 'ignore') {
                    mutateRanksToAlphabetize(imports, alphabetize);
                }
                makeOutOfOrderReport(context, imports, categories.named);
            }
        }
        return {
            ImportDeclaration(node) {
                if (node.specifiers.length > 0 || options.warnOnUnassignedImports) {
                    const name = node.source.value;
                    registerNode(context, {
                        node,
                        value: name,
                        displayName: name,
                        type: 'import',
                    }, ranks, getBlockImports(node.parent), pathGroupsExcludedImportTypes, isSortingTypesGroup);
                    if (named.import) {
                        makeNamedOrderReport(context, node.specifiers
                            .filter(specifier => specifier.type === 'ImportSpecifier')
                            .map(specifier => ({
                            node: specifier,
                            value: getValue(specifier.imported),
                            type: 'import',
                            kind: specifier.importKind,
                            ...(specifier.local.range[0] !==
                                specifier.imported.range[0] && {
                                alias: specifier.local.name,
                            }),
                        })));
                    }
                }
            },
            TSImportEqualsDeclaration(node) {
                if (node.isExport) {
                    return;
                }
                let displayName;
                let value;
                let type;
                if (node.moduleReference.type === 'TSExternalModuleReference') {
                    value = node.moduleReference.expression.value;
                    displayName = value;
                    type = 'import';
                }
                else {
                    value = '';
                    displayName = context.sourceCode.getText(node.moduleReference);
                    type = 'import:object';
                }
                registerNode(context, {
                    node,
                    value,
                    displayName,
                    type,
                }, ranks, getBlockImports(node.parent), pathGroupsExcludedImportTypes, isSortingTypesGroup);
            },
            CallExpression(node) {
                if (!isStaticRequire(node)) {
                    return;
                }
                const block = getRequireBlock(node);
                const firstArg = node.arguments[0];
                if (!block || !('value' in firstArg)) {
                    return;
                }
                const { value } = firstArg;
                registerNode(context, {
                    node,
                    value,
                    displayName: value,
                    type: 'require',
                }, ranks, getBlockImports(block), pathGroupsExcludedImportTypes, isSortingTypesGroup);
            },
            ...(named.require && {
                VariableDeclarator(node) {
                    if (node.id.type === 'ObjectPattern' &&
                        isRequireExpression(node.init)) {
                        const { properties } = node.id;
                        for (const p of properties) {
                            if (!('key' in p) ||
                                p.key.type !== 'Identifier' ||
                                p.value.type !== 'Identifier') {
                                return;
                            }
                        }
                        makeNamedOrderReport(context, node.id.properties.map(prop_ => {
                            const prop = prop_;
                            const key = prop.key;
                            const value = prop.value;
                            return {
                                node: prop,
                                value: key.name,
                                type: 'require',
                                ...(key.range[0] !== value.range[0] && {
                                    alias: value.name,
                                }),
                            };
                        }));
                    }
                },
            }),
            ...(named.export && {
                ExportNamedDeclaration(node) {
                    makeNamedOrderReport(context, node.specifiers.map(specifier => ({
                        node: specifier,
                        value: getValue(specifier.local),
                        type: 'export',
                        kind: specifier.exportKind,
                        ...(specifier.local.range[0] !== specifier.exported.range[0] && {
                            alias: getValue(specifier.exported),
                        }),
                    })));
                },
            }),
            ...(named.cjsExports && {
                AssignmentExpression(node) {
                    if (node.parent.type === 'ExpressionStatement') {
                        if (isCJSExports(context, node.left)) {
                            if (node.right.type === 'ObjectExpression') {
                                const { properties } = node.right;
                                for (const p of properties) {
                                    if (!('key' in p) ||
                                        p.key.type !== 'Identifier' ||
                                        p.value.type !== 'Identifier') {
                                        return;
                                    }
                                }
                                makeNamedOrderReport(context, properties.map(prop_ => {
                                    const prop = prop_;
                                    const key = prop.key;
                                    const value = prop.value;
                                    return {
                                        node: prop,
                                        value: key.name,
                                        type: 'export',
                                        ...(key.range[0] !== value.range[0] && {
                                            alias: value.name,
                                        }),
                                    };
                                }));
                            }
                        }
                        else {
                            const nameParts = getNamedCJSExports(context, node.left);
                            if (nameParts && nameParts.length > 0) {
                                const name = nameParts.join('.');
                                getBlockExports(node.parent.parent).push({
                                    node,
                                    value: name,
                                    displayName: name,
                                    type: 'export',
                                    rank: 0,
                                });
                            }
                        }
                    }
                },
            }),
            'Program:exit'() {
                for (const imported of importMap.values()) {
                    if (newlinesBetweenImports !== 'ignore' ||
                        newlinesBetweenTypeOnlyImports !== 'ignore') {
                        makeNewlinesBetweenReport(context, imported, newlinesBetweenImports, newlinesBetweenTypeOnlyImports, distinctGroup, isSortingTypesGroup, consolidateIslands === 'inside-groups' &&
                            (newlinesBetweenImports === 'always-and-inside-groups' ||
                                newlinesBetweenTypeOnlyImports ===
                                    'always-and-inside-groups'));
                    }
                    if (alphabetize.order !== 'ignore') {
                        mutateRanksToAlphabetize(imported, alphabetize);
                    }
                    makeOutOfOrderReport(context, imported, categories.import);
                }
                for (const exported of exportMap.values()) {
                    if (alphabetize.order !== 'ignore') {
                        mutateRanksToAlphabetize(exported, alphabetize);
                        makeOutOfOrderReport(context, exported, categories.exports);
                    }
                }
                importMap.clear();
                exportMap.clear();
            },
        };
    },
});
//# sourceMappingURL=order.js.map