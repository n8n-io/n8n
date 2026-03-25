# @microsoft/api-extractor


![API Extractor](https://github.com/microsoft/rushstack/raw/main/common/wiki-images/api-extractor-title.png?raw=true)
<br />
&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; https://api-extractor.com/

<!-- ------------------------------------------------------------------ -->
<!-- Text below this line should stay in sync with the web site content -->
<!-- ------------------------------------------------------------------ -->

**API Extractor** helps you build better [TypeScript](https://www.typescriptlang.org/) library packages.  Suppose for example that your company has published an NPM package called "**awesome-widgets**" that exports many classes and interfaces.  As developers start to depend on your library, you may encounter issues such as...

- **Accidental breaks:**  People keep reporting that their code won't compile after a supposedly "minor" update.  To address this, you boldly propose that every **awesome-widgets** pull request must be approved by an experienced developer from your team.  But that proves unrealistic -- nobody has time to look at every single PR!  What you really need is a way to detect PRs that change API contracts, and flag them for review.  That would focus attention in the right place... but how to do that?

- **Missing exports:** Suppose the **awesome-widgets** package exports an API function `AwesomeButton.draw()` that requires a parameter of type `DrawStyle`, but you forgot to export this enum.  Things seem fine at first, but when a developer tries to call that function, they discover that there's no way to specify the `DrawStyle`.  How to avoid these oversights?

- **Accidental exports:** You meant for your `DrawHelper` class to be kept internal, but one day you realize it's being exported.  When you try to remove it, consumers complain that they're using it.  How do we avoid this in the future?

- **Alpha/Beta graduation:**  You want to release previews of new APIs that are not ready for prime time yet.  But if you did a major SemVer bump every time these definitions evolve, the villagers would be after you with torches and pitchforks!  A better approach is to designate certain classes/members as **alpha** quality, then promote them to **beta** and finally to **public** as they mature.  But how to indicate this to your consumers?  (And how to detect scoping mistakes?  A **public** function should never return a **beta** result.)

- **\*.d.ts rollup:** You webpacked your library into a nice **\*.js** bundle file -- so why ship your typings as a messy tree of **lib/\*.d.ts** files full of private definitions?  Can't we consolidate them into a tidy **\*.d.ts** rollup file?  And if you publish internal/beta/public releases, each release type should get its own **\*.d.ts** file with appropriate trimming.  Developers building a production project don't want to see a bunch of **internal** and **beta** members in their VS Code IntelliSense!

- **Online documentation:**  You have faithfully annotated each TypeScript member with nice [TSDoc](https://github.com/microsoft/tsdoc) descriptions.  Now that your library has shipped, it's time to set up [a nicely formatted](https://docs.microsoft.com/en-us/javascript/api/sp-http) API reference.  What tool to use?

**API Extractor** provides an integrated, professional-quality solution for all these problems.  It is invoked at build time by your toolchain and leverages the TypeScript compiler engine to:

- Detect a project's exported API surface
- Capture the contracts in a concise report designed to facilitate review
- Warn about common mistakes (e.g. missing exports, inconsistent visibility, etc.)
- Generate \*.d.ts rollups with trimming according to release type
- Output API documentation in a portable format that's easy to integrate with your content pipeline

Best of all, **API Extractor** is free and open source.  Join the community and create a pull request!

<!-- ------------------------------------------------------------------ -->
<!-- Text above this line should stay in sync with the web site content -->
<!-- ------------------------------------------------------------------ -->

## Getting Started

For more details and support resources, please visit: https://api-extractor.com/

## Links

- [CHANGELOG.md](
  https://github.com/microsoft/rushstack/blob/main/apps/api-extractor/CHANGELOG.md) - Find
  out what's new in the latest version
- [API Reference](https://api.rushstack.io/pages/api-extractor/)

API Extractor is part of the [Rush Stack](https://rushstack.io/) family of projects.
