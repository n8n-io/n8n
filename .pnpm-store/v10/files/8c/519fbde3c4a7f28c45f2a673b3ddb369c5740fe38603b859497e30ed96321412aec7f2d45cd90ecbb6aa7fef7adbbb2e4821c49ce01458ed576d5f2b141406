// @flow
import defineFunction, {normalizeArgument} from "../defineFunction";
import buildCommon from "../buildCommon";
import delimiter from "../delimiter";
import mathMLTree from "../mathMLTree";
import Style from "../Style";
import {assertNodeType} from "../parseNode";
import {assert} from "../utils";

import * as html from "../buildHTML";
import * as mml from "../buildMathML";
import {calculateSize, makeEm} from "../units";

const adjustStyle = (size, originalStyle) => {
    // Figure out what style this fraction should be in based on the
    // function used
    let style = originalStyle;
    if (size === "display") {
        // Get display style as a default.
        // If incoming style is sub/sup, use style.text() to get correct size.
        style = style.id >= Style.SCRIPT.id ? style.text() : Style.DISPLAY;
    } else if (size === "text" &&
        style.size === Style.DISPLAY.size) {
        // We're in a \tfrac but incoming style is displaystyle, so:
        style = Style.TEXT;
    } else if (size === "script") {
        style = Style.SCRIPT;
    } else if (size === "scriptscript") {
        style = Style.SCRIPTSCRIPT;
    }
    return style;
};

const htmlBuilder = (group, options) => {
    // Fractions are handled in the TeXbook on pages 444-445, rules 15(a-e).
    const style = adjustStyle(group.size, options.style);

    const nstyle = style.fracNum();
    const dstyle = style.fracDen();
    let newOptions;

    newOptions = options.havingStyle(nstyle);
    const numerm = html.buildGroup(group.numer, newOptions, options);

    if (group.continued) {
        // \cfrac inserts a \strut into the numerator.
        // Get \strut dimensions from TeXbook page 353.
        const hStrut = 8.5 / options.fontMetrics().ptPerEm;
        const dStrut = 3.5 / options.fontMetrics().ptPerEm;
        numerm.height = numerm.height < hStrut ? hStrut : numerm.height;
        numerm.depth = numerm.depth < dStrut ? dStrut : numerm.depth;
    }

    newOptions = options.havingStyle(dstyle);
    const denomm = html.buildGroup(group.denom, newOptions, options);

    let rule;
    let ruleWidth;
    let ruleSpacing;
    if (group.hasBarLine) {
        if (group.barSize) {
            ruleWidth = calculateSize(group.barSize, options);
            rule = buildCommon.makeLineSpan("frac-line", options, ruleWidth);
        } else {
            rule = buildCommon.makeLineSpan("frac-line", options);
        }
        ruleWidth = rule.height;
        ruleSpacing = rule.height;
    } else {
        rule = null;
        ruleWidth = 0;
        ruleSpacing = options.fontMetrics().defaultRuleThickness;
    }

    // Rule 15b
    let numShift;
    let clearance;
    let denomShift;
    if (style.size === Style.DISPLAY.size || group.size === "display") {
        numShift = options.fontMetrics().num1;
        if (ruleWidth > 0) {
            clearance = 3 * ruleSpacing;
        } else {
            clearance = 7 * ruleSpacing;
        }
        denomShift = options.fontMetrics().denom1;
    } else {
        if (ruleWidth > 0) {
            numShift = options.fontMetrics().num2;
            clearance = ruleSpacing;
        } else {
            numShift = options.fontMetrics().num3;
            clearance = 3 * ruleSpacing;
        }
        denomShift = options.fontMetrics().denom2;
    }

    let frac;
    if (!rule) {
        // Rule 15c
        const candidateClearance =
            (numShift - numerm.depth) - (denomm.height - denomShift);
        if (candidateClearance < clearance) {
            numShift += 0.5 * (clearance - candidateClearance);
            denomShift += 0.5 * (clearance - candidateClearance);
        }

        frac = buildCommon.makeVList({
            positionType: "individualShift",
            children: [
                {type: "elem", elem: denomm, shift: denomShift},
                {type: "elem", elem: numerm, shift: -numShift},
            ],
        }, options);
    } else {
        // Rule 15d
        const axisHeight = options.fontMetrics().axisHeight;

        if ((numShift - numerm.depth) - (axisHeight + 0.5 * ruleWidth) <
                clearance) {
            numShift +=
                clearance - ((numShift - numerm.depth) -
                            (axisHeight + 0.5 * ruleWidth));
        }

        if ((axisHeight - 0.5 * ruleWidth) - (denomm.height - denomShift) <
                clearance) {
            denomShift +=
                clearance - ((axisHeight - 0.5 * ruleWidth) -
                            (denomm.height - denomShift));
        }

        const midShift = -(axisHeight - 0.5 * ruleWidth);

        frac = buildCommon.makeVList({
            positionType: "individualShift",
            children: [
                {type: "elem", elem: denomm, shift: denomShift},
                {type: "elem", elem: rule,   shift: midShift},
                {type: "elem", elem: numerm, shift: -numShift},
            ],
        }, options);
    }

    // Since we manually change the style sometimes (with \dfrac or \tfrac),
    // account for the possible size change here.
    newOptions = options.havingStyle(style);
    frac.height *= newOptions.sizeMultiplier / options.sizeMultiplier;
    frac.depth *= newOptions.sizeMultiplier / options.sizeMultiplier;

    // Rule 15e
    let delimSize;
    if (style.size === Style.DISPLAY.size) {
        delimSize = options.fontMetrics().delim1;
    } else if (style.size === Style.SCRIPTSCRIPT.size) {
        delimSize = options.havingStyle(Style.SCRIPT).fontMetrics().delim2;
    } else {
        delimSize = options.fontMetrics().delim2;
    }

    let leftDelim;
    let rightDelim;
    if (group.leftDelim == null) {
        leftDelim = html.makeNullDelimiter(options, ["mopen"]);
    } else {
        leftDelim = delimiter.customSizedDelim(
            group.leftDelim, delimSize, true,
            options.havingStyle(style), group.mode, ["mopen"]);
    }

    if (group.continued) {
        rightDelim = buildCommon.makeSpan([]); // zero width for \cfrac
    } else if (group.rightDelim == null) {
        rightDelim = html.makeNullDelimiter(options, ["mclose"]);
    } else {
        rightDelim = delimiter.customSizedDelim(
            group.rightDelim, delimSize, true,
            options.havingStyle(style), group.mode, ["mclose"]);
    }

    return buildCommon.makeSpan(
        ["mord"].concat(newOptions.sizingClasses(options)),
        [leftDelim, buildCommon.makeSpan(["mfrac"], [frac]), rightDelim],
        options);
};

const mathmlBuilder = (group, options) => {
    let node = new mathMLTree.MathNode(
        "mfrac",
        [
            mml.buildGroup(group.numer, options),
            mml.buildGroup(group.denom, options),
        ]);

    if (!group.hasBarLine) {
        node.setAttribute("linethickness", "0px");
    } else if (group.barSize) {
        const ruleWidth = calculateSize(group.barSize, options);
        node.setAttribute("linethickness", makeEm(ruleWidth));
    }

    const style = adjustStyle(group.size, options.style);
    if (style.size !== options.style.size) {
        node = new mathMLTree.MathNode("mstyle", [node]);
        const isDisplay = (style.size === Style.DISPLAY.size) ? "true" : "false";
        node.setAttribute("displaystyle", isDisplay);
        node.setAttribute("scriptlevel", "0");
    }

    if (group.leftDelim != null || group.rightDelim != null) {
        const withDelims = [];

        if (group.leftDelim != null) {
            const leftOp = new mathMLTree.MathNode(
                "mo",
                [new mathMLTree.TextNode(group.leftDelim.replace("\\", ""))]
            );

            leftOp.setAttribute("fence", "true");

            withDelims.push(leftOp);
        }

        withDelims.push(node);

        if (group.rightDelim != null) {
            const rightOp = new mathMLTree.MathNode(
                "mo",
                [new mathMLTree.TextNode(group.rightDelim.replace("\\", ""))]
            );

            rightOp.setAttribute("fence", "true");

            withDelims.push(rightOp);
        }

        return mml.makeRow(withDelims);
    }

    return node;
};

defineFunction({
    type: "genfrac",
    names: [
        "\\dfrac", "\\frac", "\\tfrac",
        "\\dbinom", "\\binom", "\\tbinom",
        "\\\\atopfrac", // can’t be entered directly
        "\\\\bracefrac", "\\\\brackfrac",   // ditto
    ],
    props: {
        numArgs: 2,
        allowedInArgument: true,
    },
    handler: ({parser, funcName}, args) => {
        const numer = args[0];
        const denom = args[1];
        let hasBarLine;
        let leftDelim = null;
        let rightDelim = null;
        let size = "auto";

        switch (funcName) {
            case "\\dfrac":
            case "\\frac":
            case "\\tfrac":
                hasBarLine = true;
                break;
            case "\\\\atopfrac":
                hasBarLine = false;
                break;
            case "\\dbinom":
            case "\\binom":
            case "\\tbinom":
                hasBarLine = false;
                leftDelim = "(";
                rightDelim = ")";
                break;
            case "\\\\bracefrac":
                hasBarLine = false;
                leftDelim = "\\{";
                rightDelim = "\\}";
                break;
            case "\\\\brackfrac":
                hasBarLine = false;
                leftDelim = "[";
                rightDelim = "]";
                break;
            default:
                throw new Error("Unrecognized genfrac command");
        }

        switch (funcName) {
            case "\\dfrac":
            case "\\dbinom":
                size = "display";
                break;
            case "\\tfrac":
            case "\\tbinom":
                size = "text";
                break;
        }

        return {
            type: "genfrac",
            mode: parser.mode,
            continued: false,
            numer,
            denom,
            hasBarLine,
            leftDelim,
            rightDelim,
            size,
            barSize: null,
        };
    },

    htmlBuilder,
    mathmlBuilder,
});

defineFunction({
    type: "genfrac",
    names: ["\\cfrac"],
    props: {
        numArgs: 2,
    },
    handler: ({parser, funcName}, args) => {
        const numer = args[0];
        const denom = args[1];

        return {
            type: "genfrac",
            mode: parser.mode,
            continued: true,
            numer,
            denom,
            hasBarLine: true,
            leftDelim: null,
            rightDelim: null,
            size: "display",
            barSize: null,
        };
    },
});

// Infix generalized fractions -- these are not rendered directly, but replaced
// immediately by one of the variants above.
defineFunction({
    type: "infix",
    names: ["\\over", "\\choose", "\\atop", "\\brace", "\\brack"],
    props: {
        numArgs: 0,
        infix: true,
    },
    handler({parser, funcName, token}) {
        let replaceWith;
        switch (funcName) {
            case "\\over":
                replaceWith = "\\frac";
                break;
            case "\\choose":
                replaceWith = "\\binom";
                break;
            case "\\atop":
                replaceWith = "\\\\atopfrac";
                break;
            case "\\brace":
                replaceWith = "\\\\bracefrac";
                break;
            case "\\brack":
                replaceWith = "\\\\brackfrac";
                break;
            default:
                throw new Error("Unrecognized infix genfrac command");
        }
        return {
            type: "infix",
            mode: parser.mode,
            replaceWith,
            token,
        };
    },
});

const stylArray = ["display", "text", "script", "scriptscript"];

const delimFromValue = function(delimString: string): string | null {
    let delim = null;
    if (delimString.length > 0) {
        delim = delimString;
        delim = delim === "." ? null : delim;
    }
    return delim;
};

defineFunction({
    type: "genfrac",
    names: ["\\genfrac"],
    props: {
        numArgs: 6,
        allowedInArgument: true,
        argTypes: ["math", "math", "size", "text", "math", "math"],
    },
    handler({parser}, args) {
        const numer = args[4];
        const denom = args[5];

        // Look into the parse nodes to get the desired delimiters.
        const leftNode = normalizeArgument(args[0]);
        const leftDelim = leftNode.type === "atom" && leftNode.family === "open"
            ? delimFromValue(leftNode.text) : null;
        const rightNode = normalizeArgument(args[1]);
        const rightDelim = rightNode.type === "atom" && rightNode.family === "close"
            ? delimFromValue(rightNode.text) : null;

        const barNode = assertNodeType(args[2], "size");
        let hasBarLine;
        let barSize = null;
        if (barNode.isBlank) {
            // \genfrac acts differently than \above.
            // \genfrac treats an empty size group as a signal to use a
            // standard bar size. \above would see size = 0 and omit the bar.
            hasBarLine = true;
        } else {
            barSize = barNode.value;
            hasBarLine = barSize.number > 0;
        }

        // Find out if we want displaystyle, textstyle, etc.
        let size = "auto";
        let styl = args[3];
        if (styl.type === "ordgroup") {
            if (styl.body.length > 0) {
                const textOrd = assertNodeType(styl.body[0], "textord");
                size = stylArray[Number(textOrd.text)];
            }
        } else {
            styl = assertNodeType(styl, "textord");
            size = stylArray[Number(styl.text)];
        }

        return {
            type: "genfrac",
            mode: parser.mode,
            numer,
            denom,
            continued: false,
            hasBarLine,
            barSize,
            leftDelim,
            rightDelim,
            size,
        };
    },

    htmlBuilder,
    mathmlBuilder,
});

// \above is an infix fraction that also defines a fraction bar size.
defineFunction({
    type: "infix",
    names: ["\\above"],
    props: {
        numArgs: 1,
        argTypes: ["size"],
        infix: true,
    },
    handler({parser, funcName, token}, args) {
        return {
            type: "infix",
            mode: parser.mode,
            replaceWith: "\\\\abovefrac",
            size: assertNodeType(args[0], "size").value,
            token,
        };
    },
});

defineFunction({
    type: "genfrac",
    names: ["\\\\abovefrac"],
    props: {
        numArgs: 3,
        argTypes: ["math", "size", "math"],
    },
    handler: ({parser, funcName}, args) => {
        const numer = args[0];
        const barSize = assert(assertNodeType(args[1], "infix").size);
        const denom = args[2];

        const hasBarLine = barSize.number > 0;
        return {
            type: "genfrac",
            mode: parser.mode,
            numer,
            denom,
            continued: false,
            hasBarLine,
            barSize,
            leftDelim: null,
            rightDelim: null,
            size: "auto",
        };
    },

    htmlBuilder,
    mathmlBuilder,
});
