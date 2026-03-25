// Sets `$.sync` and `$.s`
export const setScriptSync = (boundExeca, createNested, boundOptions) => {
	boundExeca.sync = createNested(mapScriptSync, boundOptions);
	boundExeca.s = boundExeca.sync;
};

// Main logic for `$`
export const mapScriptAsync = ({options}) => getScriptOptions(options);

// Main logic for `$.sync`
const mapScriptSync = ({options}) => ({...getScriptOptions(options), isSync: true});

// `$` is like `execa` but with script-friendly options: `{stdin: 'inherit', preferLocal: true}`
const getScriptOptions = options => ({options: {...getScriptStdinOption(options), ...options}});

const getScriptStdinOption = ({input, inputFile, stdio}) => input === undefined && inputFile === undefined && stdio === undefined
	? {stdin: 'inherit'}
	: {};

// When using $(...).pipe(...), most script-friendly options should apply to both commands.
// However, some options (like `stdin: 'inherit'`) would create issues with piping, i.e. cannot be deep.
export const deepScriptOptions = {preferLocal: true};
