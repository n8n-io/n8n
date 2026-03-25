const flagSymbol = Symbol('arg flag');

class ArgError extends Error {
	constructor(msg, code) {
		super(msg);
		this.name = 'ArgError';
		this.code = code;

		Object.setPrototypeOf(this, ArgError.prototype);
	}
}

function arg(
	opts,
	{
		argv = process.argv.slice(2),
		permissive = false,
		stopAtPositional = false
	} = {}
) {
	if (!opts) {
		throw new ArgError(
			'argument specification object is required',
			'ARG_CONFIG_NO_SPEC'
		);
	}

	const result = { _: [] };

	const aliases = {};
	const handlers = {};

	for (const key of Object.keys(opts)) {
		if (!key) {
			throw new ArgError(
				'argument key cannot be an empty string',
				'ARG_CONFIG_EMPTY_KEY'
			);
		}

		if (key[0] !== '-') {
			throw new ArgError(
				`argument key must start with '-' but found: '${key}'`,
				'ARG_CONFIG_NONOPT_KEY'
			);
		}

		if (key.length === 1) {
			throw new ArgError(
				`argument key must have a name; singular '-' keys are not allowed: ${key}`,
				'ARG_CONFIG_NONAME_KEY'
			);
		}

		if (typeof opts[key] === 'string') {
			aliases[key] = opts[key];
			continue;
		}

		let type = opts[key];
		let isFlag = false;

		if (
			Array.isArray(type) &&
			type.length === 1 &&
			typeof type[0] === 'function'
		) {
			const [fn] = type;
			type = (value, name, prev = []) => {
				prev.push(fn(value, name, prev[prev.length - 1]));
				return prev;
			};
			isFlag = fn === Boolean || fn[flagSymbol] === true;
		} else if (typeof type === 'function') {
			isFlag = type === Boolean || type[flagSymbol] === true;
		} else {
			throw new ArgError(
				`type missing or not a function or valid array type: ${key}`,
				'ARG_CONFIG_VAD_TYPE'
			);
		}

		if (key[1] !== '-' && key.length > 2) {
			throw new ArgError(
				`short argument keys (with a single hyphen) must have only one character: ${key}`,
				'ARG_CONFIG_SHORTOPT_TOOLONG'
			);
		}

		handlers[key] = [type, isFlag];
	}

	for (let i = 0, len = argv.length; i < len; i++) {
		const wholeArg = argv[i];

		if (stopAtPositional && result._.length > 0) {
			result._ = result._.concat(argv.slice(i));
			break;
		}

		if (wholeArg === '--') {
			result._ = result._.concat(argv.slice(i + 1));
			break;
		}

		if (wholeArg.length > 1 && wholeArg[0] === '-') {
			/* eslint-disable operator-linebreak */
			const separatedArguments =
				wholeArg[1] === '-' || wholeArg.length === 2
					? [wholeArg]
					: wholeArg
							.slice(1)
							.split('')
							.map((a) => `-${a}`);
			/* eslint-enable operator-linebreak */

			for (let j = 0; j < separatedArguments.length; j++) {
				const arg = separatedArguments[j];
				const [originalArgName, argStr] =
					arg[1] === '-' ? arg.split(/=(.*)/, 2) : [arg, undefined];

				let argName = originalArgName;
				while (argName in aliases) {
					argName = aliases[argName];
				}

				if (!(argName in handlers)) {
					if (permissive) {
						result._.push(arg);
						continue;
					} else {
						throw new ArgError(
							`unknown or unexpected option: ${originalArgName}`,
							'ARG_UNKNOWN_OPTION'
						);
					}
				}

				const [type, isFlag] = handlers[argName];

				if (!isFlag && j + 1 < separatedArguments.length) {
					throw new ArgError(
						`option requires argument (but was followed by another short argument): ${originalArgName}`,
						'ARG_MISSING_REQUIRED_SHORTARG'
					);
				}

				if (isFlag) {
					result[argName] = type(true, argName, result[argName]);
				} else if (argStr === undefined) {
					if (
						argv.length < i + 2 ||
						(argv[i + 1].length > 1 &&
							argv[i + 1][0] === '-' &&
							!(
								argv[i + 1].match(/^-?\d*(\.(?=\d))?\d*$/) &&
								(type === Number ||
									// eslint-disable-next-line no-undef
									(typeof BigInt !== 'undefined' && type === BigInt))
							))
					) {
						const extended =
							originalArgName === argName ? '' : ` (alias for ${argName})`;
						throw new ArgError(
							`option requires argument: ${originalArgName}${extended}`,
							'ARG_MISSING_REQUIRED_LONGARG'
						);
					}

					result[argName] = type(argv[i + 1], argName, result[argName]);
					++i;
				} else {
					result[argName] = type(argStr, argName, result[argName]);
				}
			}
		} else {
			result._.push(wholeArg);
		}
	}

	return result;
}

arg.flag = (fn) => {
	fn[flagSymbol] = true;
	return fn;
};

// Utility types
arg.COUNT = arg.flag((v, name, existingCount) => (existingCount || 0) + 1);

// Expose error class
arg.ArgError = ArgError;

module.exports = arg;
