"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrefixColorSelector = void 0;
function getConsoleColorsWithoutCustomColors(customColors) {
    return PrefixColorSelector.ACCEPTABLE_CONSOLE_COLORS.filter(
    // Consider the "Bright" variants of colors to be the same as the plain color to avoid similar colors
    (color) => !customColors.includes(color.replace(/Bright$/, '')));
}
/**
 * Creates a generator that yields an infinite stream of colors.
 */
function* createColorGenerator(customColors) {
    // Custom colors should be used as is, except for "auto"
    const nextAutoColors = getConsoleColorsWithoutCustomColors(customColors);
    let lastColor;
    for (const customColor of customColors) {
        let currentColor = customColor;
        if (currentColor !== 'auto') {
            yield currentColor; // Manual color
        }
        else {
            // Find the first auto color that is not the same as the last color
            while (currentColor === 'auto' || lastColor === currentColor) {
                if (!nextAutoColors.length) {
                    // There could be more "auto" values than auto colors so this needs to be able to refill
                    nextAutoColors.push(...PrefixColorSelector.ACCEPTABLE_CONSOLE_COLORS);
                }
                currentColor = String(nextAutoColors.shift());
            }
            yield currentColor; // Auto color
        }
        lastColor = currentColor;
    }
    const lastCustomColor = customColors[customColors.length - 1] || '';
    if (lastCustomColor !== 'auto') {
        while (true) {
            yield lastCustomColor; // If last custom color was not "auto" then return same color forever, to maintain existing behaviour
        }
    }
    // Finish the initial set(s) of auto colors to avoid repetition
    for (const color of nextAutoColors) {
        yield color;
    }
    // Yield an infinite stream of acceptable console colors
    //
    // If the given custom colors use every ACCEPTABLE_CONSOLE_COLORS except one then there is a chance a color will be repeated,
    // however its highly unlikely and low consequence so not worth the extra complexity to account for it
    while (true) {
        for (const color of PrefixColorSelector.ACCEPTABLE_CONSOLE_COLORS) {
            yield color; // Repeat colors forever
        }
    }
}
class PrefixColorSelector {
    constructor(customColors = []) {
        const normalizedColors = typeof customColors === 'string' ? [customColors] : customColors;
        this.colorGenerator = createColorGenerator(normalizedColors);
    }
    /** A list of colors that are readable in a terminal. */
    static get ACCEPTABLE_CONSOLE_COLORS() {
        // Colors picked randomly, can be amended if required
        return [
            // Prevent duplicates, in case the list becomes significantly large
            ...new Set([
                // Text colors
                'cyan',
                'yellow',
                'greenBright',
                'blueBright',
                'magentaBright',
                'white',
                'grey',
                'red',
                // Background colors
                'bgCyan',
                'bgYellow',
                'bgGreenBright',
                'bgBlueBright',
                'bgMagenta',
                'bgWhiteBright',
                'bgGrey',
                'bgRed',
            ]),
        ];
    }
    /**
     * @returns The given custom colors then a set of acceptable console colors indefinitely.
     */
    getNextColor() {
        return this.colorGenerator.next().value;
    }
}
exports.PrefixColorSelector = PrefixColorSelector;
