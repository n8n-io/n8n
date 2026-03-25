const consoleError = console.error;

const suppressedErrors = [
  'Error: Could not parse CSS stylesheet',
  'Warning: Use the `defaultValue` or `value` props instead of setting children on <textarea>',
  'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
];

beforeEach(() => {
  // Suppress errors from JSDOM CSS parser
  // See: https://github.com/jsdom/jsdom/issues/2177
  console.error = (logged: any) => {
    const message = logged.stack || logged;

    if (
      typeof message !== 'string' ||
      !suppressedErrors.some(suppressedError => message.includes(suppressedError))
    ) {
      consoleError(logged);
    }
  };
});

afterEach(() => {
  console.error = consoleError;
});
