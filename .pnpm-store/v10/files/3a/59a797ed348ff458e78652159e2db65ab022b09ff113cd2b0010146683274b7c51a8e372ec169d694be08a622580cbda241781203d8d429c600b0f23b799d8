import prepare from './prepare/index.js';
import mergeAtrule from './1-mergeAtrule.js';
import initialMergeRuleset from './2-initialMergeRuleset.js';
import disjoinRuleset from './3-disjoinRuleset.js';
import restructShorthand from './4-restructShorthand.js';
import restructBlock from './6-restructBlock.js';
import mergeRuleset from './7-mergeRuleset.js';
import restructRuleset from './8-restructRuleset.js';

export default function(ast, options) {
    // prepare ast for restructing
    const indexer = prepare(ast, options);
    options.logger('prepare', ast);

    mergeAtrule(ast, options);
    options.logger('mergeAtrule', ast);

    initialMergeRuleset(ast);
    options.logger('initialMergeRuleset', ast);

    disjoinRuleset(ast);
    options.logger('disjoinRuleset', ast);

    restructShorthand(ast, indexer);
    options.logger('restructShorthand', ast);

    restructBlock(ast);
    options.logger('restructBlock', ast);

    mergeRuleset(ast);
    options.logger('mergeRuleset', ast);

    restructRuleset(ast);
    options.logger('restructRuleset', ast);
};
