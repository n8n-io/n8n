// @flow
import {defineFunctionBuilders} from "../defineFunction";
import buildCommon from "../buildCommon";

import * as html from "../buildHTML";
import * as mml from "../buildMathML";

defineFunctionBuilders({
    type: "ordgroup",
    htmlBuilder(group, options) {
        if (group.semisimple) {
            return buildCommon.makeFragment(
                html.buildExpression(group.body, options, false));
        }
        return buildCommon.makeSpan(
            ["mord"], html.buildExpression(group.body, options, true), options);
    },
    mathmlBuilder(group, options) {
        return mml.buildExpressionRow(group.body, options, true);
    },
});

