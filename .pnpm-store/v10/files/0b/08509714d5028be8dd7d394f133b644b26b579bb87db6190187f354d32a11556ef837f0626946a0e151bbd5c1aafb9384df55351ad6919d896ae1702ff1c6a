let defaultResolver;

module.exports = () => {
  if (!defaultResolver) {
    try {
      defaultResolver = require(`jest-resolve/build/defaultResolver`).default;
    } catch (error) {
      defaultResolver = require(`jest-resolve/build/default_resolver`).default;
    }
  }

  return defaultResolver;
};
