/* eslint-disable unicorn/prefer-module */
/* eslint-env browser */

module.exports = function isChromatic(windowArgument) {
  const windowToCheck = windowArgument || (typeof window !== 'undefined' && window);
  return !!(
    windowToCheck &&
    (/Chromatic/.test(windowToCheck.navigator.userAgent) ||
      /chromatic=true/.test(windowToCheck.location.href))
  );
};
