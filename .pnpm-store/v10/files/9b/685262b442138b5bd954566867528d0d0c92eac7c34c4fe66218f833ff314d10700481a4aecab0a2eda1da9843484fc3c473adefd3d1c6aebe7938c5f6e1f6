# Chromatic CLI

Publishes your Storybook to Chromatic and kicks off tests if they're enabled.

<img width="100%" src="https://user-images.githubusercontent.com/321738/82901859-d820ec80-9f5e-11ea-81e7-78d494c103ad.gif" alt="">

<a href="https://www.npmjs.com/package/chromatic">
  <img src="https://badgen.net/npm/v/chromatic" alt="Published on npm">
</a>
<a href="https://www.chromatic.com/builds?appId=5d67dc0374b2e300209c41e7">
  <img src="https://badgen.net/badge/tested%20with/chromatic/fc521f" alt="Tested with Chromatic">
</a>

## Documentation

👉 Read the [Chromatic CLI docs](https://www.chromatic.com/docs/cli)

📝 View the [Changelog](https://github.com/chromaui/chromatic-cli/blob/main/CHANGELOG.md)

## System requirements

The Chromatic CLI (and GitHub Action) is built to run in a variety of environments. We provide support for the following platforms:

- Latest (LTS) versions of Ubuntu, Windows (Server), macOS
- Node.js Current, Active or Maintenance (LTS) versions, according to their [release schedule](https://github.com/nodejs/release#release-schedule)
- Storybook 6.5+

Other platforms/versions may work, but are not officially supported. Certain features may not be available on certain platforms/versions, even if otherwise supported.

## Contributing

Contributions of any kind are welcome! If you're a maintainer, refer to the following [instructions](./docs/DEVELOPMENT.md) to set up your development environment with Chromatic.

### Compatibility & versioning

Compatibility is guaranteed between this package and Chromatic like so:

- Production Chromatic ensures it’s compatible with what’s on npm
- What's on the Git tag is equal to what's published on npm for that version
- This package ensures it’s compatible with production Chromatic

To facilitate upgrading in the future, removing and adding features, this is the process:

- Any new features will have to be on Chromatic production before they could be used in this package
- We can add feature flags to be able to test new functionality
- Chromatic production can not remove any features this package depends on until after the usage has been removed from this package in addition to a grace period to allow users to upgrade
