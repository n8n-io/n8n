'use strict';

class ERR_INVALID_ARG_TYPE extends TypeError {
  constructor(name, expected, actual) {
    super(`${name} must be ${expected} got ${actual}`);
    this.code = 'ERR_INVALID_ARG_TYPE';
  }
}

class ERR_INVALID_ARG_VALUE extends TypeError {
  constructor(arg1, arg2, expected) {
    super(`The property ${arg1} ${expected}. Received '${arg2}'`);
    this.code = 'ERR_INVALID_ARG_VALUE';
  }
}

class ERR_PARSE_ARGS_INVALID_OPTION_VALUE extends Error {
  constructor(message) {
    super(message);
    this.code = 'ERR_PARSE_ARGS_INVALID_OPTION_VALUE';
  }
}

class ERR_PARSE_ARGS_UNKNOWN_OPTION extends Error {
  constructor(option, allowPositionals) {
    const suggestDashDash = allowPositionals ? `. To specify a positional argument starting with a '-', place it at the end of the command after '--', as in '-- ${JSON.stringify(option)}` : '';
    super(`Unknown option '${option}'${suggestDashDash}`);
    this.code = 'ERR_PARSE_ARGS_UNKNOWN_OPTION';
  }
}

class ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL extends Error {
  constructor(positional) {
    super(`Unexpected argument '${positional}'. This command does not take positional arguments`);
    this.code = 'ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL';
  }
}

module.exports = {
  codes: {
    ERR_INVALID_ARG_TYPE,
    ERR_INVALID_ARG_VALUE,
    ERR_PARSE_ARGS_INVALID_OPTION_VALUE,
    ERR_PARSE_ARGS_UNKNOWN_OPTION,
    ERR_PARSE_ARGS_UNEXPECTED_POSITIONAL,
  }
};
