# Upgrading to Version 10.0

Welcome to version 10.0.  This a major release and therefore will contain breaking changes.

## Breaking Changes

Our normal minor releases try to never break anything, holding all breaking changes for major releases.
We tried to squeeze in as many as we could this time so that after 10.0 ships we'll be back to quiet sailing for a while before we need to push version 11.  That said, we're very conservative about what we consider a breaking change.

*IE, if there it could possibly break things for anyone, it's typically a breaking change.*  The fact is a vast majority of users should upgrade and probably not notice any changes at all.

See [VERSION_10_BREAKING_CHANGES.md](https://github.com/highlightjs/highlight.js/blob/main/VERSION_10_BREAKING_CHANGES.md) for a comprehensive list of breaking changes, but here is a summary... if you use:

### Core highlight.js lib on the client (with no extra CDN languages)

Just keep doing that.

- If you're using `darkula.css`, you'll need to change that to `darcula.css`
- The minified distributable has changed from `.pack.js` to `.min.js`, update your name when you update your URL.
- If your users have very old browsers, they may no longer be supported (no more IE11, etc.). (We're using ES2015 code now.)
- `nohighlight` or `no-highlight` are the only two CSS classes that will SKIP highlighting completely.  `*text*` and `*plain*` no longer will do this.

### Core highlight.js lib on the client (plus additional CDN languages)

Quite a few grammars have been renamed.  Ex: `nimrod.js` is now `nim.js`.

- Check the renamed grammars to see if you might need to update your links.
- Be aware that you can't use version 9 CDN JS files anymore, they aren't compatible.
- Plus read the above list of items.

### highlight.js on the server (via NPM) and only use the public API

If you're just pulling in the FULL library (`require('./highlight.js')`) just keep doing that.  You might not need to change anything.

- If you're manually loading a smaller set of languages and using `registerLanguage` make sure you check out all the renamed grammars and dependency changes.
- Read the client-side lists above also.

### highlight.js on the server (via NPM) with a custom integration

Read the complete breaking changes list carefully.

- Read the client-side lists above also.

### highlight.js lib on the client, with source directly from our GitHub repo

That will no longer work. The source needs to be built to work properly and cannot be used "raw" unless you've also setup your own build pipeline (rollup, etc.).  Fetch a static build from the CDN, the [cdn-release repo](https://github.com/highlightjs/cdn-release) or use the new [`highlightjs-dist`]() NPM package.

### highlight.js source code directly from our GitHub repo with a custom integration

All bets are off, since we only try to guarantee stability of our NPM and CDN builds and the public API.  Read all the breaking changes and perhaps skim the commit history.

- We're using ES6 modules now.
- We're using an entirely new build system.
- The source will likely become more and more modular during the 10.0 timeline.

## Enjoy and good luck.

As always if you have any questions or issues, jump on the [Github Issues](https://github.com/highlightjs/highlight.js/issues).
