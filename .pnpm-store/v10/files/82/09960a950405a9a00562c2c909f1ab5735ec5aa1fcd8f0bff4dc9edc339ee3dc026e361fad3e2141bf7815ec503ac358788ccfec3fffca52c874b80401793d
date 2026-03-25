# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.5] - 2020-11-18

- Fix server side rendering

## [2.0.2] - 2019-05-14

- Catching an exception on Send (HEAD) ([#534])

## [2.0.0] - 2018-10-17

- Removed eval to resolve CSP ([#465])

## [2.0.0-rc.4] - 2018-10-17

- Don’t throw on module.exports

## [2.0.0-rc.3] - 2018-09-27

- Switch export method

## [2.0.0-rc.2] - 2018-09-26

- Added a changelog.md
- Reverted `a.click()` to use dispatch with a try-catch ([#465], [#382])
- Made third argument to an object where you have to pass `{ autoBom: true }`
  - boolean are depricated but still works

## [2.0.0-rc.1] - 2018-09-26

- saveAs don't return anything
  - The object that dispatched `writestart progress write writeend` are gone
  - detecting such features was never possible and nobody seems to use it.
- Removed the demo folder
- Removed date/version from top of the file
- Dosen't crash in web workers ([#449])
- Support saving urls ([#260] with workarounds for cross origin)
- Uses babel universal module pattern (UMD) to export the package
- Provides source map now as well.
- use a[download] before msSaveAs ([#193], [#294])
- removed dist from .gitignore (npm uses it if it don't find a .npmignore)
- autoBom is now reversed so you have to tell when you want to use autoBom ([#432])
- `a.click()` since there are new and depricated event constructors that works differently ([#382])
- opens up a new popup (tab) directly for the fallback method since the FileReader is async
- removed the explicitly MSIE [1-9] check
- Uses new anchor link for each save (might solve multiple download problems)

  [#382]: https://github.com/eligrey/FileSaver.js/issues/382
  [#449]: https://github.com/eligrey/FileSaver.js/issues/449
  [#260]: https://github.com/eligrey/FileSaver.js/issues/260
  [#193]: https://github.com/eligrey/FileSaver.js/issues/193
  [#294]: https://github.com/eligrey/FileSaver.js/issues/294
  [#432]: https://github.com/eligrey/FileSaver.js/issues/432
  [#382]: https://github.com/eligrey/FileSaver.js/issues/382
  [#465]: https://github.com/eligrey/FileSaver.js/issues/465
  [#469]: https://github.com/eligrey/FileSaver.js/issues/469
  [#470]: https://github.com/eligrey/FileSaver.js/issues/470
  [#491]: https://github.com/eligrey/FileSaver.js/issues/491
  [#534]: https://github.com/eligrey/FileSaver.js/issues/534
