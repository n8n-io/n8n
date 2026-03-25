/**
 * Get a list of possible event messages from a Sentry event.
 */
function getPossibleEventMessages(event) {
  const possibleMessages = [];

  if (event.message) {
    possibleMessages.push(event.message);
  }

  try {
    // @ts-expect-error Try catching to save bundle size
    const lastException = event.exception.values[event.exception.values.length - 1];
    if (lastException?.value) {
      possibleMessages.push(lastException.value);
      if (lastException.type) {
        possibleMessages.push(`${lastException.type}: ${lastException.value}`);
      }
    }
  } catch {
    // ignore errors here
  }

  return possibleMessages;
}

export { getPossibleEventMessages };
//# sourceMappingURL=eventUtils.js.map
