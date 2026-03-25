// @flow
import defineFunction, {ordargument} from "../defineFunction";
import buildCommon from "../buildCommon";

import * as html from "../buildHTML";
import * as mml from "../buildMathML";

// Non-mathy text, possibly in a font
const textFontFamilies = {
    "\\text": undefined, "\\textrm": "textrm", "\\textsf": "textsf",
    "\\texttt": "texttt", "\\textnormal": "textrm",
};

const textFontWeights = {
    "\\textbf": "textbf",
    "\\textmd": "textmd",
};

const textFontShapes = {
    "\\textit": "textit",
    "\\textup": "textup",
};

const optionsWithFont = (group, options) => {
    const font = group.font;
    // Checks if the argument is a font family or a font style.
    if (!font) {
        return options;
    } else if (textFontFamilies[font]) {
        return options.withTextFontFamily(textFontFamilies[font]);
    } else if (textFontWeights[font]) {
        return options.withTextFontWeight(textFontWeights[font]);
    } else if (font === "\\emph") {
        return options.fontShape === "textit" ?
            options.withTextFontShape("textup") :
            options.withTextFontShape("textit");
    }

    return options.withTextFontShape(textFontShapes[font]);
};

defineFunction({
    type: "text",
    names: [
        // Font families
        "\\text", "\\textrm", "\\textsf", "\\texttt", "\\textnormal",
        // Font weights
        "\\textbf", "\\textmd",
        // Font Shapes
        "\\textit", "\\textup", "\\emph",
    ],
    props: {
        numArgs: 1,
        argTypes: ["text"],
        allowedInArgument: true,
        allowedInText: true,
    },
    handler({parser, funcName}, args) {
        const body = args[0];
        return {
            type: "text",
            mode: parser.mode,
            body: ordargument(body),
            font: funcName,
        };
    },
    htmlBuilder(group, options) {
        const newOptions = optionsWithFont(group, options);
        const inner = html.buildExpression(group.body, newOptions, true);
        return buildCommon.makeSpan(["mord", "text"], inner, newOptions);
    },
    mathmlBuilder(group, options) {
        const newOptions = optionsWithFont(group, options);
        return mml.buildExpressionRow(group.body, newOptions);
    },
});
