// @flow
import defineFunction, {ordargument} from "../defineFunction";
import buildCommon from "../buildCommon";

import * as html from "../buildHTML";
import * as mml from "../buildMathML";

defineFunction({
    type: "htmlmathml",
    names: ["\\html@mathml"],
    props: {
        numArgs: 2,
        allowedInText: true,
    },
    handler: ({parser}, args) => {
        return {
            type: "htmlmathml",
            mode: parser.mode,
            html:   ordargument(args[0]),
            mathml: ordargument(args[1]),
        };
    },
    htmlBuilder: (group, options) => {
        const elements = html.buildExpression(
            group.html,
            options,
            false
        );
        return buildCommon.makeFragment(elements);
    },
    mathmlBuilder: (group, options) => {
        return mml.buildExpressionRow(group.mathml, options);
    },
});
