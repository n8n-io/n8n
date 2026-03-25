import {getVerboseFunction} from './values.js';

// Apply the `verbose` function on each line
export const applyVerboseOnLines = (printedLines, verboseInfo, fdNumber) => {
	const verboseFunction = getVerboseFunction(verboseInfo, fdNumber);
	return printedLines
		.map(({verboseLine, verboseObject}) => applyVerboseFunction(verboseLine, verboseObject, verboseFunction))
		.filter(printedLine => printedLine !== undefined)
		.map(printedLine => appendNewline(printedLine))
		.join('');
};

const applyVerboseFunction = (verboseLine, verboseObject, verboseFunction) => {
	if (verboseFunction === undefined) {
		return verboseLine;
	}

	const printedLine = verboseFunction(verboseLine, verboseObject);
	if (typeof printedLine === 'string') {
		return printedLine;
	}
};

const appendNewline = printedLine => printedLine.endsWith('\n')
	? printedLine
	: `${printedLine}\n`;
