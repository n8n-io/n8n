# 0.167.0 (2022-03-14)


### Bug Fixes

* **cli:** Clarify webhook error message & fix typo ([b3bf138](https://github.com/n8n-io/n8n/commit/b3bf138e3b60bf4f60b60ec8c1506d2037755c89))
* **cli:** ResponseHelper sends JSON. ([f23abdc](https://github.com/n8n-io/n8n/commit/f23abdce2e7a19cdb0f3d7e7bf7669a037657729)), closes [#430](https://github.com/n8n-io/n8n/issues/430)
* **editor-ui:** Use `cross-env` ([70a050c](https://github.com/n8n-io/n8n/commit/70a050c7f16954184bc06343b0ab48408762db27)), closes [#428](https://github.com/n8n-io/n8n/issues/428)
* Fix issue with long credential type names ([#2961](https://github.com/n8n-io/n8n/issues/2961)) ([535dfe0](https://github.com/n8n-io/n8n/commit/535dfe08384fdd0a4ea86521e917b28f7091ff82))
* Fix workflow deactivating bug ([195f104](https://github.com/n8n-io/n8n/commit/195f104ef51b722fd5e3756ed3d0cc47ef523362))
* forgot readonly to editor ([62f0899](https://github.com/n8n-io/n8n/commit/62f0899e100b11ba45509df796c1c5d342b1c78d))
* **GoogleCalendar Node:** Fix timezone ([3c5df3f](https://github.com/n8n-io/n8n/commit/3c5df3f892d89e1ae79dfcc0cd5b1886d1f623db))
* monaco build problems ([f811992](https://github.com/n8n-io/n8n/commit/f811992527e15aa310fcef1603a69776adff6a7c))
* **SeaTableTrigger Node:** Fix timezone issues ([#2726](https://github.com/n8n-io/n8n/issues/2726)) ([2d8ac4b](https://github.com/n8n-io/n8n/commit/2d8ac4b477f8fb381a35eba34710084d5e4d3402))
* set autocomplete data as empty array ([7a020d0](https://github.com/n8n-io/n8n/commit/7a020d079fa564f895564c14339df2617ce470f5))
* **Strapi Node:** Add support for Strapi v4 ([2a3cbf3](https://github.com/n8n-io/n8n/commit/2a3cbf3fc85f64e9b4b5814f1206249261743021))
* use .bin for tsc ([45a82b4](https://github.com/n8n-io/n8n/commit/45a82b40b5568f5aa941a605b2cf921b7dc14784))
* workflow ([061e990](https://github.com/n8n-io/n8n/commit/061e990d87dd1da1b5a136b9cfeaa31c9c316db8))


### Features

* add balance endpoint to messagebird ([c922163](https://github.com/n8n-io/n8n/commit/c922163622831d4418c308764db7ecebfc1583a7))
* Add new expression variables and support for luxon ([e8500e6](https://github.com/n8n-io/n8n/commit/e8500e69371ad4b205d1586c7837120267595c70))
* **credential:** add credential of mysql node ([040b0a6](https://github.com/n8n-io/n8n/commit/040b0a690ce91d12609b65caa02a53ea35cd6a81))
* docker images ([4d3ff09](https://github.com/n8n-io/n8n/commit/4d3ff091aa1c06032ce41ec5d82ee5c445a29687))
* **Facebook Node:** Add support for Facebook Graph API versions 13 ([53b5444](https://github.com/n8n-io/n8n/commit/53b54440d7532f439c3533676758b6c83136d48c))
* **Hubspot:** Add support for Private App Token Authentication ([f73100a](https://github.com/n8n-io/n8n/commit/f73100a0bdebd05b25517532358c71feed040eeb))
* **Hubspot:** Add support for Private App Token Authentication ([2ff13a6](https://github.com/n8n-io/n8n/commit/2ff13a68425d6a9dd63eed908671568bbaa6cefa))
* **If Node,Switch Node:** Add negative operations ([6412546](https://github.com/n8n-io/n8n/commit/6412546c0c5465b17ab2a289f45d8c8fa325eb68))
* **MongoDb Node:** Add Aggregate Operation ([2c9a06e](https://github.com/n8n-io/n8n/commit/2c9a06e86346a9e21f877cb508d13a1401c700a9))
* **node:** add mysql node ([c34f484](https://github.com/n8n-io/n8n/commit/c34f4841c28b021204fa19f988e20126d307f721))
* **node:** remove knex dependency from MySQL node ([a78da10](https://github.com/n8n-io/n8n/commit/a78da100f80a9a0b15c66091e5008dc2e83d94f6))
* **Redis Node:** Add Redis Trigger node and publish operation to regular node ([5c2deb4](https://github.com/n8n-io/n8n/commit/5c2deb468867ec77a05d09ef324d4855210e17d4))
* replace function node code editor with monaco ([c63f365](https://github.com/n8n-io/n8n/commit/c63f365a658031fcb51202f062fe3e66885f9058))
* **WebhookHelpers.ts, Webhook.node.ts:** no body response for webhook ([d129007](https://github.com/n8n-io/n8n/commit/d1290075ede7ef59f2dec54d783eaebd1cecc118))
* **Wordpress Node:** Add Status option to Get All operation of Posts resource ([4d4db7f](https://github.com/n8n-io/n8n/commit/4d4db7f805673758dfb379c9e86e98815f265db2))


### Reverts

* Revert ":bug: Fix VUE_APP_PUBLIC_PATH issue (#2648)" (#2655) ([7be9769](https://github.com/n8n-io/n8n/commit/7be9769302deae734c1b6a270619b01313e05481)), closes [#2648](https://github.com/n8n-io/n8n/issues/2648) [#2655](https://github.com/n8n-io/n8n/issues/2655)
* Revert ":bug: Fix ipad drag issue (#2016)" (#2062) ([6ffc46c](https://github.com/n8n-io/n8n/commit/6ffc46c79df553577b4684127793529ff84c6551)), closes [#2016](https://github.com/n8n-io/n8n/issues/2016) [#2062](https://github.com/n8n-io/n8n/issues/2062)
* Revert ":zap: Simplify config imports in cli package (#1840)" (#1931) ([d3a1d3f](https://github.com/n8n-io/n8n/commit/d3a1d3ffefbbe2be42c960cd7f5bf67fd0846269)), closes [#1840](https://github.com/n8n-io/n8n/issues/1840) [#1931](https://github.com/n8n-io/n8n/issues/1931)
* Revert ":zap: Deconstructed store mutation data parameters for better readability" ([3358265](https://github.com/n8n-io/n8n/commit/33582655f284cab49cb4d55f69973cde1b47b013))



