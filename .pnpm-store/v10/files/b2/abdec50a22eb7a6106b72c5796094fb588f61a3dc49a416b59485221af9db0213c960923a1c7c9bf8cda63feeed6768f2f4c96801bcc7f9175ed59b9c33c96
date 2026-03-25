import stripFinalNewlineFunction from 'strip-final-newline';

// Apply `stripFinalNewline` option, which applies to `result.stdout|stderr|all|stdio[*]`.
// If the `lines` option is used, it is applied on each line, but using a different function.
export const stripNewline = (value, {stripFinalNewline}, fdNumber) => getStripFinalNewline(stripFinalNewline, fdNumber) && value !== undefined && !Array.isArray(value)
	? stripFinalNewlineFunction(value)
	: value;

// Retrieve `stripFinalNewline` option value, including with `subprocess.all`
export const getStripFinalNewline = (stripFinalNewline, fdNumber) => fdNumber === 'all'
	? stripFinalNewline[1] || stripFinalNewline[2]
	: stripFinalNewline[fdNumber];
