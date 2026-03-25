# Changelog

## v4.2.0

- support Cloudflare Pages [75c9de8](https://github.com/watson/ci-info/commit/75c9de8)

### v4.1.0

- support Appcircle PR [1d42c26](https://github.com/watson/ci-info/commit/1d42c26)
- support AWS CodeBuild PR [e6fcdd2](https://github.com/watson/ci-info/commit/e6fcdd2)
- add `ci.id` to return vendor constant [81fd993](https://github.com/watson/ci-info/commit/81fd993)

## v4.0.0

- support Earthly CI [fb8bd85](https://github.com/watson/ci-info/commit/fb8bd85)
- support Prow CI [8e6a591](https://github.com/watson/ci-info/commit/8e6a591)
- support Vela CI [bb13901](https://github.com/watson/ci-info/commit/bb13901)
- support Agola CI [ec4e149](https://github.com/watson/ci-info/commit/ec4e149)
- support Gitea Actions [f6f173f](https://github.com/watson/ci-info/commit/f6f173f)
- run tests on nodejs v20 [bff314d](https://github.com/watson/ci-info/commit/bff314d)

#### Breaking Changes

- remove Shippable CI [2c5571a](https://github.com/watson/ci-info/commit/2c5571a)
- remove Solano CI [d6315fc](https://github.com/watson/ci-info/commit/d6315fc)

## v3.9.0

- better support for Azure Pipelines ([#116](https://github.com/watson/ci-info/pull/116)), [5ea8d85](https://github.com/watson/ci-info/commit/5ea8d85)
- detect PullRequest in Azure Pipelines [5ea8d85](https://github.com/watson/ci-info/commit/5ea8d85)

## v3.8.0

- support Harness CI [76a2867](https://github.com/watson/ci-info/commit/76a2867)

## v3.7.1

- ignore ci detection when CI is set to `'false'` [24cc450](https://github.com/watson/ci-info/commit/24cc450)

## v3.7.0

- support Sourcehut CI [85b96ea](https://github.com/watson/ci-info/commit/85b96ea)
- support ReleaseHub CI [409d886](https://github.com/watson/ci-info/commit/409d886)

## v3.6.2

- fix VERCEL environment detection ([#98](https://github.com/watson/ci-info/pull/98))

## v3.6.1

- fix error in typings [357b454](https://github.com/watson/ci-info/commit/357b454)

## v3.6.0

This release attempts to bring parity with [@npmcli/ci-detect](https://github.com/npm/ci-detect). See [#95](https://github.com/watson/ci-info/pull/95) for more details.

- support gerrit ([#95](https://github.com/watson/ci-info/pull/95))
- support google cloud build ([#95](https://github.com/watson/ci-info/pull/95))
- support heroku ([#95](https://github.com/watson/ci-info/pull/95))
- support anonymous CI's that exposes BUILD_ID and CI_NAME env vars ([#95](https://github.com/watson/ci-info/pull/95))
- support more vercel environments ([#95](https://github.com/watson/ci-info/pull/95))

## v3.5.0

- support Woodpecker CI ([#90](https://github.com/watson/ci-info/pull/90))

## v3.4.0

- partial support Appflow CI (only CI detection) ([#84](https://github.com/watson/ci-info/pull/84))
- support Codemagic CI ([#85](https://github.com/watson/ci-info/pull/85))
- support Xcode Server CI ([#86](https://github.com/watson/ci-info/pull/86))
- support Xcode Cloud CI ([#86](https://github.com/watson/ci-info/pull/86))

## v3.3.2

- fix: export correct typings for `EAS`

## v3.3.1

- fix: export `EAS_BUILD` constant in typings
- Add support for nodejs v18

## v3.3.0

- support Expo Application Services ([#70](https://github.com/watson/ci-info/pull/70))

## v3.2.0

- support LayerCI ([#68](https://github.com/watson/ci-info/pull/68))
- support Appcircle ([#69](https://github.com/watson/ci-info/pull/69))
- support Codefresh CI ([#65](https://github.com/watson/ci-info/pull/65))
- add support for nodejs v16

## v3.1.1

Bug Fixes:

- remove duplicate declaration in typings

## v3.1.0

Features:

- add typings

## v3.0.0

Features:

- Add support nodejs versions: 14, 15
- support Nevercode ([#30](https://github.com/watson/ci-info/pull/30))
- support Render CI ([#36](https://github.com/watson/ci-info/pull/36))
- support Now CI ([#37](https://github.com/watson/ci-info/pull/37))
- support GitLab PR ([#59](https://github.com/watson/ci-info/pull/59))
- support Screwdriver CD ([#60](https://github.com/watson/ci-info/pull/60))
- support Visual Studio App Center ([#61](https://github.com/watson/ci-info/pull/61))

Bug Fixes:

- update Netlify env constant ([#47](https://github.com/watson/ci-info/pull/47))

Breaking changes:

- Drop support for Node.js end-of-life versions: 6, 13
- replace `Zeit Now` with `Vercel` ([#55](https://github.com/watson/ci-info/pull/55))

## v2.0.0

Breaking changes:

- Drop support for Node.js end-of-life versions: 0.10, 0.12, 4, 5, 7, and 9
- Team Foundation Server will now be detected as Azure Pipelines. The constant `ci.TFS` no longer exists - use
  `ci.AZURE_PIPELINES` instead
- Remove deprecated `ci.TDDIUM` constant - use `ci.SOLANDO` instead

New features:

- feat: support Azure Pipelines ([#23](https://github.com/watson/ci-info/pull/23))
- feat: support Netlify CI ([#26](https://github.com/watson/ci-info/pull/26))
- feat: support Bitbucket pipelines PR detection ([#27](https://github.com/watson/ci-info/pull/27))

## v1.6.0

- feat: add Sail CI support
- feat: add Buddy support
- feat: add Bitrise support
- feat: detect Jenkins PRs
- feat: detect Drone PRs

## v1.5.1

- fix: use full path to vendors.json

## v1.5.0

- feat: add dsari detection ([#15](https://github.com/watson/ci-info/pull/15))
- feat: add ci.isPR ([#16](https://github.com/watson/ci-info/pull/16))

## v1.4.0

- feat: add Cirrus CI detection ([#13](https://github.com/watson/ci-info/pull/13))
- feat: add Shippable CI detection ([#14](https://github.com/watson/ci-info/pull/14))

## v1.3.1

- chore: reduce npm package size by not including `.github` folder content
  ([#11](https://github.com/watson/ci-info/pull/11))

## v1.3.0

- feat: add support for Strider CD
- chore: deprecate vendor constant `TDDIUM` in favor of `SOLANO`
- docs: add missing vendor constant to docs

## v1.2.0

- feat: detect solano-ci ([#9](https://github.com/watson/ci-info/pull/9))

## v1.1.3

- fix: fix spelling of Hunson in `ci.name`

## v1.1.2

- fix: no more false positive matches for Jenkins

## v1.1.1

- docs: sort lists of CI servers in README.md
- docs: add missing AWS CodeBuild to the docs

## v1.1.0

- feat: add AWS CodeBuild to CI detection ([#2](https://github.com/watson/ci-info/pull/2))

## v1.0.1

- chore: reduce npm package size by using an `.npmignore` file ([#3](https://github.com/watson/ci-info/pull/3))

## v1.0.0

- Initial release
