'use strict';

const index = require('./prepare/index.cjs');
const _1MergeAtrule = require('./1-mergeAtrule.cjs');
const _2InitialMergeRuleset = require('./2-initialMergeRuleset.cjs');
const _3DisjoinRuleset = require('./3-disjoinRuleset.cjs');
const _4RestructShorthand = require('./4-restructShorthand.cjs');
const _6RestructBlock = require('./6-restructBlock.cjs');
const _7MergeRuleset = require('./7-mergeRuleset.cjs');
const _8RestructRuleset = require('./8-restructRuleset.cjs');

function restructure(ast, options) {
    // prepare ast for restructing
    const indexer = index(ast, options);
    options.logger('prepare', ast);

    _1MergeAtrule(ast, options);
    options.logger('mergeAtrule', ast);

    _2InitialMergeRuleset(ast);
    options.logger('initialMergeRuleset', ast);

    _3DisjoinRuleset(ast);
    options.logger('disjoinRuleset', ast);

    _4RestructShorthand(ast, indexer);
    options.logger('restructShorthand', ast);

    _6RestructBlock(ast);
    options.logger('restructBlock', ast);

    _7MergeRuleset(ast);
    options.logger('mergeRuleset', ast);

    _8RestructRuleset(ast);
    options.logger('restructRuleset', ast);
}

module.exports = restructure;
