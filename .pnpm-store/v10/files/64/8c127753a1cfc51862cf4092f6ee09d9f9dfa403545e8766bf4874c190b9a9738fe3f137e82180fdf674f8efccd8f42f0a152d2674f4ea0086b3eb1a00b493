Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });

const SINGLE_ARG_COMMANDS = ['get', 'set', 'setex'];

const GET_COMMANDS = ['get', 'mget'];
const SET_COMMANDS = ['set', 'setex'];
// todo: del, expire

/** Checks if a given command is in the list of redis commands.
 *  Useful because commands can come in lowercase or uppercase (depending on the library). */
function isInCommands(redisCommands, command) {
  return redisCommands.includes(command.toLowerCase());
}

/** Determine cache operation based on redis statement */
function getCacheOperation(
  command,
) {
  if (isInCommands(GET_COMMANDS, command)) {
    return 'cache.get';
  } else if (isInCommands(SET_COMMANDS, command)) {
    return 'cache.put';
  } else {
    return undefined;
  }
}

function keyHasPrefix(key, prefixes) {
  return prefixes.some(prefix => key.startsWith(prefix));
}

/** Safely converts a redis key to a string (comma-separated if there are multiple keys) */
function getCacheKeySafely(redisCommand, cmdArgs) {
  try {
    if (cmdArgs.length === 0) {
      return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const processArg = (arg) => {
      if (typeof arg === 'string' || typeof arg === 'number' || Buffer.isBuffer(arg)) {
        return [arg.toString()];
      } else if (Array.isArray(arg)) {
        return flatten(arg.map(arg => processArg(arg)));
      } else {
        return ['<unknown>'];
      }
    };

    const firstArg = cmdArgs[0];
    if (isInCommands(SINGLE_ARG_COMMANDS, redisCommand) && firstArg != null) {
      return processArg(firstArg);
    }

    return flatten(cmdArgs.map(arg => processArg(arg)));
  } catch {
    return undefined;
  }
}

/** Determines whether a redis operation should be considered as "cache operation" by checking if a key is prefixed.
 *  We only support certain commands (such as 'set', 'get', 'mget'). */
function shouldConsiderForCache(redisCommand, keys, prefixes) {
  if (!getCacheOperation(redisCommand)) {
    return false;
  }

  for (const key of keys) {
    if (keyHasPrefix(key, prefixes)) {
      return true;
    }
  }
  return false;
}

/** Calculates size based on the cache response value */
function calculateCacheItemSize(response) {
  const getSize = (value) => {
    try {
      if (Buffer.isBuffer(value)) return value.byteLength;
      else if (typeof value === 'string') return value.length;
      else if (typeof value === 'number') return value.toString().length;
      else if (value === null || value === undefined) return 0;
      return JSON.stringify(value).length;
    } catch {
      return undefined;
    }
  };

  return Array.isArray(response)
    ? response.reduce((acc, curr) => {
        const size = getSize(curr);
        return typeof size === 'number' ? (acc !== undefined ? acc + size : size) : acc;
      }, 0)
    : getSize(response);
}

function flatten(input) {
  const result = [];

  const flattenHelper = (input) => {
    input.forEach((el) => {
      if (Array.isArray(el)) {
        flattenHelper(el);
      } else {
        result.push(el);
      }
    });
  };

  flattenHelper(input);
  return result;
}

exports.GET_COMMANDS = GET_COMMANDS;
exports.SET_COMMANDS = SET_COMMANDS;
exports.calculateCacheItemSize = calculateCacheItemSize;
exports.getCacheKeySafely = getCacheKeySafely;
exports.getCacheOperation = getCacheOperation;
exports.isInCommands = isInCommands;
exports.shouldConsiderForCache = shouldConsiderForCache;
//# sourceMappingURL=redisCache.js.map
