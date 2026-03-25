const path = require('path');
const micromatch = require('micromatch');
const isGlob = require('is-glob');

function normalizeOptions(dir, opts = {}) {
  const { ignore, ...rest } = opts;

  if (Array.isArray(ignore)) {
    opts = { ...rest };

    for (const value of ignore) {
      if (isGlob(value)) {
        if (!opts.ignoreGlobs) {
          opts.ignoreGlobs = [];
        }

        const regex = micromatch.makeRe(value, {
          // We set `dot: true` to workaround an issue with the
          // regular expression on Linux where the resulting
          // negative lookahead `(?!(\\/|^)` was never matching
          // in some cases. See also https://bit.ly/3UZlQDm
          dot: true,
          // C++ does not support lookbehind regex patterns, they
          // were only added later to JavaScript engines
          // (https://bit.ly/3V7S6UL)
          lookbehinds: false
        });
        opts.ignoreGlobs.push(regex.source);
      } else {
        if (!opts.ignorePaths) {
          opts.ignorePaths = [];
        }

        opts.ignorePaths.push(path.resolve(dir, value));
      }
    }
  }

  return opts;
}

exports.createWrapper = (binding) => {
  return {
    writeSnapshot(dir, snapshot, opts) {
      return binding.writeSnapshot(
        path.resolve(dir),
        path.resolve(snapshot),
        normalizeOptions(dir, opts),
      );
    },
    getEventsSince(dir, snapshot, opts) {
      return binding.getEventsSince(
        path.resolve(dir),
        path.resolve(snapshot),
        normalizeOptions(dir, opts),
      );
    },
    async subscribe(dir, fn, opts) {
      dir = path.resolve(dir);
      opts = normalizeOptions(dir, opts);
      await binding.subscribe(dir, fn, opts);

      return {
        unsubscribe() {
          return binding.unsubscribe(dir, fn, opts);
        },
      };
    },
    unsubscribe(dir, fn, opts) {
      return binding.unsubscribe(
        path.resolve(dir),
        fn,
        normalizeOptions(dir, opts),
      );
    }
  };
};
