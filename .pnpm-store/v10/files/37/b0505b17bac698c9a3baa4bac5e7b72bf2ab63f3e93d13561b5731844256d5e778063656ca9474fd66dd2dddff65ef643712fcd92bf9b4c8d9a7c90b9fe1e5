// Main logic for `execaCommand()`
export const mapCommandAsync = ({file, commandArguments}) => parseCommand(file, commandArguments);

// Main logic for `execaCommandSync()`
export const mapCommandSync = ({file, commandArguments}) => ({...parseCommand(file, commandArguments), isSync: true});

// Convert `execaCommand(command)` into `execa(file, ...commandArguments)`
const parseCommand = (command, unusedArguments) => {
	if (unusedArguments.length > 0) {
		throw new TypeError(`The command and its arguments must be passed as a single string: ${command} ${unusedArguments}.`);
	}

	const [file, ...commandArguments] = parseCommandString(command);
	return {file, commandArguments};
};

// Convert `command` string into an array of file or arguments to pass to $`${...fileOrCommandArguments}`
export const parseCommandString = command => {
	if (typeof command !== 'string') {
		throw new TypeError(`The command must be a string: ${String(command)}.`);
	}

	const trimmedCommand = command.trim();
	if (trimmedCommand === '') {
		return [];
	}

	const tokens = [];
	for (const token of trimmedCommand.split(SPACES_REGEXP)) {
		// Allow spaces to be escaped by a backslash if not meant as a delimiter
		const previousToken = tokens.at(-1);
		if (previousToken && previousToken.endsWith('\\')) {
			// Merge previous token with current one
			tokens[tokens.length - 1] = `${previousToken.slice(0, -1)} ${token}`;
		} else {
			tokens.push(token);
		}
	}

	return tokens;
};

const SPACES_REGEXP = / +/g;
