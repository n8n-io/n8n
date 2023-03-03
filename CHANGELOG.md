# [0.218.0](https://github.com/n8n-io/n8n/compare/n8n@0.217.2...n8n@0.218.0) (2023-03-02)


### Bug Fixes

* **core:** Fix execution pruning queries ([#5562](https://github.com/n8n-io/n8n/issues/5562)) ([88de661](https://github.com/n8n-io/n8n/commit/88de6613bda2d4f133410b05c5c2a8d2f1ba838f))
* **core:** Fix Filtering of Workflow by Tags ([#5570](https://github.com/n8n-io/n8n/issues/5570)) ([ea2035b](https://github.com/n8n-io/n8n/commit/ea2035b5102853d2aa7e5e01d70e06acf4abd3d8))
* **core:** Revert `isPending` check on the user entity ([#5571](https://github.com/n8n-io/n8n/issues/5571)) ([a19ec6a](https://github.com/n8n-io/n8n/commit/a19ec6ac94ac2ed6ab96bf7fe2216cdd2324228b))
* Fix issues with nodes missing in nodes panel ([#5599](https://github.com/n8n-io/n8n/issues/5599)) ([5040fea](https://github.com/n8n-io/n8n/commit/5040fea93ecc36017d25f237fe9b3e23bc9d623d))
* Fix mapping paths when appending to empty expression ([#5591](https://github.com/n8n-io/n8n/issues/5591)) ([1f7b478](https://github.com/n8n-io/n8n/commit/1f7b478920ee2b8b4f6affcfd0b42f79b2cd8cd1))
* **Item Lists Node:** Tweak item list summarize field naming  ([#5572](https://github.com/n8n-io/n8n/issues/5572)) ([aa2beaa](https://github.com/n8n-io/n8n/commit/aa2beaa80076fc06360828e466a3dc05e7caddbe))
* Prevent executions from displaying as running forever ([#5563](https://github.com/n8n-io/n8n/issues/5563)) ([46d9ac6](https://github.com/n8n-io/n8n/commit/46d9ac6c6f55a505716c8951f93b149713bcbe35))
* Show Execute Workflow node in nodes panel ([#5583](https://github.com/n8n-io/n8n/issues/5583)) ([d6d1c07](https://github.com/n8n-io/n8n/commit/d6d1c07a53bb903b19c49ea11b9d36993fde7c33))
* Show RabbitMQ node in nodes panel ([#5598](https://github.com/n8n-io/n8n/issues/5598)) ([4f5013f](https://github.com/n8n-io/n8n/commit/4f5013ff53294579fb9e47f90ae08e9a6bc76b75))
* Stop showing mapping hint after mapping ([#5586](https://github.com/n8n-io/n8n/issues/5586)) ([eac4275](https://github.com/n8n-io/n8n/commit/eac4275a7ebfa6ccc6258261b1b3ac36c9df9d88))


### Features

* Add distribution test tracking ([#5588](https://github.com/n8n-io/n8n/issues/5588)) ([91bd014](https://github.com/n8n-io/n8n/commit/91bd0146f35ba3f38c862cac9c5ad48ff7cd38e8))
* Add events to enable onboarding checklist ([#5536](https://github.com/n8n-io/n8n/issues/5536)) ([20c4919](https://github.com/n8n-io/n8n/commit/20c49195131399aa6ab0c6938eebb5e2733c6710))
* **core:** Add SAML login setup ([#5515](https://github.com/n8n-io/n8n/issues/5515)) ([40a934b](https://github.com/n8n-io/n8n/commit/40a934bbb4f6eed80aa5c1de6814c0e0eea65ebd))
* **core:** Add SAML settings and consolidate LDAP under SSO ([#5574](https://github.com/n8n-io/n8n/issues/5574)) ([31cc8de](https://github.com/n8n-io/n8n/commit/31cc8de8297454cad4307e008b3b915475c0a889))
* **editor:** Add missing documentation to autocomplete items for inline code editor ([#5560](https://github.com/n8n-io/n8n/issues/5560)) ([ae63440](https://github.com/n8n-io/n8n/commit/ae634407a47de33d77cb81ae7ce11362e8485fd4))
* **editor:** Show parameter hint on multilines ([#5014](https://github.com/n8n-io/n8n/issues/5014)) ([1942fd8](https://github.com/n8n-io/n8n/commit/1942fd82323183fb31af671ccb8d22f6a4798d7f))
* **Jira Software Node:** Support binary streaming for very large binary files ([#5589](https://github.com/n8n-io/n8n/issues/5589)) ([f61d779](https://github.com/n8n-io/n8n/commit/f61d779667f25a411b51ee61ddd3fe4698f05934))
* **OpenAI Node:** Add support for ChatGPT ([#5596](https://github.com/n8n-io/n8n/issues/5596)) ([06c5ecb](https://github.com/n8n-io/n8n/commit/06c5ecbdf3031a7773e698294ae701a7e501ef50))
* **Telegram Node:** Add Parse Mode to Send Document operation ([#5554](https://github.com/n8n-io/n8n/issues/5554)) ([f3c943e](https://github.com/n8n-io/n8n/commit/f3c943ef8191bd16e16a61ffbed6b1caca0d75a5))



## [0.217.2](https://github.com/n8n-io/n8n/compare/n8n@0.217.1...n8n@0.217.2) (2023-02-27)


### Bug Fixes

* **core:** Fix execution pruning queries ([#5562](https://github.com/n8n-io/n8n/issues/5562)) ([2137ae2](https://github.com/n8n-io/n8n/commit/2137ae23d789af765a7555028e9651029f88cadc))
* **core:** Fix Filtering of Workflow by Tags ([#5570](https://github.com/n8n-io/n8n/issues/5570)) ([51eedac](https://github.com/n8n-io/n8n/commit/51eedaccd427ec11b12fbf43d9dd3f0ebe9633d2))
* **core:** Revert `isPending` check on the user entity ([#5571](https://github.com/n8n-io/n8n/issues/5571)) ([43eec66](https://github.com/n8n-io/n8n/commit/43eec66828b2e03418402742c9695e08b1165bdd))



## [0.217.1](https://github.com/n8n-io/n8n/compare/n8n@0.217.0...n8n@0.217.1) (2023-02-24)


### Bug Fixes

* Prevent executions from displaying as running forever ([#5563](https://github.com/n8n-io/n8n/issues/5563)) ([b30db10](https://github.com/n8n-io/n8n/commit/b30db10d898fa791d99d13192ef411cace4f7c05))



# [0.217.0](https://github.com/n8n-io/n8n/compare/n8n@0.216.1...n8n@0.217.0) (2023-02-23)


### Bug Fixes

* **Baserow Node:** Fix issue with get all not correctly using filters ([#5519](https://github.com/n8n-io/n8n/issues/5519)) ([ee21b7a](https://github.com/n8n-io/n8n/commit/ee21b7a1cfed17936eb6bf50221b7f9983dd38e6))
* **Compare Datasets Node:** UI tweaks and fixes ([7ecd5e5](https://github.com/n8n-io/n8n/commit/7ecd5e59eca01ca2b1a01e0a3e3871bd5d322eea))
* **core:** Do not allow arbitrary path traversal in BinaryDataManager ([#5523](https://github.com/n8n-io/n8n/issues/5523)) ([eef2574](https://github.com/n8n-io/n8n/commit/eef257406730a989ec8e7a056c3d4234300fdb25))
* **core:** Do not allow arbitrary path traversal in the credential-translation endpoint ([#5522](https://github.com/n8n-io/n8n/issues/5522)) ([f0f8d59](https://github.com/n8n-io/n8n/commit/f0f8d59fee223c6bc9f8459890ed4a31ef8cb0af))
* **core:** Do not explicitly bypass auth on urls containing `.svg` ([#5525](https://github.com/n8n-io/n8n/issues/5525)) ([f58573d](https://github.com/n8n-io/n8n/commit/f58573dba30eba8fe3d844d1b7b2dbbb8d51b8b5))
* **core:** Do not remove empty output connections arrays in PurgeInvalidWorkflowConnections migration ([#5546](https://github.com/n8n-io/n8n/issues/5546)) ([0fbb3f0](https://github.com/n8n-io/n8n/commit/0fbb3f0f026432f1aea87b106a0c1f732f93c792))
* **core:** Fix execution status filters ([#5533](https://github.com/n8n-io/n8n/issues/5533)) ([17eff4d](https://github.com/n8n-io/n8n/commit/17eff4d7d6692bfdc251bfa16ce7334858642ce5))
* **core:** User update endpoint should only allow updating email, firstName, and lastName ([#5526](https://github.com/n8n-io/n8n/issues/5526)) ([510855d](https://github.com/n8n-io/n8n/commit/510855d9581f07e5081a7bc11377cd6216ba7edf))
* **Discord Node:** Fix wrong error message being displayed ([#5547](https://github.com/n8n-io/n8n/issues/5547)) ([e251439](https://github.com/n8n-io/n8n/commit/e2514393335e555af47c9aca4f81b31608df9cb5))
* **Discourse Node:** Fix issue with credential test not working ([#5520](https://github.com/n8n-io/n8n/issues/5520)) ([b3e1793](https://github.com/n8n-io/n8n/commit/b3e1793ac0f304ea72d565097b6766bc278e1238))
* **editor:** Apply correct IRunExecutionData to finished workflow ([#5552](https://github.com/n8n-io/n8n/issues/5552)) ([e2d7c18](https://github.com/n8n-io/n8n/commit/e2d7c1804f2d5da15d96edeefd50c5b8e2753fd1))
* **editor:** Fix an issue with zoom and canvas nodes connections ([#5548](https://github.com/n8n-io/n8n/issues/5548)) ([4998ab2](https://github.com/n8n-io/n8n/commit/4998ab23508adf9a244885509b2d5c7c9c9c48f0))
* **editor:** Fix unexpected date rendering on front-end ([#5528](https://github.com/n8n-io/n8n/issues/5528)) ([684d717](https://github.com/n8n-io/n8n/commit/684d71752064e25143e09666e539b91b3dcd5f71))
* **editor:** Remove 'crashed' status from filter ([#5524](https://github.com/n8n-io/n8n/issues/5524)) ([7c517cb](https://github.com/n8n-io/n8n/commit/7c517cb5300481908dd653426089a6a9291e79ca))
* fix typo in error messages when a property does not exist ([#4310](https://github.com/n8n-io/n8n/issues/4310)) ([3af3db1](https://github.com/n8n-io/n8n/commit/3af3db160b5798fe948159b6f3dd48ec743512e7))
* Fixes an issue when saving an active workflow without triggers would cause n8n to be stuck ([#5513](https://github.com/n8n-io/n8n/issues/5513)) ([75a094a](https://github.com/n8n-io/n8n/commit/75a094a8c03afc40b7872cd2115d82e69455286e))
* **Google Calendar Node:** Fix incorrect labels for start and end times when getting all events ([#5529](https://github.com/n8n-io/n8n/issues/5529)) ([f965469](https://github.com/n8n-io/n8n/commit/f965469e13a45d3a7b796dfd6be44573bf8b13d0))
* **Postgres Node:** Fix for tables containing field named json ([5d74a2f](https://github.com/n8n-io/n8n/commit/5d74a2f89a31ee1a386a52d0d71858f73d734e31))
* **S3 Node:** Fix issue with get many buckets not outputting data ([#5514](https://github.com/n8n-io/n8n/issues/5514)) ([1c47677](https://github.com/n8n-io/n8n/commit/1c476770a778b7d034924db847a8757c383bd281))


### Features

* Add new event hooks ([#5530](https://github.com/n8n-io/n8n/issues/5530)) ([d47d008](https://github.com/n8n-io/n8n/commit/d47d0086cc2b0af5338598de1fc496b9d825f9a4))
* Add Required path name mapping to multiple nodes ([#5369](https://github.com/n8n-io/n8n/issues/5369)) ([f1589d4](https://github.com/n8n-io/n8n/commit/f1589d4f0f9f7cc7beec12d9f6598f8286484989))
* **core:** Add configurable execution history limit ([#5505](https://github.com/n8n-io/n8n/issues/5505)) ([db70293](https://github.com/n8n-io/n8n/commit/db702932f3f2b14a097e7f4364c06cbb4f001ebc))
* **core:** Add execution runData recovery and status field ([#5112](https://github.com/n8n-io/n8n/issues/5112)) ([d143f3f](https://github.com/n8n-io/n8n/commit/d143f3f2ec9ce42cfa4db2b41dab019b7b42f379))
* **core:** Add saml feature flag ([#5494](https://github.com/n8n-io/n8n/issues/5494)) ([3a9c257](https://github.com/n8n-io/n8n/commit/3a9c257f55a87890c7456601de13f182cec89fde))
* Deprecate Read Binary File node ([#5490](https://github.com/n8n-io/n8n/issues/5490)) ([11b4671](https://github.com/n8n-io/n8n/commit/11b467137e7652c03c0578654b19dbc157b23220))
* **editor:** Unify regular and trigger node creator panels ([#5315](https://github.com/n8n-io/n8n/issues/5315)) ([9a1e7b5](https://github.com/n8n-io/n8n/commit/9a1e7b52f7ce698f1492af15d0139fb015ba5d30))
* Hide sensitive value in Auth Header Credentials and Auth Query Credentials ([#5534](https://github.com/n8n-io/n8n/issues/5534)) ([4a209e1](https://github.com/n8n-io/n8n/commit/4a209e1dd98ea4b43d0a4d9cd688615cd6d4d5dd))
* Support feature flag evaluation server side ([#5511](https://github.com/n8n-io/n8n/issues/5511)) ([26a20ed](https://github.com/n8n-io/n8n/commit/26a20ed47e8f580504b80150d7550ecb9a49be0d))



## [0.216.2](https://github.com/n8n-io/n8n/compare/n8n@0.216.1...n8n@0.216.2) (2023-02-23)


### Bug Fixes

* **core:** Do not remove empty output connections arrays in PurgeInvalidWorkflowConnections migration ([#5546](https://github.com/n8n-io/n8n/issues/5546)) ([ac86abe](https://github.com/n8n-io/n8n/commit/ac86abe2457d9f54fcd23ac0c8d5f39d565bdcdf))



## [0.215.3](https://github.com/n8n-io/n8n/compare/n8n@0.215.2...n8n@0.215.3) (2023-02-23)


### Bug Fixes

* **core:** Do not allow arbitrary path traversal in BinaryDataManager ([#5523](https://github.com/n8n-io/n8n/issues/5523)) ([f7079da](https://github.com/n8n-io/n8n/commit/f7079daecd210a3a2a94e07c4782d15ee2a995e0))
* **core:** Do not allow arbitrary path traversal in the credential-translation endpoint ([#5522](https://github.com/n8n-io/n8n/issues/5522)) ([14d2a88](https://github.com/n8n-io/n8n/commit/14d2a88120c966a6493c3a64a7a2925af0731b8f))
* **core:** Do not explicitly bypass auth on urls containing `.svg` ([#5525](https://github.com/n8n-io/n8n/issues/5525)) ([0b568ee](https://github.com/n8n-io/n8n/commit/0b568ee5c3d3259aaa43f757ded5583bf9d1e221))
* **core:** Do not remove empty output connections arrays in PurgeInvalidWorkflowConnections migration ([#5546](https://github.com/n8n-io/n8n/issues/5546)) ([a31cb05](https://github.com/n8n-io/n8n/commit/a31cb05fecb3c7fcb8f3def33206bb7676358561))
* **core:** User update endpoint should only allow updating email, firstName, and lastName ([#5526](https://github.com/n8n-io/n8n/issues/5526)) ([d530e20](https://github.com/n8n-io/n8n/commit/d530e20669e90e12a2d2895ae31d0018a53b817a))



## [0.214.4](https://github.com/n8n-io/n8n/compare/n8n@0.214.3...n8n@0.214.4) (2023-02-23)


### Bug Fixes

* **core:** Do not allow arbitrary path traversal in BinaryDataManager ([#5523](https://github.com/n8n-io/n8n/issues/5523)) ([df3f23e](https://github.com/n8n-io/n8n/commit/df3f23e2b8103a15632521e4ba6cf332693acf81))
* **core:** Do not allow arbitrary path traversal in the credential-translation endpoint ([#5522](https://github.com/n8n-io/n8n/issues/5522)) ([397e42d](https://github.com/n8n-io/n8n/commit/397e42d63e80577a0b897873a1d2f19533e27da7))
* **core:** Do not explicitly bypass auth on urls containing `.svg` ([#5525](https://github.com/n8n-io/n8n/issues/5525)) ([a8ca2b1](https://github.com/n8n-io/n8n/commit/a8ca2b1aea687256c7d7d3525a2c50659935d7b8))
* **core:** Do not remove empty output connections arrays in PurgeInvalidWorkflowConnections migration ([#5546](https://github.com/n8n-io/n8n/issues/5546)) ([e6a554f](https://github.com/n8n-io/n8n/commit/e6a554f884d0d8d1e5c3890745986ecc179846d5))
* **core:** User update endpoint should only allow updating email, firstName, and lastName ([#5526](https://github.com/n8n-io/n8n/issues/5526)) ([d622827](https://github.com/n8n-io/n8n/commit/d6228276a26d9dc1bf2b2c5452bc0644b6df0c63))



## [0.216.1](https://github.com/n8n-io/n8n/compare/n8n@0.216.0...n8n@0.216.1) (2023-02-21)


### Bug Fixes

* **core:** Do not allow arbitrary path traversal in BinaryDataManager ([#5523](https://github.com/n8n-io/n8n/issues/5523)) ([40b9784](https://github.com/n8n-io/n8n/commit/40b97846483fe7c58229c156acb66f43a5a79dc3))
* **core:** Do not allow arbitrary path traversal in the credential-translation endpoint ([#5522](https://github.com/n8n-io/n8n/issues/5522)) ([fb07d77](https://github.com/n8n-io/n8n/commit/fb07d77106bb4933758c63bbfb87f591bf4a27dd))
* **core:** Do not explicitly bypass auth on urls containing `.svg` ([#5525](https://github.com/n8n-io/n8n/issues/5525)) ([27adea7](https://github.com/n8n-io/n8n/commit/27adea70459329fc0dddabee69e10c9d1453835f))
* **core:** User update endpoint should only allow updating email, firstName, and lastName ([#5526](https://github.com/n8n-io/n8n/issues/5526)) ([5599221](https://github.com/n8n-io/n8n/commit/5599221007cb09cb81f0623874fafc6cd481384c))



# [0.216.0](https://github.com/n8n-io/n8n/compare/n8n@0.215.2...n8n@0.216.0) (2023-02-16)


### Bug Fixes

* **Bubble Node:** Fix pagination issue when returning all objects ([#5483](https://github.com/n8n-io/n8n/issues/5483)) ([1a20fd9](https://github.com/n8n-io/n8n/commit/1a20fd9f46495e32508d74dbb9ccaaa0f6194a07))
* **core:** Fix data transformation function that are reported not to work properly ([#5338](https://github.com/n8n-io/n8n/issues/5338)) ([0cf45bc](https://github.com/n8n-io/n8n/commit/0cf45bc4c862c7544e69af4981d4607bf0b530e3))
* **core:** Remove unnecessary info from `GET /workflows` response ([#5311](https://github.com/n8n-io/n8n/issues/5311)) ([a2c6ea9](https://github.com/n8n-io/n8n/commit/a2c6ea9e110e51debf137707b52eb7fedbc0032b))
* **HTTP Request Node:** Ignore empty body for auto detect json ([#5215](https://github.com/n8n-io/n8n/issues/5215)) ([af70337](https://github.com/n8n-io/n8n/commit/af703371fc96dcfdd8f418201d3880f124cfcfc4))


### Features

* Add workflow and credential sharing access e2e tests ([#5463](https://github.com/n8n-io/n8n/issues/5463)) ([246189f](https://github.com/n8n-io/n8n/commit/246189f6dae2ce96dabd900ce0a192de731cc6aa))
* **editor:** Add correct credential owner contact details for readonly credentials ([#5208](https://github.com/n8n-io/n8n/issues/5208)) ([36108f8](https://github.com/n8n-io/n8n/commit/36108f82a1c1657c3959225d0635255668bf0af6))
* **editor:** Add most important native props and methods to autocomplete ([#5486](https://github.com/n8n-io/n8n/issues/5486)) ([6592d14](https://github.com/n8n-io/n8n/commit/6592d144d1fb680b34240ce57a6615b06de5cde5))
* **editor:** Update to personalization survey v4 ([#5474](https://github.com/n8n-io/n8n/issues/5474)) ([6265f3a](https://github.com/n8n-io/n8n/commit/6265f3a27a076f6c3c24d0fb323e44c471d85b23))
* **Github Node:** Use resource locator component ([#5489](https://github.com/n8n-io/n8n/issues/5489)) ([00ac4c3](https://github.com/n8n-io/n8n/commit/00ac4c308a4d96a0f93401402dd92bbbd087f082))
* **Github Trigger Node:** Use resource locator component ([#5253](https://github.com/n8n-io/n8n/issues/5253)) ([a3d8fac](https://github.com/n8n-io/n8n/commit/a3d8fac73a8a93d6b7f769e1386276e34066a1b7))
* **Notion Node:** Add icon support for page and database page creation ([#5468](https://github.com/n8n-io/n8n/issues/5468)) ([71cba06](https://github.com/n8n-io/n8n/commit/71cba06b7c1ee8ed42a4dacc2d8114df119339dc))
* **Slack Node:** Add support for manually inputting a channel name ([#5488](https://github.com/n8n-io/n8n/issues/5488)) ([7954ed3](https://github.com/n8n-io/n8n/commit/7954ed3cfbd4d8d0611c0cc51385b49cc80282a6))
* Update telemetry api endpoints ([#5482](https://github.com/n8n-io/n8n/issues/5482)) ([3de49e8](https://github.com/n8n-io/n8n/commit/3de49e8f7894e628b722e2a0c62e8739b1de6be9))



## [0.215.2](https://github.com/n8n-io/n8n/compare/n8n@0.215.1...n8n@0.215.2) (2023-02-14)


### Bug Fixes

* **core:** Fix the issue with test webhooks getting removed incorrectly ([#5466](https://github.com/n8n-io/n8n/issues/5466)) ([4dc458e](https://github.com/n8n-io/n8n/commit/4dc458eca5587cf7765bed6fd384d47a31e66e2c)), closes [/github.com/n8n-io/n8n/pull/5443/files#diff-b386248ff00977749c873ed85821c241b773e9740d7e7adf94e05b73b350ed74L152](https://github.com//github.com/n8n-io/n8n/pull/5443/files/issues/diff-b386248ff00977749c873ed85821c241b773e9740d7e7adf94e05b73b350ed74L152)



## [0.215.1](https://github.com/n8n-io/n8n/compare/n8n@0.215.0...n8n@0.215.1) (2023-02-11)


### Bug Fixes

* **core:** Fix issue that worker and webhook service close directly ([#5461](https://github.com/n8n-io/n8n/issues/5461)) ([3396556](https://github.com/n8n-io/n8n/commit/339655611fcf05ebdf9be7c452bc1164333f122e))
* **core:** Handle versioned custom nodes correctly ([#5313](https://github.com/n8n-io/n8n/issues/5313)) ([59f5c42](https://github.com/n8n-io/n8n/commit/59f5c4221efd6f8733bfb5ab41a0834332e9b9e4))



# [0.215.0](https://github.com/n8n-io/n8n/compare/n8n@0.214.3...n8n@0.215.0) (2023-02-10)


### Bug Fixes

* **ActiveCampaign Node:** Fix additional fields not being sent when updating account contacts ([#5216](https://github.com/n8n-io/n8n/issues/5216)) ([333a817](https://github.com/n8n-io/n8n/commit/333a817a8ef202d4133f2796b066e6a8ec414719))
* **core:** Disable transactions on sqlite migrations that use `PRAGMA foreign_keys` ([#5392](https://github.com/n8n-io/n8n/issues/5392)) ([3a435f7](https://github.com/n8n-io/n8n/commit/3a435f7057ac4e48945bd1b3a4efea0397f026a0))
* **core:** Expression extension failing with optional chaining ([#5370](https://github.com/n8n-io/n8n/issues/5370)) ([c7b58e0](https://github.com/n8n-io/n8n/commit/c7b58e0ed19869a4f47c666cc895ed72fe20e8e4))
* **core:** Fix import command for workflows with old format(pre UM) ([#5403](https://github.com/n8n-io/n8n/issues/5403)) ([fdf47a9](https://github.com/n8n-io/n8n/commit/fdf47a96dee8883b811249e1e427b764cab15004))
* **core:** Stop copying icons to cache ([#5419](https://github.com/n8n-io/n8n/issues/5419)) ([f23fb92](https://github.com/n8n-io/n8n/commit/f23fb9269660721aadd34cbb5bb958d7aaf0bcb2))
* **editor:** Prevent creation of input connections for nodes without input slot ([#5425](https://github.com/n8n-io/n8n/issues/5425)) ([018f8a3](https://github.com/n8n-io/n8n/commit/018f8a3510b280b08d95037f9b6b870748170f3e))
* Error workflow now correctly checks for subworkflow permissions ([#5390](https://github.com/n8n-io/n8n/issues/5390)) ([c8245b9](https://github.com/n8n-io/n8n/commit/c8245b9f872fd2c85ecaaa0da426b3ef9cb03113))
* **Linear Node:** Fix issue with Issue States not loading correctly ([#5435](https://github.com/n8n-io/n8n/issues/5435)) ([57a2b9c](https://github.com/n8n-io/n8n/commit/57a2b9cceb52cbed905459e6ae92007e00a335cc))
* MySQL migration parses database contents if necessary (fix for MariaDB) ([#5441](https://github.com/n8n-io/n8n/issues/5441)) ([2eb72a6](https://github.com/n8n-io/n8n/commit/2eb72a6c9f447f77f78f6d0ab392ebec5515f58c))


### Features

* Change desktop UM experience ([#5312](https://github.com/n8n-io/n8n/issues/5312)) ([5e3e70b](https://github.com/n8n-io/n8n/commit/5e3e70b83bf905c39f23a213f953bc42d7eed357))
* **core:** Add support for WebSockets as an alternative to Server-Sent Events ([#5443](https://github.com/n8n-io/n8n/issues/5443)) ([538984d](https://github.com/n8n-io/n8n/commit/538984dc2f95fe2089f99deefcee3352e4ccd144))
* **Edit Image Node:** Allow WebP as an image format ([#5420](https://github.com/n8n-io/n8n/issues/5420)) ([94f2b2a](https://github.com/n8n-io/n8n/commit/94f2b2a26fca3987715e49352dd3e6f75b8bd6e2))
* **editor:** Add `Object` global completions ([#5407](https://github.com/n8n-io/n8n/issues/5407)) ([d7b3923](https://github.com/n8n-io/n8n/commit/d7b3923c2f5e02680170b132ba0e7cc59cb67cf6))
* **editor:** Bring completions to HTML editor ([#5382](https://github.com/n8n-io/n8n/issues/5382)) ([a07de04](https://github.com/n8n-io/n8n/commit/a07de049a2105e1c2f749958a281cedbf918c39a))
* **HubSpot Trigger Node:** Add conversation events ([#5408](https://github.com/n8n-io/n8n/issues/5408)) ([aeaa663](https://github.com/n8n-io/n8n/commit/aeaa6636201f0ad98603d1abd602bdf6072e8a11))



## [0.214.3](https://github.com/n8n-io/n8n/compare/n8n@0.214.2...n8n@0.214.3) (2023-02-09)

* **editor:** Prevent creation of input connections for nodes without input slot ([#5425](https://github.com/n8n-io/n8n/issues/5425)) ([b57ec1d](https://github.com/n8n-io/n8n/commit/b57ec1d6abbae9e23ae5f473d70674aa14701bce))


## [0.214.2](https://github.com/n8n-io/n8n/compare/n8n@0.214.1...n8n@0.214.2) (2023-02-06)


### Bug Fixes


* **editor:** Correctly show OAuth reconnect button ([#5384](https://github.com/n8n-io/n8n/issues/5384)) ([6482688](https://github.com/n8n-io/n8n/commit/6482688ee04621744451c67f6d6e3292e925bb8d))
* **editor:** Fix resolvable highlighting for HTML editor ([#5379](https://github.com/n8n-io/n8n/issues/5379)) ([31130d5](https://github.com/n8n-io/n8n/commit/31130d5257f253d9be21fe62d668231e27ecbd52))


## [0.214.1](https://github.com/n8n-io/n8n/compare/n8n@0.214.0...n8n@0.214.1) (2023-02-06)


### Bug Fixes

* **editor:** Fix mapping to empty expression input ([#5367](https://github.com/n8n-io/n8n/issues/5367)) ([e4458b4](https://github.com/n8n-io/n8n/commit/e4458b48e005667ae903ee6965e1a299546267f0))
* **editor:** Fix merge node connectors ([#5364](https://github.com/n8n-io/n8n/issues/5364)) ([20356ba](https://github.com/n8n-io/n8n/commit/20356ba8c80196f9562e073c1a55d55a4d6c37b0))
* **editor:** Fix multiple-output endpoints success style after connection is detached ([#5366](https://github.com/n8n-io/n8n/issues/5366)) ([9b628dd](https://github.com/n8n-io/n8n/commit/9b628ddc343f0a40c7ddaab93d5258ac949a4ea2))


### Features

* **Slack Node:** Revamp the node with more functionalities in a new version ([#4587](https://github.com/n8n-io/n8n/issues/4587)) ([4df6942](https://github.com/n8n-io/n8n/commit/4df69428f1e1e440aadddddb019cf559fd824a28))



# [0.214.0](https://github.com/n8n-io/n8n/compare/n8n@0.213.0...n8n@0.214.0) (2023-02-03)


### Bug Fixes

* Add paired item to the most used nodes ([#5220](https://github.com/n8n-io/n8n/issues/5220)) ([409a9ea](https://github.com/n8n-io/n8n/commit/409a9ea3573ded3156142c2662a501d7d6f5e475))
* **core:** Fix oauth2 client credentials not always working ([#5327](https://github.com/n8n-io/n8n/issues/5327)) ([ec7575b](https://github.com/n8n-io/n8n/commit/ec7575b0321edf6e21e5ba5fb4094e9a36e65571))
* **core:** Fix populating of node custom api call options ([#5347](https://github.com/n8n-io/n8n/issues/5347)) ([6985500](https://github.com/n8n-io/n8n/commit/6985500a7d14e21b629de0ee9e3006622e3774bc))
* **core:** Fix value resolution in declarative node design ([#5217](https://github.com/n8n-io/n8n/issues/5217)) ([b27a60b](https://github.com/n8n-io/n8n/commit/b27a60b66568c1cce00f38eec2dd1b6425a5a9c6))
* **core:** Prevent shared user details being saved alongside execution data ([#5334](https://github.com/n8n-io/n8n/issues/5334)) ([6ca49f9](https://github.com/n8n-io/n8n/commit/6ca49f9d5474d37281681ea571fa74e43828ca84))
* **core:** Revert custom API option injecting ([#5345](https://github.com/n8n-io/n8n/issues/5345)) ([6160741](https://github.com/n8n-io/n8n/commit/616074158c10a1928299d7213c58eeb076a664e1)), closes [#5303](https://github.com/n8n-io/n8n/issues/5303)
* **editor:** Add SMTP info translation link slot ([#5288](https://github.com/n8n-io/n8n/issues/5288)) ([c93664a](https://github.com/n8n-io/n8n/commit/c93664a57c6f252044264b09876e9b474740f6e8))
* **editor:** Change executions title to match menu ([#5349](https://github.com/n8n-io/n8n/issues/5349)) ([338b354](https://github.com/n8n-io/n8n/commit/338b354ef1600903833c9939a8618d1989534e0b))
* **editor:** Fix `json` field completions while typing ([#5309](https://github.com/n8n-io/n8n/issues/5309)) ([07b941a](https://github.com/n8n-io/n8n/commit/07b941a043f8aac761af63fd5327f45cbff7d275))
* **editor:** Handling router errors when navigation is canceled by user ([#5271](https://github.com/n8n-io/n8n/issues/5271)) ([911d656](https://github.com/n8n-io/n8n/commit/911d656f995a9a7f50db7e97ae25fcc3230ae4a5))
* **editor:** Set max width for executions list ([#5302](https://github.com/n8n-io/n8n/issues/5302)) ([52dea08](https://github.com/n8n-io/n8n/commit/52dea08003d314841d261533391e05d688dd1fe4))
* **editor:** Stop unsaved changes popup display when navigating away from an untouched workflow ([#5259](https://github.com/n8n-io/n8n/issues/5259)) ([6a93aed](https://github.com/n8n-io/n8n/commit/6a93aed3a2c428633fdf922df73203d3d41a7bb6))
* **editor:** Workflow executions view is broken ([#5341](https://github.com/n8n-io/n8n/issues/5341)) ([50cb757](https://github.com/n8n-io/n8n/commit/50cb75706b73c7349e48956a2e8556b0a2de1e24))
* **Invoice Ninja Node:** Fix line items not being correctly set for quotes and invoices ([#5304](https://github.com/n8n-io/n8n/issues/5304)) ([3b5e1d1](https://github.com/n8n-io/n8n/commit/3b5e1d127fe049934a0a32310ed408cd129b2d7d))
* **Linear Node:** Fix pagination issue for get all issues ([#5324](https://github.com/n8n-io/n8n/issues/5324)) ([f9ecc34](https://github.com/n8n-io/n8n/commit/f9ecc34b10544e787f7034e89068aa6c9356fa04))
* **Mailchimp Trigger Node:** Fix webhook recreation ([#5328](https://github.com/n8n-io/n8n/issues/5328)) ([8f5f1c3](https://github.com/n8n-io/n8n/commit/8f5f1c3aa520576215e16a8cc1a8beadae5f142a))
* Prevent unnecessarily touching updatedAt when n8n starts ([#5340](https://github.com/n8n-io/n8n/issues/5340)) ([b5154d9](https://github.com/n8n-io/n8n/commit/b5154d9be5e3adccbdcbb0ad748ed869ba75d4cc))
* **Schedule Trigger Node:** Change scheduler behaviour for intervals days and hours ([#5133](https://github.com/n8n-io/n8n/issues/5133)) ([78bbe2b](https://github.com/n8n-io/n8n/commit/78bbe2ba27990127b1b6a6333361f35e2d3e7a65))
* **Set Node:** Fix behaviour when selecting continueOnFail & PairedItem ([#5257](https://github.com/n8n-io/n8n/issues/5257)) ([a8637a0](https://github.com/n8n-io/n8n/commit/a8637a0bc6ac19859ce1ff468d0404ac73bc70bb))


### Features

* **core:** Export OpenAPI spec for external tools ([#5294](https://github.com/n8n-io/n8n/issues/5294)) ([5cb7e50](https://github.com/n8n-io/n8n/commit/5cb7e5007de7374f8ee6e6fbe1c5a8138af2d065))
* **core:** Fix populating of node custom api call options ([#5303](https://github.com/n8n-io/n8n/issues/5303)) ([e58bc41](https://github.com/n8n-io/n8n/commit/e58bc41d241b3f4a1701191f69e5eadad969bc5f))
* **core:** Set custom Cache-Control headers for static assets ([#5322](https://github.com/n8n-io/n8n/issues/5322)) ([ee210e8](https://github.com/n8n-io/n8n/commit/ee210e8507ce06f7052328f28ba14451f51b3db4))
* **core:** Simplify pagination in declarative node design ([#5161](https://github.com/n8n-io/n8n/issues/5161)) ([87ceb6f](https://github.com/n8n-io/n8n/commit/87ceb6f4b8ed1838b874639f176b421e0292b576))
* **editor:** Add mapping support for data paths ([#5191](https://github.com/n8n-io/n8n/issues/5191)) ([6092f6c](https://github.com/n8n-io/n8n/commit/6092f6c41ee28f3482675b940b1fdc600ae29971))
* **editor:** Adjust HTML editor component for use in params ([#5285](https://github.com/n8n-io/n8n/issues/5285)) ([8b09e98](https://github.com/n8n-io/n8n/commit/8b09e986542f00675197bc8e003c332e8926779f))
* **editor:** Append expressions in fixed values when mapping to string/json inputs ([#5300](https://github.com/n8n-io/n8n/issues/5300)) ([88c7ef2](https://github.com/n8n-io/n8n/commit/88c7ef29c84e0e9cfce32b97b8921bd5af38db02))
* **editor:** Completions for extensions in expression editor ([#5130](https://github.com/n8n-io/n8n/issues/5130)) ([6d811f0](https://github.com/n8n-io/n8n/commit/6d811f0d9f503905ed74938f97f193c7c3d8e7a2))
* **editor:** Continue to show mapping tooltip after dismiss ([#5289](https://github.com/n8n-io/n8n/issues/5289)) ([c6bc57b](https://github.com/n8n-io/n8n/commit/c6bc57b4cb1f7b647f167a7c18f6c6397e5d1c95))
* **editor:** Roll out schema view ([#5310](https://github.com/n8n-io/n8n/issues/5310)) ([2b1f151](https://github.com/n8n-io/n8n/commit/2b1f15150f5d069629ed34522be26f5503756614))
* **FTP Node:** Stream binary data for uploads and downloads ([#5296](https://github.com/n8n-io/n8n/issues/5296)) ([448c295](https://github.com/n8n-io/n8n/commit/448c295314b4e4842ff0352e03ba1f12025f47c9))
* **Notion Node:** Add image block ([#5237](https://github.com/n8n-io/n8n/issues/5237)) ([36b1e6e](https://github.com/n8n-io/n8n/commit/36b1e6ef1572aec4d905b29a999e4d5f4c72e826))
* **OpenAI Node:** Add frequency-penalty and presence-penalty ([#5137](https://github.com/n8n-io/n8n/issues/5137)) ([04c058a](https://github.com/n8n-io/n8n/commit/04c058a34e7c306141592691fa646ef6480bbc03))
* **Salesforce Node:** Add HasOptedOutOfEmail field to lead resource ([#5235](https://github.com/n8n-io/n8n/issues/5235)) ([59f290f](https://github.com/n8n-io/n8n/commit/59f290fe854767c6bf5c01ce9a0fb537297d82b2))
* **SSH Node:** Stream binary data for uploads and downloads ([#5305](https://github.com/n8n-io/n8n/issues/5305)) ([6f7421f](https://github.com/n8n-io/n8n/commit/6f7421f970b12e870c7d84b0f559b06678e3d42a))
* **Write Binary File Node:** Stream binary data for writes ([#5306](https://github.com/n8n-io/n8n/issues/5306)) ([d87ff13](https://github.com/n8n-io/n8n/commit/d87ff130a44d4542d1b068ed50c37071a14496b8))
* **YouTube Node:** Switch upload operation over to streaming and resumable uploads api ([#5320](https://github.com/n8n-io/n8n/issues/5320)) ([3bb1690](https://github.com/n8n-io/n8n/commit/3bb16900867b3994585eb2a62310e617f123c257))



# [0.213.0](https://github.com/n8n-io/n8n/compare/n8n@0.212.1...n8n@0.213.0) (2023-01-27)


### Bug Fixes

* **core:** Do not crash express app on unhandled rejected promises ([#5252](https://github.com/n8n-io/n8n/issues/5252)) ([7e229a3](https://github.com/n8n-io/n8n/commit/7e229a3d38990022172d4df98afd3dc31dca6e63))
* **core:** Handle missing binary metadata in download urls ([#5242](https://github.com/n8n-io/n8n/issues/5242)) ([21579a8](https://github.com/n8n-io/n8n/commit/21579a8a2af53f3fb4174afc2013cfad43511a31))
* **core:** Upsert credentials and workflows in the import: commands ([#5231](https://github.com/n8n-io/n8n/issues/5231)) ([259296c](https://github.com/n8n-io/n8n/commit/259296c5c940bd5dcebec5ad3c9acc99a7923b8f))
* **core:** Validate numeric IDs in the public API ([#5251](https://github.com/n8n-io/n8n/issues/5251)) ([68e4083](https://github.com/n8n-io/n8n/commit/68e4083bbdb8200966dc9e702bed9ca5cbc1cdf4))
* **editor:** Do not request workflow data twice when opening a workflow ([#5246](https://github.com/n8n-io/n8n/issues/5246)) ([901e94d](https://github.com/n8n-io/n8n/commit/901e94dc01c4b352301053990f197eda48c30b41))
* **editor:** Execution list micro optimization ([#5244](https://github.com/n8n-io/n8n/issues/5244)) ([a1710fb](https://github.com/n8n-io/n8n/commit/a1710fbd272a0f3980a8f323bbccf58806e9b900))
* **editor:** Fix node authentication options ordering and hiding options based on node version ([#5268](https://github.com/n8n-io/n8n/issues/5268)) ([7d74181](https://github.com/n8n-io/n8n/commit/7d7418140eb03da6014ff8ac51668fc427d10c33))
* **editor:** Fix save modal appearing after duplicating a workflow ([#5247](https://github.com/n8n-io/n8n/issues/5247)) ([c711c53](https://github.com/n8n-io/n8n/commit/c711c53ad6b044b8f90a237d6d8d1ce631359dc3))
* **editor:** Prevent workflow execution list infinite no network error ([#5230](https://github.com/n8n-io/n8n/issues/5230)) ([0d33329](https://github.com/n8n-io/n8n/commit/0d33329bc87b705760fdc70ccb39374cbd71f6f6))
* Extension being too eager and making calls when it shouldn't ([#5232](https://github.com/n8n-io/n8n/issues/5232)) ([09bdd96](https://github.com/n8n-io/n8n/commit/09bdd96d290166cced6faf5da4dda83d6d270aa3))
* **Google Drive Node:** Use the correct mimetype on converted downloads ([#5240](https://github.com/n8n-io/n8n/issues/5240)) ([58d0890](https://github.com/n8n-io/n8n/commit/58d0890dc319c918183fd81999dc87ea9c4732fd))
* **HelpScout Node:** Fix tag search not working when getting all conversations ([#5239](https://github.com/n8n-io/n8n/issues/5239)) ([6d36782](https://github.com/n8n-io/n8n/commit/6d36782463cda1d211270ecf9bd1a8cccca22cdc))
* **Notion (Beta) Node:** Fix create database page with multiple relation IDs not working ([#5260](https://github.com/n8n-io/n8n/issues/5260)) ([8ce85e3](https://github.com/n8n-io/n8n/commit/8ce85e37592da061164db18af52852e8ed1d2046))


### Features

* **core:** Add LDAP support ([#3835](https://github.com/n8n-io/n8n/issues/3835)) ([0c70a40](https://github.com/n8n-io/n8n/commit/0c70a4031702d3c770968d5679d2900def7225a8))
* **editor:** Adjust Google sign-in button to adhere to the guidelines ([#5248](https://github.com/n8n-io/n8n/issues/5248)) ([73cbddc](https://github.com/n8n-io/n8n/commit/73cbddcb2dc046f1795740a5dd2258577df4d049))
* **editor:** Simplify NDV by moving authentication details to credentials modal ([#5067](https://github.com/n8n-io/n8n/issues/5067)) ([b321c5e](https://github.com/n8n-io/n8n/commit/b321c5e4ec5aefa605991861db68efc860e0f122))
* **GitLab Node:** Add file operations (create, delete, edit, get, list) ([#5167](https://github.com/n8n-io/n8n/issues/5167)) ([cedf2e0](https://github.com/n8n-io/n8n/commit/cedf2e012c7309cd225f9810d30315c851bcab3a))
* HTML node ([#5107](https://github.com/n8n-io/n8n/issues/5107)) ([74e6f5d](https://github.com/n8n-io/n8n/commit/74e6f5d190d010831fc2ef98afdd9dff3dc93b3c))
* Improve workflow list performance using RecycleScroller and on-demand sharing data loading ([#5181](https://github.com/n8n-io/n8n/issues/5181)) ([874c735](https://github.com/n8n-io/n8n/commit/874c735d0af81c3c81cf82fb9bdf1232608d6400)), closes [#5125](https://github.com/n8n-io/n8n/issues/5125)
* **Jira Software Node:** Use resource locator component ([#5090](https://github.com/n8n-io/n8n/issues/5090)) ([237b1d8](https://github.com/n8n-io/n8n/commit/237b1d8614ffd19215eaee6a0cb9422a16cf0a5c))
* **Send Email Node:** Overhaul ([832fb87](https://github.com/n8n-io/n8n/commit/832fb87954d480ed46913c8b0f8067c96db28aab))



## [0.212.1](https://github.com/n8n-io/n8n/compare/n8n@0.212.0...n8n@0.212.1) (2023-01-23)

### Bug Fixes

- Add schema to postgres migrations (hotfix) ([#5218](https://github.com/n8n-io/n8n/issues/5218)) ([c5245dd](https://github.com/n8n-io/n8n/commit/c5245dd387f8829210a922223e46df7f275e79ca))
- **core:** Fix execute-once incoming data handling ([#5211](https://github.com/n8n-io/n8n/issues/5211)) ([3ea83d8](https://github.com/n8n-io/n8n/commit/3ea83d872ee2f8326fc9cb898fdb05bbe3b827bf))
- **core:** Fix expression extension misdetection ([#5219](https://github.com/n8n-io/n8n/issues/5219)) ([0b123ce](https://github.com/n8n-io/n8n/commit/0b123ce05e14a996f74ed4fe16008edca836d099))
- **core:** Fix onWorkflowPostExecute not being called ([#5224](https://github.com/n8n-io/n8n/issues/5224)) ([4f89fb4](https://github.com/n8n-io/n8n/commit/4f89fb4d4d663a0a39081ceda9d6e88e6c605859))
- **core:** Fix url in error handelling for the error Trigger ([#5201](https://github.com/n8n-io/n8n/issues/5201)) ([6e39175](https://github.com/n8n-io/n8n/commit/6e391755e47efc8a10529b24dee5e90c466b20b9))
- **core:** Make pindata with webhook responding on last node manual-only ([#5223](https://github.com/n8n-io/n8n/issues/5223)) ([fcbf4fd](https://github.com/n8n-io/n8n/commit/fcbf4fd587c0c8721f58b09edc68fe140acaf9f6))
- **editor:** Making parameter input components label configurable ([#5195](https://github.com/n8n-io/n8n/issues/5195)) ([9ce526e](https://github.com/n8n-io/n8n/commit/9ce526e784a6e61ed0f5b0a9ddb9d4ea21584ab2))
- **editor:** Remove infinite loading in not found workflow level execution ([#5174](https://github.com/n8n-io/n8n/issues/5174)) ([96dddf1](https://github.com/n8n-io/n8n/commit/96dddf12e1561935fa191e55baa950c207796e83))
- **Linear Node:** Fix issue with single item not being returned ([#5193](https://github.com/n8n-io/n8n/issues/5193)) ([e810966](https://github.com/n8n-io/n8n/commit/e810966a3b00e7a581120df2b22d71026e9ba4cb))
- **Notion (Beta) Node:** Fix create database page fails if relation param is empty/undefined ([#5182](https://github.com/n8n-io/n8n/issues/5182)) ([11da863](https://github.com/n8n-io/n8n/commit/11da863a2104259248b67edfff7bee3e18b3789a))

### Features

- **Google Analytics Node:** Overhaul for google analytics node ([736e700](https://github.com/n8n-io/n8n/commit/736e700902d333df55abff86c15c688de15c9bde))

# [0.212.0](https://github.com/n8n-io/n8n/compare/n8n@0.211.2...n8n@0.212.0) (2023-01-19)

### Bug Fixes

- **core:** Revert rule @typescript-eslint/prefer-nullish-coalescing ([e667df7](https://github.com/n8n-io/n8n/commit/e667df783c8c396fc40ff14de704b1e0def4a699))
- **editor:** Allow special chars in node selector completion ([#5196](https://github.com/n8n-io/n8n/issues/5196)) ([b718464](https://github.com/n8n-io/n8n/commit/b718464b1f28e52ffb0b12e4b927d8fe3678d02a))
- **GitLab Node:** Update credential test endpoint ([#5166](https://github.com/n8n-io/n8n/issues/5166)) ([e275306](https://github.com/n8n-io/n8n/commit/e275306c64a410c154e586532e35d25a583f75b4))
- **Gmail Trigger Node:** Filter by labels not working ([#5173](https://github.com/n8n-io/n8n/issues/5173)) ([026f3a5](https://github.com/n8n-io/n8n/commit/026f3a532d30dcf79b76c9f9cff709e6af0eb9ee))
- **HTTP Request Node:** Bug - node requires string instead of json ([8f49f49](https://github.com/n8n-io/n8n/commit/8f49f494ae66ce933f0fce3c3b43ce99baa1b728))
- **HTTP Request Node:** Response format to text is ignored for JSON responses ([8dbe615](https://github.com/n8n-io/n8n/commit/8dbe6159d04c963e7858d31d64721ddc0911ea36))

### Features

- **core:** Add Prometheus metrics for n8n events and api invocations (experimental) ([#5177](https://github.com/n8n-io/n8n/issues/5177)) ([9b032d6](https://github.com/n8n-io/n8n/commit/9b032d68bc8a7a45aae73e9442315e872902d50a)), closes [#5187](https://github.com/n8n-io/n8n/issues/5187)
- **Item Lists Node:** Table tranformation ([5426690](https://github.com/n8n-io/n8n/commit/5426690791ead70085681ef31f229fbe15c7d656))

## [0.211.2](https://github.com/n8n-io/n8n/compare/n8n@0.211.1...n8n@0.211.2) (2023-01-17)

### Bug Fixes

- **core:** Restore community nodes installation ([#5180](https://github.com/n8n-io/n8n/issues/5180)) ([c0268f5](https://github.com/n8n-io/n8n/commit/c0268f572fed4953354123da90f780612c7651ee))

### Features

- (Google Sheets Trigger Node): Trigger for Google Sheets ([e839a81](https://github.com/n8n-io/n8n/commit/e839a81cc5f31eb622915749f9e598f248e407d7))

## [0.211.1](https://github.com/n8n-io/n8n/compare/n8n@0.211.0...n8n@0.211.1) (2023-01-16)

### Bug Fixes

- Build `cli` to fix Postgres and MySQL test runs ([#5171](https://github.com/n8n-io/n8n/issues/5171)) ([a0c5232](https://github.com/n8n-io/n8n/commit/a0c5232aa53b13e581b5da4b6f984f5d7893fe33))
- Extend date functions clobbering plus/minus ([#5170](https://github.com/n8n-io/n8n/issues/5170)) ([f634f0d](https://github.com/n8n-io/n8n/commit/f634f0dc59389a8c7ecd4154d2cf9af495b129aa))
- Extension deep compare not quite working for some primitives ([#5172](https://github.com/n8n-io/n8n/issues/5172)) ([98017dc](https://github.com/n8n-io/n8n/commit/98017dc36f3e2fc3d2a5178fb7259205504e5582))
- Upgrade `jsonwebtoken` to address CVE-2022-23540 ([#5116](https://github.com/n8n-io/n8n/issues/5116)) ([97969fc](https://github.com/n8n-io/n8n/commit/97969fc81581379d2a3c49d839206cc9b9e05d9d))

### Features

- **editor:** Supress validation errors for freshly added nodes ([#5149](https://github.com/n8n-io/n8n/issues/5149)) ([582865c](https://github.com/n8n-io/n8n/commit/582865c7e9eff99eabb36636ca7af2d2b2e76af8))
- **Google Ads Node:** Update api version to v11 ([#4427](https://github.com/n8n-io/n8n/issues/4427)) ([dfff982](https://github.com/n8n-io/n8n/commit/dfff982662b7cee5c0203764a59d2355a02a9030))
- **Google Drive Trigger Node:** Use resource locator component ([#5148](https://github.com/n8n-io/n8n/issues/5148)) ([9958c32](https://github.com/n8n-io/n8n/commit/9958c324dbf88f25efd34433ce51af9e3aa44ae3))

# [0.211.0](https://github.com/n8n-io/n8n/compare/n8n@0.210.2...n8n@0.211.0) (2023-01-13)

### Bug Fixes

- **core:** Fixes event msg confirmations if no subscribers present ([#5118](https://github.com/n8n-io/n8n/issues/5118)) ([62d06b1](https://github.com/n8n-io/n8n/commit/62d06b1e6edb8a8a6dfb4c57de6ef3e095e6301c))
- **core:** Remove threads pkg, rewrite log writer worker ([#5134](https://github.com/n8n-io/n8n/issues/5134)) ([e845eb3](https://github.com/n8n-io/n8n/commit/e845eb33f9d0881ae5c8a26d4eab4f2109373ff5))
- **core:** Throw error in UI on expression referencing missing node but do not fail execution ([#5158](https://github.com/n8n-io/n8n/issues/5158)) ([c9e158e](https://github.com/n8n-io/n8n/commit/c9e158e45848ee94b04f49694a552f9f272a97dd))
- DB revert command shouldn't run full migrations before each revert ([#5131](https://github.com/n8n-io/n8n/issues/5131)) ([a9fb393](https://github.com/n8n-io/n8n/commit/a9fb393e1a260a2dc26ef0f759f541fcde1c722f))
- **editor:** Disable data pinning on multiple output node types ([#5111](https://github.com/n8n-io/n8n/issues/5111)) ([56951e8](https://github.com/n8n-io/n8n/commit/56951e83c0fb03a24ddb4cd0b1705e22165b8692))
- **editor:** Do not overwrite window.onerror in production ([#5135](https://github.com/n8n-io/n8n/issues/5135)) ([0dbba6d](https://github.com/n8n-io/n8n/commit/0dbba6d57f34b67935867bd81359fb833654fce1))
- **editor:** Execution page bug fixes ([#5122](https://github.com/n8n-io/n8n/issues/5122)) ([665eaef](https://github.com/n8n-io/n8n/commit/665eaef925d2e311377ecb09859f69f5fddc54b5))
- **editor:** Fixes event bus test ([#5119](https://github.com/n8n-io/n8n/issues/5119)) ([871a1d7](https://github.com/n8n-io/n8n/commit/871a1d7dad839b080df3a27fb68ea90033562f3f))
- **editor:** Hide data pinning discoverability tooltip in execution view ([#5145](https://github.com/n8n-io/n8n/issues/5145)) ([d10ca53](https://github.com/n8n-io/n8n/commit/d10ca530cff1580c20670dd68dfd7937e1a78d74))
- **editor:** Mapping tooltip dismiss ([#5128](https://github.com/n8n-io/n8n/issues/5128)) ([6deb551](https://github.com/n8n-io/n8n/commit/6deb55126e9f493de4717018a3587088f1d5ab41))
- **editor:** Recover from unsaved finished execution ([#5121](https://github.com/n8n-io/n8n/issues/5121)) ([af55ecd](https://github.com/n8n-io/n8n/commit/af55ecd64b1d4948fc08d7d32900fa9d57ef299b))
- **editor:** Setting NDV session ID ([#5144](https://github.com/n8n-io/n8n/issues/5144)) ([c724de6](https://github.com/n8n-io/n8n/commit/c724de6be2e33fe824c42c0ab8242caa9f1133f3))
- First/last being extended on proxy objects ([#5140](https://github.com/n8n-io/n8n/issues/5140)) ([9dca984](https://github.com/n8n-io/n8n/commit/9dca984c0ce68dd9c1ab14a6454c356dddf8287f))
- Handle memory issues gracefully ([#5147](https://github.com/n8n-io/n8n/issues/5147)) ([1445424](https://github.com/n8n-io/n8n/commit/14454243e7e0b40fc766cdb05c6b34756fb59109))
- **PayPal Trigger Node:** Omit verification on sandbox env ([#5150](https://github.com/n8n-io/n8n/issues/5150)) ([e140ecb](https://github.com/n8n-io/n8n/commit/e140ecbc2c6a07b96df3d048eb138dd34b25d2ce))
- Report app startup and DB migration errors to Sentry ([#5127](https://github.com/n8n-io/n8n/issues/5127)) ([a573db2](https://github.com/n8n-io/n8n/commit/a573db2ef78024a4254ff0f468dc47b12148aa28))
- Run every DB migration inside a transaction ([#5129](https://github.com/n8n-io/n8n/issues/5129)) ([62cce2e](https://github.com/n8n-io/n8n/commit/62cce2e518451f6057e316208828539f26868c18))
- Upgrade `class-validator` to address CVE-2019-18413 ([#5139](https://github.com/n8n-io/n8n/issues/5139)) ([14a61f6](https://github.com/n8n-io/n8n/commit/14a61f6ab1f0289e1b96480e3d557d14dd8178d8))
- **Zoom Node:** Add notice about deprecation of Zoom JWT app support ([#5156](https://github.com/n8n-io/n8n/issues/5156)) ([146bc3b](https://github.com/n8n-io/n8n/commit/146bc3bff503be70abaad94418535f23ff8fc511))

### Features

- Add demo experiment to help users activate ([#5141](https://github.com/n8n-io/n8n/issues/5141)) ([c2eb519](https://github.com/n8n-io/n8n/commit/c2eb519398067e799e73b6c3059f57f3deca172a))
- **editor:** Executions page ([#4997](https://github.com/n8n-io/n8n/issues/4997)) ([819c4ad](https://github.com/n8n-io/n8n/commit/819c4adb3cd79c1743debd97c21fc60a2a703534))
- **editor:** Remove prevent-ndv-auto-open feature flag ([#5114](https://github.com/n8n-io/n8n/issues/5114)) ([ab4785a](https://github.com/n8n-io/n8n/commit/ab4785ab31da061df13a6b37fe8790ddc30e3ed0))
- **editor:** Update callout component design ([#5126](https://github.com/n8n-io/n8n/issues/5126)) ([d2d481f](https://github.com/n8n-io/n8n/commit/d2d481f12e1777a60ee5411c8cdac50b1dfc3ee3))
- Expression extension framework ([#4372](https://github.com/n8n-io/n8n/issues/4372)) ([3d05acf](https://github.com/n8n-io/n8n/commit/3d05acf3130cce2c5b5155d91faa22b707ce2373)), closes [#4045](https://github.com/n8n-io/n8n/issues/4045) [#4044](https://github.com/n8n-io/n8n/issues/4044) [#4046](https://github.com/n8n-io/n8n/issues/4046)

## [0.210.2](https://github.com/n8n-io/n8n/compare/n8n@0.210.1...n8n@0.210.2) (2023-01-09)

### Bug Fixes

- **core:** Fix crash of manual workflow executions for unsaved workflows ([#5106](https://github.com/n8n-io/n8n/issues/5106)) ([a43e3e4](https://github.com/n8n-io/n8n/commit/a43e3e4112f1b9ef68ed963c41142fd591916d69))
- **editor:** Omit `pairedItem` from proxy completions ([#5098](https://github.com/n8n-io/n8n/issues/5098)) ([320e646](https://github.com/n8n-io/n8n/commit/320e646380395af00b8b73445af045f9b6315dc4))
- **editor:** Prevent refresh on submit in credential edit modal ([#5091](https://github.com/n8n-io/n8n/issues/5091)) ([9e7a9bf](https://github.com/n8n-io/n8n/commit/9e7a9bfe2096b880e265700437b76e51d9be545f))
- **Google Sheets Node:** Fix for auto-range detection ([77031a2](https://github.com/n8n-io/n8n/commit/77031a295059938c9bf1fdf549b7ffcb6746db17))
- **Read Binary File Node:** Do not crash the execution when the source file does not exist ([#5100](https://github.com/n8n-io/n8n/issues/5100)) ([c97f3ca](https://github.com/n8n-io/n8n/commit/c97f3cad596e26ff7dbd0e51fc5cfeb508d2c198))
- Remove anonymous ID from tracking calls ([#5099](https://github.com/n8n-io/n8n/issues/5099)) ([6d0f2bf](https://github.com/n8n-io/n8n/commit/6d0f2bff7f45ab27d76c34e5d4062df5d711331c))
- Stop OOM crashes in Execution Data pruning ([#5095](https://github.com/n8n-io/n8n/issues/5095)) ([c4df204](https://github.com/n8n-io/n8n/commit/c4df2049a8f8c5e9cbc69f634b0a5747e0677376))
- Update links for user management and SMTP help ([#5109](https://github.com/n8n-io/n8n/issues/5109)) ([47e32e4](https://github.com/n8n-io/n8n/commit/47e32e42682b2d6791157fdb11e5513381bd7452))

### Features

- **editor:** Introduce proxy completions to expressions ([#5075](https://github.com/n8n-io/n8n/issues/5075)) ([f4140d0](https://github.com/n8n-io/n8n/commit/f4140d011fa3b748a89122cd41c9628dd5313efd))

## [0.210.1](https://github.com/n8n-io/n8n/compare/n8n@0.210.0...n8n@0.210.1) (2023-01-05)

### Bug Fixes

- **Google Sheets Node:** Append or Update fails for numeric values ([b5e70d4](https://github.com/n8n-io/n8n/commit/b5e70d45bf5155bafe258dcf04609e6f71c5356d))
- Fix external hooks ([#5094](https://github.com/n8n-io/n8n/issues/5094)) ([d77523b](https://github.com/n8n-io/n8n/commit/d77523bd31884c4493079ee0b0dea8c66e642a95))

### Features

- Add user management invite links without SMTP set up ([#5084](https://github.com/n8n-io/n8n/issues/5084)) ([2327563](https://github.com/n8n-io/n8n/commit/2327563c441634bc6c127f2fe58792657fa7d114)), closes [#5079](https://github.com/n8n-io/n8n/issues/5079) [#5085](https://github.com/n8n-io/n8n/issues/5085)

# [0.210.0](https://github.com/n8n-io/n8n/compare/n8n@0.209.4...n8n@0.210.0) (2023-01-05)

### Bug Fixes

- Apply credential overwrites recursively ([#5072](https://github.com/n8n-io/n8n/issues/5072)) ([5d746c4](https://github.com/n8n-io/n8n/commit/5d746c4a8341e2538caa140bedfa269a5babb8db))
- **core:** Fix full manual execution for error trigger as starter of 2+ node workflow ([#5055](https://github.com/n8n-io/n8n/issues/5055)) ([a7868ae](https://github.com/n8n-io/n8n/commit/a7868ae77d070226a7c52de5a445b03e1455fbc7))
- **core:** Fix OAuth credential creation via API ([#5064](https://github.com/n8n-io/n8n/issues/5064)) ([93da026](https://github.com/n8n-io/n8n/commit/93da026c0d2a6f3738d9e1a3b450ad802ff15826))
- **core:** Fixes issue with workflow lastUpdated field ([#5015](https://github.com/n8n-io/n8n/issues/5015)) ([59004fe](https://github.com/n8n-io/n8n/commit/59004fe7bb1e821444a029c2fd3fb3f0e6a59733))
- **editor:** Clear node creator and scrim on workspace reset ([#5066](https://github.com/n8n-io/n8n/issues/5066)) ([43304b0](https://github.com/n8n-io/n8n/commit/43304b069168ef4ca6bb345eebf01d5f9ff9cb0f))
- **editor:** Fix an infinite loop while loading executions that are not on the current executions list ([#5071](https://github.com/n8n-io/n8n/issues/5071)) ([8cf3c86](https://github.com/n8n-io/n8n/commit/8cf3c868609447df20876d5ef5f25575bbe9da9b))
- **editor:** Make node title non-editable in executions view ([#5046](https://github.com/n8n-io/n8n/issues/5046)) ([2f40a7f](https://github.com/n8n-io/n8n/commit/2f40a7f98a4cea990d6c57cba8efa6fbd9c622e3))
- **editor:** Prevent scrim on executable triggers ([#5068](https://github.com/n8n-io/n8n/issues/5068)) ([e1f9349](https://github.com/n8n-io/n8n/commit/e1f9349c192fef03f31c5d09a1a9d38b50a6fe99))
- **editor:** Support tabbing away from inline expression editor ([#5056](https://github.com/n8n-io/n8n/issues/5056)) ([a2ab78f](https://github.com/n8n-io/n8n/commit/a2ab78f9274427c57db1c59d80d1ef6474879a6a))
- Fix executions bulk deletion ([#5074](https://github.com/n8n-io/n8n/issues/5074)) ([3754c5c](https://github.com/n8n-io/n8n/commit/3754c5c734814ed310eb08a6b69a38c632246696))
- **Google Sheets Node:** Fix exception when no Values to Send are set ([f1184cc](https://github.com/n8n-io/n8n/commit/f1184ccab5dd7f0f7a80a5f39cf4f7bdb387f7ae))
- **Respond to Webhook Node:** Fix issue that content-type header gets overwritten ([#5088](https://github.com/n8n-io/n8n/issues/5088)) ([7954025](https://github.com/n8n-io/n8n/commit/7954025eb2091d70479585fa90efbf9af4db2ae0))
- **Slack Node:** Add missing channels:read OAuth2 scope ([#5092](https://github.com/n8n-io/n8n/issues/5092)) ([62b2fc3](https://github.com/n8n-io/n8n/commit/62b2fc37c343b09e0e9caae49de11bee2e9dbd9b))

### Features

- Add global event bus ([#4860](https://github.com/n8n-io/n8n/issues/4860)) ([b67f803](https://github.com/n8n-io/n8n/commit/b67f803cbee04dd94caee2e80f12a3af810a3984))
- **Compare Datasets Node:** Fuzzy compare option ([9615253](https://github.com/n8n-io/n8n/commit/9615253155bec6b57344d790681c8a598fbc21c0))
- **core:** Add compatibility to redis > 6 ACLs system using username in queue-mode ([#5048](https://github.com/n8n-io/n8n/issues/5048)) ([0ec66bf](https://github.com/n8n-io/n8n/commit/0ec66bfb421c4eb3c6e92144c7563d8d3ea4ac69))
- **core:** Security audit ([#5034](https://github.com/n8n-io/n8n/issues/5034)) ([d548161](https://github.com/n8n-io/n8n/commit/d5481616326b304a76937b104d24326a93f6f565))
- **editor:** Add SSO fakedoor feature ([#5076](https://github.com/n8n-io/n8n/issues/5076)) ([8e8df6d](https://github.com/n8n-io/n8n/commit/8e8df6d6116bb22f372bf4b50511860cacb0e2e0))

### Performance Improvements

- Lazy-load public-api dependencies to reduce baseline memory usage ([#5049](https://github.com/n8n-io/n8n/issues/5049)) ([a455cce](https://github.com/n8n-io/n8n/commit/a455cce7e6cc511360a9d6f9113b5a6d18e06dba))
- Lazy-load queue-mode and analytics dependencies ([#5061](https://github.com/n8n-io/n8n/issues/5061)) ([b828cb3](https://github.com/n8n-io/n8n/commit/b828cb31d621f20b6c9612a2ac79f48e6337e528))

## [0.209.4](https://github.com/n8n-io/n8n/compare/n8n@0.209.3...n8n@0.209.4) (2022-12-28)

### Bug Fixes

- **editor:** Add sticky note without manual trigger ([#5039](https://github.com/n8n-io/n8n/issues/5039)) ([18140e0](https://github.com/n8n-io/n8n/commit/18140e059bd95d51ad24a4ef4d6e6c72ce3137f3))
- **editor:** Display default missing value in table view as `undefined` ([#5038](https://github.com/n8n-io/n8n/issues/5038)) ([33d7a13](https://github.com/n8n-io/n8n/commit/33d7a13e73dffc72b1a9aa4cf603e7758c65e40c))
- **editor:** Fix displaying of some trigger nodes in the creator panel ([#5040](https://github.com/n8n-io/n8n/issues/5040)) ([4daf905](https://github.com/n8n-io/n8n/commit/4daf905ce264f6f76045a508e2f9ed849f2b1f5e))
- **editor:** Fix trigger node type identification on add to canvas ([#5043](https://github.com/n8n-io/n8n/issues/5043)) ([2aba0c6](https://github.com/n8n-io/n8n/commit/2aba0c6d47d6d87038db6877a29e15ed079d712b))
- **editor:** Usage and plans page on Desktop ([#5045](https://github.com/n8n-io/n8n/issues/5045)) ([26e2321](https://github.com/n8n-io/n8n/commit/26e2321a710d7b42559492a6605cef3a248d918e))

### Features

- **editor:** Switch to expression on `=` input ([#5044](https://github.com/n8n-io/n8n/issues/5044)) ([16bd761](https://github.com/n8n-io/n8n/commit/16bd7610fc337fa5ba9b0088b91396bb13570bcb))

## [0.209.3](https://github.com/n8n-io/n8n/compare/n8n@0.209.2...n8n@0.209.3) (2022-12-27)

### Bug Fixes

- **core:** Do not send credentials to browser console ([#5031](https://github.com/n8n-io/n8n/issues/5031)) ([afc5297](https://github.com/n8n-io/n8n/commit/afc529799d5049e1ccaf249d191dce7ff237ee96))
- **core:** Non owner should be permitted to use their own credentials ([#5036](https://github.com/n8n-io/n8n/issues/5036)) ([6efbac3](https://github.com/n8n-io/n8n/commit/6efbac307fb7b0e8436ad1dbd8662b8d1a2167f6))
- **editor:** Fix for loading executions that are not on the current executions list ([#5035](https://github.com/n8n-io/n8n/issues/5035)) ([d0865e2](https://github.com/n8n-io/n8n/commit/d0865e28ffe78ce5ec201dab12b634cbdafcb4e8))
- **editor:** Transparentize tertiary button on Usage page ([#5033](https://github.com/n8n-io/n8n/issues/5033)) ([d6bc760](https://github.com/n8n-io/n8n/commit/d6bc760ab4b003d6233df8428f373b4c8f760a7c))
- **editor:** Update credential owner warning when sharing ([#5029](https://github.com/n8n-io/n8n/issues/5029)) ([a8f4efa](https://github.com/n8n-io/n8n/commit/a8f4efaf3ebc349c6ee073200e19ac57eb961ce9))

### Features

- **core:** Implement webhook-only manual execution ([#4960](https://github.com/n8n-io/n8n/issues/4960)) ([d113977](https://github.com/n8n-io/n8n/commit/d113977b10ffe1db879e7fa0807da8147e52ca5d))
- **editor:** Improve UX for brace completion from selection ([#5024](https://github.com/n8n-io/n8n/issues/5024)) ([52077e2](https://github.com/n8n-io/n8n/commit/52077e2c45fca3d5830a39ca3416b073f783fbf5))

## [0.209.2](https://github.com/n8n-io/n8n/compare/n8n@0.209.1...n8n@0.209.2) (2022-12-23)

### Bug Fixes

- **editor:** Ensure full tree on expression editor parse ([#5027](https://github.com/n8n-io/n8n/issues/5027)) ([47854eb](https://github.com/n8n-io/n8n/commit/47854ebc36c115110bd3cc65b3f1fd95a89fdb9d))
- Fix automatic credential selection when credentials are shared ([#5020](https://github.com/n8n-io/n8n/issues/5020)) ([6a8448d](https://github.com/n8n-io/n8n/commit/6a8448da5fceae393a31f222981a33263de72c1a))

### Performance Improvements

- Improve workflows list performance ([#5021](https://github.com/n8n-io/n8n/issues/5021)) ([bb0eeda](https://github.com/n8n-io/n8n/commit/bb0eedada9afcae589c968ffcb583fae7b6e1959))

## [0.209.1](https://github.com/n8n-io/n8n/compare/n8n@0.209.0...n8n@0.209.1) (2022-12-22)

### Bug Fixes

- **AWS DynamoDB Node:** Fix issue pagination and simplify issue [#4956](https://github.com/n8n-io/n8n/issues/4956) [#4957](https://github.com/n8n-io/n8n/issues/4957) ([#4959](https://github.com/n8n-io/n8n/issues/4959)) ([a43ea17](https://github.com/n8n-io/n8n/commit/a43ea177ebcc983ccc440662f397bf8b1698b4df))
- DynamoDB node type issues ([#5002](https://github.com/n8n-io/n8n/issues/5002)) ([9568b74](https://github.com/n8n-io/n8n/commit/9568b747c74cd72fb7629e95a7555878b4ac4afb))
- **editor:** Fix for executions preview scroll load and wrong execution displayed ([#4994](https://github.com/n8n-io/n8n/issues/4994)) ([bd0c2af](https://github.com/n8n-io/n8n/commit/bd0c2afaac37194efec8872f9fdb0a37a3f74c40))
- **editor:** Force parse on long expressions ([#5009](https://github.com/n8n-io/n8n/issues/5009)) ([22fcc8f](https://github.com/n8n-io/n8n/commit/22fcc8f2be64fb381a64f12485d81b598ef406e5))
- Issue with credentials and workflows not being matched correctly due to incorrect typing ([#5011](https://github.com/n8n-io/n8n/issues/5011)) ([746e848](https://github.com/n8n-io/n8n/commit/746e8487d250d77d91dabd8463f869a3e96d0fc2))
- Restore missing tags in workflow retrieve ([#5004](https://github.com/n8n-io/n8n/issues/5004)) ([87d8865](https://github.com/n8n-io/n8n/commit/87d8865ad38e1e5b4a3bca7d807536975116ba82))
- Show trigger actions again in nodes panel ([#5016](https://github.com/n8n-io/n8n/issues/5016)) ([e7cb190](https://github.com/n8n-io/n8n/commit/e7cb1907cdf90e9497c24f39f3e9b53e5470762c)), closes [#4976](https://github.com/n8n-io/n8n/issues/4976)

# [0.209.0](https://github.com/n8n-io/n8n/compare/n8n@0.208.1...n8n@0.209.0) (2022-12-21)

### Bug Fixes

- **editor:** Correctly display trigger nodes without actions and with related regular node in the "On App Events" category ([#4976](https://github.com/n8n-io/n8n/issues/4976)) ([445463a](https://github.com/n8n-io/n8n/commit/445463a605f5f327f897b23a9b4504939358d0df))
- Fix stickies resize ([#4986](https://github.com/n8n-io/n8n/issues/4986)) ([82f7635](https://github.com/n8n-io/n8n/commit/82f763589b21815e5ba91c10a4676d25f843eddd))
- Hide trigger tooltip for nodes with static test output ([#4970](https://github.com/n8n-io/n8n/issues/4970)) ([5b11dc3](https://github.com/n8n-io/n8n/commit/5b11dc3ff9ff75eb7c65721e0d6c03707039e7ff))
- Keep expression when dropping mapped value ([#4981](https://github.com/n8n-io/n8n/issues/4981)) ([87c7643](https://github.com/n8n-io/n8n/commit/87c76434a294f10474711ba3f023f2f4ca47f14d))
- Prevent keyboard shortcuts in expression editor modal ([#4984](https://github.com/n8n-io/n8n/issues/4984)) ([29364ea](https://github.com/n8n-io/n8n/commit/29364ea7026e5e2a288b1866956f01e380ff05a0))
- Redirect home to workflows always ([#4968](https://github.com/n8n-io/n8n/issues/4968)) ([90bfdfd](https://github.com/n8n-io/n8n/commit/90bfdfd577c02aee520545cf8758019042cdf99c))
- Update mapping gifs ([#4982](https://github.com/n8n-io/n8n/issues/4982)) ([9d00b47](https://github.com/n8n-io/n8n/commit/9d00b4748b39f5c2b08721c5ee73e47b43230b9d))
- Upgrade amqplib to address CVE-2022-0686 ([#4972](https://github.com/n8n-io/n8n/issues/4972)) ([570ed3b](https://github.com/n8n-io/n8n/commit/570ed3b52191cf3a162fcdaaabc8ab15fb0ef08c))
- View option for binary-data shouldn't download the file on Chrome/Edge ([#4995](https://github.com/n8n-io/n8n/issues/4995)) ([e225c31](https://github.com/n8n-io/n8n/commit/e225c3190ea4cb5f68f642aab455ed0044fdecf9))

### Features

- **editor:** Add usage and plan pages ([#4819](https://github.com/n8n-io/n8n/issues/4819)) ([0da338f](https://github.com/n8n-io/n8n/commit/0da338f9b5f850b25e97383ae1f4cec8d0e4c17b)), closes [#4793](https://github.com/n8n-io/n8n/issues/4793) [#4842](https://github.com/n8n-io/n8n/issues/4842) [#4866](https://github.com/n8n-io/n8n/issues/4866) [#4875](https://github.com/n8n-io/n8n/issues/4875) [#4958](https://github.com/n8n-io/n8n/issues/4958) [#4979](https://github.com/n8n-io/n8n/issues/4979)
- Update mapping pill for table/json views ([#4965](https://github.com/n8n-io/n8n/issues/4965)) ([343f53b](https://github.com/n8n-io/n8n/commit/343f53bf5393e86eb850d07de85b762476294656))

## [0.208.1](https://github.com/n8n-io/n8n/compare/n8n@0.208.0...n8n@0.208.1) (2022-12-19)

### Bug Fixes

- Always retain original errors in the error chain on NodeOperationError ([#4951](https://github.com/n8n-io/n8n/issues/4951)) ([231257d](https://github.com/n8n-io/n8n/commit/231257d0817df711cf900703fd686efb8307eeb2))
- BinaryDataManager should store metadata when saving from buffer as well ([#4964](https://github.com/n8n-io/n8n/issues/4964)) ([5cbb5f4](https://github.com/n8n-io/n8n/commit/5cbb5f4bc8e09755e29bcc08715129d61c3fd1b6))
- **editor:** Fix for wrong execution data displayed in executions preview ([#4966](https://github.com/n8n-io/n8n/issues/4966)) ([bfc8e68](https://github.com/n8n-io/n8n/commit/bfc8e68b37f77bd1a8259ca8162269451aca4f28))
- Pick up credential test functions from versioned nodes as well ([#4962](https://github.com/n8n-io/n8n/issues/4962)) ([2797c08](https://github.com/n8n-io/n8n/commit/2797c085e51548a29b83dd6ce057ac71bde9ed0c))

# [0.208.0](https://github.com/n8n-io/n8n/compare/n8n@0.207.1...n8n@0.208.0) (2022-12-16)

### Bug Fixes

- **core:** Fix for Google and Microsoft generic OAuth2 credentials ([efa4c56](https://github.com/n8n-io/n8n/commit/efa4c567579d88f9ce764c535dfb41e7391a1286))
- **core:** Fix HTTP Digest Auth for responses without an opaque parameter ([#4806](https://github.com/n8n-io/n8n/issues/4806)) ([6fac502](https://github.com/n8n-io/n8n/commit/6fac502f9ec288d7df2263e6f5a28b3a1fa84595))
- **Disqus Node:** Fix thread parameter for "Get All Threads" operation ([#4912](https://github.com/n8n-io/n8n/issues/4912)) ([a04f838](https://github.com/n8n-io/n8n/commit/a04f838117076424084d858494103638fc201996))
- Do not crash the server when Telemetry is blocked via DNS ([#4947](https://github.com/n8n-io/n8n/issues/4947)) ([6127c95](https://github.com/n8n-io/n8n/commit/6127c958f5ed786ee93f8fedb3344d6792158723))
- **editor:** Allow mapping onto expression editor with selection range ([#4945](https://github.com/n8n-io/n8n/issues/4945)) ([6b83972](https://github.com/n8n-io/n8n/commit/6b83972f6e18e03874eb11180488505b83a0111a))
- **editor:** Do not show actions dialog for actionless triggers when selected via keyboard ([#4911](https://github.com/n8n-io/n8n/issues/4911)) ([74100d3](https://github.com/n8n-io/n8n/commit/74100d3d5b12f70e78e04e8c87541f3adf6decdb))
- **editor:** Fix an issue where some node actions wouldn't select default params correctly ([#4946](https://github.com/n8n-io/n8n/issues/4946)) ([626879b](https://github.com/n8n-io/n8n/commit/626879b3a2f8f4fb6b1c365297d752f456a47610))
- **editor:** Fix typo in retry-button option "Retry with original workflow" ([#4528](https://github.com/n8n-io/n8n/issues/4528)) ([76a3f13](https://github.com/n8n-io/n8n/commit/76a3f1345877599d46691f37878e3fc3fa062243))
- Update permission for showing workflow caller policy ([#4916](https://github.com/n8n-io/n8n/issues/4916)) ([f73267f](https://github.com/n8n-io/n8n/commit/f73267ffa5b4a265ab6be52e887747487cae10c5))

### Features

- Add workflow sharing telemetry ([#4906](https://github.com/n8n-io/n8n/issues/4906)) ([ac066fc](https://github.com/n8n-io/n8n/commit/ac066fc9f3a2c1abeb327dacd7b98ae3a47e2371))
- **core:** Allow for hiding usage page via environment ([#4899](https://github.com/n8n-io/n8n/issues/4899)) ([0f40ca3](https://github.com/n8n-io/n8n/commit/0f40ca39ba64156df186bbf27433ab17edbfa1a6))
- **editor:** Inline expression editor ([#4814](https://github.com/n8n-io/n8n/issues/4814)) ([a125989](https://github.com/n8n-io/n8n/commit/a1259898c01406ebd7f8d0182a6c66fd8b0c7734)), closes [#4836](https://github.com/n8n-io/n8n/issues/4836) [#4846](https://github.com/n8n-io/n8n/issues/4846)
- **editor:** Update user management setup message when sharing is disabled ([#4928](https://github.com/n8n-io/n8n/issues/4928)) ([fbcbef2](https://github.com/n8n-io/n8n/commit/fbcbef20e7b193d6c69334a1da3c0d16936c5ec4))
- Hide credentials password values ([#4868](https://github.com/n8n-io/n8n/issues/4868)) ([fe0f982](https://github.com/n8n-io/n8n/commit/fe0f9824377026a1660d6fda63da79b6cc31ea4b))
- **OpenAI Node:** Add a node to work with OpenAI ([#4932](https://github.com/n8n-io/n8n/issues/4932)) ([7a984bb](https://github.com/n8n-io/n8n/commit/7a984bb6b74381fecb43755c1421be9d80b3ed44))
- **Send Email Node:** Add replyTo support ([#4941](https://github.com/n8n-io/n8n/issues/4941)) ([3140942](https://github.com/n8n-io/n8n/commit/31409420c2367c75cd8eaaf82d5b81f467efc8bb))
- Set all resources view as default subview ([#4919](https://github.com/n8n-io/n8n/issues/4919)) ([bcde07e](https://github.com/n8n-io/n8n/commit/bcde07e03288729ed185d1508cd73efebd82dec0))
- Update workflow overwriting message ([#4917](https://github.com/n8n-io/n8n/issues/4917)) ([2964458](https://github.com/n8n-io/n8n/commit/2964458191a02046a1806bd413e67ebf1308c2f8))

## [0.207.1](https://github.com/n8n-io/n8n/compare/n8n@0.207.0...n8n@0.207.1) (2022-12-13)

### Bug Fixes

- **editor:** Fix undo on Windows and Linux ([#4898](https://github.com/n8n-io/n8n/issues/4898)) ([3fc2d7c](https://github.com/n8n-io/n8n/commit/3fc2d7cc5af54f826a8f0c27cb7860448f92bb77))
- **editor:** Schema view render empty data ([#4902](https://github.com/n8n-io/n8n/issues/4902)) ([0b6d470](https://github.com/n8n-io/n8n/commit/0b6d47086a27117ceb0a1da107e5fcfbe11e0cd4))
- Ensure parent directory exists before copying over the icons to generated static directory ([#4865](https://github.com/n8n-io/n8n/issues/4865)) ([91e9a88](https://github.com/n8n-io/n8n/commit/91e9a88e3a83530e1dce2e72b8796da24775dcf2))

# [0.207.0](https://github.com/n8n-io/n8n/compare/n8n@0.206.1...n8n@0.207.0) (2022-12-12)

### Bug Fixes

- **core:** Remove `nodeGetter` checks ([#4883](https://github.com/n8n-io/n8n/issues/4883)) ([07b2f76](https://github.com/n8n-io/n8n/commit/07b2f7678cc409840328da8f2e0b6f064fab10d8))
- **editor:** Avoid adding manual trigger node when webhook node is added ([#4887](https://github.com/n8n-io/n8n/issues/4887)) ([b689d2d](https://github.com/n8n-io/n8n/commit/b689d2d7c28eb90c8979aba5bbc2f75867289505))
- **editor:** Fix credential sharing issues handler when no matching id or name ([#4879](https://github.com/n8n-io/n8n/issues/4879)) ([1cce8ea](https://github.com/n8n-io/n8n/commit/1cce8eaf16a4394b4241572641427011287a7dc2))
- **editor:** Fix for broken tab navigation ([#4881](https://github.com/n8n-io/n8n/issues/4881)) ([983c544](https://github.com/n8n-io/n8n/commit/983c5447c512651db96fbc57f2934c019dd3bf20))
- **editor:** Schema view shows checkbox in case of empty data ([#4889](https://github.com/n8n-io/n8n/issues/4889)) ([b0c158c](https://github.com/n8n-io/n8n/commit/b0c158c64fa7df7da7fefb6ee24223ce650318b2))
- Increase workflow reactivation max timeout to 1 day ([#4869](https://github.com/n8n-io/n8n/issues/4869)) ([593354b](https://github.com/n8n-io/n8n/commit/593354b6d89b577182873ef621c2c86c5415ef48))
- Issue listing executions with Postgres ([#4856](https://github.com/n8n-io/n8n/issues/4856)) ([5156328](https://github.com/n8n-io/n8n/commit/5156328c34f384e292e9cfaebe72ad0666b02af6))
- **Move Binary Data Node:** Stringify objects before encoding them in MoveBinaryData ([#4882](https://github.com/n8n-io/n8n/issues/4882)) ([3b969d2](https://github.com/n8n-io/n8n/commit/3b969d2cd11e2bff3402cdc5e8825b105b453630))
- Remove foreign credentials when copying nodes or duplicating workflow ([#4880](https://github.com/n8n-io/n8n/issues/4880)) ([7d2e2ee](https://github.com/n8n-io/n8n/commit/7d2e2ee0f74fbe98c0e69ec1383e13af8b8cc035))
- **Split In Batches Node:** Fix issue with pairedItem ([#4873](https://github.com/n8n-io/n8n/issues/4873)) ([38d7300](https://github.com/n8n-io/n8n/commit/38d7300d2a8168643a75f0c4fff108949f25ca15))
- Stop returning `UNKNOWN ERROR` in the response if an actual error message is available ([#4859](https://github.com/n8n-io/n8n/issues/4859)) ([4cb4c5e](https://github.com/n8n-io/n8n/commit/4cb4c5e8188fd930312e3bf720472af35731a968))
- Update duplicate action ([#4858](https://github.com/n8n-io/n8n/issues/4858)) ([19e0e96](https://github.com/n8n-io/n8n/commit/19e0e962710070d4517b20b8c8b2b57392f2100a))
- Upgrade sse-channel to mitigate CVE-2019-10744 ([#4835](https://github.com/n8n-io/n8n/issues/4835)) ([7e1a13f](https://github.com/n8n-io/n8n/commit/7e1a13f9b2cc110343f3dc1f26c9a0703eeee588))

### Features

- Add sharing permissions info for workflow sharees ([#4892](https://github.com/n8n-io/n8n/issues/4892)) ([c013245](https://github.com/n8n-io/n8n/commit/c013245db726bf7e2a880ac538631c53450a6471))
- **editor:** Add undo/redo support for canvas actions ([#4787](https://github.com/n8n-io/n8n/issues/4787)) ([b2aba48](https://github.com/n8n-io/n8n/commit/b2aba48dfe441225c36ba1626aa6f8eb4f1a8173))
- **editor:** Node creator actions ([#4696](https://github.com/n8n-io/n8n/issues/4696)) ([79fe57d](https://github.com/n8n-io/n8n/commit/79fe57dad8093b27651ce82164d6e7a0f08f9e43))
- Handle sharing features when user skips owner setup ([#4850](https://github.com/n8n-io/n8n/issues/4850)) ([6f1b78d](https://github.com/n8n-io/n8n/commit/6f1b78df9877666212d9b01818155e30c2caba0f))
- Update credential test error message for sharees ([#4864](https://github.com/n8n-io/n8n/issues/4864)) ([4765d76](https://github.com/n8n-io/n8n/commit/4765d767e361608a6349d08f7116dedc2a0e7e35))

## [0.206.1](https://github.com/n8n-io/n8n/compare/n8n@0.206.0...n8n@0.206.1) (2022-12-07)

### Bug Fixes

- **core:** Make expression resolution improvements ([#4829](https://github.com/n8n-io/n8n/issues/4829)) ([0bd13c7](https://github.com/n8n-io/n8n/commit/0bd13c71739c4fb34feab4f7a169ee89bc77eee8))
- **editor:** Schema unit test stub fontawesome icon ([#4840](https://github.com/n8n-io/n8n/issues/4840)) ([1e4ca1f](https://github.com/n8n-io/n8n/commit/1e4ca1f0d0c89386470db7f6ce265a1339c79562))
- Remove unnecessary console message ([#4848](https://github.com/n8n-io/n8n/issues/4848)) ([2ad62bc](https://github.com/n8n-io/n8n/commit/2ad62bcd442c4595daef4d02119122d9c37ab43d))

# [0.206.0](https://github.com/n8n-io/n8n/compare/n8n@0.205.0...n8n@0.206.0) (2022-12-06)

### Bug Fixes

- **Code Node:** Restore `pairedItem` to required n8n item keys ([#4821](https://github.com/n8n-io/n8n/issues/4821)) ([915f144](https://github.com/n8n-io/n8n/commit/915f1445c26d834e3d43602f901a198931a107e1))
- **core:** Fix linter error ([#4808](https://github.com/n8n-io/n8n/issues/4808)) ([3bb3809](https://github.com/n8n-io/n8n/commit/3bb3809eecd1b660c0d05c26164b9ccc90a37008))
- **core:** Fix partial execution with pinned data on child node run ([#4764](https://github.com/n8n-io/n8n/issues/4764)) ([5d75e6c](https://github.com/n8n-io/n8n/commit/5d75e6ceb3bf7d88229b4e71dda3250086aceb05))
- **core:** OAuth2 scopes does not save ([7aefed4](https://github.com/n8n-io/n8n/commit/7aefed46dcdb5d795fe9755c9fc64f445136bc17))
- Enable source-maps on WorkflowRunnerProcess in `own` mode ([#4832](https://github.com/n8n-io/n8n/issues/4832)) ([9485e2f](https://github.com/n8n-io/n8n/commit/9485e2f12a4131ec24f504591290246e24f1cd09))
- **Execute Workflow Node:** Update Execute Workflow node info notice text ([#4809](https://github.com/n8n-io/n8n/issues/4809)) ([9e7a156](https://github.com/n8n-io/n8n/commit/9e7a156532293956e74103c66babd6c967bb062c))
- **Gmail Trigger Node:** Trigger node missing some emails ([67aad63](https://github.com/n8n-io/n8n/commit/67aad6334358dfecd5ba3a6e8f085fca73bd40ad))
- Handle error when workflow does not exist or is inaccessible ([#4831](https://github.com/n8n-io/n8n/issues/4831)) ([b71295e](https://github.com/n8n-io/n8n/commit/b71295e4de658fb134b67eaa0b630704f858ce7e))
- **Local File Trigger Node:** Fix issue that causes a crash if the ignore field is empty ([#4824](https://github.com/n8n-io/n8n/issues/4824)) ([#4825](https://github.com/n8n-io/n8n/issues/4825)) ([c311424](https://github.com/n8n-io/n8n/commit/c3114241fdd399555666d2f5890815b6196ce1bf))
- Make `nodes.exclude` and `nodes.include` work with lazy-loaded nodes ([#4833](https://github.com/n8n-io/n8n/issues/4833)) ([85241fd](https://github.com/n8n-io/n8n/commit/85241fd230675691828c8d711f86aabb7e48dabe))

### Features

- Add message for readonly nodes. Improve foreign credentials handling ([#4759](https://github.com/n8n-io/n8n/issues/4759)) ([eb112ff](https://github.com/n8n-io/n8n/commit/eb112ffd23cec04f290d515917c227b628db2834))
- Add prompt to overwrite changes when concurrent editing occurs ([#4817](https://github.com/n8n-io/n8n/issues/4817)) ([af6ac42](https://github.com/n8n-io/n8n/commit/af6ac42aa3ec6805a2a18b920128beafcb9a3cdc))
- **core:** Workflow Execution Statistics ([#4200](https://github.com/n8n-io/n8n/issues/4200)) ([1722c6b](https://github.com/n8n-io/n8n/commit/1722c6b0c5dde87d3389c328b611cbb611b2853e))
- **editor:** Alert design system component ([#4834](https://github.com/n8n-io/n8n/issues/4834)) ([9dbb3ea](https://github.com/n8n-io/n8n/commit/9dbb3ea182cba890781a89fe28eda2c7b50dbc65))
- **editor:** Schema view ([#4615](https://github.com/n8n-io/n8n/issues/4615)) ([4528f34](https://github.com/n8n-io/n8n/commit/4528f34462396b5faf550c5a58c4dd9163bdbc40))
- Fix checkbox line height and make checkbox label clickable ([#4818](https://github.com/n8n-io/n8n/issues/4818)) ([1b7952a](https://github.com/n8n-io/n8n/commit/1b7952a516a5c5dfe1f79e25f811fc044a5e4962))
- **KoBoToolbox Node:** Add support for Media file API ([#4578](https://github.com/n8n-io/n8n/issues/4578)) ([37e580e](https://github.com/n8n-io/n8n/commit/37e580eb0628a651ecbc8faa3ad447cd0177d7cf))

# [0.205.0](https://github.com/n8n-io/n8n/compare/n8n@0.204.0...n8n@0.205.0) (2022-12-02)

### Bug Fixes

- **AWS SNS Node:** Pagination Issue ([d96d161](https://github.com/n8n-io/n8n/commit/d96d1610ba921ba71e90677d379b025741c7c9c8))
- **core:** Ensure executions list is properly filtered for all users ([#4765](https://github.com/n8n-io/n8n/issues/4765)) ([ddf787c](https://github.com/n8n-io/n8n/commit/ddf787c087e523871891fd363f810075943b5e7b))
- **core:** Fix `$items().length` in Execute Once mode ([#4755](https://github.com/n8n-io/n8n/issues/4755)) ([3d67df4](https://github.com/n8n-io/n8n/commit/3d67df490cad944704cd7da85c622feb418a2ea8))
- **core:** Mark binary data to be deleted when pruning executions ([#4713](https://github.com/n8n-io/n8n/issues/4713)) ([78c66f1](https://github.com/n8n-io/n8n/commit/78c66f16d6c4677a63be18d823866ad3d1414843))
- **core:** OAuth2 scope saved to DB fix ([7cb5dc2](https://github.com/n8n-io/n8n/commit/7cb5dc2aa5d15c574b0e07d0d7fa23dd9a9996ea))
- Credential overwrites should take precedence over credential default values ([#4782](https://github.com/n8n-io/n8n/issues/4782)) ([2ce6291](https://github.com/n8n-io/n8n/commit/2ce62917da514714b7198cab63dcfc0b1ebc0473))
- **editor:** Fix slots rendering of NodeCreator's NoResults component ([#4721](https://github.com/n8n-io/n8n/issues/4721)) ([d8c2dff](https://github.com/n8n-io/n8n/commit/d8c2dffc37155eb013a12d21cab6504264d16b8e))
- **editor:** JSON view values can be mapped like keys ([#4702](https://github.com/n8n-io/n8n/issues/4702)) ([6d4e959](https://github.com/n8n-io/n8n/commit/6d4e9598846c9c2eb128ce039d4aeae080178627))
- **Google Sheets Node:** Fix exception if no matching rows are found ([579f9c4](https://github.com/n8n-io/n8n/commit/579f9c4d4e5907a4ffba9a7ec6bcbb5d2faaefb9))
- **Google Sheets Node:** Fix for append operation if no empty rows in sheet ([741c7da](https://github.com/n8n-io/n8n/commit/741c7da8b1a3f2824613d2a4c4880423c8be91cb))
- Lazy load nodes for credentials testing ([#4760](https://github.com/n8n-io/n8n/issues/4760)) ([0a7a2f3](https://github.com/n8n-io/n8n/commit/0a7a2f3e4179c6bd186547dd43a5c43400c18ff8))
- **Microsoft Outlook Node:** Fix binary attachment upload ([#4766](https://github.com/n8n-io/n8n/issues/4766)) ([528439c](https://github.com/n8n-io/n8n/commit/528439cb4d5ff3f61dddf75dea6377f508429155))
- **Pipedrive Node:** Resolve properties not working ([c853b80](https://github.com/n8n-io/n8n/commit/c853b8078e66a671df448106956a0929c5b19b0a))
- Remove background for resource ownership selector ([#4748](https://github.com/n8n-io/n8n/issues/4748)) ([30214f2](https://github.com/n8n-io/n8n/commit/30214f2bc20da18e16924e4047891a6ea8586593))
- Update padding for resource filters dropdown ([#4751](https://github.com/n8n-io/n8n/issues/4751)) ([aff8cd9](https://github.com/n8n-io/n8n/commit/aff8cd9a2b376a429450661f108cdf8eb6e6d082))
- Update size of select components in filters dropdown ([#4747](https://github.com/n8n-io/n8n/issues/4747)) ([d6d442d](https://github.com/n8n-io/n8n/commit/d6d442d45882423661631ee40b732ed78543abfc))
- Update workflow save button type and design and share button type ([#4752](https://github.com/n8n-io/n8n/issues/4752)) ([b89301e](https://github.com/n8n-io/n8n/commit/b89301ec36fdbdc2a1d7c8996526b55930c20335))

### Features

- **editor:** Overhaul expression editor modal ([#4631](https://github.com/n8n-io/n8n/issues/4631)) ([59771c8](https://github.com/n8n-io/n8n/commit/59771c80ea6ccd1b0da4946f6d017e02b8016609))
- **Facebook Graph API Node:** Update to support api version 15 ([#4791](https://github.com/n8n-io/n8n/issues/4791)) ([2a85af1](https://github.com/n8n-io/n8n/commit/2a85af1bdb7098463085f1e5c96b25f820e19e15))
- **Google Calendar Node:** Use resource locator component for calendar parameters ([#4410](https://github.com/n8n-io/n8n/issues/4410)) ([b319671](https://github.com/n8n-io/n8n/commit/b319671fd0f0488488788b472af140014bd7cc99))
- **Postmark Trigger Node:** Update credentials so they can be used with the HTTP Request Node ([#4790](https://github.com/n8n-io/n8n/issues/4790)) ([0c759dc](https://github.com/n8n-io/n8n/commit/0c759dc548c058372fde5d117ea34489f7a6a2d9))
- **Todoist Node:** Update to use latest api version ([#4650](https://github.com/n8n-io/n8n/issues/4650)) ([09a48c5](https://github.com/n8n-io/n8n/commit/09a48c51b64aaf31888e98b7f2711140e9818bed))

# [0.204.0](https://github.com/n8n-io/n8n/compare/n8n@0.203.1...n8n@0.204.0) (2022-11-24)

### Bug Fixes

- **core:** Fix `$items().length` behavior in `executeOnce` mode ([#4694](https://github.com/n8n-io/n8n/issues/4694)) ([b87c122](https://github.com/n8n-io/n8n/commit/b87c12285fa2b339e726f81e271715e258b6a075))
- **core:** Fix for unused imports ([a6df51b](https://github.com/n8n-io/n8n/commit/a6df51b6e83fa25dad962ab212123edb3c055cac))
- **core:** Use CredentialsOverwrites when testing credentials ([#4675](https://github.com/n8n-io/n8n/issues/4675)) ([772ec78](https://github.com/n8n-io/n8n/commit/772ec78349b5b6877bf681f3262951e3a4e34fe4))
- Disable workflow locking due to issues ([#4708](https://github.com/n8n-io/n8n/issues/4708)) ([ee6ac5d](https://github.com/n8n-io/n8n/commit/ee6ac5d3417a2f308a7f4a3cda18c01fcec57faf))
- **editor:** Fix for missing node connections in dev environment ([#4707](https://github.com/n8n-io/n8n/issues/4707)) ([b18ae18](https://github.com/n8n-io/n8n/commit/b18ae18a6b10fb125f3eed73103e33e3519cd82c))
- **editor:** Fix missing resource locator component ([#4649](https://github.com/n8n-io/n8n/issues/4649)) ([44182f2](https://github.com/n8n-io/n8n/commit/44182f23a5e62c53209b3fa19edd1727586551ff))
- **editor:** Prevent node-creator tabs from showing when toggled by CanvasAddButton ([#4661](https://github.com/n8n-io/n8n/issues/4661)) ([60746dc](https://github.com/n8n-io/n8n/commit/60746dc92ee1b6c33015e2a6a0d34bc981aa1dd5))
- **editor:** Table view column limit tooltip ([#4655](https://github.com/n8n-io/n8n/issues/4655)) ([3ac9ba3](https://github.com/n8n-io/n8n/commit/3ac9ba3491c0dc1de283bc4285a243e02747f971))
- Fix broken n8n-info-tip slots ([#4665](https://github.com/n8n-io/n8n/issues/4665)) ([6c99223](https://github.com/n8n-io/n8n/commit/6c992233a053db1ea235f785a52a754c1e694555))
- **IF Node:** Fix "Is Empty" and "Is Not Empty" operation fails for date objects ([#4670](https://github.com/n8n-io/n8n/issues/4670)) ([753f4c9](https://github.com/n8n-io/n8n/commit/753f4c9a7d34c8d3329d4dc024fcf272f6f47ff3))
- Remove redundant await in node's api request functions without try/catch ([#4639](https://github.com/n8n-io/n8n/issues/4639)) ([67983e8](https://github.com/n8n-io/n8n/commit/67983e8f945397d3fb0be55fdeb47609be92b2cb))
- **Schedule Trigger Node:** Fixes inconsitent behavior with cron and weekly intervals ([#4558](https://github.com/n8n-io/n8n/issues/4558)) ([2fb8ed8](https://github.com/n8n-io/n8n/commit/2fb8ed825b18118fc0783e95d1551ee2ce8c3a38))
- Workflow activation should not crash if one of the credential is invalid ([#4671](https://github.com/n8n-io/n8n/issues/4671)) ([c0e13c2](https://github.com/n8n-io/n8n/commit/c0e13c2a8f9374e9c65aae3ce4102e37c993cf74))

### Features

- Add credentials E2E test suite and page object ([#4596](https://github.com/n8n-io/n8n/issues/4596)) ([b5b44d1](https://github.com/n8n-io/n8n/commit/b5b44d1b598e67ef7e735d7cdfb5233ca72caca6))
- Add save confirmation modal when leaving sharing modal ([#4683](https://github.com/n8n-io/n8n/issues/4683)) ([173badc](https://github.com/n8n-io/n8n/commit/173badc4e099ebb818686dc5a25c2192c138bcd9))
- Add share button to workflows list ([#4681](https://github.com/n8n-io/n8n/issues/4681)) ([a356d7b](https://github.com/n8n-io/n8n/commit/a356d7bdbadd5a4c69c61c5a5a30e75e9765e3d2))
- **core:** Add license support to n8n ([#4566](https://github.com/n8n-io/n8n/issues/4566)) ([30e5d3d](https://github.com/n8n-io/n8n/commit/30e5d3d04c3457780875cc36637c8c1ea14ec783))
- **core:** Lazy-load nodes and credentials to reduce baseline memory usage ([#4577](https://github.com/n8n-io/n8n/issues/4577)) ([b6c57e1](https://github.com/n8n-io/n8n/commit/b6c57e19fc5683dd7fb9eabb60ec4e89359c59eb))
- **editor:** Add workflows list status filter ([#4690](https://github.com/n8n-io/n8n/issues/4690)) ([5364e7f](https://github.com/n8n-io/n8n/commit/5364e7fc9250421b799adc28b3e47dc75819ec7d))
- Show delete button based on workflow permissions ([#4686](https://github.com/n8n-io/n8n/issues/4686)) ([4f64e26](https://github.com/n8n-io/n8n/commit/4f64e26a83c7e62c98d93c38bf3dcb6cdfaadb58))
- Show toast when saving workflow sharing settings ([#4684](https://github.com/n8n-io/n8n/issues/4684)) ([6f8d0de](https://github.com/n8n-io/n8n/commit/6f8d0de55dc9c3c1cdb17329a8560ee8453c639a))
- Switch owner subview to all subview if has shared resources ([#4672](https://github.com/n8n-io/n8n/issues/4672)) ([e3e17e5](https://github.com/n8n-io/n8n/commit/e3e17e5dac685b1230e39bbef247312419b71f9b))
- Use longer stack-traces when error-reporting is enabled ([#4674](https://github.com/n8n-io/n8n/issues/4674)) ([de5b0b0](https://github.com/n8n-io/n8n/commit/de5b0b03fedede680f5a6e0f4dc73770b888bf46))

### Performance Improvements

- **Code Node:** Improve n8n item key validation performance ([#4669](https://github.com/n8n-io/n8n/issues/4669)) ([740513b](https://github.com/n8n-io/n8n/commit/740513b42440b8760cd488659e92abe9951462b0))

## [0.203.1](https://github.com/n8n-io/n8n/compare/n8n@0.203.0...n8n@0.203.1) (2022-11-18)

### Bug Fixes

- **Google Sheets Node:** Versioning fix ([4e66672](https://github.com/n8n-io/n8n/commit/4e66672df225e67297981b7ee3408e5849db418a))

# [0.203.0](https://github.com/n8n-io/n8n/compare/n8n@0.202.1...n8n@0.203.0) (2022-11-17)

### Bug Fixes

- Add back mapping hint when parameter is focused ([#4634](https://github.com/n8n-io/n8n/issues/4634)) ([b35172e](https://github.com/n8n-io/n8n/commit/b35172e442a131f76c2d902d451356ab937bba48))
- **core:** Deduplicate error handling in nodes ([#4319](https://github.com/n8n-io/n8n/issues/4319)) ([c7133ec](https://github.com/n8n-io/n8n/commit/c7133ecd3fe6f022a537b6edb4c006d6786efad2))
- **editor:** Add 'Stop execution' button to execution preview ([#4632](https://github.com/n8n-io/n8n/issues/4632)) ([be7672a](https://github.com/n8n-io/n8n/commit/be7672a177bfcf997ec241af7c628a90312849b1))
- **editor:** Curb direct item access linting ([#4591](https://github.com/n8n-io/n8n/issues/4591)) ([271cd06](https://github.com/n8n-io/n8n/commit/271cd06a6ac6274a83a6a71fe76072281edf3724))
- **editor:** Fix expression editor variable selector filter ([#4590](https://github.com/n8n-io/n8n/issues/4590)) ([69b332b](https://github.com/n8n-io/n8n/commit/69b332b0e3321d3d1c635e53ec134d15b7e54bb9))
- **editor:** Fix for execution retry dropdown not closing ([#4575](https://github.com/n8n-io/n8n/issues/4575)) ([e0ec5a6](https://github.com/n8n-io/n8n/commit/e0ec5a6aa932db281aafe07be65aa86719e41b09))
- **editor:** Fix for logging error on user logout ([#4633](https://github.com/n8n-io/n8n/issues/4633)) ([7483e14](https://github.com/n8n-io/n8n/commit/7483e147fc552d981d03d0e96112725335c64002))
- **editor:** Fix zero treated as missing value in resource locator ([#4612](https://github.com/n8n-io/n8n/issues/4612)) ([b0bbcf6](https://github.com/n8n-io/n8n/commit/b0bbcf6028dcf3b9e25dacb1aee06a79f45f9e04))
- **editor:** Hide pin data in production executions ([#4595](https://github.com/n8n-io/n8n/issues/4595)) ([edebad1](https://github.com/n8n-io/n8n/commit/edebad1a89f1dd239c833c166a6e7f845d6df035))
- **editor:** Skip optional chaining operators in Code Node editor linting ([#4592](https://github.com/n8n-io/n8n/issues/4592)) ([ccacd42](https://github.com/n8n-io/n8n/commit/ccacd42b3706267b704f370f1044eb1ca7f5286c))
- **editor:** Update to 'Expression/Fixed' toggle - Keep expression when switching to Fixed ([#4599](https://github.com/n8n-io/n8n/issues/4599)) ([6eee155](https://github.com/n8n-io/n8n/commit/6eee155ecb91c680c5a9d4f23502da35ab249a9d))
- Fix foreign credentials being shown for new nodes ([#4622](https://github.com/n8n-io/n8n/issues/4622)) ([dea67ca](https://github.com/n8n-io/n8n/commit/dea67ca6b7eee02fd5ea24c48224c65e937e97f2))
- Fix user redirect to signin bug ([#4623](https://github.com/n8n-io/n8n/issues/4623)) ([402b75a](https://github.com/n8n-io/n8n/commit/402b75ac280cf74df30aaf758f1c0a15762ad996))
- Store copy of workflow in workflowsById to prevent node data bugs ([#4637](https://github.com/n8n-io/n8n/issues/4637)) ([9cadaea](https://github.com/n8n-io/n8n/commit/9cadaea3a44b8b983a2c8c1e78271ffcd114ef4d))

### Features

- Add duplicate workflow error handler ([#4616](https://github.com/n8n-io/n8n/issues/4616)) ([f7a9ef9](https://github.com/n8n-io/n8n/commit/f7a9ef91166df1a71db1f7827cb43ffd687839d4))
- Add workflow data reset action ([#4618](https://github.com/n8n-io/n8n/issues/4618)) ([0daa36c](https://github.com/n8n-io/n8n/commit/0daa36c1978c6722d178e16c6f756b7205068c09))
- **Compare Datasets Node:** Node tweaks ([423ee81](https://github.com/n8n-io/n8n/commit/423ee81e33b88c5ed6152b75b69219c3e4ff16c8))
- **core:** Add credential runtime checks and prevent tampering in manual run ([#4481](https://github.com/n8n-io/n8n/issues/4481)) ([d35d63a](https://github.com/n8n-io/n8n/commit/d35d63a855522c781b38238e107a6aaa211764c6))
- **Google Sheets Node:** Overhaul of node ([d96d6f1](https://github.com/n8n-io/n8n/commit/d96d6f11dbe2f1c75ff572baa4906fb628a2eb5c))
- **Notion (Beta) Node:** Use resource locator component for database and page parameters ([#4340](https://github.com/n8n-io/n8n/issues/4340)) ([277b6b7](https://github.com/n8n-io/n8n/commit/277b6b73c37187f524474364c3b58adbc15486e0))

## [0.202.1](https://github.com/n8n-io/n8n/compare/n8n@0.202.0...n8n@0.202.1) (2022-11-10)

### Bug Fixes

- Disable some error tracking ([#4579](https://github.com/n8n-io/n8n/issues/4579)) ([b2201d0](https://github.com/n8n-io/n8n/commit/b2201d0c77cf024e39f6569e7806871d38408201))

# [0.202.0](https://github.com/n8n-io/n8n/compare/n8n@0.201.0...n8n@0.202.0) (2022-11-10)

### Bug Fixes

- **API:** Do not use names for typeorm connections ([#4532](https://github.com/n8n-io/n8n/issues/4532)) ([f5c2080](https://github.com/n8n-io/n8n/commit/f5c20803d782d06ffc42dabd0a11467d44bd1888))
- **core:** Fix manual execution of pinned trigger on main mode ([#4535](https://github.com/n8n-io/n8n/issues/4535)) ([5d73b6e](https://github.com/n8n-io/n8n/commit/5d73b6e48aef2b0b386369b7d1f208845f912da5))
- **core:** Streamline multiple pinned triggers behavior ([#4569](https://github.com/n8n-io/n8n/issues/4569)) ([953457a](https://github.com/n8n-io/n8n/commit/953457ad8676501f9c92eb1f7bb68521a975975c))
- **editor:** Curb arg linting for `$input.first()` and `$input.last()` ([#4526](https://github.com/n8n-io/n8n/issues/4526)) ([0edd4bc](https://github.com/n8n-io/n8n/commit/0edd4bcc8783de0da591ad147700c450e01ba919))
- **editor:** Fix duplicate bug when new workflow is open ([#4559](https://github.com/n8n-io/n8n/issues/4559)) ([536c834](https://github.com/n8n-io/n8n/commit/536c834313b73bf36f9c9cc291dca4e4b4b860be))
- **editor:** Fix for incorrect execution saving indicator in executions view ([#4547](https://github.com/n8n-io/n8n/issues/4547)) ([0117191](https://github.com/n8n-io/n8n/commit/01171912e7587933792e5cd1cd605a6ec3b0b1be))
- **editor:** Fix for oauth authorization ([#4572](https://github.com/n8n-io/n8n/issues/4572)) ([d06197d](https://github.com/n8n-io/n8n/commit/d06197d879707c6a9826ae192682262c4f6c02ed))
- **editor:** Fix workflow activation from the Workflows view ([#4549](https://github.com/n8n-io/n8n/issues/4549)) ([d2bec63](https://github.com/n8n-io/n8n/commit/d2bec63cecbc39f1881a883d36b6a2c3ea1568a9))
- **editor:** Fix workflow back button navigation ([#4546](https://github.com/n8n-io/n8n/issues/4546)) ([825637f](https://github.com/n8n-io/n8n/commit/825637f02a5d1bc9f00cb68f19221dd7d0e055cb))
- **editor:** Prevent adding of the start node when importing workflow in the demo mode ([#4564](https://github.com/n8n-io/n8n/issues/4564)) ([49748f2](https://github.com/n8n-io/n8n/commit/49748f27a2bfbb0356ba2c30c35d34a3ad9d8063))
- **editor:** Show string numbers and null properly in JSON view ([#4513](https://github.com/n8n-io/n8n/issues/4513)) ([f6b85f4](https://github.com/n8n-io/n8n/commit/f6b85f4a69adbad10854ff77015d0d2ee69cfeac))
- **editor:** Switch `CodeNodeEditor` linter parser to `esprima-next` ([#4524](https://github.com/n8n-io/n8n/issues/4524)) ([5e0ded4](https://github.com/n8n-io/n8n/commit/5e0ded4a84a3da1fc4cd32d135cb4eb30dbd9b35))
- **editor:** Tweak dragged mapping state ([#4550](https://github.com/n8n-io/n8n/issues/4550)) ([b3cd62d](https://github.com/n8n-io/n8n/commit/b3cd62d866eeb734de253f656ee2b67c147a10c1))
- **editor:** Update workflow buttons spacings ([#4534](https://github.com/n8n-io/n8n/issues/4534)) ([88baaa0](https://github.com/n8n-io/n8n/commit/88baaa0eb15f3d1cff22ed5994b0cd39bddf5b7b))
- **editor:** Use base path in workflow preview component URL ([#4560](https://github.com/n8n-io/n8n/issues/4560)) ([db163b7](https://github.com/n8n-io/n8n/commit/db163b71b90d073cc963f63d5455b3a84f236917))
- **HTTP Request Node:** Show error cause in the output ([#4538](https://github.com/n8n-io/n8n/issues/4538)) ([c239eea](https://github.com/n8n-io/n8n/commit/c239eea1b9fc7c7397db8135528ac0d136be1c84))
- **HTTP Request Node:** Use the data in "Put Output in Field" field ([#4487](https://github.com/n8n-io/n8n/issues/4487)) ([39d4bb2](https://github.com/n8n-io/n8n/commit/39d4bb2639794eeb9c2e998daaac3accad1802b4))
- **HubSpot Node:** Add notice to HubSpot credentials about API Key Sunset ([#4570](https://github.com/n8n-io/n8n/issues/4570)) ([9b5db8d](https://github.com/n8n-io/n8n/commit/9b5db8d7be501ff06e49fd25ce9e0f3e9aa8fbea))
- **Notion Trigger (Beta) Node:** Fix Notion trigger polling strategy ([3b34050](https://github.com/n8n-io/n8n/commit/3b3405089d9194515192f10ab4085e1493bb86b5))
- **Raindrop Node:** Update access token URL ([#4542](https://github.com/n8n-io/n8n/issues/4542)) ([740df0c](https://github.com/n8n-io/n8n/commit/740df0c1e5e578269fcaa0ce767c5894c6a852d4))
- **SendInBlue Trigger Node:** Fix typo in credential name ([#4357](https://github.com/n8n-io/n8n/issues/4357)) ([5d852f9](https://github.com/n8n-io/n8n/commit/5d852f9230a73c04b5242803949117cce8bffeed))
- Update E2E testing env variables ([#4556](https://github.com/n8n-io/n8n/issues/4556)) ([f9d9f88](https://github.com/n8n-io/n8n/commit/f9d9f88f8a9d217101c2f5c67f3d3db6aa6b9b92))

### Features

- Add cypress e2e tests for signup and signin ([#3490](https://github.com/n8n-io/n8n/issues/3490)) ([7764486](https://github.com/n8n-io/n8n/commit/77644860c0fcd3d78732097ebf5d0b0457da7d57))
- **API:** Report unhandled app crashes to Sentry ([#4548](https://github.com/n8n-io/n8n/issues/4548)) ([2425c10](https://github.com/n8n-io/n8n/commit/2425c10b2b5ec65bfb05d3f6443a139ec71c6a9a))
- **API:** Set up error tracking using Sentry ([#4394](https://github.com/n8n-io/n8n/issues/4394)) ([41cb0ee](https://github.com/n8n-io/n8n/commit/41cb0eec6e634f3f346644f885f8a6064e77cc7b))
- **core:** Add ownership, sharing and credential details to `GET /workflows` ([#4510](https://github.com/n8n-io/n8n/issues/4510)) ([026fb50](https://github.com/n8n-io/n8n/commit/026fb50512d6a31bf483646ec68276fb6f39abfe))
- **editor:** Add support for notice credentials properties ([#4557](https://github.com/n8n-io/n8n/issues/4557)) ([de96def](https://github.com/n8n-io/n8n/commit/de96def372d63df27c3433bca4fae6f75c874e8e))
- Switch from npm to pnpm ([#4429](https://github.com/n8n-io/n8n/issues/4429)) ([7367773](https://github.com/n8n-io/n8n/commit/736777385c54d5b20174c9c1fda38bb31fbf14b4))

# [0.201.0](https://github.com/n8n-io/n8n/compare/n8n@0.200.1...n8n@0.201.0) (2022-11-02)

### Bug Fixes

- **core:** Fix workflow hasing for MySQL ([#4491](https://github.com/n8n-io/n8n/issues/4491)) ([2b5613e](https://github.com/n8n-io/n8n/commit/2b5613ed68ecc6991ec68ca21807cbc1e976aa22))
- **core:** Make `deepCopy` backward compatible ([#4505](https://github.com/n8n-io/n8n/issues/4505)) ([b282c7e](https://github.com/n8n-io/n8n/commit/b282c7e5d98c94b13a861167fef8af204267c5bd)), closes [#4508](https://github.com/n8n-io/n8n/issues/4508)
- displayOptions not getting value of RLC ([#4460](https://github.com/n8n-io/n8n/issues/4460)) ([3a1fa09](https://github.com/n8n-io/n8n/commit/3a1fa09108a115609e2dbbf257603ef5d7fc91d2))
- **editor:** Disable settings link in executions view for unsaved workflows ([#4493](https://github.com/n8n-io/n8n/issues/4493)) ([dcec5e9](https://github.com/n8n-io/n8n/commit/dcec5e9e8231609a9461acb196ab157ab6fabcd2))
- **editor:** Fix an issue with not being able to save some of the forms ([#4499](https://github.com/n8n-io/n8n/issues/4499)) ([1e445fc](https://github.com/n8n-io/n8n/commit/1e445fc1a38dd7541ee6fcc4b535180fa3844799))
- **editor:** Fix interim updates on executions view ([#4497](https://github.com/n8n-io/n8n/issues/4497)) ([cf034c0](https://github.com/n8n-io/n8n/commit/cf034c015fee7bc6eead0e4901bafef3a08fe88b))
- **editor:** Gix node creator search when there's active subcategory ([#4494](https://github.com/n8n-io/n8n/issues/4494)) ([f244975](https://github.com/n8n-io/n8n/commit/f24497589f9bff176ea8df3196e9aaaaef7dfb51))
- **editor:** : Limit columns in table view to prevent unresponsive UI when opening NDV ([#4480](https://github.com/n8n-io/n8n/issues/4480)) ([41e6489](https://github.com/n8n-io/n8n/commit/41e6489b75414c7fe55531223aa23f0817401539))

### Features

- **core:** Reimplement blocking workflow updates on interim changes ([#4446](https://github.com/n8n-io/n8n/issues/4446)) ([46905fd](https://github.com/n8n-io/n8n/commit/46905fd2cbcdbff7cf8056e010524fc0b74b7d53))
- **editor:** Block UI in NDV when workflow is listening to events ([#4390](https://github.com/n8n-io/n8n/issues/4390)) ([6c2c621](https://github.com/n8n-io/n8n/commit/6c2c621f1debcef73ca789204a651c3f5f23628e))
- **Venafi TLS Protect Cloud Node:** Make issuing template depend on application ([#4476](https://github.com/n8n-io/n8n/issues/4476)) ([d1d1288](https://github.com/n8n-io/n8n/commit/d1d1288ba91a6ebe9667f1c026e4575407fb5a70))

### Performance Improvements

- **editor:** Improve array intersection utility function ([#4503](https://github.com/n8n-io/n8n/issues/4503)) ([b0df810](https://github.com/n8n-io/n8n/commit/b0df8107458e3f6cbfccfc21a717e4085c4ab3d5))

## [0.200.1](https://github.com/n8n-io/n8n/compare/n8n@0.200.0...n8n@0.200.1) (2022-10-28)

### Bug Fixes

- **API:** Do not reset the auth cookie on every request to `GET /login` ([#4459](https://github.com/n8n-io/n8n/issues/4459)) ([c66929f](https://github.com/n8n-io/n8n/commit/c66929f53d87035160ad099873d73cea3fff4d2a))
- **AWS SNS Trigger Node:** Add missing jsonParse import ([#4463](https://github.com/n8n-io/n8n/issues/4463)) ([e6ec134](https://github.com/n8n-io/n8n/commit/e6ec134cf37ac21b26d10162b3d49da7dad85a1a))
- **core:** Updating deepCopy to avoid max callstack with circular deps ([#4468](https://github.com/n8n-io/n8n/issues/4468)) ([ca60b0e](https://github.com/n8n-io/n8n/commit/ca60b0e203d950605506eb7687a10b5c87b4492f))
- **editor:** Fix for executions view auto-refresh and new workflow saving ([#4462](https://github.com/n8n-io/n8n/issues/4462)) ([dbac795](https://github.com/n8n-io/n8n/commit/dbac7955f94007a8b305400ae28ccf1e5c040261))
- **editor:** Redirect old path /workflow ([#4469](https://github.com/n8n-io/n8n/issues/4469)) ([7620d93](https://github.com/n8n-io/n8n/commit/7620d93eda525c528823c20e83883ad10020bd76))
- **editor:** Remove filter that prevented showing running executions ([#4470](https://github.com/n8n-io/n8n/issues/4470)) ([658e886](https://github.com/n8n-io/n8n/commit/658e886861acb5897e9e87cf4d66cee9b6a6003a))

# [0.200.0](https://github.com/n8n-io/n8n/compare/n8n@0.199.0...n8n@0.200.0) (2022-10-27)

### Bug Fixes

- **API:** Validate excecutions and workflow filter parameters ([#4424](https://github.com/n8n-io/n8n/issues/4424)) ([dd3c596](https://github.com/n8n-io/n8n/commit/dd3c59677bbdcb49332975fd84d9e88852f76c8d))
- **core:** Amend typing for `jsonParse()` options ([#4423](https://github.com/n8n-io/n8n/issues/4423)) ([1732324](https://github.com/n8n-io/n8n/commit/1732324965cce2030d0198f7b7e7091edfad6727))
- **core:** Fix `predefinedCredentialType` in node graph item ([#4379](https://github.com/n8n-io/n8n/issues/4379)) ([77233f2](https://github.com/n8n-io/n8n/commit/77233f23701fa456a7d0170dc0b8118afa71a8c5))
- **core:** Fix canvas node execution skipping parent nodes ([#4438](https://github.com/n8n-io/n8n/issues/4438)) ([3a9684d](https://github.com/n8n-io/n8n/commit/3a9684df9f26464b3e1f9924871304f136de61fd))
- **core:** Fix single-node execution failing in `main` mode ([#4421](https://github.com/n8n-io/n8n/issues/4421)) ([5745027](https://github.com/n8n-io/n8n/commit/5745027cee9d3cb92dfc9d9025a0645f50185752))
- **core:** Set JWT authentication token sameSite policy to lax ([#4425](https://github.com/n8n-io/n8n/issues/4425)) ([1f4eaeb](https://github.com/n8n-io/n8n/commit/1f4eaeb3ae33ad88a4b07e664e2f8f8f1235bc6f))
- **core:** Update to imports in helpers ([91bd3c6](https://github.com/n8n-io/n8n/commit/91bd3c6567401dedb0216a07ab31310e451ff1e7))
- **editor:** Curb item method linting in single-item mode in `CodeNodeEditor` linter ([#4455](https://github.com/n8n-io/n8n/issues/4455)) ([b226aed](https://github.com/n8n-io/n8n/commit/b226aed9bb60981e1a69b799f3b57ba56b7bbaa1))
- **editor:** Stop rendering expressions as html ([#4420](https://github.com/n8n-io/n8n/issues/4420)) ([779b0d5](https://github.com/n8n-io/n8n/commit/779b0d58f741b9e8eea978f1651701e586d722c4))
- **Email Trigger (IMAP) Node:** Backport V2 mark-seen-after-processing to V1 ([#4435](https://github.com/n8n-io/n8n/issues/4435)) ([b296fb0](https://github.com/n8n-io/n8n/commit/b296fb06f3222ad56c9d8267f8b8283097fde113))
- **Email Trigger (IMAP) Node:** Improve connection handling and credentials ([#4393](https://github.com/n8n-io/n8n/issues/4393)) ([1a37f00](https://github.com/n8n-io/n8n/commit/1a37f0003f5d7029bc36ba91d51235e96e8719cc))
- **HTTP Request Node:** Fix sending previously selected credentials ([#4457](https://github.com/n8n-io/n8n/issues/4457)) ([44ad249](https://github.com/n8n-io/n8n/commit/44ad249827d47e0cc9584edcb2e2bcf7b088f026))
- **InvoiceNinja Node:** Added support for v5 ([2f4649c](https://github.com/n8n-io/n8n/commit/2f4649cdf44e15b41b40879f27ffe39406a53b1b))
- **TheHive Node:** Fix node issues ([ca9eca9](https://github.com/n8n-io/n8n/commit/ca9eca9ae9e168886502649458ccdb67d1261c09))

### Features

- **Airtable Trigger Node:** Use resource locator component for base and table parameters ([#4391](https://github.com/n8n-io/n8n/issues/4391)) ([227212c](https://github.com/n8n-io/n8n/commit/227212c928535f302879e9be6b585faa41c95b80))
- **core, editor:** Introduce workflow caller policy ([#4368](https://github.com/n8n-io/n8n/issues/4368)) ([e8935de](https://github.com/n8n-io/n8n/commit/e8935de3b2dbbf25df139c59fbdd298528397eca))
- **core:** Block workflow update on interim change ([#4397](https://github.com/n8n-io/n8n/issues/4397)) ([cddd012](https://github.com/n8n-io/n8n/commit/cddd012a2fa834ca6b3d85296caadcf3b8cc7bb5))
- **editor:** Add readonly state for nodes ([#4299](https://github.com/n8n-io/n8n/issues/4299)) ([408bd96](https://github.com/n8n-io/n8n/commit/408bd968152ad8bbafda7037f6eb8f5550d04c77))
- **editor:** Implement executions preview via the new executions tab in node view ([#4311](https://github.com/n8n-io/n8n/issues/4311)) ([d833345](https://github.com/n8n-io/n8n/commit/d833345092baf3c12828a5a7680c9fb8555d2c57))
- **editor:** Improve nodes panel search ([#4399](https://github.com/n8n-io/n8n/issues/4399)) ([f6733cf](https://github.com/n8n-io/n8n/commit/f6733cff9d88d9b3298f6afc2c59c0dea59c6464))
- **HTTP Request Node:** Add option for raw json header & query ([#4408](https://github.com/n8n-io/n8n/issues/4408)) ([8f25da5](https://github.com/n8n-io/n8n/commit/8f25da52b1c2d228018df8186985a2b067bd2123))
- **Write Binary File Node:** Add option to append to a file ([#4386](https://github.com/n8n-io/n8n/issues/4386)) ([4b13b33](https://github.com/n8n-io/n8n/commit/4b13b3398dce5338f46c80867d6e4c8c685f6c22))

# [0.199.0](https://github.com/n8n-io/n8n/compare/n8n@0.198.2...n8n@0.199.0) (2022-10-21)

### Bug Fixes

- **CompareDatasets Node:** Removed quotes from branch names ([263794c](https://github.com/n8n-io/n8n/commit/263794ce4038720181b147f8468dc07db33ec3ee))
- **editor:** Fix bottom menu hover bug ([#4349](https://github.com/n8n-io/n8n/issues/4349)) ([353a28b](https://github.com/n8n-io/n8n/commit/353a28bfe75ef75983df965cedfea2053c3cccfa))
- **editor:** Fix pairedItem telemetry error reporting ([b67e41b](https://github.com/n8n-io/n8n/commit/b67e41b45ee43a215a476adbf0c0b7bf6121e5d5))
- **editor:** Fix performance issues when opening node or editing code node with a lot of data ([#4388](https://github.com/n8n-io/n8n/issues/4388)) ([356a42a](https://github.com/n8n-io/n8n/commit/356a42a18752eaf7b70ee2e0c41ef6f248cd10b8))
- **editor:** Fix workflow not stopping on clicking stop button ([#4382](https://github.com/n8n-io/n8n/issues/4382)) ([50c18a7](https://github.com/n8n-io/n8n/commit/50c18a789a79b23a95830bdfd376ed6461d852d5))
- **editor:** Prevent text highlight on FireFox when mapping data ([#4347](https://github.com/n8n-io/n8n/issues/4347)) ([e1e2c94](https://github.com/n8n-io/n8n/commit/e1e2c943316a29bda989f3d96a7a40e3f57e3bab))
- **editor:** Remove wrong linting from Code node editor ([#4384](https://github.com/n8n-io/n8n/issues/4384)) ([77d041b](https://github.com/n8n-io/n8n/commit/77d041ba783a536b0572ef68ab4eeac8118c8ba8))
- **editor:** Replace cron node with schedule node ([#4371](https://github.com/n8n-io/n8n/issues/4371)) ([161cca9](https://github.com/n8n-io/n8n/commit/161cca9494eb115d4707a9fc3d273ba732b9da76))
- **editor:** Show null value in table view ([#4346](https://github.com/n8n-io/n8n/issues/4346)) ([bb4e08c](https://github.com/n8n-io/n8n/commit/bb4e08c0766487b150fad4ec3ee301d765d413d3))
- **Elasticsearch Node:** Fix pagination issue ([a02e92d](https://github.com/n8n-io/n8n/commit/a02e92d664b2896ee1abd30c761e25e96f4f44e3))
- **Google Drive Node:** Fix drive hint typo in resource locator ([#4387](https://github.com/n8n-io/n8n/issues/4387)) ([4ce0fed](https://github.com/n8n-io/n8n/commit/4ce0fed0ab2d464d9fa4051fed070f86a64fef57))
- **HTTP Request Node:** Avoid error when response doesn't include content-type ([#4365](https://github.com/n8n-io/n8n/issues/4365)) ([61b9909](https://github.com/n8n-io/n8n/commit/61b9909ac3925d51eb767542b70c82e57905b392))
- **n8n Node:** Fix resource locator not returning all items ([#4248](https://github.com/n8n-io/n8n/issues/4248)) ([ed4dcbb](https://github.com/n8n-io/n8n/commit/ed4dcbb5ddf3ded5ec9faa16badc128a0fcecf26))
- **Shedule Node:** Fixes multiple intervals, fixes week interval ([#4376](https://github.com/n8n-io/n8n/issues/4376)) ([971c2c0](https://github.com/n8n-io/n8n/commit/971c2c0aed0a2402fa6eb6217ddc914d1fade68b))

### Features

- **Compare Node:** New node to compare two inputs ([638d6f6](https://github.com/n8n-io/n8n/commit/638d6f60d3f1abd7f647cfe2964259a889e6cd1a))
- **core:** Block workflow update on interim change ([#4374](https://github.com/n8n-io/n8n/issues/4374)) ([e83b9bd](https://github.com/n8n-io/n8n/commit/e83b9bd98395fcdb1238f9226c08cf88a259654c))
- **core:** Enable sending client credentials in body ([#4377](https://github.com/n8n-io/n8n/issues/4377)) ([7fcd821](https://github.com/n8n-io/n8n/commit/7fcd821cadca942bd1321229f9f0f76fe663dc34))
- **editor, core, cli:** Implement new workflow experience ([#4358](https://github.com/n8n-io/n8n/issues/4358)) ([dae01f3](https://github.com/n8n-io/n8n/commit/dae01f3abef57fcb62af1e2e15d807d612ab4252))
- **editor:** Add automatic credential selection for new nodes ([#2746](https://github.com/n8n-io/n8n/issues/2746)) ([d31fbbb](https://github.com/n8n-io/n8n/commit/d31fbbba27895c5ab1ccdbf6d8c94b5b7b00893e))
- **editor:** Create new workflows page ([#4267](https://github.com/n8n-io/n8n/issues/4267)) ([be7aac3](https://github.com/n8n-io/n8n/commit/be7aac32797a2e4b3ffcd696ed700e5479692cbd))
- **editor:** Switch initial route based on feature flag ([#4383](https://github.com/n8n-io/n8n/issues/4383)) ([6d25eed](https://github.com/n8n-io/n8n/commit/6d25eed0500956ffe14022e396b5e9e628d80176))
- **Hubspot Node:** Enable hubspot credentials for http predefined types ([#3686](https://github.com/n8n-io/n8n/issues/3686)) ([b5c40e6](https://github.com/n8n-io/n8n/commit/b5c40e6294f876f18bc37a4d2e962832ee2f40a5))
- **Node:** Add the Scheduler Node ([#4223](https://github.com/n8n-io/n8n/issues/4223)) ([128c3b8](https://github.com/n8n-io/n8n/commit/128c3b83dfff3a3c21b2169da010698a3f4d20de))
- **Rundeck Node:** Update credential with test and make useable in HTTP Request node ([#3879](https://github.com/n8n-io/n8n/issues/3879)) ([fc87650](https://github.com/n8n-io/n8n/commit/fc876501809f5af0c7456867eae99f64b9ed653e))

### Performance Improvements

- update deepCopy ([#4364](https://github.com/n8n-io/n8n/issues/4364)) ([1aa21ed](https://github.com/n8n-io/n8n/commit/1aa21ed3df28684bad1696fd7f9349295d5b6219))

## [0.198.2](https://github.com/n8n-io/n8n/compare/n8n@0.198.1...n8n@0.198.2) (2022-10-14)

### Bug Fixes

- **editor:** Fix bug where one cannot scroll down parameters ([#4348](https://github.com/n8n-io/n8n/issues/4348)) ([7a76c2a](https://github.com/n8n-io/n8n/commit/7a76c2a35dac65048ab123932a54bc420e1d5a5c))

## [0.198.1](https://github.com/n8n-io/n8n/compare/n8n@0.198.0...n8n@0.198.1) (2022-10-14)

### Bug Fixes

- **editor:** Change start position of the start node ([#4345](https://github.com/n8n-io/n8n/issues/4345)) ([719a827](https://github.com/n8n-io/n8n/commit/719a82743b61d54bb101766f870538829321380c))
- **editor:** Align JSON view properties and their values ([#4343](https://github.com/n8n-io/n8n/issues/4343)) ([594a161](https://github.com/n8n-io/n8n/commit/594a16161ea80f9de7056d0fbce887f39ca74abb))
- **editor:** Fix `BASE_PATH` for Vite dev mode ([#4342](https://github.com/n8n-io/n8n/issues/4342)) ([24288a5](https://github.com/n8n-io/n8n/commit/24288a554d445f4fc12ad278e0736cd1e494f6ea))
- **editor:** Fix data pinning success source ([#4339](https://github.com/n8n-io/n8n/issues/4339)) ([763d2fd](https://github.com/n8n-io/n8n/commit/763d2fd24b0784aa28fc182be8b578537a6fb9a7))

# [0.198.0](https://github.com/n8n-io/n8n/compare/n8n@0.197.1...n8n@0.198.0) (2022-10-14)

### Bug Fixes

- **Box Node:** Fix issue with create folder operation showing extra items ([#4309](https://github.com/n8n-io/n8n/issues/4309)) ([28bea7e](https://github.com/n8n-io/n8n/commit/28bea7e109ac487014d16773414b53ddd5b0a631))
- **core, editor:** Prevent overlapping `runData` and `pinData` ([#4323](https://github.com/n8n-io/n8n/issues/4323)) ([cd74c3e](https://github.com/n8n-io/n8n/commit/cd74c3ebaea57a3894e12774ecb043184538b811))
- **core:** Expression evaluation of process should respect `N8N_BLOCK_ENV_ACCESS_IN_NODE` ([#4338](https://github.com/n8n-io/n8n/issues/4338)) ([5df09bb](https://github.com/n8n-io/n8n/commit/5df09bb31cb4b463007fc829073b66d1dce85fec))
- **editor-ui:** Fix axios baseUrl when hosted under a subfolder ([#4336](https://github.com/n8n-io/n8n/issues/4336)) ([c2e9a03](https://github.com/n8n-io/n8n/commit/c2e9a03ac54443f4fe65651edbce74ad95e8ca7d))
- **editor:** Change horizontal scrollbar rendering in various places ([#4282](https://github.com/n8n-io/n8n/issues/4282)) ([fdbc11a](https://github.com/n8n-io/n8n/commit/fdbc11a288f9fe9aac36017366b5817a05f4fbbf))
- **editor:** Disable trigger node execution pinning toolip for schedule nodes ([#4334](https://github.com/n8n-io/n8n/issues/4334)) ([d4b74bd](https://github.com/n8n-io/n8n/commit/d4b74bd66a4929517c0a66665443bf4059a74932))
- **editor:** Fix for menu collapse lag when loading a credentials page ([#4329](https://github.com/n8n-io/n8n/issues/4329)) ([298c4f2](https://github.com/n8n-io/n8n/commit/298c4f20a9ec5099953f57f3233e51d1c53d159f))
- **G Suite Admin Node:** Fix issue with user update operation failing ([#4317](https://github.com/n8n-io/n8n/issues/4317)) ([3e157f7](https://github.com/n8n-io/n8n/commit/3e157f73a441884dc2015c5cf3cdac6644876a7e))
- **GitLab Trigger Node:** Fix issue with trigger not always activating ([#4303](https://github.com/n8n-io/n8n/issues/4303)) ([2e916b6](https://github.com/n8n-io/n8n/commit/2e916b65644d4b844a4a626a0f0b92c2dd476128))
- **HTTP Request Node:** Fix oauth credentials not working properly for some predefined credentials ([#4277](https://github.com/n8n-io/n8n/issues/4277)) ([aa6c786](https://github.com/n8n-io/n8n/commit/aa6c786041d754bb795e3afd52e76c09541ffb63))
- **KoboToolbox Node:** Fix hook logs not working correctly ([#4286](https://github.com/n8n-io/n8n/issues/4286)) ([ebf4515](https://github.com/n8n-io/n8n/commit/ebf45157e610d1e2527e6180de99105b8aeb0fb8))
- **SeaTable Node:** Fix link items not showing in response ([#4170](https://github.com/n8n-io/n8n/issues/4170)) ([69684fc](https://github.com/n8n-io/n8n/commit/69684fc4f761f970a740b68865304a17257ed20c))
- **Zoom Node:** Fix issue with missing output items ([#4315](https://github.com/n8n-io/n8n/issues/4315)) ([a82fd3f](https://github.com/n8n-io/n8n/commit/a82fd3f33ff81d2b996e2975c5fd95c8abe84467))

- feat(Merge Node)!: Node tweaks n8n-4939 (#4321) ([6a37071](https://github.com/n8n-io/n8n/commit/6a37071350fee9ab861c34f4667709065f03f11a)), closes [#4321](https://github.com/n8n-io/n8n/issues/4321)

### Features

- **Citrix Node:** Add certificate install operation ([#4308](https://github.com/n8n-io/n8n/issues/4308)) ([bbb8c56](https://github.com/n8n-io/n8n/commit/bbb8c56b0e9b2c146ae17d956a09759ecded47f5))
- **Code Node:** Create Code node ([#3965](https://github.com/n8n-io/n8n/issues/3965)) ([1db4fa2](https://github.com/n8n-io/n8n/commit/1db4fa2bf87f02ccced4774eb547646c611cad40)), closes [#3930](https://github.com/n8n-io/n8n/issues/3930) [#4192](https://github.com/n8n-io/n8n/issues/4192) [#4220](https://github.com/n8n-io/n8n/issues/4220)
- **editor:** Update expressions display ([#4171](https://github.com/n8n-io/n8n/issues/4171)) ([6b53849](https://github.com/n8n-io/n8n/commit/6b538494cea62aa8c5b104b244f61e07baa58f18)), closes [#4149](https://github.com/n8n-io/n8n/issues/4149)
- **editor:** Updated n8n-menu component ([#4290](https://github.com/n8n-io/n8n/issues/4290)) ([6af3ba7](https://github.com/n8n-io/n8n/commit/6af3ba75dc90a511395674e9f64e5032e133952b)), closes [#4060](https://github.com/n8n-io/n8n/issues/4060)
- **Kafka Node:** Add key option for messages ([#4210](https://github.com/n8n-io/n8n/issues/4210)) ([1811c54](https://github.com/n8n-io/n8n/commit/1811c54917e5940a3f170761c94096845319db28))
- **MySql Node:** Use resource locator component for table parameter ([#4313](https://github.com/n8n-io/n8n/issues/4313)) ([9a06c6d](https://github.com/n8n-io/n8n/commit/9a06c6df251d5502b9f27320b49458cfb1ee3d57))
- **Venafi TLS Protect Cloud Trigger Node:** Add Venafi TLS Protect Cloud Trigger ([#4288](https://github.com/n8n-io/n8n/issues/4288)) ([7a2e5bd](https://github.com/n8n-io/n8n/commit/7a2e5bde90976d5682f3bd3a6896da920ec3ea37))

### Performance Improvements

- **ci:** Sort CI steps by length ([#4243](https://github.com/n8n-io/n8n/issues/4243)) ([d47ff48](https://github.com/n8n-io/n8n/commit/d47ff48fb633cb93cc1df2be06f9608f4f23c14a))

### BREAKING CHANGES

- The Merge node list of operations was rearranged.

Merge node: 'Combine' operation was added with 'Combine Mode' option, operations 'Merge By Fields', 'Merge By Position' and 'Multiplex' placed under 'Combine Mode' option.
To update -go to the workflows that use the Merge node, select 'Combine' operation and then choose an option from 'Combination Mode' that matches an operation that was previously used. If you want to continue even on error, you can set "Continue on Fail" to true.

## [0.197.1](https://github.com/n8n-io/n8n/compare/n8n@0.197.0...n8n@0.197.1) (2022-10-10)

### Bug Fixes

- **editor:** Fix resource locator width for trigger nodes ([#4302](https://github.com/n8n-io/n8n/issues/4302)) ([845d1f8](https://github.com/n8n-io/n8n/commit/845d1f8bd9763e9b886ac70c7ccbd37ff1c24b43))

# [0.197.0](https://github.com/n8n-io/n8n/compare/n8n@0.196.0...n8n@0.197.0) (2022-10-10)

### Bug Fixes

- **cli:** Cache generated assets in user writable directory instead ([#4275](https://github.com/n8n-io/n8n/issues/4275)) ([e63eee2](https://github.com/n8n-io/n8n/commit/e63eee28e00ae01fe4db92ac1235d7be7f25b76d))
- **core:** Fix excess run for pinned trigger in partial execution ([#4185](https://github.com/n8n-io/n8n/issues/4185)) ([a751fd3](https://github.com/n8n-io/n8n/commit/a751fd3ce762df99490889153d36029ff4cd00da))
- **core:** Fix hooks URLs no longer added to `index.html` ([#4262](https://github.com/n8n-io/n8n/issues/4262)) ([cc2a2e4](https://github.com/n8n-io/n8n/commit/cc2a2e438b0dee703b40dab67b4770dc06c76a7e))
- **editor:** Fix `pairedItem` in combination with pinned data ([#4257](https://github.com/n8n-io/n8n/issues/4257)) ([e30c78f](https://github.com/n8n-io/n8n/commit/e30c78febeac8bfcfbe5f1c4c13122594d8a518e))
- **Github Trigger Node:** Fix issue with trigger not always activating ([#4284](https://github.com/n8n-io/n8n/issues/4284)) ([694f1ba](https://github.com/n8n-io/n8n/commit/694f1ba4f5780b2e9821db52e579883bbc289df4))
- **Microsoft Excel Node:** Fix issue with pagination when getting all items ([#4247](https://github.com/n8n-io/n8n/issues/4247)) ([1067ec0](https://github.com/n8n-io/n8n/commit/1067ec0f5bd8e57650ccd9924e01fc52fbf0c43c))
- **Microsoft ToDo Node:** Fix pagination issue when getting all items ([#4222](https://github.com/n8n-io/n8n/issues/4222)) ([4595b54](https://github.com/n8n-io/n8n/commit/4595b54e562c50c48bdfe8049cb170196713cc8b))

### Features

- **AWS Certificate Manager Node:** Add AWS Certificate Manager node ([#4263](https://github.com/n8n-io/n8n/issues/4263)) ([9b3f30d](https://github.com/n8n-io/n8n/commit/9b3f30d584901e7dc5fa87854e72f438f2557665))
- **AWS Elastic Load Balancer Node:** Add Elastic Load Balancer node ([#4264](https://github.com/n8n-io/n8n/issues/4264)) ([fac6efb](https://github.com/n8n-io/n8n/commit/fac6efbb4158aa713bf5472d27b6fe341db8047d))
- **Citrix ADC Node:** Add Citrix ADC node ([#4274](https://github.com/n8n-io/n8n/issues/4274)) ([7abc7e6](https://github.com/n8n-io/n8n/commit/7abc7e64082b60fa48f99f4b1f41d176fbb6d6ad))
- **Cloudflare Node:** Add Cloudflare node ([#4271](https://github.com/n8n-io/n8n/issues/4271)) ([94a02c6](https://github.com/n8n-io/n8n/commit/94a02c64928205c441af5515739fe8eab7160b33))
- **core:** Improve light versioning support in declarative node design ([#4254](https://github.com/n8n-io/n8n/issues/4254)) ([1b320cd](https://github.com/n8n-io/n8n/commit/1b320cd8c9b1e00257c03f92a175e3c9ab9f8030))
- **Crypto Node:** Add SHA3 support ([#4285](https://github.com/n8n-io/n8n/issues/4285)) ([9407fdd](https://github.com/n8n-io/n8n/commit/9407fddd21295b7bdf2757736b69b046a02e798c))
- **editor:** JSON mapping ([#4270](https://github.com/n8n-io/n8n/issues/4270)) ([19e333e](https://github.com/n8n-io/n8n/commit/19e333e6602648feacd80277e170d8af38ce06c4))
- **Venafi TLS Protect Cloud Node:** Add Venafi TLS Protect Cloud ([#4253](https://github.com/n8n-io/n8n/issues/4253)) ([d36e920](https://github.com/n8n-io/n8n/commit/d36e920997d55957385e4ab4d6734639a4c28648))
- **Venafi TLS Protect Datacenter Node:** Add Venafi TLS Protect Datacenter node ([#4255](https://github.com/n8n-io/n8n/issues/4255)) ([a14110e](https://github.com/n8n-io/n8n/commit/a14110e663caca8e886312a116805c41020ba812))

### Performance Improvements

- **tooling:** Upgrade to TypeScript 4.8 ([#4207](https://github.com/n8n-io/n8n/issues/4207)) ([9089dbe](https://github.com/n8n-io/n8n/commit/9089dbe94220f1789d2cea74608352a070e09bac))

# [0.196.0](https://github.com/n8n-io/n8n/compare/n8n@0.195.5...n8n@0.196.0) (2022-09-30)

### Bug Fixes

- **build:** Add typing for SSE channel ([#4196](https://github.com/n8n-io/n8n/issues/4196)) ([eaf13cd](https://github.com/n8n-io/n8n/commit/eaf13cdf759497816255926ccc4a60f176d36a1a))
- **build:** Fix lint issue to fix build ([#4232](https://github.com/n8n-io/n8n/issues/4232)) ([40795d6](https://github.com/n8n-io/n8n/commit/40795d6adf383ec09290ca2a9da7e6ebeeaffb03))
- **Trello Node:** cardId property not showing up for completed checklist in Trello ([#4186](https://github.com/n8n-io/n8n/issues/4186)) ([05d2275](https://github.com/n8n-io/n8n/commit/05d227571d53a93380aab05444c5de38e448a317))
- **cli:** Add git to all docker images ([#4189](https://github.com/n8n-io/n8n/issues/4189)) ([0b6a958](https://github.com/n8n-io/n8n/commit/0b6a9585d41992f5dcc1a5683adc3f36e43955af))
- **cli:** Disable `X-Powered-By: Express` Header ([#4224](https://github.com/n8n-io/n8n/issues/4224)) ([a8da9c3](https://github.com/n8n-io/n8n/commit/a8da9c31a95dabbbdc4eb67e5157dd5631ff3031))
- **cli:** Disable CORS on SSE connections in production ([#4190](https://github.com/n8n-io/n8n/issues/4190)) ([e6e4f29](https://github.com/n8n-io/n8n/commit/e6e4f297c697c3371743bc1e1b2524235c4aea19))
- **core:** Remove commented out lines ([6ac442a](https://github.com/n8n-io/n8n/commit/6ac442a2accdeb4e51a3333ac6c45c8bfde0608d))
- delete unused dependencies ([#4231](https://github.com/n8n-io/n8n/issues/4231)) ([737cbf9](https://github.com/n8n-io/n8n/commit/737cbf9694296b76bc6c19716ffd6d4dcccf1c18))
- **editor:** Add missing event handler to accordion component ([#4179](https://github.com/n8n-io/n8n/issues/4179)) ([e709cb5](https://github.com/n8n-io/n8n/commit/e709cb5fe28839cf314a511a5a40f374a8ad4647))
- **editor:** Fix storybook setup ([#4234](https://github.com/n8n-io/n8n/issues/4234)) ([43dc8e6](https://github.com/n8n-io/n8n/commit/43dc8e6da1970d7ea4bb67635c8b20354150c87d))
- **editor:** Fix `BASE_URL` replacement on windows ([#4202](https://github.com/n8n-io/n8n/issues/4202)) ([5f0c656](https://github.com/n8n-io/n8n/commit/5f0c65690b8dddd21f5a694d6e74980296c7fbb8))
- **editor:** Fix ParameterInput inputField ref focus ([#4215](https://github.com/n8n-io/n8n/issues/4215)) ([ed40397](https://github.com/n8n-io/n8n/commit/ed403972a929c710180b2ac47fa4057ec47c4a35))
- **editor:** Make lodash aliases work on case-sensitive filesystems ([#4233](https://github.com/n8n-io/n8n/issues/4233)) ([a381729](https://github.com/n8n-io/n8n/commit/a3817291d7795345542b63641e265fe8f29e8750))
- **editor:** Fix copy-pasting workflow into pin data code editor ([#4193](https://github.com/n8n-io/n8n/issues/4193)) ([a4f9f04](https://github.com/n8n-io/n8n/commit/a4f9f041a07bea641c09d517942393c24d5e4a37))
- **editor:** Fix run data footer overflow ([#4175](https://github.com/n8n-io/n8n/issues/4175)) ([20b0e14](https://github.com/n8n-io/n8n/commit/20b0e14f728cd9b77e993ee15e3bd276b102e427))
- **editor:** Fix run data pagination selector not showing ([#4187](https://github.com/n8n-io/n8n/issues/4187)) ([2b3a090](https://github.com/n8n-io/n8n/commit/2b3a0901aa07046dc68cc6ece6c015819835cfd4))
- **editor:** Fix run selector not opening ([#4199](https://github.com/n8n-io/n8n/issues/4199)) ([67513e1](https://github.com/n8n-io/n8n/commit/67513e191d82dfa97a477e38770fe610dd9fca65))
- **editor:** Updating leftover i18n references in NodeView ([#4236](https://github.com/n8n-io/n8n/issues/4236)) ([068c5db](https://github.com/n8n-io/n8n/commit/068c5db1eecd60d650c3646f62eeadfad42df470))
- **editor:** Updating wrong i18n string reference ([#4209](https://github.com/n8n-io/n8n/issues/4209)) ([80e2d65](https://github.com/n8n-io/n8n/commit/80e2d65933101e69dee98ba69e80156f2ad3b7a9))
- **editor:** Fix slow loading times for nodeTypes, node creator vuex reference, and pushConnection in settings views ([#4230](https://github.com/n8n-io/n8n/issues/4230)) ([d3c0d99](https://github.com/n8n-io/n8n/commit/d3c0d998679965f53fb170e0f476f7bd17665645))
- **Merge Node:** Update description in merge node ([47eb531](https://github.com/n8n-io/n8n/commit/47eb531e980b1998fdaaece5cf533dc3903dc796))
- **core:** Fix and harmonize all primaryDocumentation links ([#4191](https://github.com/n8n-io/n8n/issues/4191)) ([6e8e4f5](https://github.com/n8n-io/n8n/commit/6e8e4f5937eb257efcbb4ff37c6b9403a044eecf))
- **core:** Remove --forceExit flag from cli tests ([#4211](https://github.com/n8n-io/n8n/issues/4211)) ([faaeb52](https://github.com/n8n-io/n8n/commit/faaeb52a14a40b30ffe90cddb84c45af55acdf93))
- **Wekan Node:** Fix authentication with new versions of Wekan ([#4088](https://github.com/n8n-io/n8n/issues/4088)) ([764bd35](https://github.com/n8n-io/n8n/commit/764bd3522b72d6188f2425df0710d16c5b34a20b))
- **Wufoo Trigger Node:** Fix form names not being listed correctly ([#4151](https://github.com/n8n-io/n8n/issues/4151)) ([616d62a](https://github.com/n8n-io/n8n/commit/616d62aa8ef64952eb248b162176460a7ac65cc3))

### Features

- **editor:** Add support for unit testing using vitest in editor-ui ([#4184](https://github.com/n8n-io/n8n/issues/4184)) ([bb66e60](https://github.com/n8n-io/n8n/commit/bb66e60afcbf120f3f916339c983b881ea185487))
- **cli:** Optimise serving static assets ([#4182](https://github.com/n8n-io/n8n/issues/4182)) ([8b0ccc0](https://github.com/n8n-io/n8n/commit/8b0ccc017bab28903d57a91602331981e45077d9))
- **core:** Improve paired item and add additional variables ([#3765](https://github.com/n8n-io/n8n/issues/3765)) ([5526057](https://github.com/n8n-io/n8n/commit/5526057efc7d27a1373dc2c46beda2737ed54689))
- **editor:** Update ResourceLocator error text ([#4242](https://github.com/n8n-io/n8n/issues/4242)) ([b0397f0](https://github.com/n8n-io/n8n/commit/b0397f0262f8a921a0552179ca95cba5f03295ce))
- **editor:** Main navigation redesign ([#4144](https://github.com/n8n-io/n8n/issues/4144)) ([3db53a1](https://github.com/n8n-io/n8n/commit/3db53a193418db2554e00d7499457d7f400663e1)), closes [#4060](https://github.com/n8n-io/n8n/issues/4060)
- **HTTP Request Node:** Redesign and add the ability to import cURL commands ([#3860](https://github.com/n8n-io/n8n/issues/3860)) ([f37d6ba](https://github.com/n8n-io/n8n/commit/f37d6ba03bcac82a50b2e9ee60c29d6a1a4be911))
- **editor:** Migrate editor-ui to Vite.js and various DX improvements (N8N-2277) ([#4061](https://github.com/n8n-io/n8n/issues/4061)) ([27e2ce0](https://github.com/n8n-io/n8n/commit/27e2ce047060ca8bfdef43cb7fe50b58c9508375)), closes [#4069](https://github.com/n8n-io/n8n/issues/4069)
- **n8n Api node:** Add core node for consuming the n8n API ([#4076](https://github.com/n8n-io/n8n/issues/4076)) ([929315f](https://github.com/n8n-io/n8n/commit/929315f9e4b56d975783b7d069bdb163218aa7d5))
- **RabbitMQ Trigger Node:** Automatically reconnect on disconnect ([#4019](https://github.com/n8n-io/n8n/issues/4019)) ([23bd71b](https://github.com/n8n-io/n8n/commit/23bd71b82aafb4d894091a115a168a049c5f594c))
- **core:** Share unshared credentials with owner on reset ([#4216](https://github.com/n8n-io/n8n/issues/4216)) ([3b7de6d](https://github.com/n8n-io/n8n/commit/3b7de6db725cffbd5ee9f06aee00029d984fe7b8))
- **Slack Node:** Add operation get many for user resource ([#3150](https://github.com/n8n-io/n8n/issues/3150)) ([2714b4c](https://github.com/n8n-io/n8n/commit/2714b4ced786212906f79c11fae28819aae420e4))
- **WhatsApp Business node:** Add WhatsApp node ([#3659](https://github.com/n8n-io/n8n/issues/3659)) ([f63710a](https://github.com/n8n-io/n8n/commit/f63710a8923bd742f3259822870f3a2f0b7e04aa))

## [0.195.5](https://github.com/n8n-io/n8n/compare/n8n@0.195.4...n8n@0.195.5) (2022-09-23)

### Bug Fixes

- **editor:** Fix extract value logic for expressions ([#4178](https://github.com/n8n-io/n8n/issues/4178)) ([46f9562](https://github.com/n8n-io/n8n/commit/46f95622e38e0327c01927bc41f4ea3c413db466))

## [0.195.4](https://github.com/n8n-io/n8n/compare/n8n@0.195.3...n8n@0.195.4) (2022-09-22)

### Bug Fixes

- **core:** Fix resolve RL values in expressions ([#4173](https://github.com/n8n-io/n8n/issues/4173)) ([469c391](https://github.com/n8n-io/n8n/commit/469c391fee70479d8095a90e6eb525032a0e02a5))

### Features

- **editor-ui:** Resizable main panel ([#3980](https://github.com/n8n-io/n8n/issues/3980)) ([d01f7d4](https://github.com/n8n-io/n8n/commit/d01f7d4d93366054075fdfcadfdff5cf03913472)), closes [#3930](https://github.com/n8n-io/n8n/issues/3930)

## [0.195.3](https://github.com/n8n-io/n8n/compare/n8n@0.195.2...n8n@0.195.3) (2022-09-22)

### Bug Fixes

- **editor:** Fix expressions bug with numbers and booleans ([#4169](https://github.com/n8n-io/n8n/issues/4169)) ([19d08e6](https://github.com/n8n-io/n8n/commit/19d08e641896fa9b1c9edf04505eac213e1de71a))
- **MSSQL Node:** Support tdsVersion option ([89d2d10](https://github.com/n8n-io/n8n/commit/89d2d10c520482f47ddd755e76b0bdf3d45e6008))

## [0.195.2](https://github.com/n8n-io/n8n/compare/n8n@0.195.1...n8n@0.195.2) (2022-09-22)

### Bug Fixes

- **core:** Fix mysql migration ([#4166](https://github.com/n8n-io/n8n/issues/4166)) ([0aeb55d](https://github.com/n8n-io/n8n/commit/0aeb55dcfd6c107c67e4c974e3371e29e188310b))

## [0.195.1](https://github.com/n8n-io/n8n/compare/n8n@0.195.0...n8n@0.195.1) (2022-09-21)

### Bug Fixes

- **core:** Fix postgres migration ([#4164](https://github.com/n8n-io/n8n/issues/4164)) ([2598ec8](https://github.com/n8n-io/n8n/commit/2598ec8a3e7a7d4e444cd4767d5944fa691dd9e1))

# [0.195.0](https://github.com/n8n-io/n8n/compare/n8n@0.194.0...n8n@0.195.0) (2022-09-21)

### Bug Fixes

- **Box Node:** Fix issue with response data not being returned ([#4147](https://github.com/n8n-io/n8n/issues/4147)) ([3cfc5b5](https://github.com/n8n-io/n8n/commit/3cfc5b55abe6aba3b68ae27846cd18e3ec79b518))
- **cli:** Fix issue with n8n crashing when error in poll method ([#4008](https://github.com/n8n-io/n8n/issues/4008)) ([6c41b29](https://github.com/n8n-io/n8n/commit/6c41b29ad2c1fffc5710d06250037e2a278b9b4a))
- **editor:** Fix broken output panel for wait node executions ([#4156](https://github.com/n8n-io/n8n/issues/4156)) ([40ebbea](https://github.com/n8n-io/n8n/commit/40ebbeaefc3a8c0e730468cd8171590dc823106c))
- **core:** Prevent calls to constructor to forbid arbitrary code execution ([#4139](https://github.com/n8n-io/n8n/issues/4139)) ([a8030db](https://github.com/n8n-io/n8n/commit/a8030dbda5b17ee158ac7ef7f586f212698252f7))
- **HTTP Node:** Fix instance crashing when batching enabled ([#3902](https://github.com/n8n-io/n8n/issues/3902)) ([0ab89ad](https://github.com/n8n-io/n8n/commit/0ab89ad5d66c1082ec2464813a9622431fa7f230))
- **public-api:** Create correct OAuth2 credential schema ([#4111](https://github.com/n8n-io/n8n/issues/4111)) ([28ab4f6](https://github.com/n8n-io/n8n/commit/28ab4f66f096eb6ec483e344bffe98b9a81520c6))
- **Xero Node:** fix line amount types being ignored when creating new invoices ([#4146](https://github.com/n8n-io/n8n/issues/4146)) ([3e2e9e6](https://github.com/n8n-io/n8n/commit/3e2e9e6009301006be7c7e96444ff4bbf824358c))

### Features

- **editor:** Add resource locator parameter ([#3932](https://github.com/n8n-io/n8n/issues/3932)) ([ad73f89](https://github.com/n8n-io/n8n/commit/ad73f8995c34a664391dcc467aca55f44f4bde71))
- **cli:** User Management and Credentials sharing ([#3602](https://github.com/n8n-io/n8n/issues/3602)) ([97cd564](https://github.com/n8n-io/n8n/commit/97cd564f7b4c5ba1472e517e0d54897b2cabcc26))

### Performance Improvements

- **ci:** Cache npm dependencies ([#4138](https://github.com/n8n-io/n8n/issues/4138)) ([1bdc102](https://github.com/n8n-io/n8n/commit/1bdc102892e77f2723ffed383874092cf4e07810))

# [0.194.0](https://github.com/n8n-io/n8n/compare/n8n@0.193.5...n8n@0.194.0) (2022-09-15)

### Bug Fixes

- AWS credential testing issue ([#4107](https://github.com/n8n-io/n8n/issues/4107)) ([5130529](https://github.com/n8n-io/n8n/commit/51305290663dc4bc05cdbb075d685673217081f9))
- **cli,core:** Address Dependabot warnings [N8N-4121] ([#3883](https://github.com/n8n-io/n8n/issues/3883)) ([461848f](https://github.com/n8n-io/n8n/commit/461848fcc4a33b0adf9958bebb2557bfa15100d6))
- **cli:** Avoid scanning unnecessary directories on windows ([#4082](https://github.com/n8n-io/n8n/issues/4082)) ([84b56eb](https://github.com/n8n-io/n8n/commit/84b56eb48e727389189c517598aadadd6f2ccf23)), closes [#4007](https://github.com/n8n-io/n8n/issues/4007)
- **cli:** Load nodes and credentials on windows using the correct file-path ([#4084](https://github.com/n8n-io/n8n/issues/4084)) ([b6c1187](https://github.com/n8n-io/n8n/commit/b6c1187922ab6552e303c98341c5732ffa96c55f))
- **cli:** Password reset should trigger internal and external hooks ([#4066](https://github.com/n8n-io/n8n/issues/4066)) ([12507d3](https://github.com/n8n-io/n8n/commit/12507d39d68a2961c6e567b6b7d83759010918b0))
- **cli:** Use absolute paths for loading custom nodes and credentials ([#4099](https://github.com/n8n-io/n8n/issues/4099)) ([43c9f01](https://github.com/n8n-io/n8n/commit/43c9f019bd3e25215134970570c574da663dd3e0)), closes [#4082](https://github.com/n8n-io/n8n/issues/4082)
- **core & Function nodes:** Update function nodes to work with binary-data-mode 'filesystem'. ([#3845](https://github.com/n8n-io/n8n/issues/3845)) ([f6064ef](https://github.com/n8n-io/n8n/commit/f6064ef278bb481a78942af3af9675f29e59045b)), closes [#1](https://github.com/n8n-io/n8n/issues/1)
- **core:** Fix issue with returnJsonArray helper breaking nodes that return no data ([3de0e22](https://github.com/n8n-io/n8n/commit/3de0e228cb78f292ead4d0103040d2c00943deae))
- **core:** Fix node renaming in expressions ([381c09f](https://github.com/n8n-io/n8n/commit/381c09fa47212a12f6c7bc166ac641afd97c9681))
- **core:** Update oauth endpoints to use instance base url ([dd3ba96](https://github.com/n8n-io/n8n/commit/dd3ba963723fbdef7d4239f0890c0776bffd062e))
- **eslint:** Setup eslint to run on every package ([#4050](https://github.com/n8n-io/n8n/issues/4050)) ([69eb979](https://github.com/n8n-io/n8n/commit/69eb97999da0543308285ebc834f3454c2eea727))
- **GoogleBigQuery Node:** Fix empty response when creating records ([#4056](https://github.com/n8n-io/n8n/issues/4056)) ([9f92a4d](https://github.com/n8n-io/n8n/commit/9f92a4d681918cb8d9f0d5b0bd322b93da0ba3ef))
- **Hubspot Node:** Correct canvas name of HubSpot node ([#4054](https://github.com/n8n-io/n8n/issues/4054)) ([e1025e8](https://github.com/n8n-io/n8n/commit/e1025e888c56995d284e0b5889af2e93b57ad3eb))
- Issue with versioned nodes not loading properly ([#4094](https://github.com/n8n-io/n8n/issues/4094)) ([9e1fa4c](https://github.com/n8n-io/n8n/commit/9e1fa4c0459b0bebe725f5e6db84104bcd37690d))
- **MongoDB Node:** Update mongo driver to 4.9.1 ([#4095](https://github.com/n8n-io/n8n/issues/4095)) ([f70e6d2](https://github.com/n8n-io/n8n/commit/f70e6d23455b5b380ffb607100e0090203e31047))
- **node:** Google Cloud Storage linting rules ([36ec81f](https://github.com/n8n-io/n8n/commit/36ec81f62489a7bc3442e46048f92d2ae9de1ce7))
- **public-api:** Fix error updating workflow with property not defined in the schema ([#4089](https://github.com/n8n-io/n8n/issues/4089)) ([f40ae50](https://github.com/n8n-io/n8n/commit/f40ae501b4dca8f00db41d8fc07b496ad06cf10f))
- **typescript:** Use consistent typescript configs ([#4049](https://github.com/n8n-io/n8n/issues/4049)) ([9267e8f](https://github.com/n8n-io/n8n/commit/9267e8fb1283794e7ebc109772e584b0471bef27))
- **workflow:** Remove a few `ts-ignore` and `eslint-disable` ([#3958](https://github.com/n8n-io/n8n/issues/3958)) ([a73ac1d](https://github.com/n8n-io/n8n/commit/a73ac1d94f5081051d1280b7ebc467f22e3d100d))

### Features

- **Adalo Node:** Add Adalo node ([#3102](https://github.com/n8n-io/n8n/issues/3102)) ([9a59d0a](https://github.com/n8n-io/n8n/commit/9a59d0a5d10b83ed4642e59c16310a436fd92a7a))
- **cli:** Load all nodes and credentials code in isolation ([#3906](https://github.com/n8n-io/n8n/issues/3906)) ([b450e97](https://github.com/n8n-io/n8n/commit/b450e977a32944a5289db2553bf12bdef4e1d3b3))
- **core, editor-ui:** Introduce node deprecation ([#4103](https://github.com/n8n-io/n8n/issues/4103)) ([98ed207](https://github.com/n8n-io/n8n/commit/98ed2076072858109f5ed512786af61dff0314d6))
- **editor:** Implement HTML sanitization for Notification and Message components ([#4081](https://github.com/n8n-io/n8n/issues/4081)) ([ea2d18b](https://github.com/n8n-io/n8n/commit/ea2d18b66dba1393a0425b5074884b782f959e5c))
- **editor:** Show input number for multi-input nodes ([#4000](https://github.com/n8n-io/n8n/issues/4000)) ([8c95d6e](https://github.com/n8n-io/n8n/commit/8c95d6ec53b735cc322a3b5f2a5a78002ae8441a))
- **gmail:** Overhaul Gmail node + create gmail trigger ([#3734](https://github.com/n8n-io/n8n/issues/3734)) ([74304db](https://github.com/n8n-io/n8n/commit/74304db4e2ae66b82695244d07c6ff8a9ffe37cf))
- **Google Cloud Storage Node:** Add GCS Node with Bucket and Object operations ([1e963d8](https://github.com/n8n-io/n8n/commit/1e963d8e1ed6956e8af02e70da304211aa725ea1))
- **Merge Node:** Overhaul of merge node ([f1a5697](https://github.com/n8n-io/n8n/commit/f1a569791d5289ced8ac78d97452f6ad5bf8d1b8))
- **typescript:** Setup Typescript incremental builds ([#3876](https://github.com/n8n-io/n8n/issues/3876)) ([799676b](https://github.com/n8n-io/n8n/commit/799676b24d9ba5628dc875de1c0bbcf7e51a51cc))

## [0.193.5](https://github.com/n8n-io/n8n/compare/n8n@0.193.4...n8n@0.193.5) (2022-09-07)

### Bug Fixes

- **editor:** Disable editing in Function nodes in executions view ([#4041](https://github.com/n8n-io/n8n/issues/4041)) ([772836a](https://github.com/n8n-io/n8n/commit/772836abc7d81fce74547dd3644c45eaea9c0a75))
- **editor:** use correct attribute on button to make it full width ([#4048](https://github.com/n8n-io/n8n/issues/4048)) ([b26545d](https://github.com/n8n-io/n8n/commit/b26545d94c9b718e20580e511aab676e98de66dc))
- **editor:** Wrong popup title when "Click To Copy" on OAuth2 Redirect Url credentials ([#4043](https://github.com/n8n-io/n8n/issues/4043)) ([0acac35](https://github.com/n8n-io/n8n/commit/0acac355e1bfff326d3bb575d5b21f0004a0c792))
- **Gmail Node:** Fix node and improve helper so to avoid double wrapping in json key ([#4052](https://github.com/n8n-io/n8n/issues/4052)) ([fbd044b](https://github.com/n8n-io/n8n/commit/fbd044bf874f270c9f9e7cda9aaecdc235ddc677))

## [0.193.4](https://github.com/n8n-io/n8n/compare/n8n@0.193.3...n8n@0.193.4) (2022-09-06)

### Bug Fixes

- **AWS Nodes:** Handle query string and body properly for AWS related requests ([#4039](https://github.com/n8n-io/n8n/issues/4039)) ([103f04e](https://github.com/n8n-io/n8n/commit/103f04e4eba08a1cd888e71073cf24178a2b52ba))
- **AWS Lambda Node:** Fix json data being sent to AWS Lambda as string ([#4029](https://github.com/n8n-io/n8n/issues/4029)) ([c28f69b](https://github.com/n8n-io/n8n/commit/c28f69b276fe46c42dfb62753b565ebae37431f5))
- **Beeminder Node:** Fix request id not being sent when creating a new datapoint ([73c5210](https://github.com/n8n-io/n8n/commit/73c52102949274c4c67ae34c458a6afa9520c150))
- **cli:** Include "auth-excluded" endpoints on the history middleware as well ([#4028](https://github.com/n8n-io/n8n/issues/4028)) ([d554128](https://github.com/n8n-io/n8n/commit/d55412845784fda4d42a1dcaca60515ad10d2aa0))
- **core:** Fix MySQL migration issue with table prefix ([#4013](https://github.com/n8n-io/n8n/issues/4013)) ([fc6484b](https://github.com/n8n-io/n8n/commit/fc6484ba4d48363fd846d5c800a25a207082f58d))
- Correct all the spelling typos ([#3960](https://github.com/n8n-io/n8n/issues/3960)) ([49c85a1](https://github.com/n8n-io/n8n/commit/49c85a1df8417918797c3fe6db46f35f9fe86bdf))
- Fix n8n-square-button import. ([#4024](https://github.com/n8n-io/n8n/issues/4024)) ([bbd967b](https://github.com/n8n-io/n8n/commit/bbd967bbdfb744874eeae5aced7ce122039b59d5))
- **GitHub Node:** Fix binary data not being returned ([#4017](https://github.com/n8n-io/n8n/issues/4017)) ([5753110](https://github.com/n8n-io/n8n/commit/575311040261be2982a3c7107bf1ea8b7b63fbb5))
- **GraphQL Node:** Fix issue with return items ([#4016](https://github.com/n8n-io/n8n/issues/4016)) ([6216132](https://github.com/n8n-io/n8n/commit/6216132ae2f3b908aacf266f4a34143bb8a74f0a))
- **Postgres Node:** Fix ssue with postgres insert and paired item ([#4020](https://github.com/n8n-io/n8n/issues/4020)) ([9314086](https://github.com/n8n-io/n8n/commit/9314086b6a84ce0f24992827ab316dee4709d118))
- **Kafka Trigger Node:** fix kafka trigger not working with default max requests value ([71cae90](https://github.com/n8n-io/n8n/commit/71cae90679d9d6fe4cf0dc898827cc9cd4457873))
- **MonicaCrm Node:** Fix pagination when using return all ([82827d0](https://github.com/n8n-io/n8n/commit/82827d0a12e889b2fdebd422bd1fcb483860599e))
- **Node Gmail:** Fix bug related to paired items ([2746905](https://github.com/n8n-io/n8n/commit/2746905570c2056abf9c388cc28c7d1d7b9f5102))
- **Raindrop Node:** Fix issue refreshing OAuth2 credentials ([3163742](https://github.com/n8n-io/n8n/commit/3163742fd7ae0afa86919e5f473be3d2bd88282b))
- **Shopify Node:** Fix pagination when empty fields are sent ([071ab40](https://github.com/n8n-io/n8n/commit/071ab40c9fa523b8ee47c9428ee6078e43985816))

### Features

- Add possibility to configure stop time for workers ([#4012](https://github.com/n8n-io/n8n/issues/4012)) ([a3791c2](https://github.com/n8n-io/n8n/commit/a3791c22b3f0be16324e1223aa719e6f122a51c1))
- **cli:** Add external hooks for when members are added or deleted ([#3988](https://github.com/n8n-io/n8n/issues/3988)) ([6be9997](https://github.com/n8n-io/n8n/commit/6be999714f62f22ec5d8ab82f91f7fc5a2b55c4d))
- **editor:** Use i18n component instead od v-html for localization ([287533e](https://github.com/n8n-io/n8n/commit/287533e6c819329dc84f2e23a33faed66181d07a))

## [0.193.3](https://github.com/n8n-io/n8n/compare/n8n@0.193.2...n8n@0.193.3) (2022-09-01)

### Bug Fixes

- **cli:** Initialize mailer just if connection can be verified ([#3997](https://github.com/n8n-io/n8n/issues/3997)) ([936cb11](https://github.com/n8n-io/n8n/commit/936cb117895695f9519f0debb3bcac275d98eda8))
- **core:** Fix disabled parent output in partial execution ([#3946](https://github.com/n8n-io/n8n/issues/3946)) ([c8743ff](https://github.com/n8n-io/n8n/commit/c8743ff6cad1563d31d4d39ffa742726830a4f38))
- **nodes:** Remove duplicate wrap of paired item data ([#4001](https://github.com/n8n-io/n8n/issues/4001)) ([54efe20](https://github.com/n8n-io/n8n/commit/54efe20ee4834fbf9306be161b36f115b9eb0834))

### Features

- **nodes:** Add database and non http credentials test ([d82e879](https://github.com/n8n-io/n8n/commit/d82e87979dc0fe47e264b0e7bb46c325157d9603))
- **Mongo DB Node:** Add MongoDB credential testing and two operations ([#3901](https://github.com/n8n-io/n8n/issues/3901)) ([b5511e5](https://github.com/n8n-io/n8n/commit/b5511e5ac7745c6b4a20aa49d2633f2f91bdbb7b))

## [0.193.2](https://github.com/n8n-io/n8n/compare/n8n@0.193.1...n8n@0.193.2) (2022-09-01)

### Bug Fixes

- **docker:** n8n docker image needs su-exec ([#3993](https://github.com/n8n-io/n8n/issues/3993)) ([aec2489](https://github.com/n8n-io/n8n/commit/aec2489aefb8fca522302bdcaa002fa62393b70a))
- **docker:** Revert docker `USER` and `WORKDIR` changes ([#3992](https://github.com/n8n-io/n8n/issues/3992)) ([34a99fd](https://github.com/n8n-io/n8n/commit/34a99fd089a754170ed4f2b9bdc02fc951d7e9bc))
- **core:** Fix OAuth2 issues ([#3391](https://github.com/n8n-io/n8n/pull/3991))

## [0.193.1](https://github.com/n8n-io/n8n/compare/n8n@0.193.0...n8n@0.193.1) (2022-08-31)

### Bug Fixes

- **editor:** Fix bug where col headers don't show ([#3985](https://github.com/n8n-io/n8n/issues/3985)) ([bee3840](https://github.com/n8n-io/n8n/commit/bee38400505b8862a4e1e5bf28b18088ff8ced8f))

# [0.193.0](https://github.com/n8n-io/n8n/compare/n8n@0.192.2...n8n@0.193.0) (2022-08-31)

### Bug Fixes

- **ci:** Setup a separate workflow action to test for pushes on master ([#3951](https://github.com/n8n-io/n8n/issues/3951)) ([1f9bdd0](https://github.com/n8n-io/n8n/commit/1f9bdd09a29a5e0564ddc874814eaf36d9380ee7))
- **core:** Make digest auth work with query params ([087d3f9](https://github.com/n8n-io/n8n/commit/087d3f99f1f5c38db763686c10c6181e20c08307))
- **editor:** Sending data as query on DELETE method ([#3972](https://github.com/n8n-io/n8n/issues/3972)) ([fc2ff35](https://github.com/n8n-io/n8n/commit/fc2ff35c412b1c10471659c91dc0fe11a3363495))
- Fix credentials_entity table migration for mysql ([#3979](https://github.com/n8n-io/n8n/issues/3979)) ([349826e](https://github.com/n8n-io/n8n/commit/349826e87fdb03a9f378422ecfac83d42bb5a376))
- **npm:** Improve .npmignore to reduce the size of the published packages ([#3970](https://github.com/n8n-io/n8n/issues/3970)) ([15d5ac6](https://github.com/n8n-io/n8n/commit/15d5ac6f3c7732374f07726c5697ba341eb9aa70))

### Features

- **design-system,editor-ui:** Upgrade some of the frontend dev dependencies ([#3978](https://github.com/n8n-io/n8n/issues/3978)) ([b428e9f](https://github.com/n8n-io/n8n/commit/b428e9fb9ffb506c97f91d45072e32241a3b07d6))
- **docker:** Reduce the size of alpine docker images ([#3973](https://github.com/n8n-io/n8n/issues/3973)) ([398adb2](https://github.com/n8n-io/n8n/commit/398adb23e8785c92478c4d80c944e60e9278ffdf))
- **editor:** Limit when to show mapping tooltip ([#3976](https://github.com/n8n-io/n8n/issues/3976)) ([8fc9f07](https://github.com/n8n-io/n8n/commit/8fc9f07f39edf8944214200dd787b2d0c9b6caff))
- **HighLevel Node:** Add HighLevel node ([c2e97a8](https://github.com/n8n-io/n8n/commit/c2e97a89f923bbebe0a6d882e86d792fcda3116d))

## [0.192.2](https://github.com/n8n-io/n8n/compare/n8n@0.192.1...n8n@0.192.2) (2022-08-25)

### Bug Fixes

- **editor:** Fix feature flag check when PH is unavailable ([#3944](https://github.com/n8n-io/n8n/issues/3944)) ([93c26da](https://github.com/n8n-io/n8n/commit/93c26dac286e8fa984cb6fb6fecd6167fc4143f3))
- **editor:** fix mapping bug when val is null ([#3942](https://github.com/n8n-io/n8n/issues/3942)) ([a21dbdc](https://github.com/n8n-io/n8n/commit/a21dbdc45b6f434f7ecd8b541bb32d397fd95c89))

## [0.192.1](https://github.com/n8n-io/n8n/compare/n8n@0.192.0...n8n@0.192.1) (2022-08-25)

### Bug Fixes

- **cli:** Account for non-array in pindata migration ([#3938](https://github.com/n8n-io/n8n/issues/3938)) ([f052187](https://github.com/n8n-io/n8n/commit/f0521873e1acf8c6491b75f37be1dd824bb355bc))

# [0.192.0](https://github.com/n8n-io/n8n/compare/n8n@0.191.1...n8n@0.192.0) (2022-08-24)

### Bug Fixes

- **cli:** Account for unparseable string in JSON key migration ([#3927](https://github.com/n8n-io/n8n/issues/3927)) ([ab45898](https://github.com/n8n-io/n8n/commit/ab45898a69dd9354cdb365187dec0d58a1836418))
- **cli:** Fix excessive instantiation type error for flattened execution ([#3921](https://github.com/n8n-io/n8n/issues/3921)) ([1d4f92a](https://github.com/n8n-io/n8n/commit/1d4f92a6575a7af6dbd4f03b61202cb56badf6a1))
- **cli:** Init nodes dir to ensure `npm install` succeeds ([#3934](https://github.com/n8n-io/n8n/issues/3934)) ([2d6eea8](https://github.com/n8n-io/n8n/commit/2d6eea82d324d4560f7445d87647ce0d5e87c678))
- **cli:** tsc build errors should fail turborepo builds as well ([#3923](https://github.com/n8n-io/n8n/issues/3923)) ([f22bd28](https://github.com/n8n-io/n8n/commit/f22bd2805d87c552d92d0da0313bf7f9c498f103))
- **core:** Account for enabled state in first pinned trigger ([#3912](https://github.com/n8n-io/n8n/issues/3912)) ([6bd7a09](https://github.com/n8n-io/n8n/commit/6bd7a09a455b61eae5edad1d93e8a7e00c0c68b3))
- **core:** Fix pinned trigger execution ([#3895](https://github.com/n8n-io/n8n/issues/3895)) ([17799cd](https://github.com/n8n-io/n8n/commit/17799cda46ad764f537d9546346ab4e04e36e681))
- **NextCloud Node:** Fix issue with credential verification and sharing file ([2b4f5c6](https://github.com/n8n-io/n8n/commit/2b4f5c6c785ab6ffc7198f60369886c44dea6ef2))
- **Freshdesk Node:** Fix issue when getAll operation requires non existent options ([329fe95](https://github.com/n8n-io/n8n/commit/329fe9581f63fe44daba5ef79724d9339cb8c813))

### Features

- **cli:** Notify external hooks about user profile and password changes ([#3919](https://github.com/n8n-io/n8n/issues/3919)) ([7d74dda](https://github.com/n8n-io/n8n/commit/7d74ddab29e05a81962fd80469248e8cee8bf9bf))
- **core, editor:** Support `pairedItem` for pinned data ([#3843](https://github.com/n8n-io/n8n/issues/3843)) ([b1e7152](https://github.com/n8n-io/n8n/commit/b1e715299d8a78188fad413392babdea7d044049))
- **core:** Add command to scripts for easy launch n8n with tunnel ([725a567](https://github.com/n8n-io/n8n/commit/725a567f07c08767f58d4ceb88386a9be694bfd2))
- **editor, core:** Integrate PostHog ([#3865](https://github.com/n8n-io/n8n/issues/3865)) ([43e054f](https://github.com/n8n-io/n8n/commit/43e054f5abae87b989ffe391a251961a2bc05542))
- **editor:** Map expressions from input table ([#3864](https://github.com/n8n-io/n8n/issues/3864)) ([ce076dc](https://github.com/n8n-io/n8n/commit/ce076dca48847562067c5149ecdd529fcc014e3f))

## [0.191.1](https://github.com/n8n-io/n8n/compare/n8n@0.191.0...n8n@0.191.1) (2022-08-19)

### Bug Fixes

- **editor:** Fix issue with disappearing connections after rename ([#3899](https://github.com/n8n-io/n8n/issues/3899)) ([ad0c214](https://github.com/n8n-io/n8n/commit/ad0c214f8ec2088ff30f408fe5ec51216468cdff))

# [0.191.0](https://github.com/n8n-io/n8n/compare/n8n@0.190.0...n8n@0.191.0) (2022-08-17)

### Bug Fixes

- **cli:** Fix community nodes tests on Postgres and MySQL ([#3861](https://github.com/n8n-io/n8n/issues/3861)) ([620525e](https://github.com/n8n-io/n8n/commit/620525ea85b7de24c0c5f3d3b57350a0a578d9b4))
- **core:** Fix issue with not displayed child workflow executions ([#3867](https://github.com/n8n-io/n8n/issues/3867)) ([f782bcd](https://github.com/n8n-io/n8n/commit/f782bcd52dbe364d1fca1bd29c9222f434df90ae))
- **editor:** Handling errors when opening settings and executions ([#3877](https://github.com/n8n-io/n8n/issues/3877)) ([762b422](https://github.com/n8n-io/n8n/commit/762b4224888cc5949eced048729fe313ec055f1c))
- **editor:** Improve expression and parameters performance ([#3874](https://github.com/n8n-io/n8n/issues/3874)) ([3608d13](https://github.com/n8n-io/n8n/commit/3608d132c0fbdb193758ba9a9c0f1da725d2313a))
- **public-api:** Fix executions pagination in Postgres and Mysql ([52015a6](https://github.com/n8n-io/n8n/commit/52015a6f033eae5c2ea9ac125a7c947d96ce7463))

### Features

- **cli:** Enable community nodes based on npm availability ([#3871](https://github.com/n8n-io/n8n/issues/3871)) ([936264b](https://github.com/n8n-io/n8n/commit/936264b3c6506cdc25b9ad55a23b314b2582275b))
- **editor:** Added animated tooltips to draggable columns in input panel ([054cc01](https://github.com/n8n-io/n8n/commit/054cc010edfc9f0f5cc72ac94f26afe52a66a192))

# [0.190.0](https://github.com/n8n-io/n8n/compare/n8n@0.189.1...n8n@0.190.0) (2022-08-10)

### Bug Fixes

- **core:** Fix crash caused by parallel test-webhook calls ([#3756](https://github.com/n8n-io/n8n/issues/3756)) ([8fe71db](https://github.com/n8n-io/n8n/commit/8fe71dba4bf568e70ed740ac3413aae77559ca3c))
- **core:** Fix issue that static data did not get saved for poll-triggers ([#3853](https://github.com/n8n-io/n8n/issues/3853)) ([8311abc](https://github.com/n8n-io/n8n/commit/8311abcf9d453f0d253c269e7d1c3842fcf8e256))
- **GitHub Trigger:** Fix typo ([#3859](https://github.com/n8n-io/n8n/issues/3859)) ([7b3d6de](https://github.com/n8n-io/n8n/commit/7b3d6de44eeb6cb066fb378c52fcc5aec60c4fdf))
- **public-api:** fix issue paginating executions ([b9fe707](https://github.com/n8n-io/n8n/commit/b9fe707cbd9df4a33b6040215826375bef238b65))

### Features

- Synchronize default VSCode settings ([#3833](https://github.com/n8n-io/n8n/issues/3833)) ([11461fd](https://github.com/n8n-io/n8n/commit/11461fda5fae10077ea9804b5cc9581074107005))

## [0.189.1](https://github.com/n8n-io/n8n/compare/n8n@0.189.0...n8n@0.189.1) (2022-08-05)

### Bug Fixes

- Fix issue with MySQL/MariaDB migration ([#3832](https://github.com/n8n-io/n8n/issues/3832))

# [0.189.0](https://github.com/n8n-io/n8n/compare/n8n@0.188.0...n8n@0.189.0) (2022-08-03)

### Bug Fixes

- **editor:** Fix label cut off ([#3820](https://github.com/n8n-io/n8n/issues/3820)) ([0f27be4](https://github.com/n8n-io/n8n/commit/0f27be4447662056a2ba13c027280830f7eab09b))
- Fix problem saving workflow when tags disabled ([#3792](https://github.com/n8n-io/n8n/issues/3792)) ([f0dddaa](https://github.com/n8n-io/n8n/commit/f0dddaa2a585715b35e26b16e1003e1683ab9402))

### Features

- **NocoDB Node:** Add support v0.90.0+ ([#3146](https://github.com/n8n-io/n8n/issues/3146)) ([d65a9ed](https://github.com/n8n-io/n8n/commit/d65a9ed118ff16c67b6d69d68108d8b7da1814d9))
- **SendInBlue Node:** Add SendInBlue Regular + Trigger Node ([#3746](https://github.com/n8n-io/n8n/issues/3746)) ([74cedd9](https://github.com/n8n-io/n8n/commit/74cedd94a82f0c053a24b6e925d9e3bcadcebfbc))
- Support community nodes on Windows ([#3823](https://github.com/n8n-io/n8n/issues/3823)) ([e8eda74](https://github.com/n8n-io/n8n/commit/e8eda7470a17deec1f5eab8cded6e74a8e3aee39))

# [0.188.0](https://github.com/n8n-io/n8n/compare/n8n@0.187.2...n8n@0.188.0) (2022-07-27)

### Bug Fixes

- **AWS DynamoDB Node:** Fix expression attribute names ([#3763](https://github.com/n8n-io/n8n/issues/3763)) ([88cb265](https://github.com/n8n-io/n8n/commit/88cb26556c162aa1281dfa6a9fa8eca4cd071e9d))
- **core:** Add windows support to import:credentials --separate ([#3589](https://github.com/n8n-io/n8n/issues/3589)) ([2fb590e](https://github.com/n8n-io/n8n/commit/2fb590e8440ac35567fdbf745b294d79feb8c5a9))
- **editor:** Fix linking buttons color ([#3770](https://github.com/n8n-io/n8n/issues/3770)) ([deb510a](https://github.com/n8n-io/n8n/commit/deb510a8e0057280da43f3b3e72d8acca5829745))
- **editor:** Fix pin data in executions when pinData is null. ([#3787](https://github.com/n8n-io/n8n/issues/3787)) ([30c0f21](https://github.com/n8n-io/n8n/commit/30c0f21b3f37280403848592877cb8658367b85e))
- **editor:** Fix spaces bug ([#3774](https://github.com/n8n-io/n8n/issues/3774)) ([02549e3](https://github.com/n8n-io/n8n/commit/02549e3ba9233a6d9f75fc1f9ff138e2aff7f4b9))
- **editor:** Fix sticky duplication and position bug ([#3755](https://github.com/n8n-io/n8n/issues/3755)) ([92614c8](https://github.com/n8n-io/n8n/commit/92614c81abfdbca51d4901b364467d3505870255))
- **editor:** Restore pindata header colors ([#3758](https://github.com/n8n-io/n8n/issues/3758)) ([1a7318b](https://github.com/n8n-io/n8n/commit/1a7318b4cf6081e5ba743117cf90ef6920625aa0))
- Fix node_type property in all events ([#3759](https://github.com/n8n-io/n8n/issues/3759)) ([1f1a63c](https://github.com/n8n-io/n8n/commit/1f1a63c39adc673259c951af3e5152c5edc34968))
- **Fix Rocketchat Node:** Fix authentication issue ([#3778](https://github.com/n8n-io/n8n/issues/3778)) ([2710061](https://github.com/n8n-io/n8n/commit/271006152386511c19feb54e438fa60966dbf705))
- **Mautic Node:** Fix authentication issue ([#3761](https://github.com/n8n-io/n8n/issues/3761)) ([fe58769](https://github.com/n8n-io/n8n/commit/fe58769b4830f388ad67ae1c32fcaa55aa0b848e))

### Features

- Improvements to pairedItem ([1348349](https://github.com/n8n-io/n8n/commit/13483497484e205975ef71091e3892f757f608e1))
- **Item List Node:** Add operation for creating array from input items ([#3149](https://github.com/n8n-io/n8n/issues/3149)) ([553b14a](https://github.com/n8n-io/n8n/commit/553b14a13c7c9056447ef0b18c9427f26221b44d))
- **Kafka Trigger Node:** Add additional options ([#3600](https://github.com/n8n-io/n8n/issues/3600)) ([3496a39](https://github.com/n8n-io/n8n/commit/3496a39788b654b46485955ba5cce5e5865babc7))
- **Metabase Node:** Add Metabase Node ([#3033](https://github.com/n8n-io/n8n/issues/3033)) ([81b5828](https://github.com/n8n-io/n8n/commit/81b58285588f142c0b1cc148f0092c462eefdd73))

## [0.187.2](https://github.com/n8n-io/n8n/compare/n8n@0.187.1...n8n@0.187.2) (2022-07-21)

### Bug Fixes

- **editor:** Fix console error ([#3751](https://github.com/n8n-io/n8n/issues/3751)) ([3a98028](https://github.com/n8n-io/n8n/commit/3a98028722d634f604a650d891cf6fabf722993d))
- **editor:** Fix login issue for non-admin users ([#3754](https://github.com/n8n-io/n8n/issues/3754)) ([ccd1ed2](https://github.com/n8n-io/n8n/commit/ccd1ed2c4c5153637a7900a79a40b1c4f53e7635))
- **editor:** Fix problems with credentials modal if no node is opened ([#3749](https://github.com/n8n-io/n8n/issues/3749)) ([5efe4a4](https://github.com/n8n-io/n8n/commit/5efe4a4c54211f1d395202c420403be3cc7e4446))
- **NocoDB Node:** Fix authentication issue ([#3750](https://github.com/n8n-io/n8n/issues/3750)) ([e65016c](https://github.com/n8n-io/n8n/commit/e65016c861176a7b17f23c5fbf3c0a3fcc1e5e1d))

## [0.187.1](https://github.com/n8n-io/n8n/compare/n8n@0.187.0...n8n@0.187.1) (2022-07-20)

### Bug Fixes

- **editor:** Fix issue that new nodes did not get automatically displayed in all connected browsers ([#3745](https://github.com/n8n-io/n8n/issues/3745)) ([34a9bee](https://github.com/n8n-io/n8n/commit/34a9beefa5b0f169f38ca48d3444af8f160c85a2))

# [0.187.0](https://github.com/n8n-io/n8n/compare/n8n@0.186.1...n8n@0.187.0) (2022-07-20)

### Bug Fixes

- **api:** Add missing node settings parameters ([#3737](https://github.com/n8n-io/n8n/issues/3737)) ([803e009](https://github.com/n8n-io/n8n/commit/803e0097fada1bf0385ac37965f0cc47bed28948))
- **api:** Validate static data value for resource workflow ([#3736](https://github.com/n8n-io/n8n/issues/3736)) ([7ba9a05](https://github.com/n8n-io/n8n/commit/7ba9a055cdeb2b0713857747a5b722dab65d3678))
- **Baserow Node:** Fix issue that table names are not getting pulled in new version ([#3721](https://github.com/n8n-io/n8n/issues/3721)) ([f65a5db](https://github.com/n8n-io/n8n/commit/f65a5db478da0da65735bdc5bb09774f1d473ec9))
- **editor:** Hide 'Execute previous node' button in readonly mode ([#3714](https://github.com/n8n-io/n8n/issues/3714)) ([7fb81dc](https://github.com/n8n-io/n8n/commit/7fb81dcd8a6c56e6e104be94278c690caf35c846))
- **editor:** Hide tabs if only 1 branch ([#3743](https://github.com/n8n-io/n8n/issues/3743)) ([fb67543](https://github.com/n8n-io/n8n/commit/fb67543b2f10c558abcacc5454d6fa0687ee4702))
- Fix broken links in nodes ([#3716](https://github.com/n8n-io/n8n/issues/3716)) ([c9b7b6d](https://github.com/n8n-io/n8n/commit/c9b7b6d30fe822bddb3d68e1b4757ffe654e918b))

### Features

- Add more credentials tests ([#3668](https://github.com/n8n-io/n8n/issues/3668)) ([683d2df](https://github.com/n8n-io/n8n/commit/683d2dfc98136503971a4beb1692e5ca191d5016))
- Add support for preAuthentication and add Metabase credentials ([#3399](https://github.com/n8n-io/n8n/issues/3399)) ([994c89a](https://github.com/n8n-io/n8n/commit/994c89a6c6ade5b99d6218c9776adc15c286b619))
- **core:** Autofix pairedItem information if inputItems(n) === outputItems(n) ([68fb1c6](https://github.com/n8n-io/n8n/commit/68fb1c64dca99fb603fe6d52fd50c4749a2ca898))
- **editor:** Add data pinning functionality ([#3511](https://github.com/n8n-io/n8n/issues/3511)) ([15693b0](https://github.com/n8n-io/n8n/commit/15693b0056097129a57dfc600807dbc5e1cc07f1)
- **editor:** Add drag and drop data mapping ([#3708](https://github.com/n8n-io/n8n/issues/3708)) ([577c73e](https://github.com/n8n-io/n8n/commit/577c73ee25c5bfc943ef5ed1de550fcb489f4998))
- **ERPNext Node:** Add credential test and add support for unauthorized certs ([#3732](https://github.com/n8n-io/n8n/issues/3732)) ([a02b206](https://github.com/n8n-io/n8n/commit/a02b20617071e1ca398735456cb416d6ab3f34a0)), closes [#3739](https://github.com/n8n-io/n8n/issues/3739)
- **Google Drive Node:** Add move to trash support ([#3693](https://github.com/n8n-io/n8n/issues/3693)) ([7406432](https://github.com/n8n-io/n8n/commit/74064325c892c5b506260e650d3361636b578b1e))
- Make it possible to dynamically load community nodes ([#2849](https://github.com/n8n-io/n8n/issues/2849)) ([c85faff](https://github.com/n8n-io/n8n/commit/c85faff4f1c6ba11c02cf5c14122d2c7341f3ec3)), closes [#3497](https://github.com/n8n-io/n8n/issues/3497) [#3501](https://github.com/n8n-io/n8n/issues/3501) [#3527](https://github.com/n8n-io/n8n/issues/3527) [#3562](https://github.com/n8n-io/n8n/issues/3562)
- **Mindee Node:** Add support for new version ([#3596](https://github.com/n8n-io/n8n/issues/3596)) ([1965407](https://github.com/n8n-io/n8n/commit/1965407030638cc309c99d344121f47805c93799))
- **Notion Node:** Allow to ignore Notion URL properties if empty ([#3564](https://github.com/n8n-io/n8n/issues/3564)) ([6cb9aef](https://github.com/n8n-io/n8n/commit/6cb9aefb0b3e4d17382042371a20e63f23641581))
- **Shopify Node:** Add OAuth support ([#3389](https://github.com/n8n-io/n8n/issues/3389)) ([945e25a](https://github.com/n8n-io/n8n/commit/945e25a77cf9ba33bc3e4b70053319ea86230cf7))

## [0.186.1](https://github.com/n8n-io/n8n/compare/n8n@0.186.0...n8n@0.186.1) (2022-07-14)

### Bug Fixes

- **Airtable Node:** Fix authentication issue ([#3709](https://github.com/n8n-io/n8n/issues/3709)) ([33d8042](https://github.com/n8n-io/n8n/commit/33d804284ae02140749ab94eecfca1699e13afee))

# [0.186.0](https://github.com/n8n-io/n8n/compare/n8n@0.185.0...n8n@0.186.0) (2022-07-13)

### Bug Fixes

- **editor:** Fix error after multiple executions ([#3697](https://github.com/n8n-io/n8n/issues/3697)) ([d200661](https://github.com/n8n-io/n8n/commit/d200661b84c36b3f04d812cf022bb338f9664392))
- **EmailReadImap Node:** Improve handling of network problems ([#3406](https://github.com/n8n-io/n8n/issues/3406)) ([6f5809e](https://github.com/n8n-io/n8n/commit/6f5809edb3f9cac0c29d448300b37ab9b6e74c08))
- **Google Drive Node:** Process all input items with List operation ([#3525](https://github.com/n8n-io/n8n/issues/3525)) ([ece1836](https://github.com/n8n-io/n8n/commit/ece1836c45707d349330f742eb3b83fa1f4eaebb))
- **Telegram Node:** Fix sending binaryData media (photo, document, video etc.) ([#3408](https://github.com/n8n-io/n8n/issues/3408)) ([af45a07](https://github.com/n8n-io/n8n/commit/af45a07f21d8448bad5c12ed702b7aa983017a2b))

### Features

- Add item information to more node errors ([#3681](https://github.com/n8n-io/n8n/issues/3681)) ([2a8043c](https://github.com/n8n-io/n8n/commit/2a8043cd27968b92b1857135d130e3ee54aae779))
- **AWS DynamoDB Node:** Improve error handling + add optional GetAll Scan FilterExpression ([#3318](https://github.com/n8n-io/n8n/issues/3318)) ([732c8fc](https://github.com/n8n-io/n8n/commit/732c8fcf8488fc35839855499f75202436fc4c9a))
- **Customer.io Node:** Add support for tracking API region selection ([#3378](https://github.com/n8n-io/n8n/issues/3378)) ([82a254a](https://github.com/n8n-io/n8n/commit/82a254a8d9295901e42ec999432a7f5b40f38281))
- **Elasticsearch Node:** Add 'Source Excludes' and 'Source Includes' options on 'Document: getAll' operation ([#3660](https://github.com/n8n-io/n8n/issues/3660)) ([8999403](https://github.com/n8n-io/n8n/commit/899940322831612bdf6e59db7f696c34f96cd496))
- **Elasticsearch Node:** Add credential tests, index pipelines and index refresh ([#2420](https://github.com/n8n-io/n8n/issues/2420))
- **Freshworks CRM Node:** Add Search + Lookup functionality ([#3131](https://github.com/n8n-io/n8n/issues/3131)) ([dbc0280](https://github.com/n8n-io/n8n/commit/dbc02803db5351d759b1420e94b14f2c7c8b1bef))
- **Jira Trigger Node:** Add optional query auth for security ([#3172](https://github.com/n8n-io/n8n/issues/3172)) ([25093b6](https://github.com/n8n-io/n8n/commit/25093b64e693a33a76efd1bd12f00ce0d4cc0f3c))
- **Postgres Node:** Improvement handling of large numbers ([#3360](https://github.com/n8n-io/n8n/issues/3360)) ([9f908e7](https://github.com/n8n-io/n8n/commit/9f908e7405d687bf57391e503ad724d58caaac07))
- **Redis Node:** Add push and pop operations ([#3127](https://github.com/n8n-io/n8n/issues/3127)) ([32c68eb](https://github.com/n8n-io/n8n/commit/32c68eb126f8411d1a3261dc8a900c109b99da6f))
- **Rename Node:** Add regex replace ([#2576](https://github.com/n8n-io/n8n/issues/2576)) ([eae9a60](https://github.com/n8n-io/n8n/commit/eae9a60a431bc08fb58016e3249328abb90716b0))
- **SpreadsheetFile Node:** Allow skipping headers when writing spreadsheets ([#3234](https://github.com/n8n-io/n8n/issues/3234)) ([dbfb8d5](https://github.com/n8n-io/n8n/commit/dbfb8d56dc6290837701dea5957d4e73db418892))
- Updated multiple credentials with tests and allow to be used on HTTP Request Node ([#3670](https://github.com/n8n-io/n8n/issues/3670)) ([d5d4dd3](https://github.com/n8n-io/n8n/commit/d5d4dd38450b788ee0ce3ed8ad0eb714c86977d2))

# [0.185.0](https://github.com/n8n-io/n8n/compare/n8n@0.184.0...n8n@0.185.0) (2022-07-05)

### Bug Fixes

- **Hubspot Node:** Fix search endpoints ([#3640](https://github.com/n8n-io/n8n/issues/3640)) ([16b9926](https://github.com/n8n-io/n8n/commit/16b9926cd25abf4a2ae4c9eba494340eab58082f))
- **KoboToolbox Node:** Improve attachment matching logic and GeoJSON Polygon format ([#3535](https://github.com/n8n-io/n8n/issues/3535)) ([637e815](https://github.com/n8n-io/n8n/commit/637e81552f86788058567342cf69e2784e3d6b2f))
- **Odoo Node:** Prevent possible issues with some custom fields ([#3496](https://github.com/n8n-io/n8n/issues/3496)) ([7d968ec](https://github.com/n8n-io/n8n/commit/7d968ec202ceccc6a009ec150747cc927273f841))
- **Sticky Node:** Fix main header hiding ([#3654](https://github.com/n8n-io/n8n/issues/3654)) ([88486bc](https://github.com/n8n-io/n8n/commit/88486bc778786d4a47ef1bb5c743c9fb206aee01))
- **Todoist Node:** Fix multiple item support ([#3614](https://github.com/n8n-io/n8n/issues/3614)) ([7ba85c4](https://github.com/n8n-io/n8n/commit/7ba85c4ab910ed02696078ece12c88f2141cccad))

### Features

- **core:** Add `action` to `INodePropertyOptions` ([#3610](https://github.com/n8n-io/n8n/issues/3610)) ([3c65968](https://github.com/n8n-io/n8n/commit/3c659682e94cdd01fd6f267a468a031b028cf690))
- **DeepL Node:** Add support for longer texts + Credential tests ([#3651](https://github.com/n8n-io/n8n/issues/3651)) ([88d6cfc](https://github.com/n8n-io/n8n/commit/88d6cfc07bfd2be64a39f285d235e22aae8c1522))
- **Facebook Node:** Add support for Facebook Graph API versions 14 ([#3656](https://github.com/n8n-io/n8n/issues/3656)) ([174d063](https://github.com/n8n-io/n8n/commit/174d06383191e6e70ba27bc3e6e46527731c80b5))
- **Google Ads Node:** Add new node ([#3526](https://github.com/n8n-io/n8n/issues/3526)) ([088daf9](https://github.com/n8n-io/n8n/commit/088daf952ea7340a3101362bce18668147b8431f))
- **Jira Node:** Use Jira rendered fields with simplify option ([#3323](https://github.com/n8n-io/n8n/issues/3323)) ([07b6cff](https://github.com/n8n-io/n8n/commit/07b6cffdba55a48bfed629a1faec8cf88bee88bc))
- **Webflow Trigger Node:** Reduce chance of webhook duplication and add credential test ([#3594](https://github.com/n8n-io/n8n/issues/3594)) ([224e008](https://github.com/n8n-io/n8n/commit/224e008fb64dabef99998508eb4385e1b872c5ad))
- **Wordpress Node:** Add post template option ([#3139](https://github.com/n8n-io/n8n/issues/3139)) ([02bc3da](https://github.com/n8n-io/n8n/commit/02bc3da78545de4771edf6fdc68720b0e7d596b9))

# [0.184.0](https://github.com/n8n-io/n8n/compare/n8n@0.183.0...n8n@0.184.0) (2022-06-29)

### Bug Fixes

- **core:** Fix logger error when logging circular json ([#3583](https://github.com/n8n-io/n8n/issues/3583)) ([3cb693d](https://github.com/n8n-io/n8n/commit/3cb693d5d4b8aaf800df70e62c1b2ca2ff208c4d))
- Correct misfix from `node-param-display-name-wrong-for-dynamic-multi-options` ([#3575](https://github.com/n8n-io/n8n/issues/3575)) ([2ccc7fb](https://github.com/n8n-io/n8n/commit/2ccc7fbc9d1df3f044cf42fe1af72bc7352caa9f))
- **Cortex Node:** Fix issue that not all Analyzers got returned ([#3606](https://github.com/n8n-io/n8n/issues/3606)) ([6e595c7](https://github.com/n8n-io/n8n/commit/6e595c72760f47107f67c1fd2bdbe76c31af4a8b))
- **editor:** Display full text of long error messages ([#3561](https://github.com/n8n-io/n8n/issues/3561)) ([8db4405](https://github.com/n8n-io/n8n/commit/8db44057f2101698ef4869fca436862e4dd39fc1))
- **editor:** Fix credentials rendering when the node has no parameters ([#3563](https://github.com/n8n-io/n8n/issues/3563)) ([55bab19](https://github.com/n8n-io/n8n/commit/55bab19eb440ed9d58137f4334a37d5f731afe0f))
- Fix issue with required optional parameters ([#3577](https://github.com/n8n-io/n8n/issues/3577)) ([42d2959](https://github.com/n8n-io/n8n/commit/42d2959f47f33defda4239a4d2fbba6927d98617))
- Fix issue with required optional parameters ([#3597](https://github.com/n8n-io/n8n/issues/3597)) ([848fcfd](https://github.com/n8n-io/n8n/commit/848fcfde5d95d952170e9a3d51b629971a13b832))
- **HTTP Request Node:** Make all OAuth2 credentials work with HTTP Request Node ([#3503](https://github.com/n8n-io/n8n/issues/3503)) ([acdb4d9](https://github.com/n8n-io/n8n/commit/acdb4d92c8ef95646e69694b2451a9111a81c52f))
- **LinkedIn Node:** Fix LinkedIn image preview ([#3528](https://github.com/n8n-io/n8n/issues/3528)) ([32f245d](https://github.com/n8n-io/n8n/commit/32f245da53c186a03172dbb23761a05b5e301532))
- **Salesforce Node:** Fix issue with lead status not using name on update ([#3599](https://github.com/n8n-io/n8n/issues/3599)) ([7ccae7c](https://github.com/n8n-io/n8n/commit/7ccae7c9b22f2848a8aa357227d145241801ba82))

### Features

- **Clockify Node:** Add more resources and improvements ([#3411](https://github.com/n8n-io/n8n/issues/3411)) ([447d190](https://github.com/n8n-io/n8n/commit/447d19024c512eea8e290d8ebc6c3ce82a53f002))
- **core:** Expose item index being processed ([#3590](https://github.com/n8n-io/n8n/issues/3590)) ([1e4fd9e](https://github.com/n8n-io/n8n/commit/1e4fd9e4df524fdee8195de7be244ff03d97f917))
- **core:** Give access to getBinaryDataBuffer in preSend method ([#3588](https://github.com/n8n-io/n8n/issues/3588)) ([522b31a](https://github.com/n8n-io/n8n/commit/522b31a47b4f4e9990e07dcc504ef2821a1fd0a5))
- Migrated to npm release of riot-tmpl fork ([#3581](https://github.com/n8n-io/n8n/issues/3581)) ([891844e](https://github.com/n8n-io/n8n/commit/891844ea8b3248195355f736d7331fd967ee99e1))

# [0.183.0](https://github.com/n8n-io/n8n/compare/n8n@0.182.1...n8n@0.183.0) (2022-06-21)

### Bug Fixes

- **core:** Do allow OPTIONS requests from any source ([#3555](https://github.com/n8n-io/n8n/issues/3555)) ([74e6b06](https://github.com/n8n-io/n8n/commit/74e6b06467f8d0059c8cc45154e2d2822dc9b0c5))
- **core:** Fix issue that GET /workflows/:id does not return tags ([#3522](https://github.com/n8n-io/n8n/issues/3522)) ([f75f5d7](https://github.com/n8n-io/n8n/commit/f75f5d711f886892a1afcebff722ab476390f4f0))
- **core:** Fix issue that some predefined credentials do not show up on HTTP Request Node ([#3556](https://github.com/n8n-io/n8n/issues/3556)) ([d417ea7](https://github.com/n8n-io/n8n/commit/d417ea7ffad9e2210f3b2b5e7122ffbe70f2ba27))
- **core:** Return correct error message if Axios error ([#3478](https://github.com/n8n-io/n8n/issues/3478)) ([1bef4df](https://github.com/n8n-io/n8n/commit/1bef4df75f999ac2e413b6c179baab3321c52fa2))
- **core:** Updated expressions allowlist and denylist. ([#3424](https://github.com/n8n-io/n8n/issues/3424)) ([d18a29d](https://github.com/n8n-io/n8n/commit/d18a29d5882fb8f4475258189f6badcd0a573b34))

### Features

- **editor:** Improve trigger panel ([#3509](https://github.com/n8n-io/n8n/issues/3509)) ([a2f6289](https://github.com/n8n-io/n8n/commit/a2f628927dff7ea6741ef8e4a60bcafd95dac7bf))
- **Hubspot Node:** Allow to set Stage on Ticket Update ([#3317](https://github.com/n8n-io/n8n/issues/3317)) ([0ac9e3f](https://github.com/n8n-io/n8n/commit/0ac9e3f975b73e88acabb66de8b8565f881f64ec))
- **Todoist Node:** Make it possible to move tasks between sections ([#3074](https://github.com/n8n-io/n8n/issues/3074)) ([049e454](https://github.com/n8n-io/n8n/commit/049e4544d9ccc0acce2a596aced06ec86992e09a))
- **Twake Node:** Update icon, add cred test and custom operation support ([#3431](https://github.com/n8n-io/n8n/issues/3431)) ([6d64e84](https://github.com/n8n-io/n8n/commit/6d64e84f5e19d5f6d83ccc0a55cdcbd256e5804f))

## [0.182.1](https://github.com/n8n-io/n8n/compare/n8n@0.182.0...n8n@0.182.1) (2022-06-16)

### Bug Fixes

- **core:** Fix issue with restarting waiting executions ([#3531](https://github.com/n8n-io/n8n/issues/3531)) ([c9273bc](https://github.com/n8n-io/n8n/commit/c9273bcd3862217b4918ac8abb37fae9c2e64622))

# [0.182.0](https://github.com/n8n-io/n8n/compare/n8n@0.181.2...n8n@0.182.0) (2022-06-14)

### Bug Fixes

- **core:** Fix issue that parameters got lost in some edge cases ([04f0bf5](https://github.com/n8n-io/n8n/commit/04f0bf5b65c8224a4fdfd3c9d2c896f63dfbcc1d))
- **core:** Fix issue with combined expression not resolving if one is invalid ([#3506](https://github.com/n8n-io/n8n/issues/3506)) ([9ff5762](https://github.com/n8n-io/n8n/commit/9ff57629c5afb2f0fd4aee84cda79c9a6f7962d0))
- **core:** Fix Public API failing to build on Windows ([#3499](https://github.com/n8n-io/n8n/issues/3499)) ([c121952](https://github.com/n8n-io/n8n/commit/c121952324619434e8a7be540970c167df715b13))
- **editor:** Fix issue that some errors did not show up correctly ([#3507](https://github.com/n8n-io/n8n/issues/3507)) ([955db0a](https://github.com/n8n-io/n8n/commit/955db0ab101feb17efffe760c79ec2820e1d4c3b))
- **HTTP Request Node:** Fix issue with requests that return null ([#3498](https://github.com/n8n-io/n8n/issues/3498)) ([7346da0](https://github.com/n8n-io/n8n/commit/7346da0b34b5fdf7ab630ccc5cda102cf80c8036))
- **Pipedrive Node:** Fix limit issue with Lead -> GetAll ([#3436](https://github.com/n8n-io/n8n/issues/3436)) ([34e891c](https://github.com/n8n-io/n8n/commit/34e891c0f8c987c9be9cff463422b9972f02269f))
- **PostBin Node:** Fix issue with it throwing unnecessary error ([#3494](https://github.com/n8n-io/n8n/issues/3494)) ([9df3e30](https://github.com/n8n-io/n8n/commit/9df3e30d36104d8e31972c773cb71f4cc82f6970))

### Features

- **core:** Add "Client Credentials" grant type to OAuth2 ([#3489](https://github.com/n8n-io/n8n/issues/3489)) ([e29c597](https://github.com/n8n-io/n8n/commit/e29c5975e1f1ad089167df46021203e9f67c8ef1))
- **Twilio Node:** Add ability to make a voice call using TTS ([#3467](https://github.com/n8n-io/n8n/issues/3467)) ([eff97e8](https://github.com/n8n-io/n8n/commit/eff97e8d67cd3f0342bbb9648503b351f4691f46))
- **Wise Node:** Add Support to download statements as JSON, CSV or PDF ([#3468](https://github.com/n8n-io/n8n/issues/3468)) ([51663c1](https://github.com/n8n-io/n8n/commit/51663c1fcbe879e29790af942b73318e95065d8f))

## [0.181.2](https://github.com/n8n-io/n8n/compare/n8n@0.181.1...n8n@0.181.2) (2022-06-09)

### Bug Fixes

- **core:** Fix issue when a node does not return data ([5eea3cd](https://github.com/n8n-io/n8n/commit/5eea3cd6d0b59963dc7c7a9e1ca597137cf3ce98))

## [0.181.1](https://github.com/n8n-io/n8n/compare/n8n@0.181.0...n8n@0.181.1) (2022-06-09)

### Bug Fixes

- **core:** Fix another possible issue with multi input nodes ([e88fab5](https://github.com/n8n-io/n8n/commit/e88fab5ee2b82665c3d68c52894a5479ce6eccf6))
- **core:** Fix issue with multi input nodes ([f79675d](https://github.com/n8n-io/n8n/commit/f79675d5c7876875065fc29504eb0590678d67d3))

# [0.181.0](https://github.com/n8n-io/n8n/compare/n8n@0.180.0...n8n@0.181.0) (2022-06-08)

### Bug Fixes

- **core:** Properly resolve expressions in declarative node design ([1999f4b](https://github.com/n8n-io/n8n/commit/1999f4b066784cc1dd6a962f51d7c11641577a8b))

### Features

- Add n8n Public API ([#3064](https://github.com/n8n-io/n8n/issues/3064)) ([a18081d](https://github.com/n8n-io/n8n/commit/a18081d749c51d497645d43614fdccb220344607))
- **core:** Make it possible to block access to environment variables ([ddb3baa](https://github.com/n8n-io/n8n/commit/ddb3baa4eddeb85e2f7abe4465ac4ff4058e1ece))

# [0.180.0](https://github.com/n8n-io/n8n/compare/n8n@0.179.0...n8n@0.180.0) (2022-06-07)

### Bug Fixes

- **core:** Allow "window" again in expressions ([#3474](https://github.com/n8n-io/n8n/issues/3474)) ([ca92ff7](https://github.com/n8n-io/n8n/commit/ca92ff70d7789e7d0af812cff7c7351e499ddfa2))
- **core:** Fix `user-management:reset` command ([#3403](https://github.com/n8n-io/n8n/issues/3403)) ([58ecadf](https://github.com/n8n-io/n8n/commit/58ecadf53c35ee0dc897eb7eb29f345f8e797b2b))
- **core:** Fix crashes in queue mode ([#3397](https://github.com/n8n-io/n8n/issues/3397)) ([042b8da](https://github.com/n8n-io/n8n/commit/042b8daf1cd16822e2da03cf18a69091477d4451))
- **editor:** Fix delete button hover spacing ([#3412](https://github.com/n8n-io/n8n/issues/3412)) ([50ff75e](https://github.com/n8n-io/n8n/commit/50ff75ecb2b42dfdb00e9c086cf604f1ca699360))
- **editor:** Fix stuck loading states ([#3428](https://github.com/n8n-io/n8n/issues/3428)) ([450a9aa](https://github.com/n8n-io/n8n/commit/450a9aafea0e44c5d6e6541a9e0872a9d3ac7dee))
- **EmailReadImap Node:** Improve error handling ([#3465](https://github.com/n8n-io/n8n/issues/3465)) ([3806d63](https://github.com/n8n-io/n8n/commit/3806d6355d4af4ad1222bac20cb36f5ef586501a))
- **Hubspot Node:** Fix loading of Contacts ([#3426](https://github.com/n8n-io/n8n/issues/3426)) ([f02421b](https://github.com/n8n-io/n8n/commit/f02421b5f3c4946aac6257bbd806d72d0031313f))

### Features

- **Cal Trigger Node:** Add cal.com Trigger Node ([#3439](https://github.com/n8n-io/n8n/issues/3439)) ([1fa445e](https://github.com/n8n-io/n8n/commit/1fa445e0e74462dd28fc81329230b868137dcbd5))
- **core:** Add support for pairedItem (beta) ([#3012](https://github.com/n8n-io/n8n/issues/3012)) ([bdb8413](https://github.com/n8n-io/n8n/commit/bdb84130d687811d65337ff6b025e7cb0eae8256))
- **core:** Add support to import/export tags ([#3130](https://github.com/n8n-io/n8n/issues/3130)) ([15a20d2](https://github.com/n8n-io/n8n/commit/15a20d257d7b6b35224c0a654f0f1988081d06d2))
- **core:** Run Error Workflow also on trigger activation error ([#3470](https://github.com/n8n-io/n8n/issues/3470)) ([b5535e4](https://github.com/n8n-io/n8n/commit/b5535e4a6233d397060308ad1b8c254b28a2d57e))
- **editor:** Display Credential-Selector after Authentication Type-Selector ([#3461](https://github.com/n8n-io/n8n/issues/3461)) ([59a59e0](https://github.com/n8n-io/n8n/commit/59a59e0c5f1a5207a7124655b5768ac9fededcdc))
- **editor:** Display node specific settings above general ones ([50ca9c4](https://github.com/n8n-io/n8n/commit/50ca9c4c7e39e1ba176724c4b20dbbab12695cc4))
- **GitHub Node:**: Add Organization -> Get All operation ([#3247](https://github.com/n8n-io/n8n/pull/3247))
- **QuickBooks Node:** Add optional Tax item field ([#3404](https://github.com/n8n-io/n8n/issues/3404)) ([c341b45](https://github.com/n8n-io/n8n/commit/c341b45396c7282da087046ade16265c99c8d9dd))

# [0.179.0](https://github.com/n8n-io/n8n/compare/n8n@0.178.2...n8n@0.179.0) (2022-05-30)

### Bug Fixes

- **core:** Fix issue that "closeFunction" got called twice ([1910299](https://github.com/n8n-io/n8n/commit/1910299a884e8d4d80d4aa6656eb4892b0fcb713))
- **core:** Fix migrations on non-public Postgres schema ([#3356](https://github.com/n8n-io/n8n/issues/3356)) ([b49d493](https://github.com/n8n-io/n8n/commit/b49d49365398f06376e53d86e6c8c5dc15f67e57))
- **core:** Fix problem with uploading large files ([#3370](https://github.com/n8n-io/n8n/issues/3370)) ([d3cecfc](https://github.com/n8n-io/n8n/commit/d3cecfc55baf547b2a2bedddebf7e890510187e0))
- **core:** Prevent expressions XSS ([#3366](https://github.com/n8n-io/n8n/issues/3366)) ([993554f](https://github.com/n8n-io/n8n/commit/993554f22a575d68f7b4424fbcf7d5e0dd8a7186))
- **Discord Node:** Fix broken rate limit handling ([#3311](https://github.com/n8n-io/n8n/issues/3311)) ([b687ba1](https://github.com/n8n-io/n8n/commit/b687ba11ccac0dfb5a5c61e5db2604ffa8b5dec0))
- **editor:** Fix component in executions list failing custom validator ([#3284](https://github.com/n8n-io/n8n/issues/3284)) ([d719678](https://github.com/n8n-io/n8n/commit/d71967878f0ef43b8a464aa9e3703f80f5a08ed7))
- **editor:** Fix conflicting hover states between sticky button and node view ([#3368](https://github.com/n8n-io/n8n/issues/3368)) ([96a109a](https://github.com/n8n-io/n8n/commit/96a109a57c808943f3ab6121ff3e830b12e82d96))
- **editor:** Fix credential display bug ([#3372](https://github.com/n8n-io/n8n/issues/3372)) ([ed69c3c](https://github.com/n8n-io/n8n/commit/ed69c3cc18d47f906f8cf5c2a6784ee20ae390bd))
- **Gmail Node:** Fix sending attachments when filesystem mode is used ([#3396](https://github.com/n8n-io/n8n/issues/3396)) ([3a09da9](https://github.com/n8n-io/n8n/commit/3a09da92be556df1b840c0e16e020b0618ce7643))
- **Google Sheet Node:** Fix issue with null values and "Use Header Names as JSON Paths" option ([#3395](https://github.com/n8n-io/n8n/issues/3395)) ([fbf6019](https://github.com/n8n-io/n8n/commit/fbf60199d95d2448f9f34d0175da316fc18a80b7))
- **NextCloud Node:** Fix folder list with Nextcloud v24 ([#3386](https://github.com/n8n-io/n8n/issues/3386)) ([5f3bed3](https://github.com/n8n-io/n8n/commit/5f3bed3d4e9134b96d6964ca28b5b5dfb1adc1c3))

### Features

- **PostBin Node:** Add PostBin node ([#3236](https://github.com/n8n-io/n8n/issues/3236)) ([06c407d](https://github.com/n8n-io/n8n/commit/06c407def88e5872b2478ac240430006055a2a22))
- **RabbitMQ Trigger Node:** Make message acknowledgement and parallel processing configurable ([#3385](https://github.com/n8n-io/n8n/issues/3385)) ([b851289](https://github.com/n8n-io/n8n/commit/b85128900187b1709a7bf13eb5c5d5c4a5528fde))
- **ServiceNow Node:** Add attachment functionality ([#3137](https://github.com/n8n-io/n8n/issues/3137)) ([c38f6af](https://github.com/n8n-io/n8n/commit/c38f6af4993cd695888ff18b3f95e0d900e65711))
- **Todoist Node:** Add support for specifying the parent task when adding and listing tasks ([#3161](https://github.com/n8n-io/n8n/issues/3161)) ([dc77594](https://github.com/n8n-io/n8n/commit/dc77594a1eaec73fa34ed09c52d108482002ffff))

## [0.178.2](https://github.com/n8n-io/n8n/compare/n8n@0.178.1...n8n@0.178.2) (2022-05-25)

### Bug Fixes

- **editor:** Fix parameter loading bug ([#3374](https://github.com/n8n-io/n8n/issues/3374)) ([c7c2061](https://github.com/n8n-io/n8n/commit/c7c2061590493a1b24a8ab4e2615d6d9eb2641e1))

## [0.178.1](https://github.com/n8n-io/n8n/compare/n8n@0.178.0...n8n@0.178.1) (2022-05-24)

### Bug Fixes

- **editor:** Fix problem with HTTP Request Node 1 credentials to be set ([#3371](https://github.com/n8n-io/n8n/issues/3371)) ([c5fc3bc](https://github.com/n8n-io/n8n/commit/c5fc3bc45e80eec47f4c06b950ab8b3ddaf66f2f))

# [0.178.0](https://github.com/n8n-io/n8n/compare/n8n@0.177.0...n8n@0.178.0) (2022-05-24)

### Bug Fixes

- **editor:** Do not display diving line unless necessary ([68db12c](https://github.com/n8n-io/n8n/commit/68db12ce6d8bfc99cd0891cfa44f8b64674dada7))
- **editor:** Do not display welcome sticky in template workflows ([#3320](https://github.com/n8n-io/n8n/issues/3320)) ([29ddac3](https://github.com/n8n-io/n8n/commit/29ddac30d33caff1cf8a061d619742fdb3402d49))
- **Slack Node:** Fix Channel->Kick ([#3365](https://github.com/n8n-io/n8n/issues/3365)) ([0212d65](https://github.com/n8n-io/n8n/commit/0212d65dae885a6a153c67095f04215f5e1f8278))

### Features

- **core:** Allow credential reuse on HTTP Request node ([#3228](https://github.com/n8n-io/n8n/issues/3228)) ([336fc9e](https://github.com/n8n-io/n8n/commit/336fc9e2a820476931a9e9b482e4be284c0337d0)), closes [#3230](https://github.com/n8n-io/n8n/issues/3230) [#3231](https://github.com/n8n-io/n8n/issues/3231) [#3222](https://github.com/n8n-io/n8n/issues/3222) [#3229](https://github.com/n8n-io/n8n/issues/3229) [#3304](https://github.com/n8n-io/n8n/issues/3304) [#3282](https://github.com/n8n-io/n8n/issues/3282) [#3359](https://github.com/n8n-io/n8n/issues/3359)
- **editor:** Add input panel to NDV ([#3204](https://github.com/n8n-io/n8n/issues/3204)) ([3af0abd](https://github.com/n8n-io/n8n/commit/3af0abd9e066a721ac873f255eeb9311ebe6dd27))
- **Salesforce Node:** Add country field ([#3314](https://github.com/n8n-io/n8n/issues/3314)) ([90a1bc1](https://github.com/n8n-io/n8n/commit/90a1bc120bc2e291432c977768929da773dcb96e))

# [0.177.0](https://github.com/n8n-io/n8n/compare/n8n@0.176.0...n8n@0.177.0) (2022-05-16)

### Bug Fixes

- **core:** Fix call to `/executions-current` with unsaved workflow ([#3280](https://github.com/n8n-io/n8n/issues/3280)) ([7090a79](https://github.com/n8n-io/n8n/commit/7090a79b5da611d829da4d027a0194fcb60b4755))
- **core:** Fix issue with fixedCollection having all default values ([7ced654](https://github.com/n8n-io/n8n/commit/7ced65484fa7c91e10e96f70d6791b689a5686d3))
- **Edit Image Node:** Fix font selection ([#3287](https://github.com/n8n-io/n8n/issues/3287)) ([8a8feb1](https://github.com/n8n-io/n8n/commit/8a8feb11c8e22e6a548e077b55e40702f2fb724a))
- **Ghost Node:** Fix post tags and add credential tests ([#3278](https://github.com/n8n-io/n8n/issues/3278)) ([a14d85e](https://github.com/n8n-io/n8n/commit/a14d85ea481b8227ba306f07e13263f45eafa6ca))
- **Google Calendar Node:** Make it work with public calendars and clean up ([#3283](https://github.com/n8n-io/n8n/issues/3283)) ([a7d960c](https://github.com/n8n-io/n8n/commit/a7d960c56122bd3b602f0e9a121919916e5d6174))
- **KoBoToolbox Node:** Fix query and sort + use question name in attachments ([#3017](https://github.com/n8n-io/n8n/issues/3017)) ([c885115](https://github.com/n8n-io/n8n/commit/c8851157684fe15c77db1fe716fa4333b54450cb))
- **Mailjet Trigger Node:** Fix issue that node could not get activated ([#3281](https://github.com/n8n-io/n8n/issues/3281)) ([e09e349](https://github.com/n8n-io/n8n/commit/e09e349fedfe067929556e328a70a32d30759e4d))
- **Pipedrive Node:** Fix resolve properties when multi option field is used ([#3277](https://github.com/n8n-io/n8n/issues/3277)) ([7eb1261](https://github.com/n8n-io/n8n/commit/7eb12615cf3eebac29e3561a079451017f80de5c))

### Features

- **core:** Automatically convert Luxon Dates to string ([#3266](https://github.com/n8n-io/n8n/issues/3266)) ([3fcee14](https://github.com/n8n-io/n8n/commit/3fcee14bf5c61ec11fc1d4f30256f5ceba09e7f4))
- **editor:** Improve n8n welcome experience ([#3289](https://github.com/n8n-io/n8n/issues/3289)) ([35f2ce2](https://github.com/n8n-io/n8n/commit/35f2ce2359bb84437ad6fc68a7115081daeb46fe))
- **Google Drive Node:** Add Shared Drive support for operations upload, delete and share ([#3294](https://github.com/n8n-io/n8n/issues/3294)) ([03cdb1f](https://github.com/n8n-io/n8n/commit/03cdb1fea4fa4967eaafa861f3a9ff4ff7ca625a))
- **Microsoft OneDrive Node:** Add rename option for files and folders ([#3224](https://github.com/n8n-io/n8n/issues/3224)) ([50246d1](https://github.com/n8n-io/n8n/commit/50246d174a274fc9ba3dea44fc83c3605b4db691))

# [0.176.0](https://github.com/n8n-io/n8n/compare/n8n@0.175.1...n8n@0.176.0) (2022-05-10)

### Bug Fixes

- **core:** Fix executions list filtering by waiting status ([#3241](https://github.com/n8n-io/n8n/issues/3241)) ([71afcd6](https://github.com/n8n-io/n8n/commit/71afcd6314a73ab6cc04e22afd69e86ca764bd42))
- **core:** Improve webhook error messages ([49d0e3e](https://github.com/n8n-io/n8n/commit/49d0e3e885003b11092cf3c890847154426dee41))
- **Edit Image Node:** Make node work with binary-data-mode 'filesystem' ([#3274](https://github.com/n8n-io/n8n/issues/3274)) ([a4db0d0](https://github.com/n8n-io/n8n/commit/a4db0d051b18bc224c6cd69faeabf03cf5fba659))

### Features

- **Pipedrive Node:** Add support for filters to getAll:organization ([#3211](https://github.com/n8n-io/n8n/issues/3211)) ([1ef10dd](https://github.com/n8n-io/n8n/commit/1ef10dd23fef0b2e3e0ef76c8116d3bebc36bc4e))
- **Pushover Node:** Add 'HTML Formatting' option and credential test ([#3082](https://github.com/n8n-io/n8n/issues/3082)) ([b3dc6d9](https://github.com/n8n-io/n8n/commit/b3dc6d9d9c640f1e0f04cb56d0fabe2aafb948b6))
- **UProc Node:** Add new tools ([#3104](https://github.com/n8n-io/n8n/issues/3104)) ([ff2bf11](https://github.com/n8n-io/n8n/commit/ff2bf1112f07b7c3fd75f60e8faefdef4e2a02af))

## [0.175.1](https://github.com/n8n-io/n8n/compare/n8n@0.175.0...n8n@0.175.1) (2022-05-03)

### Bug Fixes

- **editor:** Fix bug with node version ([ed56481](https://github.com/n8n-io/n8n/commit/ed564812435a279760a32e76f3935f492f84f487))

# [0.175.0](https://github.com/n8n-io/n8n/compare/n8n@0.174.0...n8n@0.175.0) (2022-05-02)

### Bug Fixes

- **core:** Do not applying auth if UM is disabled ([#3218](https://github.com/n8n-io/n8n/issues/3218)) ([4ceac38](https://github.com/n8n-io/n8n/commit/4ceac38e0397be91bfc1b50d8a06ebf20de8c32e))
- **core:** Skip credential check of disabled nodes and improve error ([79ced8f](https://github.com/n8n-io/n8n/commit/79ced8f6774cc70d63369001d7c56d1d4a340261))
- **editor:** Fix bug with touchscreens ([#3206](https://github.com/n8n-io/n8n/issues/3206)) ([8d9e05e](https://github.com/n8n-io/n8n/commit/8d9e05e3c3ef61cd5a65ec00d3d1474f1195f653))
- **Hubspot Node:** Fix search operators ([#3208](https://github.com/n8n-io/n8n/issues/3208)) ([ea4a8b8](https://github.com/n8n-io/n8n/commit/ea4a8b88c9bbfde3304073070a430f2421477921))
- **Sendgrid Node:** Fix issue sending attachments ([#3213](https://github.com/n8n-io/n8n/issues/3213)) ([2b00881](https://github.com/n8n-io/n8n/commit/2b008815cad82619a66d4b30d1f79630c82be978))
- **Wise Node:** Respect time parameter on get: exchangeRate ([#3227](https://github.com/n8n-io/n8n/issues/3227)) ([c7d525a](https://github.com/n8n-io/n8n/commit/c7d525a60fda4aad653017cb90253426cce98b3b))

### Features

- **core:** Introduce simplified node versioning ([#3205](https://github.com/n8n-io/n8n/issues/3205)) ([d5b9b0c](https://github.com/n8n-io/n8n/commit/d5b9b0cb9596688b3bcad0010b65888428c297c6))
- **Google Sheets Node:** Allow to use header names as JSON path ([#3165](https://github.com/n8n-io/n8n/issues/3165)) ([770c4fe](https://github.com/n8n-io/n8n/commit/770c4fe6ebe70c7a507ee5e57348508b98fda11d))
- **Microsoft Dynamics CRM Node:** Add support for other regions than North America ([#3157](https://github.com/n8n-io/n8n/issues/3157)) ([4bdd607](https://github.com/n8n-io/n8n/commit/4bdd607fdf00f6c2155c9b3e3c9e74ac50e317f4))
- **Telegram Node:** Allow querying chat administrators ([#3226](https://github.com/n8n-io/n8n/issues/3226)) ([c02d259](https://github.com/n8n-io/n8n/commit/c02d259453f2f5b444569f4c1e06fbfc95cd3305)), closes [#3157](https://github.com/n8n-io/n8n/issues/3157)

# [0.174.0](https://github.com/n8n-io/n8n/compare/n8n@0.173.1...n8n@0.174.0) (2022-04-25)

### Bug Fixes

- **core:** Open oauth callback endpoints to be public ([#3168](https://github.com/n8n-io/n8n/issues/3168)) ([01807d6](https://github.com/n8n-io/n8n/commit/01807d613654eb14dad0eb82defa4fab234a1d71))
- **MicrosoftOneDrive Node:** Fix issue with filenames that contain special characters from uploading ([#3183](https://github.com/n8n-io/n8n/issues/3183)) ([ff26a98](https://github.com/n8n-io/n8n/commit/ff26a987fe244b30f67d6516d84f1f43fed3ec43))
- **Slack Node:** Fix credential test ([#3151](https://github.com/n8n-io/n8n/issues/3151)) ([15e6d92](https://github.com/n8n-io/n8n/commit/15e6d9274ad0627dd5ebc30e70757878368042bc))

### Features

- **All AWS Nodes:** Enable support for AWS temporary credentials ([#2587](https://github.com/n8n-io/n8n/issues/2587)) ([ce79e6b](https://github.com/n8n-io/n8n/commit/ce79e6b74f6d94694f16988c8601f7c0639a04b3))
- **editor:** Add Workflow Stickies (Notes) ([#3154](https://github.com/n8n-io/n8n/issues/3154)) ([31dd01f](https://github.com/n8n-io/n8n/commit/31dd01f9cb7e1b6908a89c3402c78515a6475e61))
- **Google Sheets Node:** Add upsert support ([#2733](https://github.com/n8n-io/n8n/issues/2733)) ([aeb5a12](https://github.com/n8n-io/n8n/commit/aeb5a1234aa610b333525512085fe3b3bd60abef))
- **Microsoft Teams Node:** Enhancements and cleanup ([#2940](https://github.com/n8n-io/n8n/issues/2940)) ([d446f9e](https://github.com/n8n-io/n8n/commit/d446f9e28176e6ae2875d526cf4b6ac769dc750c))
- **MongoDB Node:** Allow parsing dates using dot notation ([#2487](https://github.com/n8n-io/n8n/issues/2487)) ([83998a1](https://github.com/n8n-io/n8n/commit/83998a15b0b4bea94aa07984136bdc56523d4f89))

# [0.173.1](https://github.com/n8n-io/n8n/compare/n8n@0.173.0...n8n@0.173.1) (2022-04-19)

### Bug Fixes

- **Discord Node:** Fix icon name

# [0.173.0](https://github.com/n8n-io/n8n/compare/n8n@0.172.0...n8n@0.173.0) (2022-04-19)

### Bug Fixes

- **core:** Add "rawBody" also for xml requests ([#3143](https://github.com/n8n-io/n8n/issues/3143)) ([5719e44](https://github.com/n8n-io/n8n/commit/5719e44b5999bb84e2fd50c8a469cc8934539747))
- **core:** Make email for UM case insensitive ([#3078](https://github.com/n8n-io/n8n/issues/3078)) ([8532b00](https://github.com/n8n-io/n8n/commit/8532b0030dbdeb85b2f74ce078adb44f43a7c4d3))
- **Discourse Node:** Fix issue with not all posts getting returned and add credential test ([#3007](https://github.com/n8n-io/n8n/issues/3007)) ([d68b7a4](https://github.com/n8n-io/n8n/commit/d68b7a4cf4b1025ce19e23f6bfc9e423595b6c0b))
- **editor:** Fix breaking Drop-downs after removing expressions ([#3094](https://github.com/n8n-io/n8n/issues/3094)) ([17b0cd8](https://github.com/n8n-io/n8n/commit/17b0cd8f765ce262241c827a635e64c189acc0f8))
- **Postgres Node:** Fix issue with columns containing spaces ([#2989](https://github.com/n8n-io/n8n/issues/2989)) ([0081d02](https://github.com/n8n-io/n8n/commit/0081d02b979ff5d98c5a834c60d8d8b5e83924ef))
- **ui:** Reset text-edit input value when pressing esc key to have matching input values ([#3098](https://github.com/n8n-io/n8n/issues/3098)) ([29fdd77](https://github.com/n8n-io/n8n/commit/29fdd77d7b4ac3bbb9faae73b0932183d48ae9a6))
- **ZendeskTrigger Node:** Fix deprecated targets, replaced with webhooks ([#3025](https://github.com/n8n-io/n8n/issues/3025)) ([794ad7c](https://github.com/n8n-io/n8n/commit/794ad7c756c68e0459d8f105acc3bcc1347d1e59))
- **Zoho Node:** Fix pagination issue ([#3129](https://github.com/n8n-io/n8n/issues/3129)) ([47bbe98](https://github.com/n8n-io/n8n/commit/47bbe9857b5f3321c9402595041afcb6b96411c4))

### Features

- **Discord Node:** Add additional options ([#2918](https://github.com/n8n-io/n8n/issues/2918)) ([310bffe](https://github.com/n8n-io/n8n/commit/310bffe7137f6baf36b93719c1e5abe8596dd346))
- **editor:** Add drag and drop from nodes panel ([#3123](https://github.com/n8n-io/n8n/issues/3123)) ([f566569](https://github.com/n8n-io/n8n/commit/f56656929992b98a3473944fd2a395e05d5c42f0))
- **Google Cloud Realtime Database Node:** Make it possible to select region ([#3096](https://github.com/n8n-io/n8n/issues/3096)) ([176538e](https://github.com/n8n-io/n8n/commit/176538e5f21f14ea3e5964dbe905fe4af89faaef))
- **GoogleBigQuery Node:** Add support for service account authentication ([#3128](https://github.com/n8n-io/n8n/issues/3128)) ([ac5f357](https://github.com/n8n-io/n8n/commit/ac5f357001b6887d649f65bc32a30e30aa75584b))
- **Markdown Node:** Add new node to covert between Markdown <> HTML ([#1728](https://github.com/n8n-io/n8n/issues/1728)) ([5d1ddb0](https://github.com/n8n-io/n8n/commit/5d1ddb0e9b56d999ec4d9278b81262aafceb43a9))
- **PagerDuty Node:** Add support for additional details in incidents ([#3140](https://github.com/n8n-io/n8n/issues/3140)) ([6ca7454](https://github.com/n8n-io/n8n/commit/6ca74540782623ac2301550b62f3382e88b8ed83)), closes [#3094](https://github.com/n8n-io/n8n/issues/3094) [#3105](https://github.com/n8n-io/n8n/issues/3105) [#3112](https://github.com/n8n-io/n8n/issues/3112) [#3078](https://github.com/n8n-io/n8n/issues/3078) [#3133](https://github.com/n8n-io/n8n/issues/3133) [#2918](https://github.com/n8n-io/n8n/issues/2918)
- **Slack Node:** Add blocks to slack message update ([#2182](https://github.com/n8n-io/n8n/issues/2182)) ([b5b6000](https://github.com/n8n-io/n8n/commit/b5b60008d680cd843a418390d451743fc13cac9c)), closes [#1728](https://github.com/n8n-io/n8n/issues/1728)

# [0.172.0](https://github.com/n8n-io/n8n/compare/n8n@0.171.1...n8n@0.172.0) (2022-04-11)

### Bug Fixes

- **Action Network Node:** Fix pagination issue and add credential test ([#3011](https://github.com/n8n-io/n8n/issues/3011)) ([9ef339e](https://github.com/n8n-io/n8n/commit/9ef339e5257e4aa79600554c815cb32fd226753d))
- **core:** Set correct timezone in luxon ([#3115](https://github.com/n8n-io/n8n/issues/3115)) ([3763f81](https://github.com/n8n-io/n8n/commit/3763f815bd14dcc45786efb9b97bb85695bbf734))
- **editor:** Fix i18n issues ([#3072](https://github.com/n8n-io/n8n/issues/3072)) ([4ae0f5b](https://github.com/n8n-io/n8n/commit/4ae0f5b6fba65bfa8f236657d89358f53e465c69)), closes [#3097](https://github.com/n8n-io/n8n/issues/3097)

### Features

- **editor:** Refactor Node Output Panel [PR#3097](https://github.com/PR/issues/3097)
- **Magento 2 Node:** Add credential tests ([#3086](https://github.com/n8n-io/n8n/issues/3086)) ([a11b00a](https://github.com/n8n-io/n8n/commit/a11b00a0374359f0ba8fe91a1df402f32de61b15))
- **PayPal Node:** Add auth test, fix typo and update API URL ([#3084](https://github.com/n8n-io/n8n/issues/3084)) ([c7a037e](https://github.com/n8n-io/n8n/commit/c7a037e9feed94b641e6aab92301c8a647a2934c)), closes [PR#2568](https://github.com/PR/issues/2568)

## [0.171.1](https://github.com/n8n-io/n8n/compare/n8n@0.171.0...n8n@0.171.1) (2022-04-06)

### Bug Fixes

- **core:** Fix issue with current executions not getting displayed ([#3093](https://github.com/n8n-io/n8n/issues/3093)) ([4af5168](https://github.com/n8n-io/n8n/commit/4af5168b3bc92578dc807bab1c11e3d90e151928))
- **core:** Fix issue with falsely skip authorizing ([#3087](https://github.com/n8n-io/n8n/issues/3087)) ([358a683](https://github.com/n8n-io/n8n/commit/358a683f381aa8eb7edd4886d6bdfe7ada61ec35))
- **WooCommerce Node:** Fix pagination issue with "Get All" operation ([#2529](https://github.com/n8n-io/n8n/issues/2529)) ([c2a5e0d](https://github.com/n8n-io/n8n/commit/c2a5e0d1b6a89cb7397b93bbb0f0be9be0df9c86))

# [0.171.0](https://github.com/n8n-io/n8n/compare/n8n@0.170.0...n8n@0.171.0) (2022-04-03)

### Bug Fixes

- **core:** Fix crash on webhook when last node did not return data ([c50d04a](https://github.com/n8n-io/n8n/commit/c50d04af9eb033d82860c336fc7350b5c3f22242))
- **EmailReadImap Node:** Fix issue that crashed process if node was configured wrong ([#3079](https://github.com/n8n-io/n8n/issues/3079)) ([85f15d4](https://github.com/n8n-io/n8n/commit/85f15d49896d876fa3ab84e9fa1846f856851274))
- **Google Tasks Node:** Fix "Show Completed" option and hide title field where not needed ([#2741](https://github.com/n8n-io/n8n/issues/2741)) ([9d703e3](https://github.com/n8n-io/n8n/commit/9d703e366b8e191e0f588469892ebb7b6d03c1d3))
- **NocoDB Node:** Fix pagination ([#3081](https://github.com/n8n-io/n8n/issues/3081)) ([5f44b0d](https://github.com/n8n-io/n8n/commit/5f44b0dad5254fe9f985b314db8f7d43ab48c712))
- **Salesforce Node:** Fix issue that "status" did not get used for Case => Create & Update ([#2212](https://github.com/n8n-io/n8n/issues/2212)) ([1018146](https://github.com/n8n-io/n8n/commit/1018146f21c47eda9f888bd19e92d1106c49267a))

### Features

- **editor:** Add download button for binary data ([#2992](https://github.com/n8n-io/n8n/issues/2992)) ([13a9db7](https://github.com/n8n-io/n8n/commit/13a9db774576a00d4e3ce1988557654d00067073))
- **Emelia Node:** Add Campaign > Duplicate functionality ([#3000](https://github.com/n8n-io/n8n/issues/3000)) ([0b08be1](https://github.com/n8n-io/n8n/commit/0b08be1c0b2961f235fc2446a36afe3995b4d847)), closes [#3065](https://github.com/n8n-io/n8n/issues/3065) [#2741](https://github.com/n8n-io/n8n/issues/2741) [#3075](https://github.com/n8n-io/n8n/issues/3075)
- **FTP Node:** Add option to recursively create directories on rename ([#3001](https://github.com/n8n-io/n8n/issues/3001)) ([39a6f41](https://github.com/n8n-io/n8n/commit/39a6f417203b76cfa2c68816c49e86dc7236aba4))
- **Mautic Node:** Add credential test and allow trailing slash in host ([#3080](https://github.com/n8n-io/n8n/issues/3080)) ([0a75539](https://github.com/n8n-io/n8n/commit/0a75539cc3d696a8946d7db5ff5842ff54835134))
- **Microsoft Teams Node:** Add chat message support ([#2635](https://github.com/n8n-io/n8n/issues/2635)) ([984f62d](https://github.com/n8n-io/n8n/commit/984f62df9ed92cdf297b3b56300c9f23bf128d2d))
- **Mocean Node:** Add "Delivery Report URL" option and credential tests ([#3075](https://github.com/n8n-io/n8n/issues/3075)) ([c89d2b1](https://github.com/n8n-io/n8n/commit/c89d2b10f2461ff8e90209b8f29c222f9430dba5))
- **ServiceNow Node:** Add basicAuth support and fix getColumns loadOptions ([#2712](https://github.com/n8n-io/n8n/issues/2712)) ([2c72584](https://github.com/n8n-io/n8n/commit/2c72584b55521b437baa20ddad7c919807fd9f8f)), closes [#2741](https://github.com/n8n-io/n8n/issues/2741) [#3075](https://github.com/n8n-io/n8n/issues/3075) [#3000](https://github.com/n8n-io/n8n/issues/3000) [#3065](https://github.com/n8n-io/n8n/issues/3065) [#2741](https://github.com/n8n-io/n8n/issues/2741) [#3075](https://github.com/n8n-io/n8n/issues/3075) [#3071](https://github.com/n8n-io/n8n/issues/3071) [#3001](https://github.com/n8n-io/n8n/issues/3001) [#2635](https://github.com/n8n-io/n8n/issues/2635) [#3080](https://github.com/n8n-io/n8n/issues/3080) [#3061](https://github.com/n8n-io/n8n/issues/3061) [#3081](https://github.com/n8n-io/n8n/issues/3081) [#2582](https://github.com/n8n-io/n8n/issues/2582) [#2212](https://github.com/n8n-io/n8n/issues/2212)
- **Strava Node:** Add "Get Streams" operation ([#2582](https://github.com/n8n-io/n8n/issues/2582)) ([6bbb4df](https://github.com/n8n-io/n8n/commit/6bbb4df05925362404f844a23a695f186d27b72e))

# [0.170.0](https://github.com/n8n-io/n8n/compare/n8n@0.169.0...n8n@0.170.0) (2022-03-27)

### Bug Fixes

- **core:** Add logs and error catches for possible failures in queue mode ([#3032](https://github.com/n8n-io/n8n/issues/3032)) ([3b4a97d](https://github.com/n8n-io/n8n/commit/3b4a97dd576bd3c2f53f958266964d3e02f01c96))
- **AWS Lambda Node:** Fix "Invocation Type" > "Continue Workflow" ([#3010](https://github.com/n8n-io/n8n/issues/3010)) ([9547a08](https://github.com/n8n-io/n8n/commit/9547a08f0344825e42f5580da035bb1f21c03368))
- **Supabase Node:** Fix Row > Get operation ([#3045](https://github.com/n8n-io/n8n/issues/3045)) ([b9aa440](https://github.com/n8n-io/n8n/commit/b9aa440be3d52bf412990b93cfc3758353fb4943))
- **Supabase Node:** Send token also via Authorization Bearer ([#2814](https://github.com/n8n-io/n8n/issues/2814)) ([5774dd8](https://github.com/n8n-io/n8n/commit/5774dd8885a87a1ebe70f4ef4a06a42013112afe))
- **Xero Node:** Fix some operations and add support for setting address and phone number ([#3048](https://github.com/n8n-io/n8n/issues/3048)) ([ab08c0d](https://github.com/n8n-io/n8n/commit/ab08c0df1599d44326b45c37f80918e5c107cc6a))
- **Wise Node:** Fix issue when executing a transfer ([#3039](https://github.com/n8n-io/n8n/issues/3039)) ([b90bf45](https://github.com/n8n-io/n8n/commit/b90bf4576c6e3f86000d61606f412ea0544b59ef))

### Features

- **Crypto Node:** Add Generate operation to generate random values ([#2541](https://github.com/n8n-io/n8n/issues/2541)) ([b5ecccb](https://github.com/n8n-io/n8n/commit/b5ecccb84080362880a307e3f9d76d429bd1d537))
- **HTTP Request Node:** Add support for OPTIONS method ([#3030](https://github.com/n8n-io/n8n/issues/3030)) ([bd9064c](https://github.com/n8n-io/n8n/commit/bd9064cd0ea8833b49a7e3860f12bfa37c286947))
- **Jira Node:** Add Simplify Output option to Issue > Get ([#2408](https://github.com/n8n-io/n8n/issues/2408)) ([016aeaa](https://github.com/n8n-io/n8n/commit/016aeaaa791205c5ee3d16eef25f856603cf0085))
- **Reddit Node:** Add possibility to query saved posts ([#3034](https://github.com/n8n-io/n8n/issues/3034)) ([5ba4c27](https://github.com/n8n-io/n8n/commit/5ba4c27d8c417964187af89a15d5dd4ce9f3271a))
- **Zendesk Node:** Add ticket status "On-hold" ([2b20a46](https://github.com/n8n-io/n8n/commit/2b20a460915655791647d62b48dde97dad3b2fd3))

# [0.169.0](https://github.com/n8n-io/n8n/compare/n8n@0.168.2...n8n@0.169.0) (2022-03-20)

### License change

From [Apache 2.0 with Commons Clause](https://github.com/n8n-io/n8n/blob/181ba3c4e236279b65d102a8a33ae6896f160487/LICENSE.md) to [Sustainable Use License](https://github.com/n8n-io/n8n/blob/master/LICENSE.md)

### Bug Fixes

- **GitHub Node:** Fix credential tests and File > List operation ([#2999](https://github.com/n8n-io/n8n/issues/2999)) ([ec618e2](https://github.com/n8n-io/n8n/commit/ec618e25bba5e36592ff37e7c560d738387c9112))
- **Telegram Node:** Fix sending binary data when disable notification is set ([#2990](https://github.com/n8n-io/n8n/issues/2990)) ([26a7c61](https://github.com/n8n-io/n8n/commit/26a7c61175c1aadc101e055067224aa0797db5c5))

### Features

- Add support for reading ids from file with executeBatch command ([#3008](https://github.com/n8n-io/n8n/issues/3008)) ([5658593](https://github.com/n8n-io/n8n/commit/5658593df4cde8615f3a8383f1045d8659fffb04))
- **HTTP Request Node:** Allow Delete requests with body ([#2900](https://github.com/n8n-io/n8n/issues/2900)) ([8a88f94](https://github.com/n8n-io/n8n/commit/8a88f948f2bb6ab780a58cd284c0f6d4f499f9c6))
- **KoBoToolbox Node:** Add KoBoToolbox Regular and Trigger Node ([#2765](https://github.com/n8n-io/n8n/issues/2765)) ([1a7f0a4](https://github.com/n8n-io/n8n/commit/1a7f0a42465574f46f00e4d9d50cf71d947dc2bc)), closes [#2510](https://github.com/n8n-io/n8n/issues/2510)
- **Linear Node:** Add Linear Node ([#2971](https://github.com/n8n-io/n8n/issues/2971)) ([8d04474](https://github.com/n8n-io/n8n/commit/8d04474e30dc9109ad84fc945cc734483d0d067b))
- **Mailjet Node:** Add credential tests and support for sandbox, JSON parameters & variables ([#2987](https://github.com/n8n-io/n8n/issues/2987)) ([d2756de](https://github.com/n8n-io/n8n/commit/d2756de090f2628f9025ba2f4436870e67576367))
- **Mattermost Node:** Add support for Channel Search ([#2687](https://github.com/n8n-io/n8n/issues/2687)) ([1b993e4](https://github.com/n8n-io/n8n/commit/1b993e402297ac400c5167d1bcfa78e9a73c07df))

## [0.168.2](https://github.com/n8n-io/n8n/compare/n8n@0.168.1...n8n@0.168.2) (2022-03-16)

### Bug Fixes

- Fix issue with n8n not authenticating oauth requests ([#2998](https://github.com/n8n-io/n8n/issues/2998))

## [0.168.1](https://github.com/n8n-io/n8n/compare/n8n@0.168.0...n8n@0.168.1) (2022-03-15)

### Bug Fixes

- Add missing email templates

# [0.168.0](https://github.com/n8n-io/n8n/compare/n8n@0.167.0...n8n@0.168.0) (2022-03-14)

### Features

- Add User Management ([#2636](https://github.com/n8n-io/n8n/issues/2636)) ([7264239](https://github.com/n8n-io/n8n/commit/7264239b839b8e92b7ea667ec70e5c3edb578277))

# 0.167.0 (2022-03-13)

### Bug Fixes

- Fix issue with long credential type names ([#2961](https://github.com/n8n-io/n8n/issues/2961)) ([535dfe0](https://github.com/n8n-io/n8n/commit/535dfe08384fdd0a4ea86521e917b28f7091ff82))
- Fix workflow deactivating bug ([195f104](https://github.com/n8n-io/n8n/commit/195f104ef51b722fd5e3756ed3d0cc47ef523362))
- **GoogleCalendar Node:** Fix timezone ([3c5df3f](https://github.com/n8n-io/n8n/commit/3c5df3f892d89e1ae79dfcc0cd5b1886d1f623db))
- **SeaTableTrigger Node:** Fix timezone issues ([#2726](https://github.com/n8n-io/n8n/issues/2726)) ([2d8ac4b](https://github.com/n8n-io/n8n/commit/2d8ac4b477f8fb381a35eba34710084d5e4d3402))
- **Strapi Node:** Add support for Strapi v4 ([2a3cbf3](https://github.com/n8n-io/n8n/commit/2a3cbf3fc85f64e9b4b5814f1206249261743021))

### Features

- Add new expression variables and support for luxon ([e8500e6](https://github.com/n8n-io/n8n/commit/e8500e69371ad4b205d1586c7837120267595c70))
- **Facebook Node:** Add support for Facebook Graph API versions 13 ([53b5444](https://github.com/n8n-io/n8n/commit/53b54440d7532f439c3533676758b6c83136d48c))
- **Hubspot:** Add support for Private App Token Authentication ([f73100a](https://github.com/n8n-io/n8n/commit/f73100a0bdebd05b25517532358c71feed040eeb))
- **If Node,Switch Node:** Add negative operations ([6412546](https://github.com/n8n-io/n8n/commit/6412546c0c5465b17ab2a289f45d8c8fa325eb68))
- **MongoDb Node:** Add Aggregate Operation ([2c9a06e](https://github.com/n8n-io/n8n/commit/2c9a06e86346a9e21f877cb508d13a1401c700a9))
- **Redis Node:** Add Redis Trigger node and publish operation to regular node ([5c2deb4](https://github.com/n8n-io/n8n/commit/5c2deb468867ec77a05d09ef324d4855210e17d4))
- **Wordpress Node:** Add Status option to Get All operation of Posts resource ([4d4db7f](https://github.com/n8n-io/n8n/commit/4d4db7f805673758dfb379c9e86e98815f265db2))

> **Note:** for changelogs before 0.167.0, refer to the [Release notes](https://docs.n8n.io/reference/release-notes.html) in the documentation.
