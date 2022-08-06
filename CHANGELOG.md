## [0.189.1](https://github.com/n8n-io/n8n/compare/n8n@0.189.0...n8n@0.189.1) (2022-08-05)


### Bug Fixes

* Fix issue with MySQL/MariaDB migration ([#3832](https://github.com/n8n-io/n8n/issues/3832))


# [0.189.0](https://github.com/n8n-io/n8n/compare/n8n@0.188.0...n8n@0.189.0) (2022-08-03)


### Bug Fixes

* **editor:** Fix label cut off ([#3820](https://github.com/n8n-io/n8n/issues/3820)) ([0f27be4](https://github.com/n8n-io/n8n/commit/0f27be4447662056a2ba13c027280830f7eab09b))
* Fix problem saving workflow when tags disabled ([#3792](https://github.com/n8n-io/n8n/issues/3792)) ([f0dddaa](https://github.com/n8n-io/n8n/commit/f0dddaa2a585715b35e26b16e1003e1683ab9402))


### Features

* **NocoDB Node:** Add support v0.90.0+ ([#3146](https://github.com/n8n-io/n8n/issues/3146)) ([d65a9ed](https://github.com/n8n-io/n8n/commit/d65a9ed118ff16c67b6d69d68108d8b7da1814d9))
* **SendInBlue Node:** Add SendInBlue Regular + Trigger Node  ([#3746](https://github.com/n8n-io/n8n/issues/3746)) ([74cedd9](https://github.com/n8n-io/n8n/commit/74cedd94a82f0c053a24b6e925d9e3bcadcebfbc))
* Support community nodes on Windows ([#3823](https://github.com/n8n-io/n8n/issues/3823)) ([e8eda74](https://github.com/n8n-io/n8n/commit/e8eda7470a17deec1f5eab8cded6e74a8e3aee39))



# [0.188.0](https://github.com/n8n-io/n8n/compare/n8n@0.187.2...n8n@0.188.0) (2022-07-27)


### Bug Fixes

* **AWS DynamoDB Node:** Fix expression attribute names ([#3763](https://github.com/n8n-io/n8n/issues/3763)) ([88cb265](https://github.com/n8n-io/n8n/commit/88cb26556c162aa1281dfa6a9fa8eca4cd071e9d))
* **core:** Add windows support to import:credentials --separate ([#3589](https://github.com/n8n-io/n8n/issues/3589)) ([2fb590e](https://github.com/n8n-io/n8n/commit/2fb590e8440ac35567fdbf745b294d79feb8c5a9))
* **editor:** Fix linking buttons color ([#3770](https://github.com/n8n-io/n8n/issues/3770)) ([deb510a](https://github.com/n8n-io/n8n/commit/deb510a8e0057280da43f3b3e72d8acca5829745))
* **editor:** Fix pin data in executions when pinData is null. ([#3787](https://github.com/n8n-io/n8n/issues/3787)) ([30c0f21](https://github.com/n8n-io/n8n/commit/30c0f21b3f37280403848592877cb8658367b85e))
* **editor:** Fix spaces bug ([#3774](https://github.com/n8n-io/n8n/issues/3774)) ([02549e3](https://github.com/n8n-io/n8n/commit/02549e3ba9233a6d9f75fc1f9ff138e2aff7f4b9))
* **editor:** Fix sticky duplication and position bug ([#3755](https://github.com/n8n-io/n8n/issues/3755)) ([92614c8](https://github.com/n8n-io/n8n/commit/92614c81abfdbca51d4901b364467d3505870255))
* **editor:** Restore pindata header colors ([#3758](https://github.com/n8n-io/n8n/issues/3758)) ([1a7318b](https://github.com/n8n-io/n8n/commit/1a7318b4cf6081e5ba743117cf90ef6920625aa0))
* Fix node_type property in all events ([#3759](https://github.com/n8n-io/n8n/issues/3759)) ([1f1a63c](https://github.com/n8n-io/n8n/commit/1f1a63c39adc673259c951af3e5152c5edc34968))
* **Fix Rocketchat Node:** Fix authentication issue ([#3778](https://github.com/n8n-io/n8n/issues/3778)) ([2710061](https://github.com/n8n-io/n8n/commit/271006152386511c19feb54e438fa60966dbf705))
* **Mautic Node:** Fix authentication issue ([#3761](https://github.com/n8n-io/n8n/issues/3761)) ([fe58769](https://github.com/n8n-io/n8n/commit/fe58769b4830f388ad67ae1c32fcaa55aa0b848e))


### Features

* Improvements to pairedItem ([1348349](https://github.com/n8n-io/n8n/commit/13483497484e205975ef71091e3892f757f608e1))
* **Item List Node:** Add operation for creating array from input items ([#3149](https://github.com/n8n-io/n8n/issues/3149)) ([553b14a](https://github.com/n8n-io/n8n/commit/553b14a13c7c9056447ef0b18c9427f26221b44d))
* **Kafka Trigger Node:** Add additional options ([#3600](https://github.com/n8n-io/n8n/issues/3600)) ([3496a39](https://github.com/n8n-io/n8n/commit/3496a39788b654b46485955ba5cce5e5865babc7))
* **Metabase Node:** Add Metabase Node ([#3033](https://github.com/n8n-io/n8n/issues/3033)) ([81b5828](https://github.com/n8n-io/n8n/commit/81b58285588f142c0b1cc148f0092c462eefdd73))



## [0.187.2](https://github.com/n8n-io/n8n/compare/n8n@0.187.1...n8n@0.187.2) (2022-07-21)


### Bug Fixes

* **editor:** Fix console error ([#3751](https://github.com/n8n-io/n8n/issues/3751)) ([3a98028](https://github.com/n8n-io/n8n/commit/3a98028722d634f604a650d891cf6fabf722993d))
* **editor:** Fix login issue for non-admin users ([#3754](https://github.com/n8n-io/n8n/issues/3754)) ([ccd1ed2](https://github.com/n8n-io/n8n/commit/ccd1ed2c4c5153637a7900a79a40b1c4f53e7635))
* **editor:** Fix problems with credentials modal if no node is opened ([#3749](https://github.com/n8n-io/n8n/issues/3749)) ([5efe4a4](https://github.com/n8n-io/n8n/commit/5efe4a4c54211f1d395202c420403be3cc7e4446))
* **NocoDB Node:** Fix authentication issue ([#3750](https://github.com/n8n-io/n8n/issues/3750)) ([e65016c](https://github.com/n8n-io/n8n/commit/e65016c861176a7b17f23c5fbf3c0a3fcc1e5e1d))



## [0.187.1](https://github.com/n8n-io/n8n/compare/n8n@0.187.0...n8n@0.187.1) (2022-07-20)


### Bug Fixes

* **editor:** Fix issue that new nodes did not get automatically displayed in all connected browsers ([#3745](https://github.com/n8n-io/n8n/issues/3745)) ([34a9bee](https://github.com/n8n-io/n8n/commit/34a9beefa5b0f169f38ca48d3444af8f160c85a2))



# [0.187.0](https://github.com/n8n-io/n8n/compare/n8n@0.186.1...n8n@0.187.0) (2022-07-20)


### Bug Fixes

* **api:** Add missing node settings parameters ([#3737](https://github.com/n8n-io/n8n/issues/3737)) ([803e009](https://github.com/n8n-io/n8n/commit/803e0097fada1bf0385ac37965f0cc47bed28948))
* **api:** Validate static data value for resource workflow ([#3736](https://github.com/n8n-io/n8n/issues/3736)) ([7ba9a05](https://github.com/n8n-io/n8n/commit/7ba9a055cdeb2b0713857747a5b722dab65d3678))
* **Baserow Node:** Fix issue that table names are not getting pulled in new version ([#3721](https://github.com/n8n-io/n8n/issues/3721)) ([f65a5db](https://github.com/n8n-io/n8n/commit/f65a5db478da0da65735bdc5bb09774f1d473ec9))
* **editor:** Hide 'Execute previous node' button in readonly mode ([#3714](https://github.com/n8n-io/n8n/issues/3714)) ([7fb81dc](https://github.com/n8n-io/n8n/commit/7fb81dcd8a6c56e6e104be94278c690caf35c846))
* **editor:** Hide tabs if only 1 branch ([#3743](https://github.com/n8n-io/n8n/issues/3743)) ([fb67543](https://github.com/n8n-io/n8n/commit/fb67543b2f10c558abcacc5454d6fa0687ee4702))
* Fix broken links in nodes ([#3716](https://github.com/n8n-io/n8n/issues/3716)) ([c9b7b6d](https://github.com/n8n-io/n8n/commit/c9b7b6d30fe822bddb3d68e1b4757ffe654e918b))


### Features

* Add more credentials tests ([#3668](https://github.com/n8n-io/n8n/issues/3668)) ([683d2df](https://github.com/n8n-io/n8n/commit/683d2dfc98136503971a4beb1692e5ca191d5016))
* Add support for preAuthentication and add Metabase credentials ([#3399](https://github.com/n8n-io/n8n/issues/3399)) ([994c89a](https://github.com/n8n-io/n8n/commit/994c89a6c6ade5b99d6218c9776adc15c286b619))
* **core:** Autofix pairedItem information if inputItems(n) === outputItems(n) ([68fb1c6](https://github.com/n8n-io/n8n/commit/68fb1c64dca99fb603fe6d52fd50c4749a2ca898))
* **editor:** Add data pinning functionality ([#3511](https://github.com/n8n-io/n8n/issues/3511)) ([15693b0](https://github.com/n8n-io/n8n/commit/15693b0056097129a57dfc600807dbc5e1cc07f1)
* **editor:** Add drag and drop data mapping ([#3708](https://github.com/n8n-io/n8n/issues/3708)) ([577c73e](https://github.com/n8n-io/n8n/commit/577c73ee25c5bfc943ef5ed1de550fcb489f4998))
* **ERPNext Node:** Add credential test and add support for unauthorized certs ([#3732](https://github.com/n8n-io/n8n/issues/3732)) ([a02b206](https://github.com/n8n-io/n8n/commit/a02b20617071e1ca398735456cb416d6ab3f34a0)), closes [#3739](https://github.com/n8n-io/n8n/issues/3739)
* **Google Drive Node:** Add move to trash support ([#3693](https://github.com/n8n-io/n8n/issues/3693)) ([7406432](https://github.com/n8n-io/n8n/commit/74064325c892c5b506260e650d3361636b578b1e))
* Make it possible to dynamically load community nodes ([#2849](https://github.com/n8n-io/n8n/issues/2849)) ([c85faff](https://github.com/n8n-io/n8n/commit/c85faff4f1c6ba11c02cf5c14122d2c7341f3ec3)), closes [#3497](https://github.com/n8n-io/n8n/issues/3497) [#3501](https://github.com/n8n-io/n8n/issues/3501) [#3527](https://github.com/n8n-io/n8n/issues/3527) [#3562](https://github.com/n8n-io/n8n/issues/3562)
* **Mindee Node:** Add support for new version ([#3596](https://github.com/n8n-io/n8n/issues/3596)) ([1965407](https://github.com/n8n-io/n8n/commit/1965407030638cc309c99d344121f47805c93799))
* **Notion Node:** Allow to ignore Notion URL properties if empty ([#3564](https://github.com/n8n-io/n8n/issues/3564)) ([6cb9aef](https://github.com/n8n-io/n8n/commit/6cb9aefb0b3e4d17382042371a20e63f23641581))
* **Shopify Node:** Add OAuth support ([#3389](https://github.com/n8n-io/n8n/issues/3389)) ([945e25a](https://github.com/n8n-io/n8n/commit/945e25a77cf9ba33bc3e4b70053319ea86230cf7))



## [0.186.1](https://github.com/n8n-io/n8n/compare/n8n@0.186.0...n8n@0.186.1) (2022-07-14)


### Bug Fixes

* **Airtable Node:** Fix authentication issue ([#3709](https://github.com/n8n-io/n8n/issues/3709)) ([33d8042](https://github.com/n8n-io/n8n/commit/33d804284ae02140749ab94eecfca1699e13afee))



# [0.186.0](https://github.com/n8n-io/n8n/compare/n8n@0.185.0...n8n@0.186.0) (2022-07-13)


### Bug Fixes

* **editor:** Fix error after multiple executions ([#3697](https://github.com/n8n-io/n8n/issues/3697)) ([d200661](https://github.com/n8n-io/n8n/commit/d200661b84c36b3f04d812cf022bb338f9664392))
* **EmailReadImap Node:** Improve handling of network problems ([#3406](https://github.com/n8n-io/n8n/issues/3406)) ([6f5809e](https://github.com/n8n-io/n8n/commit/6f5809edb3f9cac0c29d448300b37ab9b6e74c08))
* **Google Drive Node:** Process all input items with List operation ([#3525](https://github.com/n8n-io/n8n/issues/3525)) ([ece1836](https://github.com/n8n-io/n8n/commit/ece1836c45707d349330f742eb3b83fa1f4eaebb))
* **Telegram Node:** Fix sending binaryData media (photo, document, video etc.) ([#3408](https://github.com/n8n-io/n8n/issues/3408)) ([af45a07](https://github.com/n8n-io/n8n/commit/af45a07f21d8448bad5c12ed702b7aa983017a2b))


### Features

* Add item information to more node errors ([#3681](https://github.com/n8n-io/n8n/issues/3681)) ([2a8043c](https://github.com/n8n-io/n8n/commit/2a8043cd27968b92b1857135d130e3ee54aae779))
* **AWS DynamoDB Node:** Improve error handling + add optional GetAll Scan FilterExpression ([#3318](https://github.com/n8n-io/n8n/issues/3318)) ([732c8fc](https://github.com/n8n-io/n8n/commit/732c8fcf8488fc35839855499f75202436fc4c9a))
* **Customer.io Node:** Add support for tracking API region selection ([#3378](https://github.com/n8n-io/n8n/issues/3378)) ([82a254a](https://github.com/n8n-io/n8n/commit/82a254a8d9295901e42ec999432a7f5b40f38281))
* **Elasticsearch Node:** Add 'Source Excludes' and 'Source Includes' options on  'Document: getAll' operation ([#3660](https://github.com/n8n-io/n8n/issues/3660)) ([8999403](https://github.com/n8n-io/n8n/commit/899940322831612bdf6e59db7f696c34f96cd496))
* **Elasticsearch Node:** Add credential tests, index pipelines and index refresh  ([#2420](https://github.com/n8n-io/n8n/issues/2420))
* **Freshworks CRM Node:** Add Search + Lookup functionality ([#3131](https://github.com/n8n-io/n8n/issues/3131)) ([dbc0280](https://github.com/n8n-io/n8n/commit/dbc02803db5351d759b1420e94b14f2c7c8b1bef))
* **Jira Trigger Node:** Add optional query auth for security ([#3172](https://github.com/n8n-io/n8n/issues/3172)) ([25093b6](https://github.com/n8n-io/n8n/commit/25093b64e693a33a76efd1bd12f00ce0d4cc0f3c))
* **Postgres Node:** Improvement handling of large numbers ([#3360](https://github.com/n8n-io/n8n/issues/3360)) ([9f908e7](https://github.com/n8n-io/n8n/commit/9f908e7405d687bf57391e503ad724d58caaac07))
* **Redis Node:** Add push and pop operations ([#3127](https://github.com/n8n-io/n8n/issues/3127)) ([32c68eb](https://github.com/n8n-io/n8n/commit/32c68eb126f8411d1a3261dc8a900c109b99da6f))
* **Rename Node:** Add regex replace ([#2576](https://github.com/n8n-io/n8n/issues/2576)) ([eae9a60](https://github.com/n8n-io/n8n/commit/eae9a60a431bc08fb58016e3249328abb90716b0))
* **SpreadsheetFile Node:** Allow skipping headers when writing spreadsheets ([#3234](https://github.com/n8n-io/n8n/issues/3234)) ([dbfb8d5](https://github.com/n8n-io/n8n/commit/dbfb8d56dc6290837701dea5957d4e73db418892))
* Updated multiple credentials with tests and allow to be used on HTTP Request Node ([#3670](https://github.com/n8n-io/n8n/issues/3670)) ([d5d4dd3](https://github.com/n8n-io/n8n/commit/d5d4dd38450b788ee0ce3ed8ad0eb714c86977d2))



# [0.185.0](https://github.com/n8n-io/n8n/compare/n8n@0.184.0...n8n@0.185.0) (2022-07-05)


### Bug Fixes

* **Hubspot Node:** Fix search endpoints ([#3640](https://github.com/n8n-io/n8n/issues/3640)) ([16b9926](https://github.com/n8n-io/n8n/commit/16b9926cd25abf4a2ae4c9eba494340eab58082f))
* **KoboToolbox Node:** Improve attachment matching logic and GeoJSON Polygon format ([#3535](https://github.com/n8n-io/n8n/issues/3535)) ([637e815](https://github.com/n8n-io/n8n/commit/637e81552f86788058567342cf69e2784e3d6b2f))
* **Odoo Node:** Prevent possible issues with some custom fields ([#3496](https://github.com/n8n-io/n8n/issues/3496)) ([7d968ec](https://github.com/n8n-io/n8n/commit/7d968ec202ceccc6a009ec150747cc927273f841))
* **Sticky Node:** Fix main header hiding ([#3654](https://github.com/n8n-io/n8n/issues/3654)) ([88486bc](https://github.com/n8n-io/n8n/commit/88486bc778786d4a47ef1bb5c743c9fb206aee01))
* **Todoist Node:** Fix multiple item support ([#3614](https://github.com/n8n-io/n8n/issues/3614)) ([7ba85c4](https://github.com/n8n-io/n8n/commit/7ba85c4ab910ed02696078ece12c88f2141cccad))


### Features
* **core:** Add `action` to `INodePropertyOptions` ([#3610](https://github.com/n8n-io/n8n/issues/3610)) ([3c65968](https://github.com/n8n-io/n8n/commit/3c659682e94cdd01fd6f267a468a031b028cf690))
* **DeepL Node:** Add support for longer texts + Credential tests ([#3651](https://github.com/n8n-io/n8n/issues/3651)) ([88d6cfc](https://github.com/n8n-io/n8n/commit/88d6cfc07bfd2be64a39f285d235e22aae8c1522))
* **Facebook Node:** Add support for Facebook Graph API versions 14 ([#3656](https://github.com/n8n-io/n8n/issues/3656)) ([174d063](https://github.com/n8n-io/n8n/commit/174d06383191e6e70ba27bc3e6e46527731c80b5))
* **Google Ads Node:** Add new node ([#3526](https://github.com/n8n-io/n8n/issues/3526)) ([088daf9](https://github.com/n8n-io/n8n/commit/088daf952ea7340a3101362bce18668147b8431f))
* **Jira Node:** Use Jira rendered fields with simplify option ([#3323](https://github.com/n8n-io/n8n/issues/3323)) ([07b6cff](https://github.com/n8n-io/n8n/commit/07b6cffdba55a48bfed629a1faec8cf88bee88bc))
* **Webflow Trigger Node:** Reduce chance of webhook duplication and add credential test ([#3594](https://github.com/n8n-io/n8n/issues/3594)) ([224e008](https://github.com/n8n-io/n8n/commit/224e008fb64dabef99998508eb4385e1b872c5ad))
* **Wordpress Node:** Add post template option ([#3139](https://github.com/n8n-io/n8n/issues/3139)) ([02bc3da](https://github.com/n8n-io/n8n/commit/02bc3da78545de4771edf6fdc68720b0e7d596b9))



# [0.184.0](https://github.com/n8n-io/n8n/compare/n8n@0.183.0...n8n@0.184.0) (2022-06-29)


### Bug Fixes

* **core:** Fix logger error when logging circular json ([#3583](https://github.com/n8n-io/n8n/issues/3583)) ([3cb693d](https://github.com/n8n-io/n8n/commit/3cb693d5d4b8aaf800df70e62c1b2ca2ff208c4d))
* Correct misfix from `node-param-display-name-wrong-for-dynamic-multi-options` ([#3575](https://github.com/n8n-io/n8n/issues/3575)) ([2ccc7fb](https://github.com/n8n-io/n8n/commit/2ccc7fbc9d1df3f044cf42fe1af72bc7352caa9f))
* **Cortex Node:** Fix issue that not all Analyzers got returned ([#3606](https://github.com/n8n-io/n8n/issues/3606)) ([6e595c7](https://github.com/n8n-io/n8n/commit/6e595c72760f47107f67c1fd2bdbe76c31af4a8b))
* **editor:** Display full text of long error messages ([#3561](https://github.com/n8n-io/n8n/issues/3561)) ([8db4405](https://github.com/n8n-io/n8n/commit/8db44057f2101698ef4869fca436862e4dd39fc1))
* **editor:** Fix credentials rendering when the node has no parameters ([#3563](https://github.com/n8n-io/n8n/issues/3563)) ([55bab19](https://github.com/n8n-io/n8n/commit/55bab19eb440ed9d58137f4334a37d5f731afe0f))
* Fix issue with required optional parameters ([#3577](https://github.com/n8n-io/n8n/issues/3577)) ([42d2959](https://github.com/n8n-io/n8n/commit/42d2959f47f33defda4239a4d2fbba6927d98617))
* Fix issue with required optional parameters ([#3597](https://github.com/n8n-io/n8n/issues/3597)) ([848fcfd](https://github.com/n8n-io/n8n/commit/848fcfde5d95d952170e9a3d51b629971a13b832))
* **HTTP Request Node:** Make all OAuth2 credentials work with HTTP Request Node ([#3503](https://github.com/n8n-io/n8n/issues/3503)) ([acdb4d9](https://github.com/n8n-io/n8n/commit/acdb4d92c8ef95646e69694b2451a9111a81c52f))
* **LinkedIn Node:** Fix LinkedIn image preview ([#3528](https://github.com/n8n-io/n8n/issues/3528)) ([32f245d](https://github.com/n8n-io/n8n/commit/32f245da53c186a03172dbb23761a05b5e301532))
* **Salesforce Node:** Fix issue with lead status not using name on update ([#3599](https://github.com/n8n-io/n8n/issues/3599)) ([7ccae7c](https://github.com/n8n-io/n8n/commit/7ccae7c9b22f2848a8aa357227d145241801ba82))


### Features

* **Clockify Node:** Add more resources and improvements ([#3411](https://github.com/n8n-io/n8n/issues/3411)) ([447d190](https://github.com/n8n-io/n8n/commit/447d19024c512eea8e290d8ebc6c3ce82a53f002))
* **core:** Expose item index being processed ([#3590](https://github.com/n8n-io/n8n/issues/3590)) ([1e4fd9e](https://github.com/n8n-io/n8n/commit/1e4fd9e4df524fdee8195de7be244ff03d97f917))
* **core:** Give access to getBinaryDataBuffer in preSend method ([#3588](https://github.com/n8n-io/n8n/issues/3588)) ([522b31a](https://github.com/n8n-io/n8n/commit/522b31a47b4f4e9990e07dcc504ef2821a1fd0a5))
* Migrated to npm release of riot-tmpl fork ([#3581](https://github.com/n8n-io/n8n/issues/3581)) ([891844e](https://github.com/n8n-io/n8n/commit/891844ea8b3248195355f736d7331fd967ee99e1))



# [0.183.0](https://github.com/n8n-io/n8n/compare/n8n@0.182.1...n8n@0.183.0) (2022-06-21)


### Bug Fixes

* **core:** Do allow OPTIONS requests from any source ([#3555](https://github.com/n8n-io/n8n/issues/3555)) ([74e6b06](https://github.com/n8n-io/n8n/commit/74e6b06467f8d0059c8cc45154e2d2822dc9b0c5))
* **core:** Fix issue that GET /workflows/:id does not return tags ([#3522](https://github.com/n8n-io/n8n/issues/3522)) ([f75f5d7](https://github.com/n8n-io/n8n/commit/f75f5d711f886892a1afcebff722ab476390f4f0))
* **core:** Fix issue that some predefined credentials do not show up on HTTP Request Node ([#3556](https://github.com/n8n-io/n8n/issues/3556)) ([d417ea7](https://github.com/n8n-io/n8n/commit/d417ea7ffad9e2210f3b2b5e7122ffbe70f2ba27))
* **core:** Return correct error message if Axios error  ([#3478](https://github.com/n8n-io/n8n/issues/3478)) ([1bef4df](https://github.com/n8n-io/n8n/commit/1bef4df75f999ac2e413b6c179baab3321c52fa2))
* **core:** Updated expressions allowlist and denylist. ([#3424](https://github.com/n8n-io/n8n/issues/3424)) ([d18a29d](https://github.com/n8n-io/n8n/commit/d18a29d5882fb8f4475258189f6badcd0a573b34))


### Features

* **editor:** Improve trigger panel ([#3509](https://github.com/n8n-io/n8n/issues/3509)) ([a2f6289](https://github.com/n8n-io/n8n/commit/a2f628927dff7ea6741ef8e4a60bcafd95dac7bf))
* **Hubspot Node:** Allow to set Stage on Ticket Update ([#3317](https://github.com/n8n-io/n8n/issues/3317)) ([0ac9e3f](https://github.com/n8n-io/n8n/commit/0ac9e3f975b73e88acabb66de8b8565f881f64ec))
* **Todoist Node:** Make it possible to move tasks between sections ([#3074](https://github.com/n8n-io/n8n/issues/3074)) ([049e454](https://github.com/n8n-io/n8n/commit/049e4544d9ccc0acce2a596aced06ec86992e09a))
* **Twake Node:** Update icon, add cred test and custom operation support ([#3431](https://github.com/n8n-io/n8n/issues/3431)) ([6d64e84](https://github.com/n8n-io/n8n/commit/6d64e84f5e19d5f6d83ccc0a55cdcbd256e5804f))



## [0.182.1](https://github.com/n8n-io/n8n/compare/n8n@0.182.0...n8n@0.182.1) (2022-06-16)


### Bug Fixes

* **core:** Fix issue with restarting waiting executions ([#3531](https://github.com/n8n-io/n8n/issues/3531)) ([c9273bc](https://github.com/n8n-io/n8n/commit/c9273bcd3862217b4918ac8abb37fae9c2e64622))



# [0.182.0](https://github.com/n8n-io/n8n/compare/n8n@0.181.2...n8n@0.182.0) (2022-06-14)


### Bug Fixes

* **core:** Fix issue that parameters got lost in some edge cases ([04f0bf5](https://github.com/n8n-io/n8n/commit/04f0bf5b65c8224a4fdfd3c9d2c896f63dfbcc1d))
* **core:** Fix issue with combined expression not resolving if one is invalid ([#3506](https://github.com/n8n-io/n8n/issues/3506)) ([9ff5762](https://github.com/n8n-io/n8n/commit/9ff57629c5afb2f0fd4aee84cda79c9a6f7962d0))
* **core:** Fix Public API failing to build on Windows ([#3499](https://github.com/n8n-io/n8n/issues/3499)) ([c121952](https://github.com/n8n-io/n8n/commit/c121952324619434e8a7be540970c167df715b13))
* **editor:** Fix issue that some errors did not show up correctly ([#3507](https://github.com/n8n-io/n8n/issues/3507)) ([955db0a](https://github.com/n8n-io/n8n/commit/955db0ab101feb17efffe760c79ec2820e1d4c3b))
* **HTTP Request Node:** Fix issue with requests that return null ([#3498](https://github.com/n8n-io/n8n/issues/3498)) ([7346da0](https://github.com/n8n-io/n8n/commit/7346da0b34b5fdf7ab630ccc5cda102cf80c8036))
* **Pipedrive Node:** Fix limit issue with Lead -> GetAll ([#3436](https://github.com/n8n-io/n8n/issues/3436)) ([34e891c](https://github.com/n8n-io/n8n/commit/34e891c0f8c987c9be9cff463422b9972f02269f))
* **PostBin Node:** Fix issue with it throwing unnecessary error ([#3494](https://github.com/n8n-io/n8n/issues/3494)) ([9df3e30](https://github.com/n8n-io/n8n/commit/9df3e30d36104d8e31972c773cb71f4cc82f6970))


### Features

* **core:** Add "Client Credentials" grant type to OAuth2 ([#3489](https://github.com/n8n-io/n8n/issues/3489)) ([e29c597](https://github.com/n8n-io/n8n/commit/e29c5975e1f1ad089167df46021203e9f67c8ef1))
* **Twilio Node:** Add ability to make a voice call using TTS ([#3467](https://github.com/n8n-io/n8n/issues/3467)) ([eff97e8](https://github.com/n8n-io/n8n/commit/eff97e8d67cd3f0342bbb9648503b351f4691f46))
* **Wise Node:** Add Support to download statements as JSON, CSV or PDF ([#3468](https://github.com/n8n-io/n8n/issues/3468)) ([51663c1](https://github.com/n8n-io/n8n/commit/51663c1fcbe879e29790af942b73318e95065d8f))



## [0.181.2](https://github.com/n8n-io/n8n/compare/n8n@0.181.1...n8n@0.181.2) (2022-06-09)


### Bug Fixes

* **core:** Fix issue when a node does not return data ([5eea3cd](https://github.com/n8n-io/n8n/commit/5eea3cd6d0b59963dc7c7a9e1ca597137cf3ce98))



## [0.181.1](https://github.com/n8n-io/n8n/compare/n8n@0.181.0...n8n@0.181.1) (2022-06-09)


### Bug Fixes

* **core:** Fix another possible issue with multi input nodes ([e88fab5](https://github.com/n8n-io/n8n/commit/e88fab5ee2b82665c3d68c52894a5479ce6eccf6))
* **core:** Fix issue with multi input nodes ([f79675d](https://github.com/n8n-io/n8n/commit/f79675d5c7876875065fc29504eb0590678d67d3))



# [0.181.0](https://github.com/n8n-io/n8n/compare/n8n@0.180.0...n8n@0.181.0) (2022-06-08)


### Bug Fixes

* **core:** Properly resolve expressions in declarative node design ([1999f4b](https://github.com/n8n-io/n8n/commit/1999f4b066784cc1dd6a962f51d7c11641577a8b))


### Features

* Add n8n Public API ([#3064](https://github.com/n8n-io/n8n/issues/3064)) ([a18081d](https://github.com/n8n-io/n8n/commit/a18081d749c51d497645d43614fdccb220344607))
* **core:** Make it possible to block access to environment variables ([ddb3baa](https://github.com/n8n-io/n8n/commit/ddb3baa4eddeb85e2f7abe4465ac4ff4058e1ece))



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

* **editor:** Fix parameter loading bug ([#3374](https://github.com/n8n-io/n8n/issues/3374)) ([c7c2061](https://github.com/n8n-io/n8n/commit/c7c2061590493a1b24a8ab4e2615d6d9eb2641e1))



## [0.178.1](https://github.com/n8n-io/n8n/compare/n8n@0.178.0...n8n@0.178.1) (2022-05-24)


### Bug Fixes

* **editor:** Fix problem with HTTP Request Node 1 credentials to be set ([#3371](https://github.com/n8n-io/n8n/issues/3371)) ([c5fc3bc](https://github.com/n8n-io/n8n/commit/c5fc3bc45e80eec47f4c06b950ab8b3ddaf66f2f))



# [0.178.0](https://github.com/n8n-io/n8n/compare/n8n@0.177.0...n8n@0.178.0) (2022-05-24)


### Bug Fixes

* **editor:** Do not display diving line unless necessary ([68db12c](https://github.com/n8n-io/n8n/commit/68db12ce6d8bfc99cd0891cfa44f8b64674dada7))
* **editor:** Do not display welcome sticky in template workflows ([#3320](https://github.com/n8n-io/n8n/issues/3320)) ([29ddac3](https://github.com/n8n-io/n8n/commit/29ddac30d33caff1cf8a061d619742fdb3402d49))
* **Slack Node:** Fix Channel->Kick ([#3365](https://github.com/n8n-io/n8n/issues/3365)) ([0212d65](https://github.com/n8n-io/n8n/commit/0212d65dae885a6a153c67095f04215f5e1f8278))


### Features

* **core:** Allow credential reuse on HTTP Request node ([#3228](https://github.com/n8n-io/n8n/issues/3228)) ([336fc9e](https://github.com/n8n-io/n8n/commit/336fc9e2a820476931a9e9b482e4be284c0337d0)), closes [#3230](https://github.com/n8n-io/n8n/issues/3230) [#3231](https://github.com/n8n-io/n8n/issues/3231) [#3222](https://github.com/n8n-io/n8n/issues/3222) [#3229](https://github.com/n8n-io/n8n/issues/3229) [#3304](https://github.com/n8n-io/n8n/issues/3304) [#3282](https://github.com/n8n-io/n8n/issues/3282) [#3359](https://github.com/n8n-io/n8n/issues/3359)
* **editor:** Add input panel to NDV ([#3204](https://github.com/n8n-io/n8n/issues/3204)) ([3af0abd](https://github.com/n8n-io/n8n/commit/3af0abd9e066a721ac873f255eeb9311ebe6dd27))
* **Salesforce Node:** Add country field ([#3314](https://github.com/n8n-io/n8n/issues/3314)) ([90a1bc1](https://github.com/n8n-io/n8n/commit/90a1bc120bc2e291432c977768929da773dcb96e))



# [0.177.0](https://github.com/n8n-io/n8n/compare/n8n@0.176.0...n8n@0.177.0) (2022-05-16)


### Bug Fixes

* **core:** Fix call to `/executions-current` with unsaved workflow ([#3280](https://github.com/n8n-io/n8n/issues/3280)) ([7090a79](https://github.com/n8n-io/n8n/commit/7090a79b5da611d829da4d027a0194fcb60b4755))
* **core:** Fix issue with fixedCollection having all default values ([7ced654](https://github.com/n8n-io/n8n/commit/7ced65484fa7c91e10e96f70d6791b689a5686d3))
* **Edit Image Node:** Fix font selection ([#3287](https://github.com/n8n-io/n8n/issues/3287)) ([8a8feb1](https://github.com/n8n-io/n8n/commit/8a8feb11c8e22e6a548e077b55e40702f2fb724a))
* **Ghost Node:** Fix post tags and add credential tests ([#3278](https://github.com/n8n-io/n8n/issues/3278)) ([a14d85e](https://github.com/n8n-io/n8n/commit/a14d85ea481b8227ba306f07e13263f45eafa6ca))
* **Google Calendar Node:** Make it work with public calendars and clean up ([#3283](https://github.com/n8n-io/n8n/issues/3283)) ([a7d960c](https://github.com/n8n-io/n8n/commit/a7d960c56122bd3b602f0e9a121919916e5d6174))
* **KoBoToolbox Node:** Fix query and sort + use question name in attachments ([#3017](https://github.com/n8n-io/n8n/issues/3017)) ([c885115](https://github.com/n8n-io/n8n/commit/c8851157684fe15c77db1fe716fa4333b54450cb))
* **Mailjet Trigger Node:** Fix issue that node could not get activated ([#3281](https://github.com/n8n-io/n8n/issues/3281)) ([e09e349](https://github.com/n8n-io/n8n/commit/e09e349fedfe067929556e328a70a32d30759e4d))
* **Pipedrive Node:** Fix resolve properties when multi option field is used ([#3277](https://github.com/n8n-io/n8n/issues/3277)) ([7eb1261](https://github.com/n8n-io/n8n/commit/7eb12615cf3eebac29e3561a079451017f80de5c))


### Features

* **core:** Automatically convert Luxon Dates to string ([#3266](https://github.com/n8n-io/n8n/issues/3266)) ([3fcee14](https://github.com/n8n-io/n8n/commit/3fcee14bf5c61ec11fc1d4f30256f5ceba09e7f4))
* **editor:** Improve n8n welcome experience ([#3289](https://github.com/n8n-io/n8n/issues/3289)) ([35f2ce2](https://github.com/n8n-io/n8n/commit/35f2ce2359bb84437ad6fc68a7115081daeb46fe))
* **Google Drive Node:** Add Shared Drive support for operations upload, delete and share ([#3294](https://github.com/n8n-io/n8n/issues/3294)) ([03cdb1f](https://github.com/n8n-io/n8n/commit/03cdb1fea4fa4967eaafa861f3a9ff4ff7ca625a))
* **Microsoft OneDrive Node:** Add rename option for files and folders ([#3224](https://github.com/n8n-io/n8n/issues/3224)) ([50246d1](https://github.com/n8n-io/n8n/commit/50246d174a274fc9ba3dea44fc83c3605b4db691))



# [0.176.0](https://github.com/n8n-io/n8n/compare/n8n@0.175.1...n8n@0.176.0) (2022-05-10)


### Bug Fixes

* **core:** Fix executions list filtering by waiting status ([#3241](https://github.com/n8n-io/n8n/issues/3241)) ([71afcd6](https://github.com/n8n-io/n8n/commit/71afcd6314a73ab6cc04e22afd69e86ca764bd42))
* **core:** Improve webhook error messages ([49d0e3e](https://github.com/n8n-io/n8n/commit/49d0e3e885003b11092cf3c890847154426dee41))
* **Edit Image Node:** Make node work with binary-data-mode 'filesystem' ([#3274](https://github.com/n8n-io/n8n/issues/3274)) ([a4db0d0](https://github.com/n8n-io/n8n/commit/a4db0d051b18bc224c6cd69faeabf03cf5fba659))


### Features

* **Pipedrive Node:** Add support for filters to getAll:organization ([#3211](https://github.com/n8n-io/n8n/issues/3211)) ([1ef10dd](https://github.com/n8n-io/n8n/commit/1ef10dd23fef0b2e3e0ef76c8116d3bebc36bc4e))
* **Pushover Node:** Add 'HTML Formatting' option and credential test ([#3082](https://github.com/n8n-io/n8n/issues/3082)) ([b3dc6d9](https://github.com/n8n-io/n8n/commit/b3dc6d9d9c640f1e0f04cb56d0fabe2aafb948b6))
* **UProc Node:** Add new tools ([#3104](https://github.com/n8n-io/n8n/issues/3104)) ([ff2bf11](https://github.com/n8n-io/n8n/commit/ff2bf1112f07b7c3fd75f60e8faefdef4e2a02af))



## [0.175.1](https://github.com/n8n-io/n8n/compare/n8n@0.175.0...n8n@0.175.1) (2022-05-03)


### Bug Fixes

* **editor:** Fix bug with node version ([ed56481](https://github.com/n8n-io/n8n/commit/ed564812435a279760a32e76f3935f492f84f487))



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
