// @flow
import defineFunction from "../defineFunction";
import buildCommon from "../buildCommon";
import mathMLTree from "../mathMLTree";

import * as html from "../buildHTML";
import * as mml from "../buildMathML";

// \vcenter:  Vertically center the argument group on the math axis.

defineFunction({
    type: "vcenter",
    names: ["\\vcenter"],
    props: {
        numArgs: 1,
        argTypes: ["original"], // In LaTeX, \vcenter can act only on a box.
        allowedInText: false,
    },
    handler({parser}, args) {
        return {
            type: "vcenter",
            mode: parser.mode,
            body: args[0],
        };
    },
    htmlBuilder(group, options) {
        const body = html.buildGroup(group.body, options);
        const axisHeight = options.fontMetrics().axisHeight;
        const dy = 0.5 * ((body.height - axisHeight) - (body.depth + axisHeight));
        return buildCommon.makeVList({
            positionType: "shift",
            positionData: dy,
            children: [{type: "elem", elem: body}],
        }, options);
    },
    mathmlBuilder(group, options) {
        // There is no way to do this in MathML.
        // Write a class as a breadcrumb in case some post-processor wants
        // to perform a vcenter adjustment.
        return new mathMLTree.MathNode(
            "mpadded", [mml.buildGroup(group.body, options)], ["vcenter"]);
    },
});

