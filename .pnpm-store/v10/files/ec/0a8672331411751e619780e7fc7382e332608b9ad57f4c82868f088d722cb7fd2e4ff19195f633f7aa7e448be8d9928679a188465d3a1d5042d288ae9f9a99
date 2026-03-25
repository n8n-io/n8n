// @flow
import {defineFunctionBuilders} from "../defineFunction";
import mathMLTree from "../mathMLTree";

import * as mml from "../buildMathML";

const pad = () => {
    const padNode = new mathMLTree.MathNode("mtd", []);
    padNode.setAttribute("width", "50%");
    return padNode;
};

defineFunctionBuilders({
    type: "tag",
    mathmlBuilder(group, options) {
        const table = new mathMLTree.MathNode("mtable", [
            new mathMLTree.MathNode("mtr", [
                pad(),
                new mathMLTree.MathNode("mtd", [
                    mml.buildExpressionRow(group.body, options),
                ]),
                pad(),
                new mathMLTree.MathNode("mtd", [
                    mml.buildExpressionRow(group.tag, options),
                ]),
            ]),
        ]);
        table.setAttribute("width", "100%");
        return table;

        // TODO: Left-aligned tags.
        // Currently, the group and options passed here do not contain
        // enough info to set tag alignment. `leqno` is in Settings but it is
        // not passed to Options. On the HTML side, leqno is
        // set by a CSS class applied in buildTree.js. That would have worked
        // in MathML if browsers supported <mlabeledtr>. Since they don't, we
        // need to rewrite the way this function is called.
    },
});

