## [0.3.20](https://github.com/typeorm/typeorm/compare/0.3.19...0.3.20) (2024-01-26)

### Bug Fixes

-   added missing parentheses in where conditions ([#10650](https://github.com/typeorm/typeorm/issues/10650)) ([4624930](https://github.com/typeorm/typeorm/commit/46249303be03adea74266837b8e6eb49227f476e)), closes [#10534](https://github.com/typeorm/typeorm/issues/10534)
-   don't escape indexPredicate ([#10618](https://github.com/typeorm/typeorm/issues/10618)) ([dd49a25](https://github.com/typeorm/typeorm/commit/dd49a254dc475eedfe72378be2670cc6a61aacf1))
-   fallback runMigrations transaction to DataSourceOptions ([#10601](https://github.com/typeorm/typeorm/issues/10601)) ([0cab0dd](https://github.com/typeorm/typeorm/commit/0cab0dd7308d2cb8ba5600ce46899bd14a062565))
-   hangup when load relations with relationLoadStrategy: query ([#10630](https://github.com/typeorm/typeorm/issues/10630)) ([54d8d9e](https://github.com/typeorm/typeorm/commit/54d8d9efe9bb41671f44f41ea6372b7b5d2ad0f1)), closes [#10481](https://github.com/typeorm/typeorm/issues/10481)
-   include asExpression columns in returning clause ([#10632](https://github.com/typeorm/typeorm/issues/10632)) ([f232ba7](https://github.com/typeorm/typeorm/commit/f232ba780872660fbfd2467b52ef5b97cb6f2935)), closes [#8450](https://github.com/typeorm/typeorm/issues/8450) [#8450](https://github.com/typeorm/typeorm/issues/8450)
-   multiple insert in SAP Hana ([#10597](https://github.com/typeorm/typeorm/issues/10597)) ([1b34c9a](https://github.com/typeorm/typeorm/commit/1b34c9a49e99fa937dd9894ddb7e6bba85c08a42))
-   resolve issue CREATE/DROP Index concurrently ([#10634](https://github.com/typeorm/typeorm/issues/10634)) ([8aa8690](https://github.com/typeorm/typeorm/commit/8aa8690f94c12c9740bf746b2ec55def13941d35)), closes [#10626](https://github.com/typeorm/typeorm/issues/10626)
-   type inferencing of EntityManager#create ([#10569](https://github.com/typeorm/typeorm/issues/10569)) ([99d8249](https://github.com/typeorm/typeorm/commit/99d8249e450f7e649685105b372e265f41a0ee47))

### Features

-   add json type support for Oracle ([#10611](https://github.com/typeorm/typeorm/issues/10611)) ([7e85460](https://github.com/typeorm/typeorm/commit/7e85460f10b0c6f57dda9d532fe925ebf0711fe9))
-   add postgres multirange column types ([#10627](https://github.com/typeorm/typeorm/issues/10627)) ([d0b7670](https://github.com/typeorm/typeorm/commit/d0b76703cc1c7919f5c6a974ad0889c331d78672)), closes [#10556](https://github.com/typeorm/typeorm/issues/10556)
-   add table comment for postgres ([#10613](https://github.com/typeorm/typeorm/issues/10613)) ([4493db4](https://github.com/typeorm/typeorm/commit/4493db4d1b02eaa2c3f997ff256057d01cc48323))

### Reverts

-   Revert "fix: prevent using absolute table path in migrations unless required (#10123)" (#10624) ([8f371f2](https://github.com/typeorm/typeorm/commit/8f371f23978600c36a2edf8222fec1024ae09c2e)), closes [#10123](https://github.com/typeorm/typeorm/issues/10123) [#10624](https://github.com/typeorm/typeorm/issues/10624)
-   revert "feat: nullable embedded entities (#10289)" (#10614) ([15de46f](https://github.com/typeorm/typeorm/commit/15de46fd5d31cd742477821e7a32bc98c9616d30)), closes [#10289](https://github.com/typeorm/typeorm/issues/10289) [#10614](https://github.com/typeorm/typeorm/issues/10614)

## [0.3.19](https://github.com/typeorm/typeorm/compare/0.3.18...0.3.19) (2024-01-03)

### Bug Fixes

-   fixed `Cannot read properties of undefined (reading 'sync')` caused after glob package upgrade

## [0.3.18](https://github.com/typeorm/typeorm/compare/0.3.17...0.3.18) (2024-01-03)

### Bug Fixes

-   add BaseEntity to model-shim ([#10503](https://github.com/typeorm/typeorm/issues/10503)) ([3cf938e](https://github.com/typeorm/typeorm/commit/3cf938efc04bf73129d2e755e2bb8a243be19e24))
-   add error handling for missing join columns ([#10525](https://github.com/typeorm/typeorm/issues/10525)) ([122c897](https://github.com/typeorm/typeorm/commit/122c897a2ff4cc6f5e8149d488f18bf5c21b5ca9)), closes [#7034](https://github.com/typeorm/typeorm/issues/7034)
-   add missing export for View class ([#10261](https://github.com/typeorm/typeorm/issues/10261)) ([7adbc9b](https://github.com/typeorm/typeorm/commit/7adbc9bdc7e3e5a4bd3db9c5cf980b71c74fc8fa))
-   added fail callback while opening the database in Cordova ([#10566](https://github.com/typeorm/typeorm/issues/10566)) ([8b4df5b](https://github.com/typeorm/typeorm/commit/8b4df5b2998c561047ac817b6c188fbb6ad0af7b))
-   aggregate function throw error when column alias name is set ([#10035](https://github.com/typeorm/typeorm/issues/10035)) ([022d2b5](https://github.com/typeorm/typeorm/commit/022d2b5f622771349355f00a087c26c930db0d25)), closes [#9927](https://github.com/typeorm/typeorm/issues/9927)
-   backport postgres connection error handling to crdb ([#10177](https://github.com/typeorm/typeorm/issues/10177)) ([149226d](https://github.com/typeorm/typeorm/commit/149226dd677ca3ca69c9f5ccd7b96e86573eb26e))
-   bump better-sqlite3 version range ([#10452](https://github.com/typeorm/typeorm/issues/10452)) ([75ec8f2](https://github.com/typeorm/typeorm/commit/75ec8f2032657560fed7418a6ca4a059a58d18ee))
-   caching always enabled not caching queries ([#10524](https://github.com/typeorm/typeorm/issues/10524)) ([8af533f](https://github.com/typeorm/typeorm/commit/8af533f79f993e97f8c5608eec1da1d2f5e23156))
-   circular dependency breaking node.js 20.6 ([#10344](https://github.com/typeorm/typeorm/issues/10344)) ([ba7ad3c](https://github.com/typeorm/typeorm/commit/ba7ad3c69b4d7813cf71503c130ae9ef248ea28d)), closes [#10338](https://github.com/typeorm/typeorm/issues/10338)
-   correctly keep query.data from ormOption for commit / rollback subscribers ([#10151](https://github.com/typeorm/typeorm/issues/10151)) ([73ee70b](https://github.com/typeorm/typeorm/commit/73ee70b33165af9151aadf9d26c58e78eebdfa53))
-   default value in child table/entity column decorator for multiple table inheritance is ignored for inherited columns ([#10563](https://github.com/typeorm/typeorm/issues/10563)) ([#10564](https://github.com/typeorm/typeorm/issues/10564)) ([af77a5d](https://github.com/typeorm/typeorm/commit/af77a5d0acf0c9661c4d61c38fd57bca9a1b65fc))
-   deletedAt column leaking as side effect of object update while creating a row ([#10435](https://github.com/typeorm/typeorm/issues/10435)) ([7de4890](https://github.com/typeorm/typeorm/commit/7de4890265d5045e21c0ea1db7c45cea826f9e31))
-   empty objects being hydrated when eager loading relations that have a `@VirtualColumn` ([#10432](https://github.com/typeorm/typeorm/issues/10432)) ([b53e410](https://github.com/typeorm/typeorm/commit/b53e410e5abe930ab489ff4c8c16f62306910f6a)), closes [#10431](https://github.com/typeorm/typeorm/issues/10431)
-   extend GiST index with range types for Postgres driver ([#10572](https://github.com/typeorm/typeorm/issues/10572)) ([a4900ae](https://github.com/typeorm/typeorm/commit/a4900ae15feb6727f085cbeae09000566b15081e)), closes [#10567](https://github.com/typeorm/typeorm/issues/10567)
-   ignore changes for columns with `update: false` in persistence ([#10250](https://github.com/typeorm/typeorm/issues/10250)) ([f8fa1fd](https://github.com/typeorm/typeorm/commit/f8fa1fd821a0ca61b09079625e04583f9e1a0403)), closes [#10249](https://github.com/typeorm/typeorm/issues/10249)
-   improve helper for cli for commands missing positionals ([#10133](https://github.com/typeorm/typeorm/issues/10133)) ([9f8899f](https://github.com/typeorm/typeorm/commit/9f8899f56cb95fbee70eed73d507530e8b6c74ff))
-   loading datasource unable to process a regular default export ([#10184](https://github.com/typeorm/typeorm/issues/10184)) ([201342d](https://github.com/typeorm/typeorm/commit/201342d1509938925b90deeac1d974cd01fe3d3c)), closes [#8810](https://github.com/typeorm/typeorm/issues/8810)
-   logMigration has incorrect logging condition ([#10323](https://github.com/typeorm/typeorm/issues/10323)) ([d41930f](https://github.com/typeorm/typeorm/commit/d41930f0d6b8f672a5242da4a4b5568d90090d59)), closes [#10322](https://github.com/typeorm/typeorm/issues/10322) [#10322](https://github.com/typeorm/typeorm/issues/10322)
-   ManyToMany ER_DUP_ENTRY error ([#10343](https://github.com/typeorm/typeorm/issues/10343)) ([e296063](https://github.com/typeorm/typeorm/commit/e296063b128318ddd3b59ae1e23e104d0ed524b0)), closes [#5704](https://github.com/typeorm/typeorm/issues/5704)
-   migrations on indexed TIMESTAMP WITH TIME ZONE Oracle columns ([#10506](https://github.com/typeorm/typeorm/issues/10506)) ([cf37f13](https://github.com/typeorm/typeorm/commit/cf37f1370bb0a180bedf0a2e2fedd8047ae4ef78)), closes [#10493](https://github.com/typeorm/typeorm/issues/10493)
-   mongodb - undefined is not constructor ([#10559](https://github.com/typeorm/typeorm/issues/10559)) ([ad5bf11](https://github.com/typeorm/typeorm/commit/ad5bf11a918170b50e3251410004f75c1811eb01))
-   mongodb resolves leaked cursor ([#10316](https://github.com/typeorm/typeorm/issues/10316)) ([2dc9624](https://github.com/typeorm/typeorm/commit/2dc9624d0016447b0738d85c6ddeace1110eb56f)), closes [#10315](https://github.com/typeorm/typeorm/issues/10315)
-   mssql datasource testonborrow not affecting anything ([#10589](https://github.com/typeorm/typeorm/issues/10589)) ([122b683](https://github.com/typeorm/typeorm/commit/122b683840487f05b26a938a1fb057d71beb1bb3))
-   nested transactions issues ([#10210](https://github.com/typeorm/typeorm/issues/10210)) ([25e6ecd](https://github.com/typeorm/typeorm/commit/25e6ecdfd23569b4b6ba15b845b4444927386f42))
-   prevent using absolute table path in migrations unless required ([#10123](https://github.com/typeorm/typeorm/issues/10123)) ([dd59524](https://github.com/typeorm/typeorm/commit/dd595242a7fbb8c7445cc79bf0b751f1ed1762bd))
-   remove `date-fns` in favor of `DayJs` ([#10306](https://github.com/typeorm/typeorm/issues/10306)) ([cf7147f](https://github.com/typeorm/typeorm/commit/cf7147fa7c0231089b45078abc813f0e56e5dd9e))
-   remove dynamic require calls ([#10196](https://github.com/typeorm/typeorm/issues/10196)) ([a939654](https://github.com/typeorm/typeorm/commit/a939654c95804b172276ba26769c43af97469d5d))
-   resolve circular dependency when using Vite ([#10273](https://github.com/typeorm/typeorm/issues/10273)) ([080528b](https://github.com/typeorm/typeorm/commit/080528b11716cc786b00c4890160f6ccf3375925))
-   resolve issue building eager relation alias for nested relations ([#10004](https://github.com/typeorm/typeorm/issues/10004)) ([c6f608d](https://github.com/typeorm/typeorm/commit/c6f608d3e8f9c28646240ac67e20e6567be1aab6)), closes [#9944](https://github.com/typeorm/typeorm/issues/9944)
-   resolve issue of generating migration for numeric arrays repeatedly ([#10471](https://github.com/typeorm/typeorm/issues/10471)) ([39fdcf6](https://github.com/typeorm/typeorm/commit/39fdcf651fc0b690febbe11fa39892034529fd03)), closes [#10043](https://github.com/typeorm/typeorm/issues/10043)
-   resolve issue queryBuilder makes different parameter identifiers for same parameter ([#10327](https://github.com/typeorm/typeorm/issues/10327)) ([6c918ea](https://github.com/typeorm/typeorm/commit/6c918ea3923488e3744cf4a09f01b21117674fe5)), closes [#7308](https://github.com/typeorm/typeorm/issues/7308)
-   resolve issues on upsert ([#10588](https://github.com/typeorm/typeorm/issues/10588)) ([dc1bfed](https://github.com/typeorm/typeorm/commit/dc1bfed6d53691135628e064e0c3bda21f7d0ee3)), closes [#10587](https://github.com/typeorm/typeorm/issues/10587)
-   scrub all comment end markers from comments ([#10163](https://github.com/typeorm/typeorm/issues/10163)) ([d937f61](https://github.com/typeorm/typeorm/commit/d937f6106a1c0a5770de7c06c315009c5549c4d5))
-   serialize bigint when building a query id [#10336](https://github.com/typeorm/typeorm/issues/10336) ([#10337](https://github.com/typeorm/typeorm/issues/10337)) ([bfc1cc5](https://github.com/typeorm/typeorm/commit/bfc1cc5ab4232459a1d11b82fd131e7e2e9c2aa4))
-   should automatically cache if alwaysEnable ([#10137](https://github.com/typeorm/typeorm/issues/10137)) ([173910e](https://github.com/typeorm/typeorm/commit/173910ed79aada4d250fd658d6dd73fca7740950)), closes [#9910](https://github.com/typeorm/typeorm/issues/9910)
-   SQLite simple-enum column parsing ([#10550](https://github.com/typeorm/typeorm/issues/10550)) ([696e688](https://github.com/typeorm/typeorm/commit/696e688d0072eb54608eaf081be1a6d9c40910e3))
-   update UpdateDateColumn on upsert ([#10458](https://github.com/typeorm/typeorm/issues/10458)) ([fdb9866](https://github.com/typeorm/typeorm/commit/fdb9866ad2359aa37fed1e7e99b3736a4dc9dc74)), closes [#9015](https://github.com/typeorm/typeorm/issues/9015)
-   upgrade ts-node version to latest(10.9.1) version ([#10143](https://github.com/typeorm/typeorm/issues/10143)) ([fcb9904](https://github.com/typeorm/typeorm/commit/fcb9904f247d9ddf21bad07101b488d33e0a1fd2))
-   using async datasource to configure typeorm ([#10170](https://github.com/typeorm/typeorm/issues/10170)) ([fbd45db](https://github.com/typeorm/typeorm/commit/fbd45dba32cd92ddcb00cc4f3c745d247ad27bae))

### Features

-   ability to change default replication mode ([#10419](https://github.com/typeorm/typeorm/issues/10419)) ([72b1d1b](https://github.com/typeorm/typeorm/commit/72b1d1b865d7d67f4609740be0db325804a600b5))
-   add concurrent indexes for postgres ([#10442](https://github.com/typeorm/typeorm/issues/10442)) ([f4e6eaf](https://github.com/typeorm/typeorm/commit/f4e6eaf15597cf387a268ab1c7e81eaaecefdd6a))
-   add exists and exists by ([#10291](https://github.com/typeorm/typeorm/issues/10291)) ([b6b46fb](https://github.com/typeorm/typeorm/commit/b6b46fb133559c8c5508fc0cdabc8f1a02683409))
-   add isolated where statements ([#10213](https://github.com/typeorm/typeorm/issues/10213)) ([3cda7ec](https://github.com/typeorm/typeorm/commit/3cda7ec39d145f4f37f74bf40906565e472852ed))
-   add MSSQL disableAsciiToUnicodeParamConversion option and tests ([#10161](https://github.com/typeorm/typeorm/issues/10161)) ([df7c069](https://github.com/typeorm/typeorm/commit/df7c06948cc53efda8b2d519338c8a5dc5159607)), closes [#10131](https://github.com/typeorm/typeorm/issues/10131)
-   add support for mssql server DefaultAzureCredential usage ([#10246](https://github.com/typeorm/typeorm/issues/10246)) ([c8ee5b1](https://github.com/typeorm/typeorm/commit/c8ee5b1d1a77cc08c358d8c7f2a96e53ecb83872))
-   add support for table comment in MySQL ([#10017](https://github.com/typeorm/typeorm/issues/10017)) ([338df16](https://github.com/typeorm/typeorm/commit/338df164395fa1475149614281b3c649fb5b2611))
-   allow to use custom type witch extends object type for find where argument ([#10475](https://github.com/typeorm/typeorm/issues/10475)) ([48f5f85](https://github.com/typeorm/typeorm/commit/48f5f85d687e1a4d4d4ee83741759d70990985f7))
-   BeforeQuery and AfterQuery events ([#10234](https://github.com/typeorm/typeorm/issues/10234)) ([5c28154](https://github.com/typeorm/typeorm/commit/5c28154cbe19008b5ae7b3612c8a718a8e628dcb)), closes [#3302](https://github.com/typeorm/typeorm/issues/3302)
-   custom STI discriminator value for EntitySchema ([#10508](https://github.com/typeorm/typeorm/issues/10508)) ([b240d87](https://github.com/typeorm/typeorm/commit/b240d87f347de49975f87a42b885c2d103bbff12)), closes [#10494](https://github.com/typeorm/typeorm/issues/10494)
-   enabled CTE for oracle driver ([#10319](https://github.com/typeorm/typeorm/issues/10319)) ([65858f3](https://github.com/typeorm/typeorm/commit/65858f3a1759a950325e830ab9d4e0b2f519e455))
-   entityId in InsertEvent ([#10540](https://github.com/typeorm/typeorm/issues/10540)) ([ae006af](https://github.com/typeorm/typeorm/commit/ae006af501025f709fe585b821f0da683628eec3))
-   expose countDocuments in mongodb ([#10314](https://github.com/typeorm/typeorm/issues/10314)) ([ebd61d1](https://github.com/typeorm/typeorm/commit/ebd61d14400e2769517e1afaa1c9b00d95b14ec5))
-   exposed entity and criteria properties on EntityNotFoundError ([#10202](https://github.com/typeorm/typeorm/issues/10202)) ([bafcd17](https://github.com/typeorm/typeorm/commit/bafcd1709b7c88b5140bb38e5536c3b4b28dad3d))
-   implement column comments for SAP HANA ([#10502](https://github.com/typeorm/typeorm/issues/10502)) ([45e31cc](https://github.com/typeorm/typeorm/commit/45e31cc57aac636ec4f13101a8a5ac0a1a12b8d1))
-   implement OR operator ([#10086](https://github.com/typeorm/typeorm/issues/10086)) ([a00b1df](https://github.com/typeorm/typeorm/commit/a00b1df68f249335c0266d16f02c33cff941f528)), closes [#10054](https://github.com/typeorm/typeorm/issues/10054) [#10054](https://github.com/typeorm/typeorm/issues/10054) [#10054](https://github.com/typeorm/typeorm/issues/10054) [#10054](https://github.com/typeorm/typeorm/issues/10054) [#10054](https://github.com/typeorm/typeorm/issues/10054) [#10054](https://github.com/typeorm/typeorm/issues/10054) [#10054](https://github.com/typeorm/typeorm/issues/10054)
-   implement streaming for SAP HANA ([#10512](https://github.com/typeorm/typeorm/issues/10512)) ([7e9cead](https://github.com/typeorm/typeorm/commit/7e9cead8a3bfe36bdec4d6146cb1ab6681d5b556))
-   implements QueryFailedError generic for driverError typing ([#10253](https://github.com/typeorm/typeorm/issues/10253)) ([78b2f48](https://github.com/typeorm/typeorm/commit/78b2f4805ca5f1302b3cf91f4c7affd851bcc801))
-   modify repository.extend method for chaining repositories ([#10256](https://github.com/typeorm/typeorm/issues/10256)) ([ca29c0f](https://github.com/typeorm/typeorm/commit/ca29c0ff8e40e5bfa29d769b59c405509060cacc))
-   nullable embedded entities ([#10289](https://github.com/typeorm/typeorm/issues/10289)) ([e67d704](https://github.com/typeorm/typeorm/commit/e67d7041387df78c69599c1d3c880389a935ffbf))
-   support for MongoDB 6.x ([#10545](https://github.com/typeorm/typeorm/issues/10545)) ([3647b26](https://github.com/typeorm/typeorm/commit/3647b269ccb1f236595bf8ff3adcca5460a0d205))
-   support mssql@10 ([#10356](https://github.com/typeorm/typeorm/issues/10356)) ([f6bb671](https://github.com/typeorm/typeorm/commit/f6bb6711e2c5b05db656568bee5152ed800ea9f7)), closes [#10340](https://github.com/typeorm/typeorm/issues/10340)
-   use node-oracledb 6 ([#10285](https://github.com/typeorm/typeorm/issues/10285)) ([3af891a](https://github.com/typeorm/typeorm/commit/3af891a8e69a921c0fd83a2fcc3d1739c0360a8d)), closes [#10277](https://github.com/typeorm/typeorm/issues/10277)
-   user-defined index name for STI discriminator column ([#10509](https://github.com/typeorm/typeorm/issues/10509)) ([89c5257](https://github.com/typeorm/typeorm/commit/89c525761d6979d1f876b09adb9b3fc08097fe86)), closes [#10496](https://github.com/typeorm/typeorm/issues/10496)

### Performance Improvements

-   improve SapQueryRunner performance ([#10198](https://github.com/typeorm/typeorm/issues/10198)) ([f6b87e3](https://github.com/typeorm/typeorm/commit/f6b87e3ee1ab218edd93061bbec84a42ed6ac481))

### BREAKING CHANGES

-   With node-oracledb the thin client is used as default. Added a option to use the thick client. Also added the option to specify the instant client lib
-   MongoDB: from the previous behavior of returning a result with metadata describing when a document is not found.
    See: https://github.com/mongodb/node-mongodb-native/blob/HEAD/etc/notes/CHANGES_6.0.0.md
-   [new nullable embeds feature](https://github.com/typeorm/typeorm/pull/10289) introduced a breaking change which might enforce you to update types on your entities to ` | null`,
    if all columns in your embed entity are nullable. Since database queries now return embedded property as `null` if all its column values are null.

## [0.3.17](https://github.com/typeorm/typeorm/compare/0.3.16...0.3.17) (2023-06-20)

### Bug Fixes

-   [#10040](https://github.com/typeorm/typeorm/issues/10040) TypeORM synchronize database even if it is up to date ([#10041](https://github.com/typeorm/typeorm/issues/10041)) ([b1a3a39](https://github.com/typeorm/typeorm/commit/b1a3a395049052f3f031e9fd27b99769b03b9011))
-   add missing await ([#10084](https://github.com/typeorm/typeorm/issues/10084)) ([f5d4397](https://github.com/typeorm/typeorm/commit/f5d43975dbbf02d0e40d64d01265105d4018cf7a))

## [0.3.16](https://github.com/typeorm/typeorm/compare/0.3.15...0.3.16) (2023-05-09)

### Bug Fixes

-   add `trustServerCertificate` option to `SqlServerConnectionOptions` ([#9985](https://github.com/typeorm/typeorm/issues/9985)) ([0305805](https://github.com/typeorm/typeorm/commit/03058055df78034a4544e52cfd277ed1c0cbdcb2)), closes [#8093](https://github.com/typeorm/typeorm/issues/8093)
-   add directConnection options to MongoDB connection ([#9955](https://github.com/typeorm/typeorm/issues/9955)) ([e0165e7](https://github.com/typeorm/typeorm/commit/e0165e75ee818c759b51a7fa3b0b3adc6befa347))
-   add onDelete option validation for oracle ([#9786](https://github.com/typeorm/typeorm/issues/9786)) ([938f94b](https://github.com/typeorm/typeorm/commit/938f94bded92b272bdcecc04534ffb879186dc44)), closes [#9189](https://github.com/typeorm/typeorm/issues/9189)
-   added instanceName to options ([#9968](https://github.com/typeorm/typeorm/issues/9968)) ([7c5627f](https://github.com/typeorm/typeorm/commit/7c5627f2728500bb45a2586a3bfd34ab39d46fad))
-   added transaction retry logic in cockroachdb ([#10032](https://github.com/typeorm/typeorm/issues/10032)) ([607d6f9](https://github.com/typeorm/typeorm/commit/607d6f959525b7c01bad5fe14364e4af82d878bb))
-   allow json as alias for longtext mariadb ([#10018](https://github.com/typeorm/typeorm/issues/10018)) ([2a2bb4b](https://github.com/typeorm/typeorm/commit/2a2bb4bdc11915966a65dc144189b33d410d9d57))
-   convert the join table ID to the referenceColumn ID type ([#9887](https://github.com/typeorm/typeorm/issues/9887)) ([9460296](https://github.com/typeorm/typeorm/commit/9460296147b8117e414ca311828615d87f5ab283))
-   correct encode mongodb auth credentials ([#10024](https://github.com/typeorm/typeorm/issues/10024)) ([96b7ee4](https://github.com/typeorm/typeorm/commit/96b7ee44b2538f65c77c7d168e4f10316cc123fa)), closes [#9885](https://github.com/typeorm/typeorm/issues/9885)
-   create correct children during cascade saving entities with STI ([#9034](https://github.com/typeorm/typeorm/issues/9034)) ([06c1e98](https://github.com/typeorm/typeorm/commit/06c1e98ae20cf516f4f5afc53fec4df91209f121)), closes [#7758](https://github.com/typeorm/typeorm/issues/7758) [#7758](https://github.com/typeorm/typeorm/issues/7758) [#9033](https://github.com/typeorm/typeorm/issues/9033) [#9033](https://github.com/typeorm/typeorm/issues/9033) [#7758](https://github.com/typeorm/typeorm/issues/7758) [#7758](https://github.com/typeorm/typeorm/issues/7758)
-   express option bug in init command ([#10022](https://github.com/typeorm/typeorm/issues/10022)) ([5be20e2](https://github.com/typeorm/typeorm/commit/5be20e2bcd18431e457090a63a99dc06f9c2d3d2))
-   for running cli-ts-node-esm use exit code from child process ([#10030](https://github.com/typeorm/typeorm/issues/10030)) ([a188b1d](https://github.com/typeorm/typeorm/commit/a188b1d9f4cc0bdc36a30be1380104e5f38ccb24)), closes [#10029](https://github.com/typeorm/typeorm/issues/10029)
-   mongodb typings breaks the browser version ([#9962](https://github.com/typeorm/typeorm/issues/9962)) ([99bef49](https://github.com/typeorm/typeorm/commit/99bef491280aedb6b337a14e6723b33e67b048d0)), closes [#9959](https://github.com/typeorm/typeorm/issues/9959)
-   RelationIdLoader has access to queryPlanner when wrapped in transaction ([#9990](https://github.com/typeorm/typeorm/issues/9990)) ([21a9d67](https://github.com/typeorm/typeorm/commit/21a9d67fcf294e805c416d55394d55b238860b7d)), closes [#9988](https://github.com/typeorm/typeorm/issues/9988)
-   resolve duplicate subscriber updated columns ([#9958](https://github.com/typeorm/typeorm/issues/9958)) ([3d67901](https://github.com/typeorm/typeorm/commit/3d67901fde2750a8c10521bedc3eee3d57065b43)), closes [#9948](https://github.com/typeorm/typeorm/issues/9948)
-   select + addOrderBy broke in 0.3.14 ([#9961](https://github.com/typeorm/typeorm/issues/9961)) ([0e56f0f](https://github.com/typeorm/typeorm/commit/0e56f0fcf8ec3f2ec37fee92f75ba09262801655)), closes [#9960](https://github.com/typeorm/typeorm/issues/9960)
-   support More/LessThanOrEqual in relations ([#9978](https://github.com/typeorm/typeorm/issues/9978)) ([8795c86](https://github.com/typeorm/typeorm/commit/8795c864e835a875e78577b5737da42d78e19247))

### Features

-   mariadb uuid inet4 inet6 column data type support ([#9845](https://github.com/typeorm/typeorm/issues/9845)) ([d8a2e37](https://github.com/typeorm/typeorm/commit/d8a2e3730f12bb2b8e521635e176a284594121f3))

### Reverts

-   "refactor: remove date-fns package ([#9634](https://github.com/typeorm/typeorm/issues/9634))" ([54f4f89](https://github.com/typeorm/typeorm/commit/54f4f8986adf197eb96ec0bc6d9d5a44d6552bcc))

## [0.3.15](https://github.com/typeorm/typeorm/compare/0.3.14...0.3.15) (2023-04-15)

### Bug Fixes

-   make cache optional fields optional ([#9942](https://github.com/typeorm/typeorm/issues/9942)) ([159c60a](https://github.com/typeorm/typeorm/commit/159c60a6e8cedbd32766fdca9694ec28cde9f6f7))
-   prevent unique index identical to primary key (all sql dialects) ([#9940](https://github.com/typeorm/typeorm/issues/9940)) ([51eecc2](https://github.com/typeorm/typeorm/commit/51eecc2aa07bfe3cfdd649fefadea3d719436d5e))
-   SelectQueryBuilder builds incorrectly escaped alias in Oracle when used on entity with composite key ([#9668](https://github.com/typeorm/typeorm/issues/9668)) ([83c6c0e](https://github.com/typeorm/typeorm/commit/83c6c0ed803f72c872fa40a740eb6fabe2102cbb))

### Features

-   support for the latest mongodb v5 ([#9925](https://github.com/typeorm/typeorm/issues/9925)) ([f6a3ce7](https://github.com/typeorm/typeorm/commit/f6a3ce732d86fd01807fc13c049ab51df785d772)), closes [#7907](https://github.com/typeorm/typeorm/issues/7907) [#7907](https://github.com/typeorm/typeorm/issues/7907)

## [0.3.14](https://github.com/typeorm/typeorm/compare/0.3.12...0.3.14) (2023-04-09)

### Bug Fixes

-   drop xml & yml connection option support. Addresses security issues in underlying dependency ([#9930](https://github.com/typeorm/typeorm/issues/9930)) ([7dac12c](https://github.com/typeorm/typeorm/commit/7dac12c2b18be34fb63ebfde988eb0825ec21384))

### Features

-   QueryBuilder performance optimizations ([#9914](https://github.com/typeorm/typeorm/issues/9914)) ([12e9db0](https://github.com/typeorm/typeorm/commit/12e9db07b6b9676e63fff5f55a45b1d269716ed9))

## [0.3.13](https://github.com/typeorm/typeorm/compare/0.3.12...0.3.13) (2023-04-06)

### Bug Fixes

-   firstCapital=true not working in camelCase() function ([f1330ad](https://github.com/typeorm/typeorm/commit/f1330ad6e23bea65a16b4f1c4199f10f3fa7282b))
-   handles "query" relation loading strategy for TreeRepositories ([#9680](https://github.com/typeorm/typeorm/issues/9680)) ([a11809e](https://github.com/typeorm/typeorm/commit/a11809e1b20cc77fd2767b8bab2500a0c7e20d23)), closes [#9673](https://github.com/typeorm/typeorm/issues/9673)
-   improve EntityNotFound error message in QueryBuilder.findOneOrFail ([#9872](https://github.com/typeorm/typeorm/issues/9872)) ([f7f6817](https://github.com/typeorm/typeorm/commit/f7f68178640120d8c1e92b8c9be0eeaa8262b4f3))
-   loading tables with fk in sqlite query runner ([#9875](https://github.com/typeorm/typeorm/issues/9875)) ([4997da0](https://github.com/typeorm/typeorm/commit/4997da054b5cfafdbdf374b3e554e5c4e0590da7)), closes [#9266](https://github.com/typeorm/typeorm/issues/9266)
-   prevent foreign key support during migration batch under sqlite ([#9775](https://github.com/typeorm/typeorm/issues/9775)) ([197cc05](https://github.com/typeorm/typeorm/commit/197cc05e90c0182357d85aa1ce7ae45de99d9d98)), closes [#9770](https://github.com/typeorm/typeorm/issues/9770)
-   proper default value on generating migration when default value is a function calling [Postgres] ([#9830](https://github.com/typeorm/typeorm/issues/9830)) ([bebba05](https://github.com/typeorm/typeorm/commit/bebba05388a40a9f278a450d4a988865c158abb7))
-   react-native doesn't properly work in ESM projects because of circular dependency ([#9765](https://github.com/typeorm/typeorm/issues/9765)) ([099fcd9](https://github.com/typeorm/typeorm/commit/099fcd9b104bc930faea08f97ee3d5610118e0c4))
-   resolve issues for mssql migration when simple-enum was changed ([cb154d4](https://github.com/typeorm/typeorm/commit/cb154d4ca36cda251fcb9eb05a29b7758ae813cf)), closes [#7785](https://github.com/typeorm/typeorm/issues/7785) [#9457](https://github.com/typeorm/typeorm/issues/9457) [#7785](https://github.com/typeorm/typeorm/issues/7785) [#9457](https://github.com/typeorm/typeorm/issues/9457)
-   resolves issue with mssql column recreation ([#9773](https://github.com/typeorm/typeorm/issues/9773)) ([07221a3](https://github.com/typeorm/typeorm/commit/07221a364682b567533c93130efb4f5189e009a9)), closes [#9399](https://github.com/typeorm/typeorm/issues/9399)
-   transform values for FindOperators [#9381](https://github.com/typeorm/typeorm/issues/9381) ([#9777](https://github.com/typeorm/typeorm/issues/9777)) ([de1228d](https://github.com/typeorm/typeorm/commit/de1228deace974eca3e9dd3956208ebe4cd9347f)), closes [#9816](https://github.com/typeorm/typeorm/issues/9816)
-   use forward slashes when normalizing path ([#9768](https://github.com/typeorm/typeorm/issues/9768)) ([58fc088](https://github.com/typeorm/typeorm/commit/58fc08840a4a64ca1935391f4709a784c3f0b373)), closes [#9766](https://github.com/typeorm/typeorm/issues/9766)
-   use object create if entity skip constructor is set ([#9831](https://github.com/typeorm/typeorm/issues/9831)) ([a868979](https://github.com/typeorm/typeorm/commit/a8689795dad796338e2a291a6a2fda89b00ef243))

### Features

-   add support for json datatype for sqlite ([#9744](https://github.com/typeorm/typeorm/issues/9744)) ([4ac8c00](https://github.com/typeorm/typeorm/commit/4ac8c00117417ae622368aabe36d0fd5c676bd00))
-   add support for STI on EntitySchema ([#9834](https://github.com/typeorm/typeorm/issues/9834)) ([bc306fb](https://github.com/typeorm/typeorm/commit/bc306fb5a2c4dc02d04632af2b2f6c697a684356)), closes [#9833](https://github.com/typeorm/typeorm/issues/9833)
-   allow type FindOptionsOrderValue for order by object property ([#9895](https://github.com/typeorm/typeorm/issues/9895)) ([#9896](https://github.com/typeorm/typeorm/issues/9896)) ([0814970](https://github.com/typeorm/typeorm/commit/0814970a9cc2c958199c9d74d1ef313de43dab50))
-   Broadcast identifier for removed related entities ([#9913](https://github.com/typeorm/typeorm/issues/9913)) ([f530811](https://github.com/typeorm/typeorm/commit/f530811b0da2863711db3467e55bf815c66b4b4b))
-   leftJoinAndMapOne and innerJoinAndMapOne map result to entity ([#9354](https://github.com/typeorm/typeorm/issues/9354)) ([947ffc3](https://github.com/typeorm/typeorm/commit/947ffc34324c1d692496804e43dafa6302efc1db))

## [0.3.12](https://github.com/typeorm/typeorm/compare/0.3.11...0.3.12) (2023-02-07)

### Bug Fixes

-   allow to pass ObjectLiteral in mongo find where condition ([#9632](https://github.com/typeorm/typeorm/issues/9632)) ([4eda5df](https://github.com/typeorm/typeorm/commit/4eda5df8693d1a659ff5c3461124cf05619fdd72)), closes [#9518](https://github.com/typeorm/typeorm/issues/9518)
-   DataSource.setOptions doesn't properly update the database in the drivers ([#9635](https://github.com/typeorm/typeorm/issues/9635)) ([a95bed7](https://github.com/typeorm/typeorm/commit/a95bed7c05d10eb4b508e225faa4cb3c7ea7944f))
-   Fix grammar error in no migrations found log ([#9754](https://github.com/typeorm/typeorm/issues/9754)) ([6fb2121](https://github.com/typeorm/typeorm/commit/6fb212187fdf97c07c41aad20d4f5503dfd44215))
-   improved `FindOptionsWhere` behavior with union types ([#9607](https://github.com/typeorm/typeorm/issues/9607)) ([7726f5a](https://github.com/typeorm/typeorm/commit/7726f5ad1ec0c826510202a0f2cbeea705547eee))
-   Incorrect enum default value when table name contains dash character ([#9685](https://github.com/typeorm/typeorm/issues/9685)) ([b3b0c11](https://github.com/typeorm/typeorm/commit/b3b0c118a40441b31ac18ee7ce0cea0696b701ab))
-   incorrect sorting of entities with multi-inheritances ([#9406](https://github.com/typeorm/typeorm/issues/9406)) ([54ca9dd](https://github.com/typeorm/typeorm/commit/54ca9dd801a77e011c2faf056b9e12845ccde82b))
-   make sure "require" is defined in the environment ([1a9b9fb](https://github.com/typeorm/typeorm/commit/1a9b9fbcd683b2a28acbd26e39ac98dc6b60f001))
-   materialized hints support for cte ([#9605](https://github.com/typeorm/typeorm/issues/9605)) ([67973b4](https://github.com/typeorm/typeorm/commit/67973b4726500fc835639ffc302e0b6b20093df4))
-   multiple select queries during db sync in sqlite ([#9639](https://github.com/typeorm/typeorm/issues/9639)) ([6c928a4](https://github.com/typeorm/typeorm/commit/6c928a4aa002cf5db0733055c0a754e97e4b43b3))
-   overriding caching settings when alwaysEnabled is true ([#9731](https://github.com/typeorm/typeorm/issues/9731)) ([4df969e](https://github.com/typeorm/typeorm/commit/4df969ea6254f9f69c371a72d80e857ab7c1f62d))
-   redundant Unique constraint on primary join column in Postgres ([#9677](https://github.com/typeorm/typeorm/issues/9677)) ([b8704f8](https://github.com/typeorm/typeorm/commit/b8704f87d2e06c048dea3f0b408ab18738acf7d7))
-   remove unnecessary .js extension in imports ([#9713](https://github.com/typeorm/typeorm/issues/9713)) ([6b37e38](https://github.com/typeorm/typeorm/commit/6b37e3818bd74541cadbd44e55c84df510e41e3a))
-   resolve issue with "simple-enum" synchronization in SQLite ([#9716](https://github.com/typeorm/typeorm/issues/9716)) ([c77c43e](https://github.com/typeorm/typeorm/commit/c77c43e2423201bdc2ede85ae921447570685585)), closes [#9715](https://github.com/typeorm/typeorm/issues/9715)
-   sql expression when `where` parameter is empty array ([#9691](https://github.com/typeorm/typeorm/issues/9691)) ([7df2ccf](https://github.com/typeorm/typeorm/commit/7df2ccf69d13f8f0769e614638d8badd89c181b0)), closes [#9690](https://github.com/typeorm/typeorm/issues/9690)
-   synchronizing View with schema broken for oracle ([#9602](https://github.com/typeorm/typeorm/issues/9602)) ([18b659d](https://github.com/typeorm/typeorm/commit/18b659d1298a4606da0ea54ebd852f1c726ed4f2))

### Features

-   add find operator json contains ([#9665](https://github.com/typeorm/typeorm/issues/9665)) ([d2f37f6](https://github.com/typeorm/typeorm/commit/d2f37f6e72f3f7566bcd312a256c652ea5dc5508))
-   allow mysql2 v3 as peerDependency ([#9747](https://github.com/typeorm/typeorm/issues/9747)) ([6c9010e](https://github.com/typeorm/typeorm/commit/6c9010e466ef103685ad842b5bcfef8ad8ace0c2)), closes [#9714](https://github.com/typeorm/typeorm/issues/9714)
-   naming strategy for legacy Oracle ([#9703](https://github.com/typeorm/typeorm/issues/9703)) ([0eb7441](https://github.com/typeorm/typeorm/commit/0eb74411d62f9132ba45154040b204f31a98c779))
-   support busy_timeout param parameter for sqlite ([#9623](https://github.com/typeorm/typeorm/issues/9623)) ([8668c29](https://github.com/typeorm/typeorm/commit/8668c29d83765001d68918f0fbe663061eee9373))
-   support enableWal for the better-sqlite3 driver ([#9619](https://github.com/typeorm/typeorm/issues/9619)) ([8731858](https://github.com/typeorm/typeorm/commit/8731858fbc88150f935b9a853f533d5c217d9d0e))
-   support for SQL aggregate functions SUM, AVG, MIN, and MAX to the Repository API ([#9737](https://github.com/typeorm/typeorm/issues/9737)) ([7d1f1d6](https://github.com/typeorm/typeorm/commit/7d1f1d69588b771c5ec393c86976008a352ddcc0))
-   support time travel queries, upsert, enums, spatial types in cockroachdb ([#9128](https://github.com/typeorm/typeorm/issues/9128)) ([defb409](https://github.com/typeorm/typeorm/commit/defb409f5650fed0b7a4ff2933208282a45572fb)), closes [#9068](https://github.com/typeorm/typeorm/issues/9068) [#8532](https://github.com/typeorm/typeorm/issues/8532) [#8532](https://github.com/typeorm/typeorm/issues/8532) [#9199](https://github.com/typeorm/typeorm/issues/9199)
-   update mssql dependency and other dependencies as well ([#9763](https://github.com/typeorm/typeorm/issues/9763)) ([4555211](https://github.com/typeorm/typeorm/commit/4555211bcb71dce59b418a185141cc413a910352))

## [0.3.11](https://github.com/typeorm/typeorm/compare/0.3.10...0.3.11) (2022-12-03)

### Fixes

-   boolean parameter escape in SQLiteDriver ([#9400](https://github.com/typeorm/typeorm/issues/9400)) ([4a36d0e](https://github.com/typeorm/typeorm/commit/4a36d0e8c1c50260b3a15c693802856341adfee6)), closes [#1981](https://github.com/typeorm/typeorm/issues/1981)
-   cacheId not used when loading relations with take ([#9469](https://github.com/typeorm/typeorm/issues/9469)) ([93e6b3d](https://github.com/typeorm/typeorm/commit/93e6b3dd8e6c26c64a30350a6dcd486c47d7e516))
-   correctly return insertId for react-native ([#9554](https://github.com/typeorm/typeorm/issues/9554)) ([97fae63](https://github.com/typeorm/typeorm/commit/97fae631b33e5bea957f96b242df30737e2c3792))
-   disable transactionSupport option for CordovaDriver ([#9391](https://github.com/typeorm/typeorm/issues/9391)) ([53fad8f](https://github.com/typeorm/typeorm/commit/53fad8f235140b5625d0f2fb738c74d33fa31ea2))
-   explicitly define property for entity relation as enumerable ([#9437](https://github.com/typeorm/typeorm/issues/9437)) ([85fa9c6](https://github.com/typeorm/typeorm/commit/85fa9c6e7df1a0e3ba8c95d64d9b2a6ab464e0e0)), closes [#6631](https://github.com/typeorm/typeorm/issues/6631)
-   fix ormUtils prototype check crashing on null prototype ([#9517](https://github.com/typeorm/typeorm/issues/9517)) ([19536ed](https://github.com/typeorm/typeorm/commit/19536edc3997d4ce83da28cc63b3962491c093d9))
-   fixed outdated `init` command ([#9422](https://github.com/typeorm/typeorm/issues/9422)) ([0984307](https://github.com/typeorm/typeorm/commit/09843078bec2e8bccece0807847ba0bc100aef5f))
-   left instead of inner join for where or + optional relations ([#9516](https://github.com/typeorm/typeorm/issues/9516)) ([d490793](https://github.com/typeorm/typeorm/commit/d490793c7ced454bcc4d770638701a54032595cc))
-   Mark array arguments to find operators as read-only ([#9474](https://github.com/typeorm/typeorm/issues/9474)) ([6eb674b](https://github.com/typeorm/typeorm/commit/6eb674bb9d5272b41b3312211e3a55390e2fe2ff))
-   pass fake flag to undoLastMigration ([#9562](https://github.com/typeorm/typeorm/issues/9562)) ([2458ac7](https://github.com/typeorm/typeorm/commit/2458ac70444ec79f800a9f5d7b8c42aeacaf4571)), closes [#9561](https://github.com/typeorm/typeorm/issues/9561)
-   resolve issue with migrations and unsigned int columns in aurora-data-api ([#9478](https://github.com/typeorm/typeorm/issues/9478)) ([38e0eff](https://github.com/typeorm/typeorm/commit/38e0eff18ae23133dd0f8a392a1943a7572e68f7)), closes [#9477](https://github.com/typeorm/typeorm/issues/9477)
-   resolve nameless TableForeign on drop foreign key ([#9460](https://github.com/typeorm/typeorm/issues/9460)) ([efb4168](https://github.com/typeorm/typeorm/commit/efb41688403b4daf59a129d0fd24aa4dadb626a6)), closes [#9432](https://github.com/typeorm/typeorm/issues/9432)
-   synchronize with typeorm_metadata table only if needed ([#9175](https://github.com/typeorm/typeorm/issues/9175)) ([cdabaa3](https://github.com/typeorm/typeorm/commit/cdabaa30287d357c0ae994209e573f97f92dad22)), closes [#9173](https://github.com/typeorm/typeorm/issues/9173) [#9173](https://github.com/typeorm/typeorm/issues/9173) [#9173](https://github.com/typeorm/typeorm/issues/9173)
-   the mpath is incorrect when the parent of the tree entity is null ([#9535](https://github.com/typeorm/typeorm/issues/9535)) ([658604d](https://github.com/typeorm/typeorm/commit/658604d0aeb65304053378ce0405f41217da45f1))
-   typings for Repository.extend function ([#9396](https://github.com/typeorm/typeorm/issues/9396)) ([f07fb2c](https://github.com/typeorm/typeorm/commit/f07fb2c3f2a4e970aef247cfd25b4a501933e6cc))

### Features

-   "And" operator in FindOptions ([#9489](https://github.com/typeorm/typeorm/issues/9489)) ([fc3b4f8](https://github.com/typeorm/typeorm/commit/fc3b4f8021271601d5b896b6b30b3820303ca6fe)), closes [#3113](https://github.com/typeorm/typeorm/issues/3113)
-   add id in migrate:show command logging ([#9475](https://github.com/typeorm/typeorm/issues/9475)) ([71efa8e](https://github.com/typeorm/typeorm/commit/71efa8e8590b6c2ff58e46cdaed0ef2c146e3eb0))
-   add Open DB Flags and URI DB Name in SQLite ([#9468](https://github.com/typeorm/typeorm/issues/9468)) ([73148c9](https://github.com/typeorm/typeorm/commit/73148c9ad484983123090f2ebedd3f48f83808ce))
-   add parseInt8 option to postgres driver. Closes [#9341](https://github.com/typeorm/typeorm/issues/9341) ([#9435](https://github.com/typeorm/typeorm/issues/9435)) ([2473ff0](https://github.com/typeorm/typeorm/commit/2473ff0a8eca2fafffdabd6fa4cc46b76347f0c2))
-   Add synchronize to @JoinTable ([#9442](https://github.com/typeorm/typeorm/issues/9442)) ([93e14a9](https://github.com/typeorm/typeorm/commit/93e14a928bc8755742ddbe81dffd44eac21c05e4)), closes [#3443](https://github.com/typeorm/typeorm/issues/3443)
-   added opaque types support over primitives in find-options ([#9560](https://github.com/typeorm/typeorm/issues/9560)) ([4ec04fa](https://github.com/typeorm/typeorm/commit/4ec04fa1205ec9587946869c56077dae5454a063))
-   allow for partial index conditions for on conflict statments in postgres ([#8971](https://github.com/typeorm/typeorm/issues/8971)) ([2c54381](https://github.com/typeorm/typeorm/commit/2c543818158ecf0a3425b2bc7c5b26f6aff95b03))
-   allow peerDependency of better-sqlite3 version 8.x.x ([#9564](https://github.com/typeorm/typeorm/issues/9564)) ([26107e6](https://github.com/typeorm/typeorm/commit/26107e6b313fcc1a4c68998caa480a416a3af3e1)), closes [#9563](https://github.com/typeorm/typeorm/issues/9563)
-   allow per-migration control over transaction behavior ([#9459](https://github.com/typeorm/typeorm/issues/9459)) ([6ba48bd](https://github.com/typeorm/typeorm/commit/6ba48bdc1bf032540256f6435327e70204bdfd6e)), closes [#7087](https://github.com/typeorm/typeorm/issues/7087)
-   implement exists query method ([#9303](https://github.com/typeorm/typeorm/issues/9303)) ([598e269](https://github.com/typeorm/typeorm/commit/598e26980d0ae8431f53c14afe8f1f3ba93e43c1)), closes [#2815](https://github.com/typeorm/typeorm/issues/2815)
-   index support for materialized views of PostgreSQL ([#9414](https://github.com/typeorm/typeorm/issues/9414)) ([1cb738a](https://github.com/typeorm/typeorm/commit/1cb738a701fde93814f9aaeee1b99ece938c0744))
-   migration:generate successful exit the process with zero code ([#9288](https://github.com/typeorm/typeorm/issues/9288)) ([f215e2d](https://github.com/typeorm/typeorm/commit/f215e2d16f75c730d0f2bdbd9abdbccd3b69865e))
-   new virtual column decorator ([#9339](https://github.com/typeorm/typeorm/issues/9339)) ([d305e5f](https://github.com/typeorm/typeorm/commit/d305e5f9ac431f9b38a21e493886bf4836daa488)), closes [#9323](https://github.com/typeorm/typeorm/issues/9323) [typeorm#9323](https://github.com/typeorm/issues/9323) [typeorm#9323](https://github.com/typeorm/issues/9323) [typeorm#9323](https://github.com/typeorm/issues/9323) [typeorm#9323](https://github.com/typeorm/issues/9323)
-   upsert options conflictPaths as Entity keys ([#9365](https://github.com/typeorm/typeorm/issues/9365)) ([b282428](https://github.com/typeorm/typeorm/commit/b2824288f83b76b1bb8af83f51e814cc8311e4e5))

## [0.3.10](https://github.com/typeorm/typeorm/compare/0.3.9...0.3.10) (2022-09-19)

### Bug Fixes

-   "Cannot commit, no transaction is active" error in sql.js ([#9234](https://github.com/typeorm/typeorm/issues/9234)) ([749809a](https://github.com/typeorm/typeorm/commit/749809a42ada15674c995753f683287efe6b3722)), closes [#9100](https://github.com/typeorm/typeorm/issues/9100)
-   add missing support for primaryKeyConstraintName property in EntitySchema ([cc63961](https://github.com/typeorm/typeorm/commit/cc639610dc3fb3fabb982bb25cd7f7cf9dd4e68a))
-   malformed query when selecting deeply nested embedded entities ([#9273](https://github.com/typeorm/typeorm/issues/9273)) ([83f7b88](https://github.com/typeorm/typeorm/commit/83f7b88387f47fdf59c63b906cd7e60c33789673))
-   prototype pollution issue ([e3aac27](https://github.com/typeorm/typeorm/commit/e3aac270319006069b37f574c6e41a1fcfe7c5b1))
-   typescript 4.8 type issues [#9331](https://github.com/typeorm/typeorm/issues/9331) ([#9357](https://github.com/typeorm/typeorm/issues/9357)) ([a1960e1](https://github.com/typeorm/typeorm/commit/a1960e1125c36cd7c9bd2e550a001631090314aa))
-   Update RelationIdLoader to use DriverUtils.getAlias ([#9380](https://github.com/typeorm/typeorm/issues/9380)) ([a917d65](https://github.com/typeorm/typeorm/commit/a917d657fbb2492cf78eee3a49b09bbb13898aa0)), closes [#9379](https://github.com/typeorm/typeorm/issues/9379)

### Features

-   orphanedRowAction=disabled (rebase of PR 8285) ([#8678](https://github.com/typeorm/typeorm/issues/8678)) ([de15df1](https://github.com/typeorm/typeorm/commit/de15df14ede16f11da176a499282a79a2aa9e324))
-   sqlite - deferrable options for foreign keys ([#9360](https://github.com/typeorm/typeorm/issues/9360)) ([773a4fe](https://github.com/typeorm/typeorm/commit/773a4fe439e0a3c4ee90e5c9545b2d4784008eb0))
-   unify Pool max connection size in supported Drivers ([#9305](https://github.com/typeorm/typeorm/issues/9305)) ([48976c2](https://github.com/typeorm/typeorm/commit/48976c2967ce821252c636f54f027a89b71db142)), closes [#3388](https://github.com/typeorm/typeorm/issues/3388)
-   update db image versions in docker compose ([#9367](https://github.com/typeorm/typeorm/issues/9367)) ([f24b262](https://github.com/typeorm/typeorm/commit/f24b26202b86dc70a97e3fc11136051f26f68046)), closes [#9326](https://github.com/typeorm/typeorm/issues/9326)

## [0.3.9](https://github.com/typeorm/typeorm/compare/0.3.7...0.3.9) (2022-08-28)

-   fixed regression introduced in 0.3.8 - broken CLI because of #8917 ([#9332](https://github.com/typeorm/typeorm/issues/9332)), closes [#9330](https://github.com/typeorm/typeorm/issues/9330)

## [0.3.8](https://github.com/typeorm/typeorm/compare/0.3.7...0.3.8) (2022-08-26)

### Bug Fixes

-   allow space and no-space syntaxes for SQLite constraints ([#9238](https://github.com/typeorm/typeorm/issues/9238)) ([bb07244](https://github.com/typeorm/typeorm/commit/bb07244b6188e623a6f8c8407e808d75f94918af)), closes [#9237](https://github.com/typeorm/typeorm/issues/9237)
-   allow where IsNull for ManyToOne relations ([#9031](https://github.com/typeorm/typeorm/issues/9031)) ([72728f1](https://github.com/typeorm/typeorm/commit/72728f155d2e9d11fd9c2c1fb97c071c3b41ae6b)), closes [#8890](https://github.com/typeorm/typeorm/issues/8890)
-   change postgres driver version checking query ([#9319](https://github.com/typeorm/typeorm/issues/9319)) ([c4f4650](https://github.com/typeorm/typeorm/commit/c4f46506d87009a589a7adf9b9367be06c92042c)), closes [#9318](https://github.com/typeorm/typeorm/issues/9318) [#9318](https://github.com/typeorm/typeorm/issues/9318)
-   don't use temporary table name to create foreign key, unique, check constraint with SQLite ([#9185](https://github.com/typeorm/typeorm/issues/9185)) ([e519910](https://github.com/typeorm/typeorm/commit/e51991076dbed4ed06f3cd008eac8029a01c78d2)), closes [#9176](https://github.com/typeorm/typeorm/issues/9176)
-   dropIndex now works when providing a tableIndex without name ([#8937](https://github.com/typeorm/typeorm/issues/8937)) ([de8aaac](https://github.com/typeorm/typeorm/commit/de8aaac54c72f098a50362430ca160ab1c672597))
-   entity manager remove using entity schemas ([#9221](https://github.com/typeorm/typeorm/issues/9221)) ([f045536](https://github.com/typeorm/typeorm/commit/f045536f2449f7adcbc346a94dcf30573c76e56b))
-   find query mongodb properly with @DeleteDateColumn() ([#9262](https://github.com/typeorm/typeorm/issues/9262)) ([e49d0c8](https://github.com/typeorm/typeorm/commit/e49d0c8740b9dec45448131edc012a920e6fcea2))
-   handle inherited relations insert order ([#9242](https://github.com/typeorm/typeorm/issues/9242)) ([14dfadb](https://github.com/typeorm/typeorm/commit/14dfadbde94f4f87678e155394ca9334af7bfa32)), closes [#9241](https://github.com/typeorm/typeorm/issues/9241)
-   handle inherited relations insert order ([#9321](https://github.com/typeorm/typeorm/issues/9321)) ([3671887](https://github.com/typeorm/typeorm/commit/36718876f9289175452ca93d4c0b70393b3324ed)), closes [#9242](https://github.com/typeorm/typeorm/issues/9242) [#9241](https://github.com/typeorm/typeorm/issues/9241)
-   pass error to pgpool release ([#9209](https://github.com/typeorm/typeorm/issues/9209)) ([eb8f0c6](https://github.com/typeorm/typeorm/commit/eb8f0c6c0442aa7a74c6581344fa64be5637538c)), closes [#7792](https://github.com/typeorm/typeorm/issues/7792) [#5112](https://github.com/typeorm/typeorm/issues/5112)
-   QueryBuilder update handles Date objects wrong on a ManyToOne relationship ([#8748](https://github.com/typeorm/typeorm/issues/8748)) ([88d0ced](https://github.com/typeorm/typeorm/commit/88d0ced812c9e05ef088dfd5ebaab003eb1811b4)), closes [#8747](https://github.com/typeorm/typeorm/issues/8747)
-   resolve FindOptionsOrder.nulls to allow FIRST/LAST in uppercase ([#8978](https://github.com/typeorm/typeorm/issues/8978)) ([5e5abbd](https://github.com/typeorm/typeorm/commit/5e5abbd14854a431db06d4ab337705797415786b)), closes [#8970](https://github.com/typeorm/typeorm/issues/8970)
-   resolve issues with new synonymous for GeometryCollection type in MySQL 8 ([#8927](https://github.com/typeorm/typeorm/issues/8927)) ([5ebc626](https://github.com/typeorm/typeorm/commit/5ebc626d29af8c343cee445153377d10d92e309f))
-   sqlite temporary tables now honor withoutRowid ([#8431](https://github.com/typeorm/typeorm/issues/8431)) ([b8d04dc](https://github.com/typeorm/typeorm/commit/b8d04dc3f9aef0658b72d5d438716c1f76420004)), closes [#8430](https://github.com/typeorm/typeorm/issues/8430)
-   support async import for DataSource in CLI [#8914](https://github.com/typeorm/typeorm/issues/8914) ([#8917](https://github.com/typeorm/typeorm/issues/8917)) ([15f90e0](https://github.com/typeorm/typeorm/commit/15f90e0be897f5bd2f4dac1d1e8d24f539a842a8))
-   update date utils to parse year correctly for years 1-999 ([#9236](https://github.com/typeorm/typeorm/issues/9236)) ([72a0147](https://github.com/typeorm/typeorm/commit/72a0147f31c14ca27b88af1d69a3a5ab409fec8d)), closes [#9230](https://github.com/typeorm/typeorm/issues/9230)

### Features

-   add fake migrations running and reverting ([#8976](https://github.com/typeorm/typeorm/issues/8976)) ([340ab67](https://github.com/typeorm/typeorm/commit/340ab67b1013781184ab74bc8c8f72d76be2c927)), closes [#6195](https://github.com/typeorm/typeorm/issues/6195)
-   add setOnLocked for SKIP LOCKED and NOWAIT ([#9317](https://github.com/typeorm/typeorm/issues/9317)) ([68e8f22](https://github.com/typeorm/typeorm/commit/68e8f2289487ad21c18fb7b93754788a02199ee4))
-   add support for non-generated columns with uuid_generate_v4() default ([#9065](https://github.com/typeorm/typeorm/issues/9065)) ([dadb658](https://github.com/typeorm/typeorm/commit/dadb658c59645effaacf4e737e4401cc66b1099d)), closes [#9063](https://github.com/typeorm/typeorm/issues/9063)
-   new mssql option appName ([#9213](https://github.com/typeorm/typeorm/issues/9213)) ([51a0ebe](https://github.com/typeorm/typeorm/commit/51a0ebe5f296db8251b037928021715404eeabda))

## [0.3.7](https://github.com/typeorm/typeorm/compare/0.3.6...0.3.7) (2022-06-29)

### Bug Fixes

-   add missing `enumName` support for EntitySchema ([#9024](https://github.com/typeorm/typeorm/issues/9024)) ([676fd1b](https://github.com/typeorm/typeorm/commit/676fd1bf772db535bd2c084ebadd9f5c0661ca5e))
-   add missing connect call on RedisQueryResultCache connect ([#8894](https://github.com/typeorm/typeorm/issues/8894)) ([7dfb69f](https://github.com/typeorm/typeorm/commit/7dfb69f3664458d6f9f299f5bdbce4bed0b7994f))
-   add SET TRANSACTION AUTOCOMMIT DDL statements (SAP HANA) ([#9020](https://github.com/typeorm/typeorm/issues/9020)) ([cac648e](https://github.com/typeorm/typeorm/commit/cac648e633e0011d42a8a0c4ebcf900f6675d645))
-   call dataSource.destroy() only on initialized dataSource in CLI commands ([#9146](https://github.com/typeorm/typeorm/issues/9146)) ([a100a7a](https://github.com/typeorm/typeorm/commit/a100a7a7f1c17432549e5e93fb141d0f52062213))
-   expo infinite loop on SAVEPOINT ([#8984](https://github.com/typeorm/typeorm/issues/8984)) ([ec23922](https://github.com/typeorm/typeorm/commit/ec23922da745fde7c1e7e353777327f40fbaca28))
-   fixes recursive document to entity attributes mapping ([#9050](https://github.com/typeorm/typeorm/issues/9050)) ([40155d6](https://github.com/typeorm/typeorm/commit/40155d6ceed1f33f26da548681644c17625605e7)), closes [#9049](https://github.com/typeorm/typeorm/issues/9049)
-   log command error prior to calling destroy ([#9135](https://github.com/typeorm/typeorm/issues/9135)) ([bf17381](https://github.com/typeorm/typeorm/commit/bf17381fd2f949b36394b3cfa0199831d41f67dc))
-   make soft-remove and recover events importable from index ([#9110](https://github.com/typeorm/typeorm/issues/9110)) ([e296126](https://github.com/typeorm/typeorm/commit/e2961263e07ee058d5b1c3706cea21b3ae24d776)), closes [#9108](https://github.com/typeorm/typeorm/issues/9108)
-   migration successful now displays name of the migration file ([#8904](https://github.com/typeorm/typeorm/issues/8904)) ([49cbe23](https://github.com/typeorm/typeorm/commit/49cbe232776a5cbe4369a5fed08221dcff8d59e2))
-   release newly created runner when no runner provided in DbQueryResultCache ([#8969](https://github.com/typeorm/typeorm/issues/8969)) ([ec05f1d](https://github.com/typeorm/typeorm/commit/ec05f1d58a08b3cdb72243856a186fef738a236e)), closes [#4866](https://github.com/typeorm/typeorm/issues/4866)
-   resolve cli init peer dependency issues ([#8977](https://github.com/typeorm/typeorm/issues/8977)) ([f7578d4](https://github.com/typeorm/typeorm/commit/f7578d48ef160634744b591636b903728ea79120)), closes [#8975](https://github.com/typeorm/typeorm/issues/8975)
-   resolve ESM module declaration file correctly ([#9097](https://github.com/typeorm/typeorm/issues/9097)) ([506133e](https://github.com/typeorm/typeorm/commit/506133e2179529bf3add2b0b982613835d321af6))
-   support for TypeScript 4.8 ([#9106](https://github.com/typeorm/typeorm/issues/9106)) ([d924b70](https://github.com/typeorm/typeorm/commit/d924b705e5ea4ff57c853e8848eeb1f3b90c0a71)), closes [/github.com/microsoft/TypeScript/issues/49461#issuecomment-1154443477](https://github.com//github.com/microsoft/TypeScript/issues/49461/issues/issuecomment-1154443477)
-   update mssql peerDependency ([#8887](https://github.com/typeorm/typeorm/issues/8887)) ([9adab34](https://github.com/typeorm/typeorm/commit/9adab34e5d8744c134690f855111d21f5d29cf12))
-   wrong entity transform of relation id when referenced column is a primary key ([#8959](https://github.com/typeorm/typeorm/issues/8959)) ([6e888dd](https://github.com/typeorm/typeorm/commit/6e888dd0a13110f386ed538161740ae059491b91))

### Features

-   add `for_key_share` ("FOR KEY SHARE") lock mode for postgres driver ([#8879](https://github.com/typeorm/typeorm/issues/8879)) ([4687be8](https://github.com/typeorm/typeorm/commit/4687be8b77b0f807b2fe4b1e2278e05d0dbd4431)), closes [#8878](https://github.com/typeorm/typeorm/issues/8878)
-   add nativeBinding option to better-sqlite3 driver ([#9157](https://github.com/typeorm/typeorm/issues/9157)) ([bcdddc3](https://github.com/typeorm/typeorm/commit/bcdddc32bddeb3d141c03372971ee27d743b9ab8))
-   add spanner as a db option for the init command ([#9121](https://github.com/typeorm/typeorm/issues/9121)) ([e61cade](https://github.com/typeorm/typeorm/commit/e61cade32fbcd491e4d8e27aea7b35b5a946c879))
-   allow explicitly named primary keys, foreign keys, and indices ([#8900](https://github.com/typeorm/typeorm/issues/8900)) ([78df84c](https://github.com/typeorm/typeorm/commit/78df84c732ce085caf4b5ccf37477ef93b38f4d0)), closes [#1355](https://github.com/typeorm/typeorm/issues/1355)
-   Cloud Spanner support ([#8730](https://github.com/typeorm/typeorm/issues/8730)) ([62518ae](https://github.com/typeorm/typeorm/commit/62518ae1226f22b2f230afa615532c92f1544f01))
-   fix issues with generated columns and add support in other drivers ([#8806](https://github.com/typeorm/typeorm/issues/8806)) ([0418ebc](https://github.com/typeorm/typeorm/commit/0418ebcaf6835dfffe3c3db1f66d20bfe3e5b09d)), closes [#8761](https://github.com/typeorm/typeorm/issues/8761)
-   implement support for relationids in entity schemas ([#9129](https://github.com/typeorm/typeorm/issues/9129)) ([e24cced](https://github.com/typeorm/typeorm/commit/e24cced8f63206a607deff6445cfcccf63c3a0c8))
-   support TS 4.7+ node16/nodenext module mode ([#9043](https://github.com/typeorm/typeorm/issues/9043)) ([862a402](https://github.com/typeorm/typeorm/commit/862a4027af14e5c3632c2a76c44b62ef0277338a))
-   upgrade ioredis to v5 ([#8997](https://github.com/typeorm/typeorm/issues/8997)) ([723f1e5](https://github.com/typeorm/typeorm/commit/723f1e514bf261bc1539bdaf86fd0a72a1e42a46))

### Performance Improvements

-   don't recompile escapeRegExp for every query ([#8956](https://github.com/typeorm/typeorm/issues/8956)) ([189592c](https://github.com/typeorm/typeorm/commit/189592c77980e766f92f6eb77dbd7412db106086)), closes [#8955](https://github.com/typeorm/typeorm/issues/8955)
-   partially lift matching from regexp to js ([#9032](https://github.com/typeorm/typeorm/issues/9032)) ([bbdc20f](https://github.com/typeorm/typeorm/commit/bbdc20f8cafc63e768f248213eafe65f163cb6e5)), closes [#3857](https://github.com/typeorm/typeorm/issues/3857) [#8955](https://github.com/typeorm/typeorm/issues/8955) [#8956](https://github.com/typeorm/typeorm/issues/8956) [/github.com/typeorm/typeorm/issues/3857#issuecomment-699505893](https://github.com//github.com/typeorm/typeorm/issues/3857/issues/issuecomment-699505893)

## [0.3.6](https://github.com/typeorm/typeorm/compare/0.3.5...0.3.6) (2022-04-12)

### Features

-   add `for_key_share` ("FOR KEY SHARE") lock mode for postgres driver ([#8879](https://github.com/typeorm/typeorm/issues/8879)) ([4687be8](https://github.com/typeorm/typeorm/commit/4687be8b77b0f807b2fe4b1e2278e05d0dbd4431)), closes [#8878](https://github.com/typeorm/typeorm/issues/8878)
-   new driver: Cloud Spanner ([#8730](https://github.com/typeorm/typeorm/issues/8730)) ([62518ae](https://github.com/typeorm/typeorm/commit/62518ae1226f22b2f230afa615532c92f1544f01))

## [0.3.5](https://github.com/typeorm/typeorm/compare/0.3.4...0.3.5) (2022-04-05)

### Bug Fixes

-   `.save` repository method not returning generated uuids for aurora-postgres ([#8825](https://github.com/typeorm/typeorm/issues/8825)) ([ed06f4c](https://github.com/typeorm/typeorm/commit/ed06f4c1f1056837f03a97a25762742a12620a94))
-   allow hstore type to use transformers in driver postgres ([#8823](https://github.com/typeorm/typeorm/issues/8823)) ([b1a0107](https://github.com/typeorm/typeorm/commit/b1a01074c99b1fee9b2da2c056f5f773367d391b))
-   broken shebang parameters of `cli-ts-node-commonjs` and `cli-ts-node-esm` on some linux distros ([#8821](https://github.com/typeorm/typeorm/issues/8821)) ([c5dfc11](https://github.com/typeorm/typeorm/commit/c5dfc11ea7b8b33aa9e621b64b953c1d62a27989)), closes [#8818](https://github.com/typeorm/typeorm/issues/8818)
-   find select object api should support false values [#8796](https://github.com/typeorm/typeorm/issues/8796) ([#8807](https://github.com/typeorm/typeorm/issues/8807)) ([9ac8e9e](https://github.com/typeorm/typeorm/commit/9ac8e9ed0da0ac5bba71b76ee99d6f0c4eb0871f))
-   resolve missing ConnectionOptions export in index.ts ([#8850](https://github.com/typeorm/typeorm/issues/8850)) ([1693a17](https://github.com/typeorm/typeorm/commit/1693a17011195c353e5bc1d93d9c26ac48624a0b)), closes [#8837](https://github.com/typeorm/typeorm/issues/8837)
-   save correct discriminator with STI ([#8819](https://github.com/typeorm/typeorm/issues/8819)) ([9d1e246](https://github.com/typeorm/typeorm/commit/9d1e2460edae9c01f6a56c727f0321b265f78d89)), closes [#2927](https://github.com/typeorm/typeorm/issues/2927)
-   Update DeepPartial for usage of generics with Repository class ([#8817](https://github.com/typeorm/typeorm/issues/8817)) ([8ba742e](https://github.com/typeorm/typeorm/commit/8ba742eb36586a21a918ed178208874a53ace3f9))
-   fixed issue with `typeorm init` command ([#8820](https://github.com/typeorm/typeorm/issues/8820))

## [0.3.4](https://github.com/typeorm/typeorm/compare/0.3.3...0.3.4) (2022-03-26)

### Bug Fixes

-   BaseEntity.reload method regression and made `findOne` to throw error on missing conditions in runtime ([#8801](https://github.com/typeorm/typeorm/issues/8801)) ([ee8c1ec](https://github.com/typeorm/typeorm/commit/ee8c1ecbc210adcc685d6156a941004b9d724227))
-   improve DeepPartial recursion ([#8732](https://github.com/typeorm/typeorm/issues/8732)) ([0494008](https://github.com/typeorm/typeorm/commit/0494008b703240bf593c6f8f2c601cb0d6761805)), closes [#8681](https://github.com/typeorm/typeorm/issues/8681)
-   missing timestamp in created migrations filenames ([#8802](https://github.com/typeorm/typeorm/issues/8802)) ([ceee439](https://github.com/typeorm/typeorm/commit/ceee4396d31da1a7dde53cb50689f53659c8a4b1))
-   PoolConnection leaked by MysqlDriver ([#8803](https://github.com/typeorm/typeorm/issues/8803)) ([d2cfd22](https://github.com/typeorm/typeorm/commit/d2cfd224cacb5db9761aa9679764d699b8abbc65))
-   remove console.log calls from SelectQueryBuilder ([#8795](https://github.com/typeorm/typeorm/issues/8795)) ([54c7db4](https://github.com/typeorm/typeorm/commit/54c7db49355bb09514b6e977d1d7235c02557a0b)), closes [#8792](https://github.com/typeorm/typeorm/issues/8792)
-   stop crashing when redis is offline and ignoreErrors on cache options is set ([#8725](https://github.com/typeorm/typeorm/issues/8725)) ([edc39d1](https://github.com/typeorm/typeorm/commit/edc39d14a97d90c534b56693b988a0ad139e69fd))

### Features

-   add support for insert with alias ([#4003](https://github.com/typeorm/typeorm/issues/4003)) ([#8791](https://github.com/typeorm/typeorm/issues/8791)) ([4b37030](https://github.com/typeorm/typeorm/commit/4b37030fc02878a27b0d57d4217b2efab49999af))
-   applicationName parameter for CockroachDB ([#8800](https://github.com/typeorm/typeorm/issues/8800)) ([79b7f5c](https://github.com/typeorm/typeorm/commit/79b7f5c22840992e205d61f6433916aaf80ea647))

## [0.3.3](https://github.com/typeorm/typeorm/compare/0.3.2...0.3.3) (2022-03-23)

### Bug Fixes

-   improve initialization of custom repository ([#8782](https://github.com/typeorm/typeorm/issues/8782)) ([52a641c](https://github.com/typeorm/typeorm/commit/52a641ca7ce8e4b168155b5043d1e9289c694fc7))
-   resolve entities correctly in datasource when globs are specified ([#8778](https://github.com/typeorm/typeorm/issues/8778)) ([a641c5d](https://github.com/typeorm/typeorm/commit/a641c5dff86df683b84e14873e88011013258f87))

### Features

-   support for Common Table Expressions ([#8534](https://github.com/typeorm/typeorm/issues/8534)) ([7cc1848](https://github.com/typeorm/typeorm/commit/7cc1848fd4a44aefa986026ee659ed872ea6ab8f)), closes [#1116](https://github.com/typeorm/typeorm/issues/1116) [#5899](https://github.com/typeorm/typeorm/issues/5899) [#4753](https://github.com/typeorm/typeorm/issues/4753)

## [0.3.2](https://github.com/typeorm/typeorm/compare/0.3.1...0.3.2) (2022-03-22)

### Bug Fixes

-   broken CLI in ESM projects since version 0.3.0 ([#8773](https://github.com/typeorm/typeorm/issues/8773)) ([97699e8](https://github.com/typeorm/typeorm/commit/97699e816e03867efe595f620ceb152af91f9f56))

### Features

-   add typeorm CLI variations that include `ts-node` ([#8776](https://github.com/typeorm/typeorm/issues/8776)) ([05fc744](https://github.com/typeorm/typeorm/commit/05fc74446988d100052f46e2dbf61c6cc2999b99))
-   allows user to specify which mysql package should be used ([#8771](https://github.com/typeorm/typeorm/issues/8771)) ([35106df](https://github.com/typeorm/typeorm/commit/35106dfe78a92783abca7d06307ab9106ae536bc))

### Reverts

-   json/jsonb change introduced in 0.3.1 ([#8777](https://github.com/typeorm/typeorm/issues/8777)) ([edf27d9](https://github.com/typeorm/typeorm/commit/edf27d97a30d1aaf28e5c7a7aab96d16152e4983))

## [0.3.1](https://github.com/typeorm/typeorm/compare/0.3.0...0.3.1) (2022-03-21)

### Bug Fixes

-   bugfixes introduced in 0.3.0 ([#8764](https://github.com/typeorm/typeorm/issues/8764)) ([d61f857](https://github.com/typeorm/typeorm/commit/d61f857ce9447a25d074810759fd5c4aad9a08e3)), closes [#8762](https://github.com/typeorm/typeorm/issues/8762) [#8759](https://github.com/typeorm/typeorm/issues/8759) [#8758](https://github.com/typeorm/typeorm/issues/8758) [#8757](https://github.com/typeorm/typeorm/issues/8757)

### Features

-   new array find operators (`ArrayContains`, `ArrayContainedBy`, `ArrayOverlap`) ([#8766](https://github.com/typeorm/typeorm/issues/8766)) ([9f1b8e3](https://github.com/typeorm/typeorm/commit/9f1b8e3425739a871c2d0ad84ddd6e7456117f7f)):

### BREAKING CHANGES

-   we do not call JSON.stringify() to json/jsonb column types in Postgres. Instead, we delegate value directly to underlying pg driver. This is a correct way of handling jsons.
-   array: true must be explicitly defined for array json/jsonb values
-   strings being JSON-stringified must be manually escaped

## [0.3.0](https://github.com/typeorm/typeorm/pull/8616) (2022-03-17)

Changes in the version includes changes from the `next` branch and `typeorm@next` version.
They were pending their migration from 2018. Finally, they are in the master branch and master version.

### Features

-   compilation `target` now is `es2020`. This requires Node.JS version `14+`

-   TypeORM now properly works when installed within different node_modules contexts
    (often happen if TypeORM is a dependency of another library or TypeORM is heavily used in monorepo projects)

-   `Connection` was renamed to `DataSource`.
    Old `Connection` is still there, but now it's deprecated. It will be completely removed in next version.
    New API:

```ts
export const dataSource = new DataSource({
    // ... options ...
})

// load entities, establish db connection, sync schema, etc.
await dataSource.connect()
```

Previously, you could use `new Connection()`, `createConnection()`, `getConnectionManager().create()`, etc.
They all deprecated in favour of new syntax you can see above.

New way gives you more flexibility and simplicity in usage.

-   new custom repositories syntax:

```ts
export const UserRepository = myDataSource.getRepository(UserEntity).extend({
    findUsersWithPhotos() {
        return this.find({
            relations: {
                photos: true,
            },
        })
    },
})
```

Old ways of custom repository creation were dropped.

-   added new option on relation load strategy called `relationLoadStrategy`.
    Relation load strategy is used on entity load and determines how relations must be loaded when you query entities and their relations from the database.
    Used on `find*` methods and `QueryBuilder`. Value can be set to `join` or `query`.

    -   `join` - loads relations using SQL `JOIN` expression
    -   `query` - executes separate SQL queries for each relation

Default is `join`, but default can be set in `ConnectionOptions`:

```ts
createConnection({
    /* ... */
    relationLoadStrategy: "query",
})
```

Also, it can be set per-query in `find*` methods:

```ts
userRepository.find({
    relations: {
        photos: true,
    },
})
```

And QueryBuilder:

```ts
userRepository.createQueryBuilder().setRelationLoadStrategy("query")
```

For queries returning big amount of data, we recommend to use `query` strategy,
because it can be a more performant approach to query relations.

-   added new `findOneBy`, `findOneByOrFail`, `findBy`, `countBy`, `findAndCountBy` methods to `BaseEntity`, `EntityManager` and `Repository`:

```ts
const users = await userRepository.findBy({
    name: "Michael",
})
```

Overall `find*` and `count*` method signatures where changed, read the "breaking changes" section for more info.

-   new `select` type signature in `FindOptions` (used in `find*` methods):

```ts
userRepository.find({
    select: {
        id: true,
        firstName: true,
        lastName: true,
    },
})
```

Also, now it's possible to specify select columns of the loaded relations:

```ts
userRepository.find({
    select: {
        id: true,
        firstName: true,
        lastName: true,
        photo: {
            id: true,
            filename: true,
            album: {
                id: true,
                name: true,
            },
        },
    },
})
```

-   new `relations` type signature in `FindOptions` (used in `find*` methods):

```ts
userRepository.find({
    relations: {
        contacts: true,
        photos: true,
    },
})
```

To load nested relations use a following signature:

```ts
userRepository.find({
    relations: {
        contacts: true,
        photos: {
            album: true,
        },
    },
})
```

-   new `order` type signature in `FindOptions` (used in `find*` methods):

```ts
userRepository.find({
    order: {
        id: "ASC",
    },
})
```

Now supports nested order by-s:

```ts
userRepository.find({
    order: {
        photos: {
            album: {
                name: "ASC",
            },
        },
    },
})
```

-   new `where` type signature in `FindOptions` (used in `find*` methods) now allows to build nested statements with conditional relations, for example:

```ts
userRepository.find({
    where: {
        photos: {
            album: {
                name: "profile",
            },
        },
    },
})
```

Gives you users who have photos in their "profile" album.

-   `FindOperator`-s can be applied for relations in `where` statement, for example:

```ts
userRepository.find({
    where: {
        photos: MoreThan(10),
    },
})
```

Gives you users with more than 10 photos.

-   `boolean` can be applied for relations in `where` statement, for example:

```ts
userRepository.find({
    where: {
        photos: true,
    },
})
```

### BREAKING CHANGES

-   minimal Node.JS version requirement now is `14+`

-   drop `ormconfig` support. `ormconfig` still works if you use deprecated methods,
    however we do not recommend using it anymore, because it's support will be completely dropped in `0.4.0`.
    If you want to have your connection options defined in a separate file, you can still do it like this:

```ts
import ormconfig from "./ormconfig.json"

const MyDataSource = new DataSource(require("./ormconfig.json"))
```

Or even more type-safe approach with `resolveJsonModule` in `tsconfig.json` enabled:

```ts
import ormconfig from "./ormconfig.json"

const MyDataSource = new DataSource(ormconfig)
```

But we do not recommend use this practice, because from `0.4.0` you'll only be able to specify entities / subscribers / migrations using direct references to entity classes / schemas (see "deprecations" section).

We won't be supporting all `ormconfig` extensions (e.g. `json`, `js`, `ts`, `yaml`, `xml`, `env`).

-   support for previously deprecated `migrations:*` commands was removed. Use `migration:*` commands instead.

-   all commands were re-worked. Please refer to new CLI documentation.

-   `cli` option from `BaseConnectionOptions` (now `BaseDataSourceOptions` options) was removed (since CLI commands were re-worked).

-   now migrations are running before schema synchronization if you have both pending migrations and schema synchronization pending
    (it works if you have both `migrationsRun` and `synchronize` enabled in connection options).

-   `aurora-data-api` driver now is called `aurora-mysql`

-   `aurora-data-api-pg` driver now is called `aurora-postgres`

-   `EntityManager.connection` is now `EntityManager.dataSource`

-   `Repository` now has a constructor (breaks classes extending Repository with custom constructor)

-   `@TransactionRepository`, `@TransactionManager`, `@Transaction` decorators were completely removed. These decorators do the things out of the TypeORM scope.

-   Only junction table names shortened.

**MOTIVATION:** We must shorten only table names generated by TypeORM.
It's user responsibility to name tables short if their RDBMS limit table name length
since it won't make sense to have table names as random hashes.
It's really better if user specify custom table name into `@Entity` decorator.
Also, for junction table it's possible to set a custom name using `@JoinTable` decorator.

-   `findOne()` signature without parameters was dropped.
    If you need a single row from the db you can use a following syntax:

```ts
const [user] = await userRepository.find()
```

This change was made to prevent user confusion.
See [this issue](https://github.com/typeorm/typeorm/issues/2500) for details.

-   `findOne(id)` signature was dropped. Use following syntax instead:

```ts
const user = await userRepository.findOneBy({
    id: id, // where id is your column name
})
```

This change was made to provide a more type-safe approach for data querying.
Due to this change you might need to refactor the way you load entities using MongoDB driver.

-   `findOne`, `findOneOrFail`, `find`, `count`, `findAndCount` methods now only accept `FindOptions` as parameter, e.g.:

```ts
const users = await userRepository.find({
    where: {
        /* conditions */
    },
    relations: {
        /* relations */
    },
})
```

To supply `where` conditions directly without `FindOptions` new methods were added:
`findOneBy`, `findOneByOrFail`, `findBy`, `countBy`, `findAndCountBy`. Example:

```ts
const users = await userRepository.findBy({
    name: "Michael",
})
```

This change was required to simply current `find*` and `count*` methods typings,
improve type safety and prevent user confusion.

-   `findByIds` was deprecated, use `findBy` method instead in conjunction with `In` operator, for example:

```ts
userRepository.findBy({
    id: In([1, 2, 3]),
})
```

This change was made to provide a more type-safe approach for data querying.

-   `findOne` and `QueryBuilder.getOne()` now return `null` instead of `undefined` in the case if it didn't find anything in the database.
    Logically it makes more sense to return `null`.

-   `findOne` now limits returning rows to 1 at database level.

**NOTE:** `FOR UPDATE` locking does not work with `findOne` in Oracle since `FOR UPDATE` cannot be used with `FETCH NEXT` in a single query.

-   `where` in `FindOptions` (e.g. `find({ where: { ... })`) is more sensitive to input criteria now.

-   `FindConditions` (`where` in `FindOptions`) was renamed to `FindOptionsWhere`.

-   `null` as value in `where` used in `find*` methods is not supported anymore.
    Now you must explicitly use `IsNull()` operator.

Before:

```ts
userRepository.find({
    where: {
        photo: null,
    },
})
```

After:

```ts
userRepository.find({
    where: {
        photo: IsNull(),
    },
})
```

This change was made to make it more transparent on how to add "IS NULL" statement to final SQL,
because before it bring too much confusion for ORM users.

-   if you had entity properties of a non-primitive type (except Buffer) defined as columns,
    then you won't be able to use it in `find*`'s `where`. Example:

Before for the `@Column(/*...*/) membership: MembershipKind` you could have a query like:

```ts
userRepository.find({
    membership: new MembershipKind("premium"),
})
```

now, you need to wrap this value into `Equal` operator:

```ts
userRepository.find({
    membership: Equal(new MembershipKind("premium")),
})
```

This change is due to type-safety improvement new `where` signature brings.

-   `order` in `FindOptions` (used in `find*` methods) doesn't support ordering by relations anymore.
    Define relation columns, and order by them instead.

-   `where` in `FindOptions` (used in `find*` methods) previously supported `ObjectLiteral` and `string` types.
    Now both signatures were removed. ObjectLiteral was removed because it seriously breaks the type safety,
    and `string` doesn't make sense in the context of `FindOptions`. Use `QueryBuilder` instead.

-   `MongoRepository` and `MongoEntityManager` now use new types called `MongoFindManyOptions` and `MongoFindOneOptions`
    for their `find*` methods.

-   `primary relation` (e.g. `@ManyToOne(() => User, { primary: true }) user: User`) support is removed.
    You still have an ability to use foreign keys as your primary keys,
    however now you must explicitly define a column marked as primary.

Example, before:

```ts
@ManyToOne(() => User, { primary: true })
user: User
```

Now:

```ts
@PrimaryColumn()
userId: number

@ManyToOne(() => User)
user: User
```

Primary column name must match the relation name + join column name on related entity.
If related entity has multiple primary keys, and you want to point to multiple primary keys,
you can define multiple primary columns the same way:

```ts
@PrimaryColumn()
userFirstName: string

@PrimaryColumn()
userLastName: string

@ManyToOne(() => User)
user: User
```

This change was required to simplify ORM internals and introduce new features.

-   prefix relation id columns contained in embedded entities ([#7432](https://github.com/typeorm/typeorm/pull/7432))

-   find by Date object in sqlite driver ([#7538](https://github.com/typeorm/typeorm/pull/7538))

-   issue with non-reliable `new Date(ISOString)` parsing ([#7796](https://github.com/typeorm/typeorm/pull/7796))

### DEPRECATIONS

-   all CLI commands do not support `ormconfig` anymore. You must specify a file with data source instance instead.

-   `entities`, `migrations`, `subscribers` options inside `DataSourceOptions` accepting `string` directories support is deprecated.
    You'll be only able to pass entity references in the future versions.

-   all container-related features (`UseContainerOptions`, `ContainedType`, `ContainerInterface`, `defaultContainer`,
    `useContainer`, `getFromContainer`) are deprecated.

-   EntityManager's `getCustomRepository` used within transactions is deprecated. Use `withRepository` method instead.

-   `Connection.isConnected` is deprecated. Use `.isInitialized` instead.

-   `select` in `FindOptions` (used in `find*` methods) used as an array of property names is deprecated.
    Now you should use a new object-literal notation. Example:

Deprecated way of loading entity relations:

```ts
userRepository.find({
    select: ["id", "firstName", "lastName"],
})
```

New way of loading entity relations:

```ts
userRepository.find({
    select: {
        id: true,
        firstName: true,
        lastName: true,
    },
})
```

This change is due to type-safety improvement new `select` signature brings.

-   `relations` in `FindOptions` (used in `find*` methods) used as an array of relation names is deprecated.
    Now you should use a new object-literal notation. Example:

Deprecated way of loading entity relations:

```ts
userRepository.find({
    relations: ["contacts", "photos", "photos.album"],
})
```

New way of loading entity relations:

```ts
userRepository.find({
    relations: {
        contacts: true,
        photos: {
            album: true,
        },
    },
})
```

This change is due to type-safety improvement new `relations` signature brings.

-   `join` in `FindOptions` (used in `find*` methods) is deprecated. Use `QueryBuilder` to build queries containing manual joins.

-   `Connection`, `ConnectionOptions` are deprecated, new names to use are: `DataSource` and `DataSourceOptions`.
    To create the same connection you had before use a new syntax: `new DataSource({ /*...*/ })`.

-   `createConnection()`, `createConnections()` are deprecated, since `Connection` is called `DataSource` now, to create a connection and connect to the database
    simply do:

```ts
const myDataSource = new DataSource({
    /*...*/
})
await myDataSource.connect()
```

-   `getConnection()` is deprecated. To have a globally accessible connection, simply export your data source and use it in places you need it:

```ts
export const myDataSource = new DataSource({
    /*...*/
})
// now you can use myDataSource anywhere in your application
```

-   `getManager()`, `getMongoManager()`, `getSqljsManager()`, `getRepository()`, `getTreeRepository()`, `getMongoRepository()`, `createQueryBuilder()`
    are all deprecated now. Use globally accessible data source instead:

```ts
export const myDataSource = new DataSource({
    /*...*/
})
export const Manager = myDataSource.manager
export const UserRepository = myDataSource.getRepository(UserEntity)
export const PhotoRepository = myDataSource.getRepository(PhotoEntity)
// ...
```

-   `getConnectionManager()` and `ConnectionManager` itself are deprecated - now `Connection` is called `DataSource`,
    and each data source can be defined in exported variable. If you want to have a collection
    of data sources, just define them in a variable, simply as:

```ts
const dataSource1 = new DataSource({
    /*...*/
})
const dataSource2 = new DataSource({
    /*...*/
})
const dataSource3 = new DataSource({
    /*...*/
})

export const MyDataSources = {
    dataSource1,
    dataSource2,
    dataSource3,
}
```

-   `getConnectionOptions()` is deprecated - in next version we are going to implement different mechanism of connection options loading

-   `AbstractRepository` is deprecated. Use new way of custom repositories creation.

-   `Connection.name` and `BaseConnectionOptions.name` are deprecated. Connections don't need names anymore since we are going to drop all related methods relying on this property.

-   all deprecated signatures will be removed in `0.4.0`

### EXPERIMENTAL FEATURES NOT PORTED FROM NEXT BRANCH

-   `observers` - we will consider returning them back with new API in future versions
-   `alternative find operators` - using `$any`, `$in`, `$like` and other operators in `where` condition.

## [0.2.45](https://github.com/typeorm/typeorm/compare/0.2.44...0.2.45) (2022-03-04)

### Bug Fixes

-   allow clearing database inside a transaction ([#8712](https://github.com/typeorm/typeorm/issues/8712)) ([f3cfdd2](https://github.com/typeorm/typeorm/commit/f3cfdd264105ba8cf1c92832b4b95e5a3ca0ed09)), closes [#8527](https://github.com/typeorm/typeorm/issues/8527)
-   discard duplicated columns on update ([#8724](https://github.com/typeorm/typeorm/issues/8724)) ([0fc093d](https://github.com/typeorm/typeorm/commit/0fc093d168b54a0fd99bb411a730aad9be1858ac)), closes [#8723](https://github.com/typeorm/typeorm/issues/8723)
-   fix entityManager.getId for custom join table ([#8676](https://github.com/typeorm/typeorm/issues/8676)) ([33b2bd7](https://github.com/typeorm/typeorm/commit/33b2bd7acc55d6eb30bfe0681748d6b6abaff0b5)), closes [#7736](https://github.com/typeorm/typeorm/issues/7736)
-   force web bundlers to ignore index.mjs and use the browser ESM version directly ([#8710](https://github.com/typeorm/typeorm/issues/8710)) ([411fa54](https://github.com/typeorm/typeorm/commit/411fa54368c8940e94b1cbf7ab64b8d5377f9406)), closes [#8709](https://github.com/typeorm/typeorm/issues/8709)

### Features

-   add nested transaction ([#8541](https://github.com/typeorm/typeorm/issues/8541)) ([6523526](https://github.com/typeorm/typeorm/commit/6523526003bab74a0df8f7d578790c1728b26057)), closes [#1505](https://github.com/typeorm/typeorm/issues/1505)
-   add transformer to ViewColumnOptions ([#8717](https://github.com/typeorm/typeorm/issues/8717)) ([96ac8f7](https://github.com/typeorm/typeorm/commit/96ac8f7eece06ae0a8b52ae7da740c92c0c0d4b9))

## [0.2.44](https://github.com/typeorm/typeorm/compare/0.2.43...0.2.44) (2022-02-23)

### Bug Fixes

-   alter relation loader to use transforms when present ([#8691](https://github.com/typeorm/typeorm/issues/8691)) ([2c2fb29](https://github.com/typeorm/typeorm/commit/2c2fb29a67bfd0ca7dd9133a2f85f5b4db5fb195)), closes [#8690](https://github.com/typeorm/typeorm/issues/8690)
-   cannot read properties of undefined (reading 'joinEagerRelations') ([136015b](https://github.com/typeorm/typeorm/commit/136015b04ee72b0ca2439fbff53b1467c12c24b6))
-   expo driver doesn't work properly because of new beforeMigration() afterMigration() callbacks ([#8683](https://github.com/typeorm/typeorm/issues/8683)) ([5a71803](https://github.com/typeorm/typeorm/commit/5a7180378e34ab58ad40c504ebc5195e2413c5f4))
-   ng webpack default import ([#8688](https://github.com/typeorm/typeorm/issues/8688)) ([2d3374b](https://github.com/typeorm/typeorm/commit/2d3374b3b4cb8163764c035bd687b2c81787f338)), closes [#8674](https://github.com/typeorm/typeorm/issues/8674)
-   support imports of absolute paths of ESM files on Windows ([#8669](https://github.com/typeorm/typeorm/issues/8669)) ([12cbfcd](https://github.com/typeorm/typeorm/commit/12cbfcde7bc4f56069ed3298064bb91ad0816bf0)), closes [#8651](https://github.com/typeorm/typeorm/issues/8651)

### Features

-   add option to upsert to skip update if the row already exists and no values would be changed ([#8679](https://github.com/typeorm/typeorm/issues/8679)) ([8744395](https://github.com/typeorm/typeorm/commit/87443954b59768ab77fb15097ea9d88822b4a733))
-   allow `{delete,insert}().returning()` on MariaDB ([#8673](https://github.com/typeorm/typeorm/issues/8673)) ([7facbab](https://github.com/typeorm/typeorm/commit/7facbabd2663098156a53983ea38433ed39082d2)), closes [#7235](https://github.com/typeorm/typeorm/issues/7235) [#7235](https://github.com/typeorm/typeorm/issues/7235)
-   Implement deferrable foreign keys for SAP HANA ([#6104](https://github.com/typeorm/typeorm/issues/6104)) ([1f54c70](https://github.com/typeorm/typeorm/commit/1f54c70b76de34d4420904b72137df746ea9aaed))

## [0.2.43](https://github.com/typeorm/typeorm/compare/0.2.42...0.2.43) (2022-02-17)

### Bug Fixes

-   support `require` to internal files without explicitly writing `.js` in the path ([#8660](https://github.com/typeorm/typeorm/issues/8660)) ([96aed8a](https://github.com/typeorm/typeorm/commit/96aed8aae06df0ae555aa51ed9f1a5ffec141e61)), closes [#8656](https://github.com/typeorm/typeorm/issues/8656)

### Features

-   embedded entities with entity schema ([#8626](https://github.com/typeorm/typeorm/issues/8626)) ([7dbe956](https://github.com/typeorm/typeorm/commit/7dbe956c56da3a430ae6f0e99730e9449deae889)), closes [#3632](https://github.com/typeorm/typeorm/issues/3632)

### Reverts

-   Revert "feat: soft delete recursive cascade (#8436)" (#8654) ([6b0b15b](https://github.com/typeorm/typeorm/commit/6b0b15b0e68584ed7cd81a658d8606cfdb96817c)), closes [#8436](https://github.com/typeorm/typeorm/issues/8436) [#8654](https://github.com/typeorm/typeorm/issues/8654)

## [0.2.42](https://github.com/typeorm/typeorm/compare/0.2.41...0.2.42) (2022-02-16)

### Bug Fixes

-   proper column comment mapping from database to metadata in aurora-data-api ([baa5880](https://github.com/typeorm/typeorm/commit/baa5880001064333eb4eb01765b1d79e17cf1fb5))
-   add referencedSchema to PostgresQueryRunner ([#8566](https://github.com/typeorm/typeorm/issues/8566)) ([c490319](https://github.com/typeorm/typeorm/commit/c49031929aca8f3b932c6593b75447256085bfef))
-   adding/removing @Generated() will now generate a migration to add/remove the DEFAULT value ([#8274](https://github.com/typeorm/typeorm/issues/8274)) ([4208393](https://github.com/typeorm/typeorm/commit/42083936e2b65f0d1bd8e23d12689a7f49e2da2f)), closes [#5898](https://github.com/typeorm/typeorm/issues/5898)
-   adds entity-schema support for createForeignKeyConstraints ([#8606](https://github.com/typeorm/typeorm/issues/8606)) ([f224f24](https://github.com/typeorm/typeorm/commit/f224f24e5247d3c42385bfc03c89f518aa932310)), closes [#8489](https://github.com/typeorm/typeorm/issues/8489)
-   allow special keyword as column name for simple-enum type on sqlite ([#8645](https://github.com/typeorm/typeorm/issues/8645)) ([93bf96e](https://github.com/typeorm/typeorm/commit/93bf96ea635823c7933ea8ef7326be62ccdd6ea7))
-   correctly handle multiple-row insert for SAP HANA driver ([#7957](https://github.com/typeorm/typeorm/issues/7957)) ([8f2ae71](https://github.com/typeorm/typeorm/commit/8f2ae71201e7738fe3c1efd5bbc4584dfe62dcc0))
-   disable SQLite FK checks in synchronize / migrations ([#7922](https://github.com/typeorm/typeorm/issues/7922)) ([f24822e](https://github.com/typeorm/typeorm/commit/f24822ef9cb3051fbe9f3fd5d9e669788852c5a5))
-   find descendants of a non-existing tree parent ([#8557](https://github.com/typeorm/typeorm/issues/8557)) ([cbb61eb](https://github.com/typeorm/typeorm/commit/cbb61eb08139204479110c88d7d1849a24080d11)), closes [#8556](https://github.com/typeorm/typeorm/issues/8556)
-   For MS SQL Server use lowercase "sys"."columns" reference. ([#8400](https://github.com/typeorm/typeorm/issues/8400)) ([#8401](https://github.com/typeorm/typeorm/issues/8401)) ([e8a0f92](https://github.com/typeorm/typeorm/commit/e8a0f921b4baa7aa7e55ac1fd34c449dfa1e3229))
-   improve DeepPartial type ([#8187](https://github.com/typeorm/typeorm/issues/8187)) ([b93416d](https://github.com/typeorm/typeorm/commit/b93416d7bc25006b34a90c14c497cc7e6e57e28c))
-   Lock peer dependencies versions ([#8597](https://github.com/typeorm/typeorm/issues/8597)) ([600bd4e](https://github.com/typeorm/typeorm/commit/600bd4e5da74b012409d1fdf411a0a0b5265466b))
-   make EntityMetadataValidator comply with entitySkipConstructor, cover with test ([#8445](https://github.com/typeorm/typeorm/issues/8445)) ([3d6c5da](https://github.com/typeorm/typeorm/commit/3d6c5dae76ad0e0640650058ae58fe0addda2ae6)), closes [#8444](https://github.com/typeorm/typeorm/issues/8444)
-   materialized path being computed as "undefined1." ([#8526](https://github.com/typeorm/typeorm/issues/8526)) ([09f54e0](https://github.com/typeorm/typeorm/commit/09f54e0273be4dc836824a38e9c78b50ad21bba6))
-   MongoConnectionOptions sslCA type mismatch ([#8628](https://github.com/typeorm/typeorm/issues/8628)) ([02400da](https://github.com/typeorm/typeorm/commit/02400dab662aceca9a722c4aa0dd74a9fa2cb90d))
-   mongodb repository.find filters soft deleted rows ([#8581](https://github.com/typeorm/typeorm/issues/8581)) ([f7c1f7d](https://github.com/typeorm/typeorm/commit/f7c1f7d7c0481f4ada506e5b811a3219519eadf9)), closes [#7113](https://github.com/typeorm/typeorm/issues/7113)
-   mongodb@4 compatibility support ([#8412](https://github.com/typeorm/typeorm/issues/8412)) ([531013b](https://github.com/typeorm/typeorm/commit/531013b2f8dfb8d04b0bfb844dc83a5ba6404569))
-   must invoke key pragma before any other interaction if SEE setted ([#8478](https://github.com/typeorm/typeorm/issues/8478)) ([546b3ed](https://github.com/typeorm/typeorm/commit/546b3ed8886c44fbe3d9e167d1904cb9e5961df7)), closes [#8475](https://github.com/typeorm/typeorm/issues/8475)
-   nested eager relations in a lazy-loaded entity are not loaded ([#8564](https://github.com/typeorm/typeorm/issues/8564)) ([1cfd7b9](https://github.com/typeorm/typeorm/commit/1cfd7b98ba27032dd0e9429a245c40cea47900f7))
-   QueryFailedError when tree entity with JoinColumn ([#8443](https://github.com/typeorm/typeorm/issues/8443)) ([#8447](https://github.com/typeorm/typeorm/issues/8447)) ([a11c50d](https://github.com/typeorm/typeorm/commit/a11c50d5519bda1410ab9ccf67bfcb12ef109c61))
-   relation id and afterAll hook performance fixes ([#8169](https://github.com/typeorm/typeorm/issues/8169)) ([31f0b55](https://github.com/typeorm/typeorm/commit/31f0b5535aa0cc49ff23610b1924c03432f5461f))
-   replaced custom uuid generator with `uuid` library ([#8642](https://github.com/typeorm/typeorm/issues/8642)) ([8898a71](https://github.com/typeorm/typeorm/commit/8898a7175f481f1c171acefef61dc089bc3f8a8e))
-   single table inheritance returns the same discriminator value error for unrelated tables where their parents extend from the same entity ([#8525](https://github.com/typeorm/typeorm/issues/8525)) ([6523fcc](https://github.com/typeorm/typeorm/commit/6523fccda1147dc697afbba57792e5cb4165fbf2)), closes [#8522](https://github.com/typeorm/typeorm/issues/8522)
-   updating with only `update: false` columns shouldn't trigger @UpdateDateColumn column updation ([2834729](https://github.com/typeorm/typeorm/commit/2834729e80577bd30f09c2c0e4c949cde173bba3)), closes [#8394](https://github.com/typeorm/typeorm/issues/8394) [#8394](https://github.com/typeorm/typeorm/issues/8394) [#8394](https://github.com/typeorm/typeorm/issues/8394)
-   upsert should find unique index created by one-to-one relation ([#8618](https://github.com/typeorm/typeorm/issues/8618)) ([c8c00ba](https://github.com/typeorm/typeorm/commit/c8c00baf9351973be5780687418303dd87de2077))

### Features

-   add comment param to FindOptions ([#8545](https://github.com/typeorm/typeorm/issues/8545)) ([ece0da0](https://github.com/typeorm/typeorm/commit/ece0da027dfce4357764dda4b810598ad64af9d9))
-   add custom timestamp option in migration creation ([#8501](https://github.com/typeorm/typeorm/issues/8501)) ([4a7f242](https://github.com/typeorm/typeorm/commit/4a7f2420f1b498465b2a5913b7d848b3eaafb113)), closes [#8500](https://github.com/typeorm/typeorm/issues/8500) [#8500](https://github.com/typeorm/typeorm/issues/8500)
-   add support for node-redis v4.0.0 and newer ([#8425](https://github.com/typeorm/typeorm/issues/8425)) ([0626ed1](https://github.com/typeorm/typeorm/commit/0626ed1f0bd75fb8e72a462593f33813d85faee8))
-   add support for Postgres 10+ GENERATED ALWAYS AS IDENTITY ([#8371](https://github.com/typeorm/typeorm/issues/8371)) ([a0f09de](https://github.com/typeorm/typeorm/commit/a0f09de8400ac7c94df33f8213ef0eec79b9239d)), closes [#8370](https://github.com/typeorm/typeorm/issues/8370)
-   add WITH (lock) clause for MSSQL select with join queries ([#8507](https://github.com/typeorm/typeorm/issues/8507)) ([3284808](https://github.com/typeorm/typeorm/commit/3284808b63552d81456752187c0d130db76007ed)), closes [#4764](https://github.com/typeorm/typeorm/issues/4764)
-   adds entity-schema support for withoutRowid ([#8432](https://github.com/typeorm/typeorm/issues/8432)) ([bd22dc3](https://github.com/typeorm/typeorm/commit/bd22dc3b8175ef82967b8265a2388ce16cc08623)), closes [#8429](https://github.com/typeorm/typeorm/issues/8429)
-   allow soft-deletion of orphaned relation rows using orphanedRow… ([#8414](https://github.com/typeorm/typeorm/issues/8414)) ([cefddd9](https://github.com/typeorm/typeorm/commit/cefddd95c550191d6a18cb53c8ea4995d0c219ca))
-   custom name for typeorm_metadata table ([#8528](https://github.com/typeorm/typeorm/issues/8528)) ([f8154eb](https://github.com/typeorm/typeorm/commit/f8154eb4c5089a1a0d2c2073f0ea5d64b3252e08)), closes [#7266](https://github.com/typeorm/typeorm/issues/7266)
-   deferrable option for Unique constraints (Postgres) ([#8356](https://github.com/typeorm/typeorm/issues/8356)) ([e52b26c](https://github.com/typeorm/typeorm/commit/e52b26c910047d22aa3ea003b62d11c2bf352249))
-   ESM support ([#8536](https://github.com/typeorm/typeorm/issues/8536)) ([3a694dd](https://github.com/typeorm/typeorm/commit/3a694dd3e99699e7284709c53967a5dfcb1e1806)), closes [#6974](https://github.com/typeorm/typeorm/issues/6974) [#6941](https://github.com/typeorm/typeorm/issues/6941) [#7516](https://github.com/typeorm/typeorm/issues/7516) [#7159](https://github.com/typeorm/typeorm/issues/7159)
-   query builder negating with "NotBrackets" for complex expressions ([#8476](https://github.com/typeorm/typeorm/issues/8476)) ([fe7f328](https://github.com/typeorm/typeorm/commit/fe7f328fd5b918cab2e7301d57c62e81d9ff34f3))
-   separate update events into update, soft-remove, and recover ([#8403](https://github.com/typeorm/typeorm/issues/8403)) ([93383bd](https://github.com/typeorm/typeorm/commit/93383bd2ee6dc8c22a5cfc0021334fe199da81dc)), closes [#8398](https://github.com/typeorm/typeorm/issues/8398)
-   soft delete recursive cascade ([#8436](https://github.com/typeorm/typeorm/issues/8436)) ([d0f32b3](https://github.com/typeorm/typeorm/commit/d0f32b3a17be9ffe9fbc6112e5731bbac91c3691))
-   sqlite attach ([#8396](https://github.com/typeorm/typeorm/issues/8396)) ([9e844d9](https://github.com/typeorm/typeorm/commit/9e844d9ff72fae72578399e24464cd7912c0fe5e))

### Reverts

-   migration:show command must exist with zero status code (Fixes [#7349](https://github.com/typeorm/typeorm/issues/7349)) ([#8185](https://github.com/typeorm/typeorm/issues/8185)) ([e0adeee](https://github.com/typeorm/typeorm/commit/e0adeee48eeb0d5412aa5c0258f7c12e6b1c38ed))

### BREAKING CHANGES

-   update listeners and subscriber no longer triggered by soft-remove and recover

## [0.2.41](https://github.com/typeorm/typeorm/compare/0.2.40...0.2.41) (2021-11-18)

### Bug Fixes

-   add `retryWrites` to `MongoConnectionOptions` ([#8354](https://github.com/typeorm/typeorm/issues/8354)) ([c895680](https://github.com/typeorm/typeorm/commit/c895680dce35f0550f48d92d7dd1a5fb48ab4135)), closes [#7869](https://github.com/typeorm/typeorm/issues/7869)
-   create typeorm_metadata table when running migrations ([#4956](https://github.com/typeorm/typeorm/issues/4956)) ([b2c8168](https://github.com/typeorm/typeorm/commit/b2c8168514b23671080e6d384e381e997fbaa11e))
-   db caching won't work with replication enabled ([#7694](https://github.com/typeorm/typeorm/issues/7694)) ([2d0abe7](https://github.com/typeorm/typeorm/commit/2d0abe7140a0aec40d50c15acd98633483db3e29)), closes [#5919](https://github.com/typeorm/typeorm/issues/5919)
-   incorrect composite `UNIQUE` constraints detection ([#8364](https://github.com/typeorm/typeorm/issues/8364)) ([29cb891](https://github.com/typeorm/typeorm/commit/29cb89123aaf705437927a8c6ed23204422b71cc)), closes [#8158](https://github.com/typeorm/typeorm/issues/8158)
-   Postgres enum generates unnecessary queries on schema sync ([#8268](https://github.com/typeorm/typeorm/issues/8268)) ([98d5f39](https://github.com/typeorm/typeorm/commit/98d5f39e35b6e5dd77ae2aa60f80f4ac98249379))
-   resolve issue delete column null on after update event subscriber ([#8318](https://github.com/typeorm/typeorm/issues/8318)) ([8a5e671](https://github.com/typeorm/typeorm/commit/8a5e6715e2d32da22c2fa71a14a7cf1fe897a159)), closes [#6327](https://github.com/typeorm/typeorm/issues/6327)

### Features

-   export interfaces from schema-builder/options ([#8383](https://github.com/typeorm/typeorm/issues/8383)) ([7b8a1e3](https://github.com/typeorm/typeorm/commit/7b8a1e38f269ba329a153135e12e1a21274b3a18))
-   implement generated columns for postgres 12 driver ([#6469](https://github.com/typeorm/typeorm/issues/6469)) ([91080be](https://github.com/typeorm/typeorm/commit/91080be0cd35a5ee9467d4b50b6b7fb5421ac800))
-   lock modes in cockroachdb ([#8250](https://github.com/typeorm/typeorm/issues/8250)) ([d494fcc](https://github.com/typeorm/typeorm/commit/d494fccc9c6a2d773bcb411ba746a74539373eff)), closes [#8249](https://github.com/typeorm/typeorm/issues/8249)

## [0.2.40](https://github.com/typeorm/typeorm/compare/0.2.39...0.2.40) (2021-11-11)

### Bug Fixes

-   BaseEntity finder methods to properly type-check lazy relations conditions ([#5710](https://github.com/typeorm/typeorm/issues/5710)) ([0665ff5](https://github.com/typeorm/typeorm/commit/0665ff5473d075e442f3a93f665bbe087bdf29de))

### Features

-   add depth limiter optional parameter when loading nested trees using TreeRepository's findTrees() and findDescendantsTree() ([#7926](https://github.com/typeorm/typeorm/issues/7926)) ([0c44629](https://github.com/typeorm/typeorm/commit/0c44629c83c48c27448e7e3cb39faf26994e6e56)), closes [#3909](https://github.com/typeorm/typeorm/issues/3909)
-   add upsert methods for the drivers that support onUpdate ([#8104](https://github.com/typeorm/typeorm/issues/8104)) ([3f98197](https://github.com/typeorm/typeorm/commit/3f981975d4347483937547feaa8fa4f63b81a83c)), closes [#2363](https://github.com/typeorm/typeorm/issues/2363)
-   Postgres IDENTITY Column support ([#7741](https://github.com/typeorm/typeorm/issues/7741)) ([969af95](https://github.com/typeorm/typeorm/commit/969af958ba27282b9594140a7e2d58dba1192830))

### Reverts

-   "feat: use char(36) for uuid representation in mysql ([#7853](https://github.com/typeorm/typeorm/issues/7853))" ([#8343](https://github.com/typeorm/typeorm/issues/8343)) ([1588c58](https://github.com/typeorm/typeorm/commit/1588c58539e5121dad6b7120f0b5f83f43f1532f))
-   regression in ordering by the relation property ([#8346](https://github.com/typeorm/typeorm/issues/8346)) ([#8352](https://github.com/typeorm/typeorm/issues/8352)) ([0334d10](https://github.com/typeorm/typeorm/commit/0334d104d9ce93c8cb079449ce98ffbdc64219c2)), closes [#3736](https://github.com/typeorm/typeorm/issues/3736) [#8118](https://github.com/typeorm/typeorm/issues/8118)

## [0.2.39](https://github.com/typeorm/typeorm/compare/0.2.38...0.2.39) (2021-11-09)

### Bug Fixes

-   attach FOR NO KEY UPDATE lock to query if required ([#8008](https://github.com/typeorm/typeorm/issues/8008)) ([9692930](https://github.com/typeorm/typeorm/commit/96929302a4dc27a19e94c5532a3ae76951e52552)), closes [#7717](https://github.com/typeorm/typeorm/issues/7717)
-   cli should accept absolute paths for --config ([4ad3a61](https://github.com/typeorm/typeorm/commit/4ad3a61037ad9ead998665d2857d6e4725d7b718))
-   create a different cacheId if present for count query in getManyAndCount ([#8283](https://github.com/typeorm/typeorm/issues/8283)) ([9f14e48](https://github.com/typeorm/typeorm/commit/9f14e488281fb08d8ea1a95c6cc363e1234fa307)), closes [#4277](https://github.com/typeorm/typeorm/issues/4277)
-   defaults type cast filtering in Cockroachdb ([#8144](https://github.com/typeorm/typeorm/issues/8144)) ([28c183e](https://github.com/typeorm/typeorm/commit/28c183e9df562e2eb1e3c93afbd1d4687b1b0846)), closes [#7110](https://github.com/typeorm/typeorm/issues/7110) [#7110](https://github.com/typeorm/typeorm/issues/7110)
-   do not generate migration for unchanged enum column ([#8161](https://github.com/typeorm/typeorm/issues/8161)) ([#8164](https://github.com/typeorm/typeorm/issues/8164)) ([4638dea](https://github.com/typeorm/typeorm/commit/4638dea55d0e9239a62fb3143cd96988bf07bc68))
-   NativescriptQueryRunner's query method fails when targeting es2017 ([#8182](https://github.com/typeorm/typeorm/issues/8182)) ([8615733](https://github.com/typeorm/typeorm/commit/861573377bb33b73232399c21b1b3a5c07b58036))
-   OneToManySubjectBuilder bug with multiple primary keys ([#8221](https://github.com/typeorm/typeorm/issues/8221)) ([6558295](https://github.com/typeorm/typeorm/commit/655829592ee10aaa5d28a96691ada0d5510899ea))
-   ordering by joined columns for PostgreSQL ([#3736](https://github.com/typeorm/typeorm/issues/3736)) ([#8118](https://github.com/typeorm/typeorm/issues/8118)) ([1649882](https://github.com/typeorm/typeorm/commit/1649882d335587ac78d2203db3a7ab492a942374))
-   support DeleteResult in SQLiteDriver ([#8237](https://github.com/typeorm/typeorm/issues/8237)) ([b678807](https://github.com/typeorm/typeorm/commit/b6788072c20b5f235df9272625c3d1d7522d27e0))

### Features

-   add `typeorm` command wrapper to package.json in project template ([#8081](https://github.com/typeorm/typeorm/issues/8081)) ([19d4a91](https://github.com/typeorm/typeorm/commit/19d4a914a5da2c28f1eb4ed1c28a52db7dc809d0))
-   add dependency configuraiton for views [#8240](https://github.com/typeorm/typeorm/issues/8240) ([#8261](https://github.com/typeorm/typeorm/issues/8261)) ([2c861af](https://github.com/typeorm/typeorm/commit/2c861afaef839f33b5cf1cc2b3bcf8b6e4a0be4f))
-   add relation options to all tree queries ([#8080](https://github.com/typeorm/typeorm/issues/8080)) ([e4d4636](https://github.com/typeorm/typeorm/commit/e4d46363917db57a9107048b973b6a12be8d61fd)), closes [#8076](https://github.com/typeorm/typeorm/issues/8076)
-   add the ability to pass the driver into all database types ([#8259](https://github.com/typeorm/typeorm/issues/8259)) ([2133ffe](https://github.com/typeorm/typeorm/commit/2133ffea9c678841bf3537838777d9a5fec3a00e))
-   more informative logging in case of migration failure ([#8307](https://github.com/typeorm/typeorm/issues/8307)) ([dc6f1c9](https://github.com/typeorm/typeorm/commit/dc6f1c91be29e88466614eb8b8d21a92659cfd0b))
-   support using custom index with SelectQueryBuilder in MySQL ([#7755](https://github.com/typeorm/typeorm/issues/7755)) ([f79ae58](https://github.com/typeorm/typeorm/commit/f79ae589cd1a658fea553cb57abc2a41a46523f8))

### Reverts

-   Revert "fix: STI types on children in joins (#3160)" (#8309) ([0adad88](https://github.com/typeorm/typeorm/commit/0adad8810e15b8d00259a2635e1c50e85598e1ed)), closes [#3160](https://github.com/typeorm/typeorm/issues/3160) [#8309](https://github.com/typeorm/typeorm/issues/8309)

## [0.2.38](https://github.com/typeorm/typeorm/compare/0.2.37...0.2.38) (2021-10-02)

### Bug Fixes

-   prevent using absolute table path in migrations unless required ([#8038](https://github.com/typeorm/typeorm/issues/8038)) ([e9366b3](https://github.com/typeorm/typeorm/commit/e9366b33ddff296de1254019589b85e40aa53e12))
-   snakecase conversion for strings with numbers ([#8111](https://github.com/typeorm/typeorm/issues/8111)) ([749511d](https://github.com/typeorm/typeorm/commit/749511d981f6b9a1a08113b23e8779a91cda78f8))
-   use full path for table lookups ([#8097](https://github.com/typeorm/typeorm/issues/8097)) ([22676a0](https://github.com/typeorm/typeorm/commit/22676a04c30b3b49a61003320dfad3ecad3791e8))

### Features

-   support QueryRunner.stream with Oracle ([#8086](https://github.com/typeorm/typeorm/issues/8086)) ([b858f84](https://github.com/typeorm/typeorm/commit/b858f84e6fb15f801f2564088428d250d1c59e18))

## [0.2.37](https://github.com/typeorm/typeorm/compare/0.2.36...0.2.37) (2021-08-13)

### Bug Fixes

-   allow periods in parameter identifiers ([#8022](https://github.com/typeorm/typeorm/issues/8022)) ([4201938](https://github.com/typeorm/typeorm/commit/420193892ffe857c532130c0c7b18dcc4c8d38e2))
-   ConnectionManager `connections` property should include list of `Connection`s ([#8004](https://github.com/typeorm/typeorm/issues/8004)) ([2344db6](https://github.com/typeorm/typeorm/commit/2344db60c4314da31885f5686e94bb6dcb203a96))
-   entity value for date columns that are related ([#8027](https://github.com/typeorm/typeorm/issues/8027)) ([5a3767f](https://github.com/typeorm/typeorm/commit/5a3767f58f6ef355b01cf6e92342401a051a369c))
-   handle brackets when only one condition is passed ([#8048](https://github.com/typeorm/typeorm/issues/8048)) ([ab39066](https://github.com/typeorm/typeorm/commit/ab39066f182d357fcc999cd976510c0e2a61d6de))
-   handle enums with multiple apostrophes in MySQL ([#8013](https://github.com/typeorm/typeorm/issues/8013)) ([37c40a6](https://github.com/typeorm/typeorm/commit/37c40a610caecfc3b27b48a87b0e98d715f23395)), closes [#8011](https://github.com/typeorm/typeorm/issues/8011)
-   include all drivers in driverfactory error message ([#8061](https://github.com/typeorm/typeorm/issues/8061)) ([fbd1ef7](https://github.com/typeorm/typeorm/commit/fbd1ef74e84b59ef0b8d99e311f0aced902190e6))
-   resolve not returning soft deleted relations with withDeleted find option ([#8017](https://github.com/typeorm/typeorm/issues/8017)) ([65cbcc7](https://github.com/typeorm/typeorm/commit/65cbcc79bceac4cf8d15dec8c558dcbc9a037220))
-   SAP HANA inserts used incorrect value for returning query ([#8072](https://github.com/typeorm/typeorm/issues/8072)) ([36398db](https://github.com/typeorm/typeorm/commit/36398dbe467274a9ac08a013ed4daaf307ee2de2))
-   some drivers set the wrong database name when defined from url ([#8058](https://github.com/typeorm/typeorm/issues/8058)) ([a3a3284](https://github.com/typeorm/typeorm/commit/a3a32849c04a83adbf775fcf07843a934551dbfb))
-   throw error when not connected in drivers ([#7995](https://github.com/typeorm/typeorm/issues/7995)) ([cd71f62](https://github.com/typeorm/typeorm/commit/cd71f62cb8125d1bbd92b341aa2eea1de0ac3537))

### Features

-   add relations option to tree queries ([#7981](https://github.com/typeorm/typeorm/issues/7981)) ([ca26297](https://github.com/typeorm/typeorm/commit/ca26297484542498b8f622f540ca354360d53ed0)), closes [#7974](https://github.com/typeorm/typeorm/issues/7974) [#4564](https://github.com/typeorm/typeorm/issues/4564)
-   add serviceName option for oracle connections ([#8021](https://github.com/typeorm/typeorm/issues/8021)) ([37bd012](https://github.com/typeorm/typeorm/commit/37bd0124dc81c957b2a036436594ae8c4606eb6c))
-   add support to string array on dropColumns ([#7654](https://github.com/typeorm/typeorm/issues/7654)) ([91d5b2f](https://github.com/typeorm/typeorm/commit/91d5b2fc374c2f7b1545d40ee76577272de21436))
-   support Oracle Implicit Results ([#8050](https://github.com/typeorm/typeorm/issues/8050)) ([fe78bee](https://github.com/typeorm/typeorm/commit/fe78bee3725efef47d5be6f924b9caf13f3299a7))

## [0.2.36](https://github.com/typeorm/typeorm/compare/0.2.35...0.2.36) (2021-07-31)

### Bug Fixes

-   add deprecated `WhereExpression` alias for `WhereExpressionBuilder` ([#7980](https://github.com/typeorm/typeorm/issues/7980)) ([76e7ed9](https://github.com/typeorm/typeorm/commit/76e7ed943779b940212c4e453d97028b5ffed7d0))
-   always generate migrations with template string literals ([#7971](https://github.com/typeorm/typeorm/issues/7971)) ([e9c2af6](https://github.com/typeorm/typeorm/commit/e9c2af610a1c9a632605b71d67b97e048be2e29e))
-   use js rather than ts in all `browser` package manifests ([#7982](https://github.com/typeorm/typeorm/issues/7982)) ([0d90bcd](https://github.com/typeorm/typeorm/commit/0d90bcdc8c77f2080aa200fe9f4f962b7b01c9ee))
-   use nvarchar/ntext during transit for SQLServer queries ([#7933](https://github.com/typeorm/typeorm/issues/7933)) ([62d7976](https://github.com/typeorm/typeorm/commit/62d79762dbfe58219a5673ba4d404fe9f2e40436))

### Features

-   add postgres connection option `applicationName` ([#7989](https://github.com/typeorm/typeorm/issues/7989)) ([d365acc](https://github.com/typeorm/typeorm/commit/d365acca68069d0bd9acea5b45a73d7f4c1f4d8f))

## [0.2.35](https://github.com/typeorm/typeorm/compare/0.2.34...0.2.35) (2021-07-28)

### Bug Fixes

-   `entity` to be `Partial<Entity>` | `undefined` in `UpdateEvent` ([#7783](https://github.com/typeorm/typeorm/issues/7783)) ([f033045](https://github.com/typeorm/typeorm/commit/f033045dd6d1dac4f6f7e528997a2c5f8892d763))
-   actually return a working ReadStream from SQL Server query runner ([#7893](https://github.com/typeorm/typeorm/issues/7893)) ([e80985f](https://github.com/typeorm/typeorm/commit/e80985fabbafcb4f5409d72840c3902e1619b8a6))
-   added version check before dropping materialized views to keep backward compatibility ([#7716](https://github.com/typeorm/typeorm/issues/7716)) ([29f1f86](https://github.com/typeorm/typeorm/commit/29f1f86ae2a2dafd70fd958b1980b9f059f42f7a))
-   allow for string id in mongo.findByIds call ([#7838](https://github.com/typeorm/typeorm/issues/7838)) ([4b45ae1](https://github.com/typeorm/typeorm/commit/4b45ae1e8174cf438f9fca92c635957513bff8f8))
-   better support of relation-based properties in where clauses ([#7805](https://github.com/typeorm/typeorm/issues/7805)) ([3221c50](https://github.com/typeorm/typeorm/commit/3221c50d878505b1b8435b07451ec94cd8d04fce))
-   Buffer in primary columns causes bugs with relations ([#7952](https://github.com/typeorm/typeorm/issues/7952)) ([37e08a7](https://github.com/typeorm/typeorm/commit/37e08a7848a92cd4f98fec8f33f120cee739352f)), closes [#4060](https://github.com/typeorm/typeorm/issues/4060)
-   capacitor does not correctly set journal mode ([#7873](https://github.com/typeorm/typeorm/issues/7873)) ([5f20eb7](https://github.com/typeorm/typeorm/commit/5f20eb791a3c51410d6759548ec11c9a919659ff))
-   Capacitor driver PRAGMA requests failing on Android ([#7728](https://github.com/typeorm/typeorm/issues/7728)) ([9620a26](https://github.com/typeorm/typeorm/commit/9620a26c4eeb34baddce3a841ffd686d82cd87af))
-   condition is optional in SelectQueryBuilder joins ([#7888](https://github.com/typeorm/typeorm/issues/7888)) ([2deaa0e](https://github.com/typeorm/typeorm/commit/2deaa0e948d7b797c0e4d3ccbc3c9c2f0f253caf))
-   correctly handle mongo replica set driver option ([#7908](https://github.com/typeorm/typeorm/issues/7908)) ([9212df4](https://github.com/typeorm/typeorm/commit/9212df45e3899370efdf9ec67f1a6418ce4ac838))
-   correctly load yml in ConnectionOptionsYmlReader ([#7743](https://github.com/typeorm/typeorm/issues/7743)) ([57f9254](https://github.com/typeorm/typeorm/commit/57f9254499ef07500f5e59df20e778ee0f27b9aa))
-   craft oracle connectString as a descriptor with SID ([#7878](https://github.com/typeorm/typeorm/issues/7878)) ([b05d093](https://github.com/typeorm/typeorm/commit/b05d0936ddabae179a42c9c0f67779a6bec3d5b1))
-   delete operation in MongoDB impact all matched documents ([#7811](https://github.com/typeorm/typeorm/issues/7811)) ([0fbae53](https://github.com/typeorm/typeorm/commit/0fbae53bdd83f5da94ac8a468e1506c2852eed02)), closes [#7809](https://github.com/typeorm/typeorm/issues/7809)
-   Do not add NULL/NOT NULL for stored columns ([#7708](https://github.com/typeorm/typeorm/issues/7708)) ([3c33e9f](https://github.com/typeorm/typeorm/commit/3c33e9f54541a12b0d0fd37177c6afebf7a5349f)), closes [#7698](https://github.com/typeorm/typeorm/issues/7698)
-   do OBJECT_ID lookup for column constraint instead of name in mssql ([#7916](https://github.com/typeorm/typeorm/issues/7916)) ([fa8c1b0](https://github.com/typeorm/typeorm/commit/fa8c1b088a9a6a2a1ffaec1b1a681be99cf2db3c))
-   drop pool.autostart from mssql options because it's unused ([#7877](https://github.com/typeorm/typeorm/issues/7877)) ([0d21a4d](https://github.com/typeorm/typeorm/commit/0d21a4d07ec275a295df6f78b85c4814c027258a))
-   drop SAP statement after `prepare` per Hana client docs ([#7748](https://github.com/typeorm/typeorm/issues/7748)) ([8ca05b1](https://github.com/typeorm/typeorm/commit/8ca05b11db3ba083c7395cca09a4aa98c70e3d8f))
-   eager relation respects children relations ([#5685](https://github.com/typeorm/typeorm/issues/5685)) ([e7e887a](https://github.com/typeorm/typeorm/commit/e7e887a582cce66bd21044472f4a5288894650c9))
-   enable returning additional columns with MSSQL ([#7864](https://github.com/typeorm/typeorm/issues/7864)) ([e1db48d](https://github.com/typeorm/typeorm/commit/e1db48d8391728455744c91ea7976a334300f77d))
-   entity object undefined in `afterUpdate` subscriber ([#7724](https://github.com/typeorm/typeorm/issues/7724)) ([d25304d](https://github.com/typeorm/typeorm/commit/d25304d9e319157c6b8999932fb9144a67bd84cf))
-   find operation in MongoDB do not include nullable values from documents ([#7820](https://github.com/typeorm/typeorm/issues/7820)) ([98c13cf](https://github.com/typeorm/typeorm/commit/98c13cf710de83783bc5b5576a64327b26d26262)), closes [#7760](https://github.com/typeorm/typeorm/issues/7760)
-   fix table loading when schemas are used ([3a106a3](https://github.com/typeorm/typeorm/commit/3a106a3cca223dadca58af1244c6dda79c60b43c))
-   foreign keys in SAP were loading from the wrong table ([#7914](https://github.com/typeorm/typeorm/issues/7914)) ([4777a79](https://github.com/typeorm/typeorm/commit/4777a795210c3a93a4171a17dbdce248e25b21da))
-   handle postgres default when tableColumn.default is not string ([#7816](https://github.com/typeorm/typeorm/issues/7816)) ([0463855](https://github.com/typeorm/typeorm/commit/0463855223100028e62f7cb2e84319770f54449e))
-   handle snake case of ABcD which should become a_bc_d ([#7883](https://github.com/typeorm/typeorm/issues/7883)) ([eb680f9](https://github.com/typeorm/typeorm/commit/eb680f99b74c335556d23016264fcf1ea6ce1d6f))
-   improve query for MSSQL to fetch foreign keys and tables ([#7935](https://github.com/typeorm/typeorm/issues/7935)) ([f6af01a](https://github.com/typeorm/typeorm/commit/f6af01ad1b20ce67dc03448f050de3127227758c))
-   make `OracleQueryRunner` createDatabase if-not-exists not fail ([f5a80ef](https://github.com/typeorm/typeorm/commit/f5a80ef3df82120fee8f68e02f320dacbc856607))
-   only pass `data` from SaveOptions during that query ([#7886](https://github.com/typeorm/typeorm/issues/7886)) ([1de2e13](https://github.com/typeorm/typeorm/commit/1de2e13cfe442af99c2cf017f48127e1de3a08d9))
-   oracle cannot support DB in table identifiers ([#7954](https://github.com/typeorm/typeorm/issues/7954)) ([8c60d91](https://github.com/typeorm/typeorm/commit/8c60d917ef5fbfdc11b7c3ad8e2901eba3f9fa4b))
-   pass table to namingstrategy when we can instead of table name ([#7925](https://github.com/typeorm/typeorm/issues/7925)) ([140002d](https://github.com/typeorm/typeorm/commit/140002d1ebc4837071dab83a7bb164a02a7a2732))
-   prevent modification of the FindOptions.relations ([#7887](https://github.com/typeorm/typeorm/issues/7887)) ([a2fcad6](https://github.com/typeorm/typeorm/commit/a2fcad6ef963c3e444765d6a7b4fa1e0e89a72e6))
-   prevent reuse of broken connections in postgres pool ([#7792](https://github.com/typeorm/typeorm/issues/7792)) ([5cf368a](https://github.com/typeorm/typeorm/commit/5cf368a23fa78b9e97dd12b54616f17b8431ffee))
-   prevent transactions in the Cordova driver ([#7771](https://github.com/typeorm/typeorm/issues/7771)) ([fc4133c](https://github.com/typeorm/typeorm/commit/fc4133cf621874c616bf7643c79112b9f68a1e09))
-   properly escape oracle table paths ([#7917](https://github.com/typeorm/typeorm/issues/7917)) ([7e8687c](https://github.com/typeorm/typeorm/commit/7e8687c45283cdb2caffa53ed5ebab527797c3e8))
-   regression when making `join` conditions `undefined`-able ([#7892](https://github.com/typeorm/typeorm/issues/7892)) ([b0c1cc6](https://github.com/typeorm/typeorm/commit/b0c1cc6d6820e93bc7b986d4f18db4020195e170))
-   restored `buildColumnAlias` for backward compatibility ([#7706](https://github.com/typeorm/typeorm/issues/7706)) ([36ceefa](https://github.com/typeorm/typeorm/commit/36ceefa710c0994e054c8e267a1fb1bdf4b25c39))
-   return correct DeleteResult and UpdateResult for mongo ([#7884](https://github.com/typeorm/typeorm/issues/7884)) ([7a646a2](https://github.com/typeorm/typeorm/commit/7a646a212815e6b9c2dda752442075624f9f552d))
-   support fully qualified schema in createSchema ([#7934](https://github.com/typeorm/typeorm/issues/7934)) ([94edd12](https://github.com/typeorm/typeorm/commit/94edd12ca450d4dbcd2e4902e1009fcd27136490))
-   support table names between schemas in oracle ([#7951](https://github.com/typeorm/typeorm/issues/7951)) ([aa45b93](https://github.com/typeorm/typeorm/commit/aa45b935ff33915a86199307c86aabf904d67e28))
-   typing so SelectQueryBuilder.getRawOne may return undefined ([#7863](https://github.com/typeorm/typeorm/issues/7863)) ([36e5a0c](https://github.com/typeorm/typeorm/commit/36e5a0cf09a25dfe98ffa130f35005a8eacc4155)), closes [#7449](https://github.com/typeorm/typeorm/issues/7449)
-   typo prevented us from pulling the schema correctly in some cases ([c7f2db8](https://github.com/typeorm/typeorm/commit/c7f2db8d6999b990308787681a2767e41ad2bdd6))
-   update operation in MongoDB impact all matched documents ([#7803](https://github.com/typeorm/typeorm/issues/7803)) ([052014c](https://github.com/typeorm/typeorm/commit/052014cdba844b1a7867f46606045a494cffc907)), closes [#7788](https://github.com/typeorm/typeorm/issues/7788)
-   use correct query for cross-database mssql identity check ([#7911](https://github.com/typeorm/typeorm/issues/7911)) ([7869fb1](https://github.com/typeorm/typeorm/commit/7869fb143c2b3ec019507a79e80eb2e29c270338))
-   use fully qualified and escaped table names for oracle ([#7857](https://github.com/typeorm/typeorm/issues/7857)) ([2b90725](https://github.com/typeorm/typeorm/commit/2b90725a080c7ea9140464a68c8c8c9475fd73f9)), closes [#7779](https://github.com/typeorm/typeorm/issues/7779)
-   use ObjectLiteral in UpdateEvent rather than `Entity` ([#7910](https://github.com/typeorm/typeorm/issues/7910)) ([78fbc14](https://github.com/typeorm/typeorm/commit/78fbc14b3ee915ce035cb1546c92142eab6a899e))
-   use only table name in constraint naming strategy ([5dc777f](https://github.com/typeorm/typeorm/commit/5dc777f17ec238c3f3303aa9379fe855727220b1))

### Features

-   add `retryWrites` to allowed mongo `extra` options ([#7869](https://github.com/typeorm/typeorm/issues/7869)) ([dcdaaca](https://github.com/typeorm/typeorm/commit/dcdaacacaf122c7579d31a700e93c5357a9e0a16))
-   add capacitor driver options for encryption & version ([#7868](https://github.com/typeorm/typeorm/issues/7868)) ([a2bd94b](https://github.com/typeorm/typeorm/commit/a2bd94b146738a2aa637f52011c1fd5e92ed38e1))
-   add connection option `entitySkipConstructor` ([f43d561](https://github.com/typeorm/typeorm/commit/f43d56110fd41c23d80e32021adf4ade7648ce97))
-   add ObjectLiteral typing to andWhere / orWhere ([#7786](https://github.com/typeorm/typeorm/issues/7786)) ([525381d](https://github.com/typeorm/typeorm/commit/525381d91e15d1d9b9dd7bd36beaac35646ee3b0))
-   add parseTableName to Driver interface ([#7956](https://github.com/typeorm/typeorm/issues/7956)) ([cffbf43](https://github.com/typeorm/typeorm/commit/cffbf43b291e59a45c5b8e3685a1d1153dfeaeb1))
-   add path, database, and schema to Table ([#7913](https://github.com/typeorm/typeorm/issues/7913)) ([444e38b](https://github.com/typeorm/typeorm/commit/444e38bffd7f3ff962282d01bf980a554a94b3fa))
-   add property for database and schema in views ([#7953](https://github.com/typeorm/typeorm/issues/7953)) ([4c5bbd9](https://github.com/typeorm/typeorm/commit/4c5bbd9e1c92219712efaff061d6501c473193dd))
-   add referenced database & schema to TableForeignKey ([fff6b11](https://github.com/typeorm/typeorm/commit/fff6b11cd3c369f9f95c99decba84213847e76e3))
-   add writeConcern option as a possible `extras` for mongodb ([#7801](https://github.com/typeorm/typeorm/issues/7801)) ([90894c7](https://github.com/typeorm/typeorm/commit/90894c7fd39c5237ddb26690082ca4c2443b2fd4))
-   consistent parsing and escaping of table names in QueryRunners ([bd9e767](https://github.com/typeorm/typeorm/commit/bd9e767ffaafe9381630787fa860d0904b8d3e49))
-   implement OracleQueryRunner.hasDatabase ([128b982](https://github.com/typeorm/typeorm/commit/128b9825f2b9fd81c4ee5ba36e554ef86eb64865))
-   make parameter to getTables optional ([#7901](https://github.com/typeorm/typeorm/issues/7901)) ([ba86602](https://github.com/typeorm/typeorm/commit/ba866026ec7d0ce44f68f9b585bc094c82e32dcd))
-   make postgres extensions install optional ([#7725](https://github.com/typeorm/typeorm/issues/7725)) ([92b96a5](https://github.com/typeorm/typeorm/commit/92b96a550512bb218e1c6691e2f5908007d0b6e6)), closes [#7662](https://github.com/typeorm/typeorm/issues/7662)
-   publicly export `Transaction*Event` types ([#7949](https://github.com/typeorm/typeorm/issues/7949)) ([2436a66](https://github.com/typeorm/typeorm/commit/2436a66b499c81e1d2394b19f3b158258f31d899)), closes [/github.com/typeorm/typeorm/blob/master/src/subscriber/EntitySubscriberInterface.ts#L12](https://github.com//github.com/typeorm/typeorm/blob/master/src/subscriber/EntitySubscriberInterface.ts/issues/L12)
-   set `enableArithAbort` for SQLServerDriver ([#7894](https://github.com/typeorm/typeorm/issues/7894)) ([1f64da2](https://github.com/typeorm/typeorm/commit/1f64da2c49b21b678a0f2faf0805dbeb763b0f4a))
-   support absolute path in migration:generate ([#7720](https://github.com/typeorm/typeorm/issues/7720)) ([b690c27](https://github.com/typeorm/typeorm/commit/b690c270cd2e9886329e520cab5ee31eaeae77a4))
-   use char(36) for uuid representation in mysql ([#7853](https://github.com/typeorm/typeorm/issues/7853)) ([063aafa](https://github.com/typeorm/typeorm/commit/063aafa34408dd9b1ed3802bb43be6f772523277))
-   use column length from driver when creating columns ([#7858](https://github.com/typeorm/typeorm/issues/7858)) ([b107ad9](https://github.com/typeorm/typeorm/commit/b107ad95164627b6e959b4e476eb82f3dded972c))

## [0.2.34](https://github.com/typeorm/typeorm/compare/0.2.33...0.2.34) (2021-06-03)

### Bug Fixes

-   restored `buildColumnAlias` for backward compatibility ([#7706](https://github.com/typeorm/typeorm/issues/7706)) ([36ceefa](https://github.com/typeorm/typeorm/commit/36ceefa710c0994e054c8e267a1fb1bdf4b25c39))

## [0.2.33](https://github.com/typeorm/typeorm/compare/0.2.32...0.2.33) (2021-06-01)

### Bug Fixes

-   @Unique constraint is not created with specified name ([beea2e1](https://github.com/typeorm/typeorm/commit/beea2e1e4429d13d7864ebc23aa6e58fa01647ea))
-   `MATERIALIZED VIEW` is treated as a regular `VIEW` which causes issues on sync ([#7592](https://github.com/typeorm/typeorm/issues/7592)) ([f85f436](https://github.com/typeorm/typeorm/commit/f85f436f51fb000cd9959b44e8d7a79bf0cd10ab))
-   added error handler for slave connections in MySQL and AuroraDataApi drivers ([#7641](https://github.com/typeorm/typeorm/issues/7641)) ([882a740](https://github.com/typeorm/typeorm/commit/882a7409e5bd018fad6c04925ff5ccaa7e9e7db2))
-   call listeners for array embeddeds in MongoDB ([#4260](https://github.com/typeorm/typeorm/issues/4260)) ([2dc355b](https://github.com/typeorm/typeorm/commit/2dc355b50179a18fe690924797f5c69f2fe23c1f))
-   closing pool incorrectly works on Postgres ([#7596](https://github.com/typeorm/typeorm/issues/7596)) ([1310c97](https://github.com/typeorm/typeorm/commit/1310c97ff3092b9ff23b2fe83d6b7763beb4316b)), closes [#6958](https://github.com/typeorm/typeorm/issues/6958) [#6958](https://github.com/typeorm/typeorm/issues/6958) [#6958](https://github.com/typeorm/typeorm/issues/6958)
-   column name with empty spaces causes bug in Index/Unique decorators [#7534](https://github.com/typeorm/typeorm/issues/7534) ([a3a6e06](https://github.com/typeorm/typeorm/commit/a3a6e063a37fbe1444ffd0c8b1d93bf3ea90e75d))
-   correctly strip type conversion in postgres for default values ([#7681](https://github.com/typeorm/typeorm/issues/7681)) ([069b8b6](https://github.com/typeorm/typeorm/commit/069b8b6888c389d93ff44ca6ed964fb5913d9840)), closes [#1532](https://github.com/typeorm/typeorm/issues/1532) [#7647](https://github.com/typeorm/typeorm/issues/7647) [#5132](https://github.com/typeorm/typeorm/issues/5132)
-   datetime functions in column "default" leads to unnecessary queries during synchronization ([#7517](https://github.com/typeorm/typeorm/issues/7517)) ([03f3285](https://github.com/typeorm/typeorm/commit/03f328583750ed08272fc1a640adcd13e82f09af)), closes [#3991](https://github.com/typeorm/typeorm/issues/3991) [#3991](https://github.com/typeorm/typeorm/issues/3991) [#2737](https://github.com/typeorm/typeorm/issues/2737) [#2737](https://github.com/typeorm/typeorm/issues/2737) [#6412](https://github.com/typeorm/typeorm/issues/6412) [#4281](https://github.com/typeorm/typeorm/issues/4281) [#4658](https://github.com/typeorm/typeorm/issues/4658) [#3991](https://github.com/typeorm/typeorm/issues/3991) [#2333](https://github.com/typeorm/typeorm/issues/2333) [#7381](https://github.com/typeorm/typeorm/issues/7381) [#4658](https://github.com/typeorm/typeorm/issues/4658) [#3991](https://github.com/typeorm/typeorm/issues/3991) [#3991](https://github.com/typeorm/typeorm/issues/3991) [#3991](https://github.com/typeorm/typeorm/issues/3991) [#3991](https://github.com/typeorm/typeorm/issues/3991)
-   default `schema` defined in entity/connection leads to unnecessary queries during schema sync ([#7575](https://github.com/typeorm/typeorm/issues/7575)) ([7eb0327](https://github.com/typeorm/typeorm/commit/7eb032705912cbf4ee340ed9e49970d0f6e23714)), closes [#7276](https://github.com/typeorm/typeorm/issues/7276) [#7276](https://github.com/typeorm/typeorm/issues/7276)
-   do a deep comparison to see if the default value has changed for `json` types in Postgres ([#7650](https://github.com/typeorm/typeorm/issues/7650)) ([a471c1b](https://github.com/typeorm/typeorm/commit/a471c1b689848e7cd9203dcef5edd192019ea456))
-   Incorrect migration generated when multiple views are updated in a single migration ([#7587](https://github.com/typeorm/typeorm/issues/7587)) ([0b103dd](https://github.com/typeorm/typeorm/commit/0b103dd0347737c91510c7ed4719a289dacf8d3b)), closes [#7586](https://github.com/typeorm/typeorm/issues/7586)
-   issues with custom enum name in Postgres ([#7661](https://github.com/typeorm/typeorm/issues/7661)) ([ad0262a](https://github.com/typeorm/typeorm/commit/ad0262a116e5366b562e70a1bbc60246add78d83)), closes [#7614](https://github.com/typeorm/typeorm/issues/7614) [#7541](https://github.com/typeorm/typeorm/issues/7541) [#7647](https://github.com/typeorm/typeorm/issues/7647) [#6540](https://github.com/typeorm/typeorm/issues/6540)
-   mongodb connectionURL parse options ([#7560](https://github.com/typeorm/typeorm/issues/7560)) ([b2ac41a](https://github.com/typeorm/typeorm/commit/b2ac41a706635aba37b204eaf7ebf52aaee91104))
-   mongodb typings for Cursor ([#7526](https://github.com/typeorm/typeorm/issues/7526)) ([daf3991](https://github.com/typeorm/typeorm/commit/daf399171996d578f0607dd0631647bed59ff212))
-   only first \0 is removed in comments, only first \\ is escaped etc. ([#7532](https://github.com/typeorm/typeorm/issues/7532)) ([36b14cb](https://github.com/typeorm/typeorm/commit/36b14cbd808d73c61c9308d66291cf06e860419a))
-   pass `ManyToMany` `onUpdate` option to foreign key metadata ([#5714](https://github.com/typeorm/typeorm/issues/5714)) ([198d2c5](https://github.com/typeorm/typeorm/commit/198d2c50acab9d0d748194506970415866247da4)), closes [#4980](https://github.com/typeorm/typeorm/issues/4980)
-   Postgres identifier exceeds limit on eager relations ([#7508](https://github.com/typeorm/typeorm/issues/7508)) ([#7509](https://github.com/typeorm/typeorm/issues/7509)) ([e4ec429](https://github.com/typeorm/typeorm/commit/e4ec429fe518c26f4c95175a482bde143d508254))
-   remove `enableExtension` for slave connections in Postgres ([#7693](https://github.com/typeorm/typeorm/issues/7693)) ([620aac9](https://github.com/typeorm/typeorm/commit/620aac9e0f2c089f78c7a055b2fb844a475a7eb5)), closes [#7691](https://github.com/typeorm/typeorm/issues/7691)
-   replaced deprecated `insert` method with `insertOne` for MongoDriver in MigrationExecutor. ([#7594](https://github.com/typeorm/typeorm/issues/7594)) ([83fed60](https://github.com/typeorm/typeorm/commit/83fed60cccc498d1c5776c05a5aa3ad47c50453e))
-   resolve issue when enum that has functions is used in entity ([#7653](https://github.com/typeorm/typeorm/issues/7653)) ([dba327d](https://github.com/typeorm/typeorm/commit/dba327d426f591317f8210302107b95be1a5b420)), closes [#7651](https://github.com/typeorm/typeorm/issues/7651)
-   Silent failure in createDatabase and dropDatabase with Postgres ([#7590](https://github.com/typeorm/typeorm/issues/7590)) ([974d2d4](https://github.com/typeorm/typeorm/commit/974d2d4efb0bdcf57e0522b4da3c94ab2937427b)), closes [#6867](https://github.com/typeorm/typeorm/issues/6867)
-   STI types on children in joins ([#3160](https://github.com/typeorm/typeorm/issues/3160)) ([60a6c5d](https://github.com/typeorm/typeorm/commit/60a6c5d9607e06bfb2ff842d733ff90ce8b279ea))
-   use `host` if `hostReplicaSet` is not provided in MongoDriver ([#7559](https://github.com/typeorm/typeorm/issues/7559)) ([9b6d7bc](https://github.com/typeorm/typeorm/commit/9b6d7bc4189f7741f0f823d65fc5c8ba4fbc2d94))
-   use migrationsTransactionMode while running migration from cli ([#7576](https://github.com/typeorm/typeorm/issues/7576)) ([7953ebb](https://github.com/typeorm/typeorm/commit/7953ebb40f2b685f3d578bcf2be403f61e544205))
-   use most specific matching relation type ([#2967](https://github.com/typeorm/typeorm/issues/2967)) ([ee3c00a](https://github.com/typeorm/typeorm/commit/ee3c00a686f1296bbe3bc3d0b7e1bd29333b358f))

### Features

-   add `orphanedRowAction` option to EntitySchemaRelationOptions ([#7625](https://github.com/typeorm/typeorm/issues/7625)) ([a8eb49a](https://github.com/typeorm/typeorm/commit/a8eb49a3647d601531a6c3cb8404e1941a9d1f9c)), closes [#7417](https://github.com/typeorm/typeorm/issues/7417)
-   add `set` datatype support for aurora-data-api ([#7665](https://github.com/typeorm/typeorm/issues/7665)) ([b6c1836](https://github.com/typeorm/typeorm/commit/b6c18366c3fe294f864ab4cd97c0bfc91e9d1f9d))
-   add support for specifying `ioredis` cache with a URL ([#7689](https://github.com/typeorm/typeorm/issues/7689)) ([e017f9b](https://github.com/typeorm/typeorm/commit/e017f9b4683e12feb485b878ab002c42c1d63ffb)), closes [#7631](https://github.com/typeorm/typeorm/issues/7631)
-   add tree entities update and delete logic ([#7156](https://github.com/typeorm/typeorm/issues/7156)) ([9c8a3fb](https://github.com/typeorm/typeorm/commit/9c8a3fbad7cf737ee514924ed8871a703768fddc)), closes [#7155](https://github.com/typeorm/typeorm/issues/7155)
-   added Capacitor driver ([#7695](https://github.com/typeorm/typeorm/issues/7695)) ([0f7a778](https://github.com/typeorm/typeorm/commit/0f7a7783984c680350dd7560f47b78733a3ff3c5))
-   cache option to ignore errors ([#7630](https://github.com/typeorm/typeorm/issues/7630)) ([5fde0ea](https://github.com/typeorm/typeorm/commit/5fde0ea89fb7c4942d7bbbe21f6bfbbe620347e5)), closes [#926](https://github.com/typeorm/typeorm/issues/926)
-   define class properties for QueryFailedError to allow users to access a typed error ([#7529](https://github.com/typeorm/typeorm/issues/7529)) ([b43dcba](https://github.com/typeorm/typeorm/commit/b43dcba84e5bfa55baa7426a5059448207437f2d))
-   support `MAX_EXECUTION_TIME ` for MySQL driver. ([#7638](https://github.com/typeorm/typeorm/issues/7638)) ([0564c34](https://github.com/typeorm/typeorm/commit/0564c348b9bd779e9f24cbf340ea48b6badc9f7e))

## [0.2.32](https://github.com/typeorm/typeorm/compare/0.2.31...0.2.32) (2021-03-30)

### Bug Fixes

-   aurora-data-api get correct increment primary key for multiple entities inserted ([#7434](https://github.com/typeorm/typeorm/issues/7434)) ([fc8af5f](https://github.com/typeorm/typeorm/commit/fc8af5f5289ea13d3f152efbd0b800917ca0306a)), closes [#7385](https://github.com/typeorm/typeorm/issues/7385)
-   aurora-data-api return number of affected rows in UpdatedResult and DeleteResult ([#7433](https://github.com/typeorm/typeorm/issues/7433)) ([46aba1d](https://github.com/typeorm/typeorm/commit/46aba1d1b947c9b03ba2661367427a818be46324)), closes [#7386](https://github.com/typeorm/typeorm/issues/7386)
-   RelationLoader load with existing queryRunner ([#7471](https://github.com/typeorm/typeorm/issues/7471)) ([2dcb493](https://github.com/typeorm/typeorm/commit/2dcb493d55d95536ba4c2085c8f7af740be9ec72)), closes [#5338](https://github.com/typeorm/typeorm/issues/5338)
-   Array type default value should not generate SQL commands without change ([#7409](https://github.com/typeorm/typeorm/issues/7409)) ([7f06e44](https://github.com/typeorm/typeorm/commit/7f06e447c60846c1aa28f2561b3f77a22e012f9a))
-   correctly get referenceColumn value in `getEntityValueMap` ([#7005](https://github.com/typeorm/typeorm/issues/7005)) ([7fe723b](https://github.com/typeorm/typeorm/commit/7fe723b23b74a4c81608a856a82b8aa85fe1b385)), closes [#7002](https://github.com/typeorm/typeorm/issues/7002)
-   don't transform json(b) column value when computing update changes ([#6929](https://github.com/typeorm/typeorm/issues/6929)) ([6be54d4](https://github.com/typeorm/typeorm/commit/6be54d46ac812487242ceffeda2922aff783b235))
-   empty entity when query with nested relations ([#7450](https://github.com/typeorm/typeorm/issues/7450)) ([9abf727](https://github.com/typeorm/typeorm/commit/9abf727691d98351f49aa523c5ea03ec2b1ac620)), closes [#7041](https://github.com/typeorm/typeorm/issues/7041) [#7041](https://github.com/typeorm/typeorm/issues/7041) [#7041](https://github.com/typeorm/typeorm/issues/7041)
-   fixed all known enum issues ([#7419](https://github.com/typeorm/typeorm/issues/7419)) ([724d80b](https://github.com/typeorm/typeorm/commit/724d80bf1aacedfc139ad09fe5842cad8fdb2893)), closes [#5371](https://github.com/typeorm/typeorm/issues/5371) [#6471](https://github.com/typeorm/typeorm/issues/6471) [#7217](https://github.com/typeorm/typeorm/issues/7217) [#6047](https://github.com/typeorm/typeorm/issues/6047) [#7283](https://github.com/typeorm/typeorm/issues/7283) [#5871](https://github.com/typeorm/typeorm/issues/5871) [#5729](https://github.com/typeorm/typeorm/issues/5729) [#5478](https://github.com/typeorm/typeorm/issues/5478) [#5882](https://github.com/typeorm/typeorm/issues/5882) [#5275](https://github.com/typeorm/typeorm/issues/5275) [#2233](https://github.com/typeorm/typeorm/issues/2233) [#5648](https://github.com/typeorm/typeorm/issues/5648) [#4897](https://github.com/typeorm/typeorm/issues/4897) [#6376](https://github.com/typeorm/typeorm/issues/6376) [#6115](https://github.com/typeorm/typeorm/issues/6115)
-   improve EntityManager.save() return type ([#7391](https://github.com/typeorm/typeorm/issues/7391)) ([66fbfda](https://github.com/typeorm/typeorm/commit/66fbfdaaa6e03114607671103fe0df7ab1d781a8))
-   Only first single quote in comments is escaped ([#7514](https://github.com/typeorm/typeorm/issues/7514)) ([e1e9423](https://github.com/typeorm/typeorm/commit/e1e94236e71c14a4682356ada7774d657eba8936))
-   performance issues of `RelationId`. ([#7318](https://github.com/typeorm/typeorm/issues/7318)) ([01a215a](https://github.com/typeorm/typeorm/commit/01a215a32b47a03af9301c0e6e68f943a24919c4)), closes [#5691](https://github.com/typeorm/typeorm/issues/5691)
-   rename a sequence related to generated primary key when a table is renamed ([#5406](https://github.com/typeorm/typeorm/issues/5406)) ([25b457f](https://github.com/typeorm/typeorm/commit/25b457f7e8d6cdeee146ba60a280f1a65bcec9eb))
-   resolve issue building tree entities with embeded primary column ([#7416](https://github.com/typeorm/typeorm/issues/7416)) ([dc81814](https://github.com/typeorm/typeorm/commit/dc81814056071ee3557043e5e6be06c431314634)), closes [#7415](https://github.com/typeorm/typeorm/issues/7415)
-   wrong migration generation when column default value is set to null [#6950](https://github.com/typeorm/typeorm/issues/6950) ([#7356](https://github.com/typeorm/typeorm/issues/7356)) ([5a3f9ff](https://github.com/typeorm/typeorm/commit/5a3f9ff3d6ff5ec1bf704c836bef5a7529ff7f5a))

### Features

-   add check and dry-run to migration generate ([#7275](https://github.com/typeorm/typeorm/issues/7275)) ([d6df200](https://github.com/typeorm/typeorm/commit/d6df200772604103279502dfc61340475131d4e1)), closes [#3037](https://github.com/typeorm/typeorm/issues/3037) [#6978](https://github.com/typeorm/typeorm/issues/6978)
-   add option for installing package using CLI ([#6889](https://github.com/typeorm/typeorm/issues/6889)) ([3d876c6](https://github.com/typeorm/typeorm/commit/3d876c61fafc815e429c68f4f4e1ab79e47c7b9c))
-   Add support for Access Token Authentication for SQL Server Driver (mssql) ([#7477](https://github.com/typeorm/typeorm/issues/7477)) ([e639772](https://github.com/typeorm/typeorm/commit/e639772e3b5aa5fa2f40fd6cda984b13e4bf9c90))
-   added socketPath support for replicas in MySQL driver ([#7459](https://github.com/typeorm/typeorm/issues/7459)) ([8d7afaf](https://github.com/typeorm/typeorm/commit/8d7afaf78df8974ebbe00219716af8da738a6fe7))
-   allow to pass the given table name as string in RelationDecorators ([#7448](https://github.com/typeorm/typeorm/issues/7448)) ([4dbb10e](https://github.com/typeorm/typeorm/commit/4dbb10e11ff3fdd58fdaac87337aa0d3237002ba))
-   implement "FOR UPDATE OF" for postgres driver ([#7040](https://github.com/typeorm/typeorm/issues/7040)) ([fde9f07](https://github.com/typeorm/typeorm/commit/fde9f0772eef69836ff4d85816cfe4fd6f7028b4))
-   introduced a new configuration option "formatOptions.castParameters" to delegate the prepare/hydrate parameters to the driver which will result in casting the parameters to their respective column type ([#7483](https://github.com/typeorm/typeorm/issues/7483)) ([7793b3f](https://github.com/typeorm/typeorm/commit/7793b3f992d928b4db6bff6a5ad1b4cbe377a167))
-   output Javascript Migrations instead of TypeScript ([#7294](https://github.com/typeorm/typeorm/issues/7294)) ([b97cc4f](https://github.com/typeorm/typeorm/commit/b97cc4ff955de8be39258add958c2885d0bcdfe6))

## [0.2.31](https://github.com/typeorm/typeorm/compare/0.2.30...0.2.31) (2021-02-08)

### Bug Fixes

-   append condition to STI child entity join ([#7339](https://github.com/typeorm/typeorm/issues/7339)) ([68bb82e](https://github.com/typeorm/typeorm/commit/68bb82e5de639ef746f8ddc699e3ee2ca051bdbe))
-   avoid regex lookbehind for compatibility ([#7270](https://github.com/typeorm/typeorm/issues/7270)) ([063d27f](https://github.com/typeorm/typeorm/commit/063d27fe338abf2929e45a8a8d4a0e4f292111c4)), closes [#7026](https://github.com/typeorm/typeorm/issues/7026)
-   cache from ENV - add ioredis support ([#7332](https://github.com/typeorm/typeorm/issues/7332)) ([5e2117c](https://github.com/typeorm/typeorm/commit/5e2117cdffeb31691dbe7fbd8f56e0f9256d1d47))
-   datetime2 rounding in mssql ([#7264](https://github.com/typeorm/typeorm/issues/7264)) ([4711a71](https://github.com/typeorm/typeorm/commit/4711a7189b4a852a467fa83f26f9827b3249aba4)), closes [#3202](https://github.com/typeorm/typeorm/issues/3202)
-   escape columns in InsertQueryBuilder.orUpdate ([#6316](https://github.com/typeorm/typeorm/issues/6316)) ([ab56e07](https://github.com/typeorm/typeorm/commit/ab56e07de162771b0a42bc4074f089ca6f52cd2b))
-   incorrect postgres uuid type in PrimaryGeneratedColumnType ([#7298](https://github.com/typeorm/typeorm/issues/7298)) ([2758502](https://github.com/typeorm/typeorm/commit/2758502c83a9e8f8c6b18e19530366f45073755f))
-   MariaDB VIRTUAL + [NOT NULL|NULL] error ([#7022](https://github.com/typeorm/typeorm/issues/7022)) ([82f2b75](https://github.com/typeorm/typeorm/commit/82f2b75013e50c9cce9468f03e886639d4943a9a)), closes [#2691](https://github.com/typeorm/typeorm/issues/2691)
-   reject nullable primary key columns ([#7001](https://github.com/typeorm/typeorm/issues/7001)) ([cdace6e](https://github.com/typeorm/typeorm/commit/cdace6e5fa09e823bddd3f076c318ce1903d48dc))
-   resolve issue with find with relations returns soft-deleted entities ([#7296](https://github.com/typeorm/typeorm/issues/7296)) ([d7cb338](https://github.com/typeorm/typeorm/commit/d7cb338145f2c3e009c4934a2aa882df74bc7dc8)), closes [#6265](https://github.com/typeorm/typeorm/issues/6265)
-   save does not return id, save does not return generated ([#7336](https://github.com/typeorm/typeorm/issues/7336)) ([01a6aee](https://github.com/typeorm/typeorm/commit/01a6aee75edfc3d74ce0f6626258360458960363))

### Features

-   enable explicitly inserting IDENTITY values into mssql ([#6199](https://github.com/typeorm/typeorm/issues/6199)) ([4abbd46](https://github.com/typeorm/typeorm/commit/4abbd46af347ff7d1b38f073715155b186437512)), closes [#2199](https://github.com/typeorm/typeorm/issues/2199)
-   export all errors ([#7006](https://github.com/typeorm/typeorm/issues/7006)) ([56300d8](https://github.com/typeorm/typeorm/commit/56300d810e3e6c200a933261c2b78f442751b842))
-   option to disable foreign keys creation ([#7277](https://github.com/typeorm/typeorm/issues/7277)) ([cb17b95](https://github.com/typeorm/typeorm/commit/cb17b959e5ab6170df8b3fcac115521516b77848)), closes [#3120](https://github.com/typeorm/typeorm/issues/3120) [#3120](https://github.com/typeorm/typeorm/issues/3120)
-   support maxdecimaldigits option by geometry type ([#7166](https://github.com/typeorm/typeorm/issues/7166)) ([d749008](https://github.com/typeorm/typeorm/commit/d74900830729c8b9b32226d42d304576e573c744))
-   useUTC connection option for oracle and postgres ([#7295](https://github.com/typeorm/typeorm/issues/7295)) ([e06a442](https://github.com/typeorm/typeorm/commit/e06a4423c83ae78a771cc239ee1135e70c98c899))

### BREAKING CHANGES

-   passing `ColumnOptions` to `@PrimaryColumn` does not function anymore. One must use `PrimaryColumnOptions` instead.
-   minor breaking change on "conflict\*" options - column names used are now automatically escaped.

## [0.2.30](https://github.com/typeorm/typeorm/compare/0.2.29...0.2.30) (2021-01-12)

### Bug Fixes

-   add missing "comment" field to QB clone method ([#7205](https://github.com/typeorm/typeorm/issues/7205)) ([f019771](https://github.com/typeorm/typeorm/commit/f0197710ab986b474ce0b6c260d57e8234a5bb4f)), closes [#7203](https://github.com/typeorm/typeorm/issues/7203)
-   avoid early release of PostgresQueryRunner ([#7109](https://github.com/typeorm/typeorm/issues/7109)) ([#7185](https://github.com/typeorm/typeorm/issues/7185)) ([9abe007](https://github.com/typeorm/typeorm/commit/9abe0076f65afba9034fb48ba3ebd43be7e7557a))
-   Error when sorting by an embedded entity while using join and skip/take ([#7082](https://github.com/typeorm/typeorm/issues/7082)) ([d27dd2a](https://github.com/typeorm/typeorm/commit/d27dd2af2ca320e74a17b3ab273cd3bf55d01923)), closes [#7079](https://github.com/typeorm/typeorm/issues/7079)
-   Fix CLI query command TypeError ([#7043](https://github.com/typeorm/typeorm/issues/7043)) ([b35397e](https://github.com/typeorm/typeorm/commit/b35397ea07982a21d3b263cb0b7c04d5aa057d1a))
-   get length attribute of postgres array columns ([#7239](https://github.com/typeorm/typeorm/issues/7239)) ([eb82f78](https://github.com/typeorm/typeorm/commit/eb82f786cbe3244351d5860289dace3169cf473b)), closes [#6990](https://github.com/typeorm/typeorm/issues/6990)
-   handle overlapping property / database names in querybuilder ([#7042](https://github.com/typeorm/typeorm/issues/7042)) ([b518fa1](https://github.com/typeorm/typeorm/commit/b518fa15f9b2183545b3c0daa2447ecd38ecc859)), closes [#7030](https://github.com/typeorm/typeorm/issues/7030)
-   improve stack traces when using persist executor ([#7218](https://github.com/typeorm/typeorm/issues/7218)) ([0dfe5b8](https://github.com/typeorm/typeorm/commit/0dfe5b83f584c3960cdef28e53d2f0ded3f829ce))
-   order should allow only model fields, not methods ([#7188](https://github.com/typeorm/typeorm/issues/7188)) ([0194193](https://github.com/typeorm/typeorm/commit/01941937df11abd63fad9da082e1b5cf6a1300ce)), closes [#7178](https://github.com/typeorm/typeorm/issues/7178)
-   resolve migration for UpdateDateColumn without ON UPDATE clause ([#7057](https://github.com/typeorm/typeorm/issues/7057)) ([ddd8cbc](https://github.com/typeorm/typeorm/commit/ddd8cbcdf6d67b6b1425de581c3da5d264a01167)), closes [#6995](https://github.com/typeorm/typeorm/issues/6995)
-   resolves Postgres sequence identifier length error ([#7115](https://github.com/typeorm/typeorm/issues/7115)) ([568ef35](https://github.com/typeorm/typeorm/commit/568ef3546e6da6e73f68437fff418901d6232c51)), closes [#7106](https://github.com/typeorm/typeorm/issues/7106)
-   return 'null' (instead of 'undefined') on lazy relations that have no results ([#7146](https://github.com/typeorm/typeorm/issues/7146)) ([#7147](https://github.com/typeorm/typeorm/issues/7147)) ([9b278c9](https://github.com/typeorm/typeorm/commit/9b278c99e52bbcdf0d36ece29168785ee8641687))
-   support MongoDB DNS seed list connection ([#7136](https://github.com/typeorm/typeorm/issues/7136)) ([f730bb9](https://github.com/typeorm/typeorm/commit/f730bb9fc1908a65edacc07e5e364648efb48768)), closes [#3347](https://github.com/typeorm/typeorm/issues/3347) [#3133](https://github.com/typeorm/typeorm/issues/3133)
-   **data-api:** Fixed how data api driver uses and reuses a client ([#6869](https://github.com/typeorm/typeorm/issues/6869)) ([6ce65fb](https://github.com/typeorm/typeorm/commit/6ce65fbf6be5e696c3ae907d3f8e63b1e7332a1e))
-   use default import of yargs for --help ([#6986](https://github.com/typeorm/typeorm/issues/6986)) ([6ef8ffe](https://github.com/typeorm/typeorm/commit/6ef8ffe387980c51f9f20e9cc03d6199c7068ac5))

### Features

-   add NOWAIT and SKIP LOCKED lock support for MySQL ([#7236](https://github.com/typeorm/typeorm/issues/7236)) ([9407507](https://github.com/typeorm/typeorm/commit/9407507a742a3fe0ea2a836417d6851cad72e74c)), closes [#6530](https://github.com/typeorm/typeorm/issues/6530)
-   closure table custom naming ([#7120](https://github.com/typeorm/typeorm/issues/7120)) ([bcd998b](https://github.com/typeorm/typeorm/commit/bcd998b4f384893679e60914d3c52b3d68e7792e))
-   JavaScript file migrations output ([#7253](https://github.com/typeorm/typeorm/issues/7253)) ([ce9cb87](https://github.com/typeorm/typeorm/commit/ce9cb8732cb70458f29c0976d980d34b0f4fa3d7))
-   relations: Orphaned row action ([#7105](https://github.com/typeorm/typeorm/issues/7105)) ([efc2837](https://github.com/typeorm/typeorm/commit/efc283769ed972d022980e681e294d695087a807))

## [0.2.29](https://github.com/typeorm/typeorm/compare/0.2.28...0.2.29) (2020-11-02)

### Bug Fixes

-   allow falsey discriminator values ([#6973](https://github.com/typeorm/typeorm/issues/6973)) ([f3ba242](https://github.com/typeorm/typeorm/commit/f3ba2420396341ad3b808ea8540ea6a2272ff916)), closes [#3891](https://github.com/typeorm/typeorm/issues/3891)
-   allow for complex jsonb primary key columns ([#6834](https://github.com/typeorm/typeorm/issues/6834)) ([f95e9d8](https://github.com/typeorm/typeorm/commit/f95e9d8f9a6c7a1117564b3e3f65b5294f8d5ff5)), closes [#6833](https://github.com/typeorm/typeorm/issues/6833)
-   Allows valid non-object JSON to be retrieved in simple-json columns ([#6574](https://github.com/typeorm/typeorm/issues/6574)) ([0aedf43](https://github.com/typeorm/typeorm/commit/0aedf43874a6f950614134967bf4b173e4513ba0)), closes [#5501](https://github.com/typeorm/typeorm/issues/5501)
-   Cannot read property 'hasMetadata' of undefined ([#5659](https://github.com/typeorm/typeorm/issues/5659)) ([0280cdc](https://github.com/typeorm/typeorm/commit/0280cdc451c35ef73c830eb1191c95d34f6ce06e)), closes [#3685](https://github.com/typeorm/typeorm/issues/3685)
-   check if the connection is closed before executing a query. This prevents SQLITE_MISUSE errors (https://sqlite.org/rescode.html#misuse) originating from sqlite itself ([#6975](https://github.com/typeorm/typeorm/issues/6975)) ([5f6bbec](https://github.com/typeorm/typeorm/commit/5f6bbecd6166f1e80ed87d7e6c2c181fe463bdef))
-   check mysql constraint schema on join ([#6851](https://github.com/typeorm/typeorm/issues/6851)) ([d2b914d](https://github.com/typeorm/typeorm/commit/d2b914da6a425d47916c72ac50bfa69bea4847fb)), closes [#6169](https://github.com/typeorm/typeorm/issues/6169) [#6169](https://github.com/typeorm/typeorm/issues/6169)
-   correct reading of custom ormconfig.env files ([#6922](https://github.com/typeorm/typeorm/issues/6922)) ([a09fb7f](https://github.com/typeorm/typeorm/commit/a09fb7fb919e7ebb1c174ba4b0abe09b245e0442))
-   explicitly define `query` command's param ([#6899](https://github.com/typeorm/typeorm/issues/6899)) ([4475d80](https://github.com/typeorm/typeorm/commit/4475d8067592b91b857f2b456dc31c5850a21081)), closes [#6896](https://github.com/typeorm/typeorm/issues/6896)
-   findRoots should get the defined primary key column ([#6982](https://github.com/typeorm/typeorm/issues/6982)) ([f2ba901](https://github.com/typeorm/typeorm/commit/f2ba9012fe4e851bc667dfdfedc3fd4af665d52b)), closes [#6948](https://github.com/typeorm/typeorm/issues/6948) [#6948](https://github.com/typeorm/typeorm/issues/6948)
-   Fix Mongodb delete by ObjectId. Closes [#6552](https://github.com/typeorm/typeorm/issues/6552) ([#6553](https://github.com/typeorm/typeorm/issues/6553)) ([e37eb1e](https://github.com/typeorm/typeorm/commit/e37eb1e8e8544f91c3d0a44b55322966e121b3af))
-   fixes the typescript errors in EntityCreateCommand & SubscriberCreateCommand ([#6824](https://github.com/typeorm/typeorm/issues/6824)) ([0221a93](https://github.com/typeorm/typeorm/commit/0221a933d19125cc0703a7fdd2a243b494ac5e72))
-   handle count multiple PK & edge cases more gracefully ([#6870](https://github.com/typeorm/typeorm/issues/6870)) ([4abfb34](https://github.com/typeorm/typeorm/commit/4abfb342aa390ab4643a1133daaf90c0996b61c2)), closes [#5989](https://github.com/typeorm/typeorm/issues/5989) [#5314](https://github.com/typeorm/typeorm/issues/5314) [#4550](https://github.com/typeorm/typeorm/issues/4550)
-   Handle undefined querysets in QueryCommand ([#6910](https://github.com/typeorm/typeorm/issues/6910)) ([6f285dc](https://github.com/typeorm/typeorm/commit/6f285dce1ac315707fe01a892c1c74521a98aae2)), closes [#6612](https://github.com/typeorm/typeorm/issues/6612)
-   handle Undefined values in driver URL options ([#6925](https://github.com/typeorm/typeorm/issues/6925)) ([6fa2df5](https://github.com/typeorm/typeorm/commit/6fa2df5ade71a3fee550e3c8fb7bcd7cd02080a8))
-   ILike operator generally available for any driver ([#6945](https://github.com/typeorm/typeorm/issues/6945)) ([37f0d8f](https://github.com/typeorm/typeorm/commit/37f0d8f7938ee5dbcf899a7f2855ea6dc6dc604e))
-   Only check for discriminator conflicts on STI entities ([#2985](https://github.com/typeorm/typeorm/issues/2985)) ([06903d1](https://github.com/typeorm/typeorm/commit/06903d1c914e8082620dbf16551caa302862d328)), closes [#2984](https://github.com/typeorm/typeorm/issues/2984)
-   postgresql connection URL can use an UNIX Socket ([#2614](https://github.com/typeorm/typeorm/issues/2614)) ([#6042](https://github.com/typeorm/typeorm/issues/6042)) ([21c4166](https://github.com/typeorm/typeorm/commit/21c41663ccecfa5f2d94f94424f1a9a53e5d817c))
-   prevent create-type commands edge-case TypeErrors ([#6836](https://github.com/typeorm/typeorm/issues/6836)) ([08ec0a8](https://github.com/typeorm/typeorm/commit/08ec0a8ed922225ff529790ad5ff19c0e463954e)), closes [#6831](https://github.com/typeorm/typeorm/issues/6831)
-   redundant migration with decimal default ([#6879](https://github.com/typeorm/typeorm/issues/6879)) ([6ff67f7](https://github.com/typeorm/typeorm/commit/6ff67f71fa7ad2bcf8a89c01ead7f54386e35f3a)), closes [#6140](https://github.com/typeorm/typeorm/issues/6140) [#5407](https://github.com/typeorm/typeorm/issues/5407)
-   remove @DiscriminatorValue from error message ([#5256](https://github.com/typeorm/typeorm/issues/5256)) ([2bf15ca](https://github.com/typeorm/typeorm/commit/2bf15ca913016ad07080c38c9fc3ee848b60ca4f)), closes [#5255](https://github.com/typeorm/typeorm/issues/5255)
-   resolves issue proto-less object validation ([#6884](https://github.com/typeorm/typeorm/issues/6884)) ([e08d9c6](https://github.com/typeorm/typeorm/commit/e08d9c61aab72f16ecd8bd790cb32bf0d164a5af)), closes [#2065](https://github.com/typeorm/typeorm/issues/2065)
-   return null for nullable RelationId() column ([#6848](https://github.com/typeorm/typeorm/issues/6848)) ([7147a0d](https://github.com/typeorm/typeorm/commit/7147a0dbe7f2622a21c51edefa3b921f42e04b49)), closes [#6815](https://github.com/typeorm/typeorm/issues/6815)
-   subscribers should use the subscribersDir ([5ef9450](https://github.com/typeorm/typeorm/commit/5ef94509b89f11f8337e18046c3f9d9632d234df))
-   support changing comments in MySQL columns ([#6903](https://github.com/typeorm/typeorm/issues/6903)) ([c5143aa](https://github.com/typeorm/typeorm/commit/c5143aab08a04e96aebb55996ed7683d48542bbd))
-   support combination of many-to-one/cacade/composte PK ([#6417](https://github.com/typeorm/typeorm/issues/6417)) ([9a0497b](https://github.com/typeorm/typeorm/commit/9a0497b533b2f6896b8e7d189b36dd3892e58007))
-   support empty `IN` clause across all dialects ([#6887](https://github.com/typeorm/typeorm/issues/6887)) ([9635080](https://github.com/typeorm/typeorm/commit/96350805fb9f02b8fb2c90b5528a15d5cdb9faeb)), closes [#4865](https://github.com/typeorm/typeorm/issues/4865) [#2195](https://github.com/typeorm/typeorm/issues/2195)
-   support multiple row insert on oracle ([#6927](https://github.com/typeorm/typeorm/issues/6927)) ([a5eb946](https://github.com/typeorm/typeorm/commit/a5eb946117a18d94c0157188b6a39542c8d50756)), closes [#2434](https://github.com/typeorm/typeorm/issues/2434)
-   sync the typeorm-model-shim ([#6891](https://github.com/typeorm/typeorm/issues/6891)) ([c72e48b](https://github.com/typeorm/typeorm/commit/c72e48b9c7b893f8a2483ba1ddaa7ded039fe349)), closes [#6288](https://github.com/typeorm/typeorm/issues/6288) [#5920](https://github.com/typeorm/typeorm/issues/5920)
-   TreeRepository based entities primary column supports custom name. ([#6942](https://github.com/typeorm/typeorm/issues/6942)) ([7ec1b75](https://github.com/typeorm/typeorm/commit/7ec1b75f12832e4d99e1ed0cef40755f2b6d650a))
-   use `require` in `ReactNativeDriver` ([#6814](https://github.com/typeorm/typeorm/issues/6814)) ([1a6383c](https://github.com/typeorm/typeorm/commit/1a6383cecd74ee90388db313a74432f7ba12cfdf)), closes [#6811](https://github.com/typeorm/typeorm/issues/6811)
-   use correct type for MongoQueryRunner.databaseConnection ([#6906](https://github.com/typeorm/typeorm/issues/6906)) ([da70b40](https://github.com/typeorm/typeorm/commit/da70b405498b142ecc29f7ff01e7a37f88227360)), closes [#6453](https://github.com/typeorm/typeorm/issues/6453)
-   use pg ^8 in `init` command ([6ed9906](https://github.com/typeorm/typeorm/commit/6ed990666604ca9b8c0029d4fe972a039ef28570))
-   wrong FK loaded in multi-database environment ([#6828](https://github.com/typeorm/typeorm/issues/6828)) ([c060f95](https://github.com/typeorm/typeorm/commit/c060f95db0e261b02c4b28b19541cabcb1ac4a75)), closes [#6168](https://github.com/typeorm/typeorm/issues/6168)

### Features

-   add ability for escaping for Raw() find operator ([#6850](https://github.com/typeorm/typeorm/issues/6850)) ([91b85bf](https://github.com/typeorm/typeorm/commit/91b85bfe6e73ff93db2684a13935b9bd6a9abcfd))
-   add absolute path support to other CLI commands ([#6807](https://github.com/typeorm/typeorm/issues/6807)) ([d9a76e9](https://github.com/typeorm/typeorm/commit/d9a76e91bed06037ff28ec132893f40c09004438))
-   Add SelectQueryBuilder.getOneOrFail() ([#6885](https://github.com/typeorm/typeorm/issues/6885)) ([920e781](https://github.com/typeorm/typeorm/commit/920e7812cd9d405df921f9ae9ce52ba0a9743bea)), closes [#6246](https://github.com/typeorm/typeorm/issues/6246)
-   backport ilike from next ([#6862](https://github.com/typeorm/typeorm/issues/6862)) ([c8bf81e](https://github.com/typeorm/typeorm/commit/c8bf81ed2d47ba0822f8d6267ae1997180db2e31))
-   Exit with code 1 on empty migration:generate ([#6978](https://github.com/typeorm/typeorm/issues/6978)) ([8244ea1](https://github.com/typeorm/typeorm/commit/8244ea1371d5cf37e3f80e1b141f5945af38cb5e))
-   schema synchronization for partitioned tables with PostgreSQL 12+ ([#6780](https://github.com/typeorm/typeorm/issues/6780)) ([990442e](https://github.com/typeorm/typeorm/commit/990442e891e91cd829f9f34eff2114d4c623d24b))
-   support `autoEncryption` option for MongoDB ([#6865](https://github.com/typeorm/typeorm/issues/6865)) ([b22c27f](https://github.com/typeorm/typeorm/commit/b22c27feb2dd3892d47a9e82b0d7b11650d059b5))
-   Support column comments in Postgres and CockroachDB ([#6902](https://github.com/typeorm/typeorm/issues/6902)) ([bc623a4](https://github.com/typeorm/typeorm/commit/bc623a42a868eae7c988779abc4cdc0bbf775def)), closes [#3360](https://github.com/typeorm/typeorm/issues/3360)
-   support ESM in ormconfig js & ts ([#6853](https://github.com/typeorm/typeorm/issues/6853)) ([7ebca2b](https://github.com/typeorm/typeorm/commit/7ebca2b9b1fd21e546b3a345a069637d6aab4b3e)), closes [#5003](https://github.com/typeorm/typeorm/issues/5003)
-   support query comments in the query builder ([#6892](https://github.com/typeorm/typeorm/issues/6892)) ([84c18a9](https://github.com/typeorm/typeorm/commit/84c18a9cab2e87b28eb046b5688bfca4d3ce9da6)), closes [#3643](https://github.com/typeorm/typeorm/issues/3643)
-   transactional events in subscriber interface + "transaction" option in FindOptions ([#6996](https://github.com/typeorm/typeorm/issues/6996)) ([0e4b239](https://github.com/typeorm/typeorm/commit/0e4b2397a6e62f5f2c35e5890bba53abe40a49ac))

### Performance Improvements

-   Improve MySQL LoadTables Performance ([#6886](https://github.com/typeorm/typeorm/issues/6886)) ([0f0e0b6](https://github.com/typeorm/typeorm/commit/0f0e0b660c83409bb59f806b9f6e099ca8dbc61c)), closes [#6800](https://github.com/typeorm/typeorm/issues/6800)
-   Improve replacePropertyNames ([#4760](https://github.com/typeorm/typeorm/issues/4760)) ([d86671c](https://github.com/typeorm/typeorm/commit/d86671cb179751730d0324b23d9f4bcb21010728))

## [0.2.28](https://github.com/typeorm/typeorm/compare/0.2.27...0.2.28) (2020-09-30)

### Bug Fixes

-   FindManyOptions order in parameter typing is important ([51608ae](https://github.com/typeorm/typeorm/commit/51608aebccd31570fc33ba0cd90c3147cdfc70b8))
-   lock Typescript to 3.6.0 ([#6810](https://github.com/typeorm/typeorm/issues/6810)) ([7f7e4d5](https://github.com/typeorm/typeorm/commit/7f7e4d53119506bdbb86999606707cd740859fe7)), closes [#6809](https://github.com/typeorm/typeorm/issues/6809) [#6805](https://github.com/typeorm/typeorm/issues/6805)

## [0.2.27](https://github.com/typeorm/typeorm/compare/0.2.26...0.2.27) (2020-09-29)

### Bug Fixes

-   add dummy for FileLogger, ConnectionOptionsReaders, and update gulpfile ([#6763](https://github.com/typeorm/typeorm/issues/6763)) ([180fbd4](https://github.com/typeorm/typeorm/commit/180fbd415da80ce383b426f6d38486aa3826296d))
-   backport FindOperator return types ([#6717](https://github.com/typeorm/typeorm/issues/6717)) ([2b37808](https://github.com/typeorm/typeorm/commit/2b3780836f5fd737fdc58fe4e0eb2ea4200cae66))
-   coerce port to number in ConnectionOptionsEnvReader ([#6786](https://github.com/typeorm/typeorm/issues/6786)) ([55fbb69](https://github.com/typeorm/typeorm/commit/55fbb696c6c2324a67a08061322dc5726844b7d1)), closes [#6781](https://github.com/typeorm/typeorm/issues/6781)
-   count() method for multiple primary keys for cockroachdb ([#6745](https://github.com/typeorm/typeorm/issues/6745)) ([dfe8259](https://github.com/typeorm/typeorm/commit/dfe8259ef53a432f1c02607e6ffee662dd4fd8a9))
-   enforce name argument of migration generate command ([#2719](https://github.com/typeorm/typeorm/issues/2719)) ([#6690](https://github.com/typeorm/typeorm/issues/6690)) ([dfcb2db](https://github.com/typeorm/typeorm/commit/dfcb2db216d6ed33946dfa190e19eb14c0fed390)), closes [#4798](https://github.com/typeorm/typeorm/issues/4798) [#4805](https://github.com/typeorm/typeorm/issues/4805) [#4798](https://github.com/typeorm/typeorm/issues/4798) [#4805](https://github.com/typeorm/typeorm/issues/4805)
-   ensure browser builds don't include any non-browser modules ([#6743](https://github.com/typeorm/typeorm/issues/6743)) ([c714867](https://github.com/typeorm/typeorm/commit/c714867d3d0c43ccbb7ca8fb3ce969207e4d5c04)), closes [#6739](https://github.com/typeorm/typeorm/issues/6739)
-   hdb-pool is not namespaced under [@sap](https://github.com/sap) ([#6700](https://github.com/typeorm/typeorm/issues/6700)) ([9583430](https://github.com/typeorm/typeorm/commit/9583430e8282d1ad758724957971a5d5d9664f63)), closes [#6697](https://github.com/typeorm/typeorm/issues/6697)
-   migration:generate issue with onUpdate using mariadb 10.4 ([#6714](https://github.com/typeorm/typeorm/issues/6714)) ([6e28322](https://github.com/typeorm/typeorm/commit/6e28322ca65ba739bf0d767075016bc0cae7a48c))
-   prevent multiple `release` listeners in PostgresQueryRunner ([#6708](https://github.com/typeorm/typeorm/issues/6708)) ([208cf6b](https://github.com/typeorm/typeorm/commit/208cf6b0511a2d565c7999837497bb6cf8f8e7c7)), closes [#6699](https://github.com/typeorm/typeorm/issues/6699)
-   prevent wrong returned entity in ReturningResultsEntityUpdator ([#6440](https://github.com/typeorm/typeorm/issues/6440)) ([c1c8e88](https://github.com/typeorm/typeorm/commit/c1c8e88f8945bf6a03bde728de370f5c61c5bdb8))
-   resolve issues ora-00972:identifier is too long ([#6751](https://github.com/typeorm/typeorm/issues/6751)) ([b55a417](https://github.com/typeorm/typeorm/commit/b55a417ea4852ad2e66091cfa800534f7ccdd3c9)), closes [#5067](https://github.com/typeorm/typeorm/issues/5067) [#5067](https://github.com/typeorm/typeorm/issues/5067)
-   sql.js v1.2+ don't support undefined parameters ([#6698](https://github.com/typeorm/typeorm/issues/6698)) ([ea59b8d](https://github.com/typeorm/typeorm/commit/ea59b8d46b2a36ac251f43c8a8fb98ff15ab4e2d)), closes [#5720](https://github.com/typeorm/typeorm/issues/5720)

### Features

-   add option to pass postgres server notices to client logger ([#6215](https://github.com/typeorm/typeorm/issues/6215)) ([5084e47](https://github.com/typeorm/typeorm/commit/5084e47be4fd42316ad47e6102645534fae45d9f)), closes [#2216](https://github.com/typeorm/typeorm/issues/2216)
-   backport SQLite Busy handler & WAL mode enable ([#6588](https://github.com/typeorm/typeorm/issues/6588)) ([7a52f18](https://github.com/typeorm/typeorm/commit/7a52f18c86613292c3503484eac332f59141a6e3))
-   Beautify generated SQL for migrations ([#6685](https://github.com/typeorm/typeorm/issues/6685)) ([370442c](https://github.com/typeorm/typeorm/commit/370442c27a0aecd67eeb44f6077922dda16bcef8)), closes [#4415](https://github.com/typeorm/typeorm/issues/4415)
-   create EntityTarget and use instead of EntitySchema / ObjectType / etc ([#6701](https://github.com/typeorm/typeorm/issues/6701)) ([8b68f40](https://github.com/typeorm/typeorm/commit/8b68f40a01b6cdc0e8d21492d988fe21cbef64de))

### Reverts

-   Revert "fix: properly override database url properties (#6247)" (#6802) ([45b980c](https://github.com/typeorm/typeorm/commit/45b980cf7fd61b0ee2e9560d9aadb96ce331d5cb)), closes [#6247](https://github.com/typeorm/typeorm/issues/6247) [#6802](https://github.com/typeorm/typeorm/issues/6802)

## [0.2.26](https://github.com/typeorm/typeorm/compare/0.2.25...0.2.26) (2020-09-10)

### Bug Fixes

-   @JoinTable does not respect inverseJoinColumns referenced column width ([#6444](https://github.com/typeorm/typeorm/issues/6444)) ([f642a9e](https://github.com/typeorm/typeorm/commit/f642a9e)), closes [#6442](https://github.com/typeorm/typeorm/issues/6442)
-   add missing schema for OracleDriver ([#6673](https://github.com/typeorm/typeorm/issues/6673)) ([8b8bc35](https://github.com/typeorm/typeorm/commit/8b8bc35))
-   change InsertQueryBuilder.values() with an empty array into a no-op ([#6584](https://github.com/typeorm/typeorm/issues/6584)) ([9d2df28](https://github.com/typeorm/typeorm/commit/9d2df28)), closes [#3111](https://github.com/typeorm/typeorm/issues/3111)
-   Child entities not being saved correctly with cascade actions ([#6219](https://github.com/typeorm/typeorm/issues/6219)) ([16a2d80](https://github.com/typeorm/typeorm/commit/16a2d80))
-   correctly parse connection URI with query params ([#6390](https://github.com/typeorm/typeorm/issues/6390)) ([54a3a15](https://github.com/typeorm/typeorm/commit/54a3a15)), closes [#6389](https://github.com/typeorm/typeorm/issues/6389)
-   decorators should implement the official TypeScript interface ([#6398](https://github.com/typeorm/typeorm/issues/6398)) ([c23c888](https://github.com/typeorm/typeorm/commit/c23c888)), closes [#5922](https://github.com/typeorm/typeorm/issues/5922)
-   DeepPartial with any and {[k: string]: any} ([#6581](https://github.com/typeorm/typeorm/issues/6581)) ([8d90d40](https://github.com/typeorm/typeorm/commit/8d90d40)), closes [#6580](https://github.com/typeorm/typeorm/issues/6580) [#6580](https://github.com/typeorm/typeorm/issues/6580)
-   exporting missing load event ([#6396](https://github.com/typeorm/typeorm/issues/6396)) ([c6336aa](https://github.com/typeorm/typeorm/commit/c6336aa))
-   get correct insert ids for multiple entities inserted ([#6668](https://github.com/typeorm/typeorm/issues/6668)) ([ef2011d](https://github.com/typeorm/typeorm/commit/ef2011d)), closes [#2131](https://github.com/typeorm/typeorm/issues/2131) [#5973](https://github.com/typeorm/typeorm/issues/5973) [#2131](https://github.com/typeorm/typeorm/issues/2131)
-   getPendingMigrations isn't properly working ([#6372](https://github.com/typeorm/typeorm/issues/6372)) ([7c0da1c](https://github.com/typeorm/typeorm/commit/7c0da1c))
-   handle 'error' events from pool connection ([#6262](https://github.com/typeorm/typeorm/issues/6262)) ([ae3cf0e](https://github.com/typeorm/typeorm/commit/ae3cf0e))
-   insert IN(null) instead of IN() when In([]) empty array for mysqlDriver ([#6237](https://github.com/typeorm/typeorm/issues/6237)) ([6f6bdbd](https://github.com/typeorm/typeorm/commit/6f6bdbd))
-   make only a single SELECT to get inserted default and generated values of multiple entities ([#6669](https://github.com/typeorm/typeorm/issues/6669)) ([4fc4a1b](https://github.com/typeorm/typeorm/commit/4fc4a1b)), closes [#6266](https://github.com/typeorm/typeorm/issues/6266) [#6266](https://github.com/typeorm/typeorm/issues/6266)
-   Migration issues with scale & precision in sqlite/sql.js ([#6638](https://github.com/typeorm/typeorm/issues/6638)) ([0397e44](https://github.com/typeorm/typeorm/commit/0397e44)), closes [#6636](https://github.com/typeorm/typeorm/issues/6636)
-   mysql migration: make sure the indices sql which left-join be the same database ([#6426](https://github.com/typeorm/typeorm/issues/6426)) ([906d97f](https://github.com/typeorm/typeorm/commit/906d97f))
-   pass `ids_` to alias builder to prevent length overflow ([#6624](https://github.com/typeorm/typeorm/issues/6624)) ([cf3ad62](https://github.com/typeorm/typeorm/commit/cf3ad62))
-   pass formatOptions to Data API Client, fix extensions ([#6404](https://github.com/typeorm/typeorm/issues/6404)) ([9abab82](https://github.com/typeorm/typeorm/commit/9abab82)), closes [#1](https://github.com/typeorm/typeorm/issues/1)
-   Query builder makes query with joins, without limit for inherited entities ([#6402](https://github.com/typeorm/typeorm/issues/6402)) ([874e573](https://github.com/typeorm/typeorm/commit/874e573)), closes [#6399](https://github.com/typeorm/typeorm/issues/6399)
-   remove unnecessary optionality from Raw operator's columnAlias argument ([#6321](https://github.com/typeorm/typeorm/issues/6321)) ([0d99b46](https://github.com/typeorm/typeorm/commit/0d99b46))
-   resolve missing decorators on shim ([#6354](https://github.com/typeorm/typeorm/issues/6354)) ([8e2d97d](https://github.com/typeorm/typeorm/commit/8e2d97d)), closes [#6093](https://github.com/typeorm/typeorm/issues/6093)
-   revert fix handle URL objects as column field values ([#6145](https://github.com/typeorm/typeorm/issues/6145)) ([e073e02](https://github.com/typeorm/typeorm/commit/e073e02))
-   SqlQueryRunner.hasColumn was not working ([#6146](https://github.com/typeorm/typeorm/issues/6146)) ([a595fed](https://github.com/typeorm/typeorm/commit/a595fed)), closes [#5718](https://github.com/typeorm/typeorm/issues/5718)
-   support multiple `JoinColumn`s in EntitySchema ([#6397](https://github.com/typeorm/typeorm/issues/6397)) ([298a3b9](https://github.com/typeorm/typeorm/commit/298a3b9)), closes [#5444](https://github.com/typeorm/typeorm/issues/5444)
-   Unnecessary migrations for fulltext indices ([#6634](https://github.com/typeorm/typeorm/issues/6634)) ([c81b405](https://github.com/typeorm/typeorm/commit/c81b405)), closes [#6633](https://github.com/typeorm/typeorm/issues/6633)
-   unnecessary migrations for unsigned numeric types ([#6632](https://github.com/typeorm/typeorm/issues/6632)) ([7ddaf23](https://github.com/typeorm/typeorm/commit/7ddaf23)), closes [#2943](https://github.com/typeorm/typeorm/issues/2943) [/github.com/typeorm/typeorm/pull/6632#pullrequestreview-480932808](https://github.com//github.com/typeorm/typeorm/pull/6632/issues/pullrequestreview-480932808)
-   update query deep partial TypeScript definition ([#6085](https://github.com/typeorm/typeorm/issues/6085)) ([23110d1](https://github.com/typeorm/typeorm/commit/23110d1))

### Features

-   add AWS configurationOptions to aurora-postgres connector ([#6106](https://github.com/typeorm/typeorm/issues/6106)) ([203f51d](https://github.com/typeorm/typeorm/commit/203f51d))
-   add better-sqlite3 driver ([#6224](https://github.com/typeorm/typeorm/issues/6224)) ([2241451](https://github.com/typeorm/typeorm/commit/2241451))
-   add postgres connection timeout option ([#6160](https://github.com/typeorm/typeorm/issues/6160)) ([0072149](https://github.com/typeorm/typeorm/commit/0072149))
-   FileLogger accepts custom file path ([#6642](https://github.com/typeorm/typeorm/issues/6642)) ([c99ba40](https://github.com/typeorm/typeorm/commit/c99ba40)), closes [#4410](https://github.com/typeorm/typeorm/issues/4410)
-   implement postgres ltree ([#6480](https://github.com/typeorm/typeorm/issues/6480)) ([43a7386](https://github.com/typeorm/typeorm/commit/43a7386)), closes [#4193](https://github.com/typeorm/typeorm/issues/4193)
-   support absolute paths in migrationsDir for the CLI ([#6660](https://github.com/typeorm/typeorm/issues/6660)) ([2b5f139](https://github.com/typeorm/typeorm/commit/2b5f139))
-   support cjs extension for ormconfig ([#6285](https://github.com/typeorm/typeorm/issues/6285)) ([6eeb03a](https://github.com/typeorm/typeorm/commit/6eeb03a))

## [0.2.25](https://github.com/typeorm/typeorm/compare/0.2.24...0.2.25) (2020-05-19)

### Bug Fixes

-   'in' clause case for ORACLE ([#5345](https://github.com/typeorm/typeorm/issues/5345)) ([8977365](https://github.com/typeorm/typeorm/commit/8977365))
-   calling EntityManager.insert() with an empty array of entities ([#5745](https://github.com/typeorm/typeorm/issues/5745)) ([f8c52f3](https://github.com/typeorm/typeorm/commit/f8c52f3)), closes [#5734](https://github.com/typeorm/typeorm/issues/5734) [#5734](https://github.com/typeorm/typeorm/issues/5734) [#5734](https://github.com/typeorm/typeorm/issues/5734)
-   columns with transformer should be normalized for update ([#5700](https://github.com/typeorm/typeorm/issues/5700)) ([4ef6b65](https://github.com/typeorm/typeorm/commit/4ef6b65)), closes [#2703](https://github.com/typeorm/typeorm/issues/2703)
-   escape column comment in mysql driver ([#6056](https://github.com/typeorm/typeorm/issues/6056)) ([5fc802d](https://github.com/typeorm/typeorm/commit/5fc802d))
-   expo sqlite driver disconnect() ([#6027](https://github.com/typeorm/typeorm/issues/6027)) ([61d59ca](https://github.com/typeorm/typeorm/commit/61d59ca))
-   HANA - SSL options, column delta detection mechanism ([#5938](https://github.com/typeorm/typeorm/issues/5938)) ([2fd0a8a](https://github.com/typeorm/typeorm/commit/2fd0a8a))
-   handle URL objects as column field values ([#5771](https://github.com/typeorm/typeorm/issues/5771)) ([50a0641](https://github.com/typeorm/typeorm/commit/50a0641)), closes [#5762](https://github.com/typeorm/typeorm/issues/5762) [#5762](https://github.com/typeorm/typeorm/issues/5762)
-   insert and update query builder to handle mssql geometry column correctly ([#5947](https://github.com/typeorm/typeorm/issues/5947)) ([87cc6f4](https://github.com/typeorm/typeorm/commit/87cc6f4))
-   migrations being generated for FK even if there are no changes ([#5869](https://github.com/typeorm/typeorm/issues/5869)) ([416e419](https://github.com/typeorm/typeorm/commit/416e419))
-   multiple assignments to same column on UPDATE [#2651](https://github.com/typeorm/typeorm/issues/2651) ([#5598](https://github.com/typeorm/typeorm/issues/5598)) ([334e17e](https://github.com/typeorm/typeorm/commit/334e17e))
-   prevent TypeError when calling bind function with sql.js 1.2.X ([#5789](https://github.com/typeorm/typeorm/issues/5789)) ([c6cbddc](https://github.com/typeorm/typeorm/commit/c6cbddc))
-   prototype pollution issue ([#6096](https://github.com/typeorm/typeorm/issues/6096)) ([db9d0fa](https://github.com/typeorm/typeorm/commit/db9d0fa))
-   provide a default empty array for parameters. ([#5677](https://github.com/typeorm/typeorm/issues/5677)) ([9e8a8cf](https://github.com/typeorm/typeorm/commit/9e8a8cf))
-   redundant undefined parameters are not generated in migration files anymore ([#5690](https://github.com/typeorm/typeorm/issues/5690)) ([d5cde49](https://github.com/typeorm/typeorm/commit/d5cde49))
-   replacing instanceof Array checks to Array.isArray because instanceof Array seems to be problematic on some platforms ([#5606](https://github.com/typeorm/typeorm/issues/5606)) ([b99b4ad](https://github.com/typeorm/typeorm/commit/b99b4ad))
-   respect database from connection urls ([#5640](https://github.com/typeorm/typeorm/issues/5640)) ([ed75d59](https://github.com/typeorm/typeorm/commit/ed75d59)), closes [#2096](https://github.com/typeorm/typeorm/issues/2096)
-   sha.js import ([#5728](https://github.com/typeorm/typeorm/issues/5728)) ([8c3f48a](https://github.com/typeorm/typeorm/commit/8c3f48a))
-   Unknown fields are stripped from WHERE clause (issue [#3416](https://github.com/typeorm/typeorm/issues/3416)) ([#5603](https://github.com/typeorm/typeorm/issues/5603)) ([215f106](https://github.com/typeorm/typeorm/commit/215f106))
-   update dependency mkdirp to 1.x ([#5748](https://github.com/typeorm/typeorm/issues/5748)) ([edeb561](https://github.com/typeorm/typeorm/commit/edeb561))
-   update Entity decorator return type to ClassDecorator ([#5776](https://github.com/typeorm/typeorm/issues/5776)) ([7d8a1ca](https://github.com/typeorm/typeorm/commit/7d8a1ca))
-   use an empty string enum as the type of a primary key column ([#6063](https://github.com/typeorm/typeorm/issues/6063)) ([8e0d817](https://github.com/typeorm/typeorm/commit/8e0d817)), closes [#3874](https://github.com/typeorm/typeorm/issues/3874)
-   use correct typings for the result of `getUpsertedIds()` ([#5878](https://github.com/typeorm/typeorm/issues/5878)) ([2ab88c2](https://github.com/typeorm/typeorm/commit/2ab88c2))
-   wrong table name parameter when not using default schema ([#5801](https://github.com/typeorm/typeorm/issues/5801)) ([327144a](https://github.com/typeorm/typeorm/commit/327144a))

### Features

-   add FOR NO KEY UPDATE lock mode for postgresql ([#5971](https://github.com/typeorm/typeorm/issues/5971)) ([360122f](https://github.com/typeorm/typeorm/commit/360122f))
-   add name option to view column ([#5962](https://github.com/typeorm/typeorm/issues/5962)) ([3cfcc50](https://github.com/typeorm/typeorm/commit/3cfcc50)), closes [#5708](https://github.com/typeorm/typeorm/issues/5708)
-   Add soft remove and recover methods to entity ([#5854](https://github.com/typeorm/typeorm/issues/5854)) ([9d2b8e0](https://github.com/typeorm/typeorm/commit/9d2b8e0))
-   added support for NOWAIT & SKIP LOCKED in Postgres ([#5927](https://github.com/typeorm/typeorm/issues/5927)) ([2c90e1c](https://github.com/typeorm/typeorm/commit/2c90e1c))
-   Aurora Data API - Postgres Support ([#5651](https://github.com/typeorm/typeorm/issues/5651)) ([e584297](https://github.com/typeorm/typeorm/commit/e584297))
-   aurora Data API - Support for AWS configuration options through aurora driver ([#5754](https://github.com/typeorm/typeorm/issues/5754)) ([1829f96](https://github.com/typeorm/typeorm/commit/1829f96))
-   create-column, update-column, version-column column kinds now support user specified values ([#5867](https://github.com/typeorm/typeorm/issues/5867)) ([5a2eb30](https://github.com/typeorm/typeorm/commit/5a2eb30)), closes [#3271](https://github.com/typeorm/typeorm/issues/3271)
-   names of extra columns for specific tree types moved to NamingStrategy ([#5737](https://github.com/typeorm/typeorm/issues/5737)) ([ec3be41](https://github.com/typeorm/typeorm/commit/ec3be41))
-   PG allow providing a function for password ([#5673](https://github.com/typeorm/typeorm/issues/5673)) ([265d1ae](https://github.com/typeorm/typeorm/commit/265d1ae))
-   update cli migration up and down from any to void ([#5630](https://github.com/typeorm/typeorm/issues/5630)) ([76e165d](https://github.com/typeorm/typeorm/commit/76e165d))
-   UpdateResult returns affected rows in mysql ([#5628](https://github.com/typeorm/typeorm/issues/5628)) ([17f2fff](https://github.com/typeorm/typeorm/commit/17f2fff)), closes [#1308](https://github.com/typeorm/typeorm/issues/1308)

### Performance Improvements

-   An optimized version of EntityMetadata#compareIds() for the common case ([#5419](https://github.com/typeorm/typeorm/issues/5419)) ([a9bdb37](https://github.com/typeorm/typeorm/commit/a9bdb37))

## [0.2.23](https://github.com/typeorm/typeorm/compare/0.2.22...0.2.23), [0.2.24](https://github.com/typeorm/typeorm/compare/0.2.23...0.2.24) (2020-02-28)

### Bug Fixes

-   .synchronize() drops json column on mariadb ([#5391](https://github.com/typeorm/typeorm/issues/5391)) ([e3c78c1](https://github.com/typeorm/typeorm/commit/e3c78c1)), closes [typeorm/typeorm#3636](https://github.com/typeorm/typeorm/issues/3636)
-   (base-entity) set create return type to T[] ([#5400](https://github.com/typeorm/typeorm/issues/5400)) ([ceff897](https://github.com/typeorm/typeorm/commit/ceff897))
-   add the enableArithAbort option to the sql server connection option typings ([#5526](https://github.com/typeorm/typeorm/issues/5526)) ([d19dbc6](https://github.com/typeorm/typeorm/commit/d19dbc6))
-   bug when default value in mssql were not updated if previous default was already set ([9fc8329](https://github.com/typeorm/typeorm/commit/9fc8329))
-   change OrmUtils.mergeDeep to not merge RegExp objects ([#5182](https://github.com/typeorm/typeorm/issues/5182)) ([0f51836](https://github.com/typeorm/typeorm/commit/0f51836)), closes [#3534](https://github.com/typeorm/typeorm/issues/3534)
-   fk on update should not use attributes of on delete ([2baa934](https://github.com/typeorm/typeorm/commit/2baa934))
-   load typeorm-aurora-data-api-driver correctly when using webpack ([#4788](https://github.com/typeorm/typeorm/issues/4788)) ([#5302](https://github.com/typeorm/typeorm/issues/5302)) ([9da0d34](https://github.com/typeorm/typeorm/commit/9da0d34))
-   not to make typeorm generate alter query on geometry column when that column was not changed ([#5525](https://github.com/typeorm/typeorm/issues/5525)) ([ee57557](https://github.com/typeorm/typeorm/commit/ee57557))
-   Oracle sql expression for date column ([#5305](https://github.com/typeorm/typeorm/issues/5305)) ([40e9d3a](https://github.com/typeorm/typeorm/commit/40e9d3a)), closes [#4452](https://github.com/typeorm/typeorm/issues/4452) [#4452](https://github.com/typeorm/typeorm/issues/4452)
-   refactoring instance of with Array.isArray() ([#5539](https://github.com/typeorm/typeorm/issues/5539)) ([1e1595e](https://github.com/typeorm/typeorm/commit/1e1595e))
-   Return NULL when normalize default null value ([#5517](https://github.com/typeorm/typeorm/issues/5517)) ([1826b75](https://github.com/typeorm/typeorm/commit/1826b75)), closes [#5509](https://github.com/typeorm/typeorm/issues/5509)
-   SAP HANA driver fixes ([#5445](https://github.com/typeorm/typeorm/issues/5445)) ([87b161f](https://github.com/typeorm/typeorm/commit/87b161f))
-   update foreign keys when table name changes ([#5482](https://github.com/typeorm/typeorm/issues/5482)) ([7157cb3](https://github.com/typeorm/typeorm/commit/7157cb3))
-   use OUTPUT INTO on SqlServer for returning columns ([#5361](https://github.com/typeorm/typeorm/issues/5361)) ([6bac3ca](https://github.com/typeorm/typeorm/commit/6bac3ca)), closes [#5160](https://github.com/typeorm/typeorm/issues/5160) [#5160](https://github.com/typeorm/typeorm/issues/5160)
-   use sha.js instead of crypto for hash calculation ([#5270](https://github.com/typeorm/typeorm/issues/5270)) ([b380a7f](https://github.com/typeorm/typeorm/commit/b380a7f))

### Features

-   Add basic support for custom cache providers ([#5309](https://github.com/typeorm/typeorm/issues/5309)) ([6c6bde7](https://github.com/typeorm/typeorm/commit/6c6bde7))
-   add fulltext parser option ([#5380](https://github.com/typeorm/typeorm/issues/5380)) ([dd73395](https://github.com/typeorm/typeorm/commit/dd73395))

## [0.2.22](https://github.com/typeorm/typeorm/compare/0.2.21...0.2.22) (2019-12-23)

### Bug Fixes

-   use a prefix on SelectQueryBuilder internal parameters ([#5178](https://github.com/typeorm/typeorm/issues/5178)) ([cacb08b](https://github.com/typeorm/typeorm/commit/cacb08b)), closes [#5174](https://github.com/typeorm/typeorm/issues/5174) [#5174](https://github.com/typeorm/typeorm/issues/5174)

### Features

-   hash aliases to avoid conflicts ([#5227](https://github.com/typeorm/typeorm/issues/5227)) ([edc8e6d](https://github.com/typeorm/typeorm/commit/edc8e6d))
-   implement driver options for NativeScript ([#5217](https://github.com/typeorm/typeorm/issues/5217)) ([3e58426](https://github.com/typeorm/typeorm/commit/3e58426))
-   SAP Hana support ([#5246](https://github.com/typeorm/typeorm/issues/5246)) ([ec90341](https://github.com/typeorm/typeorm/commit/ec90341))
-   speed ​​up id search in buildChildrenEntityTree ([#5202](https://github.com/typeorm/typeorm/issues/5202)) ([2e628c3](https://github.com/typeorm/typeorm/commit/2e628c3))

### BREAKING CHANGES

-   aliases for very long relation names may be replaced with hashed strings.
    Fix: avoid collisions by using longest possible hash.
    Retain more entropy by not using only 8 characters of hashed aliases.

## [0.2.21](https://github.com/typeorm/typeorm/compare/0.2.20...0.2.21) (2019-12-05)

### Bug Fixes

-   allow expireAfterSeconds 0 in Index decorator (close [#5004](https://github.com/typeorm/typeorm/issues/5004)) ([#5005](https://github.com/typeorm/typeorm/issues/5005)) ([d05467c](https://github.com/typeorm/typeorm/commit/d05467c))
-   do not mutate connection options ([#5078](https://github.com/typeorm/typeorm/issues/5078)) ([1047989](https://github.com/typeorm/typeorm/commit/1047989))
-   mysql driver query streaming ([#5036](https://github.com/typeorm/typeorm/issues/5036)) ([aff2f56](https://github.com/typeorm/typeorm/commit/aff2f56))
-   remove consrc usage (postgres,cockroachdb) ([#4333](https://github.com/typeorm/typeorm/issues/4333)) ([ce7cb16](https://github.com/typeorm/typeorm/commit/ce7cb16)), closes [#4332](https://github.com/typeorm/typeorm/issues/4332)
-   repo for app-root-path in lock file ([#5052](https://github.com/typeorm/typeorm/issues/5052)) ([f0fd192](https://github.com/typeorm/typeorm/commit/f0fd192))
-   resolve MySQL unique index check when bigNumberStrings is false ([#4822](https://github.com/typeorm/typeorm/issues/4822)) ([d205574](https://github.com/typeorm/typeorm/commit/d205574)), closes [#2737](https://github.com/typeorm/typeorm/issues/2737)
-   resolve sorting bug for several mongo vesions with typeorm migration ([#5121](https://github.com/typeorm/typeorm/issues/5121)) ([cb771a1](https://github.com/typeorm/typeorm/commit/cb771a1)), closes [#5115](https://github.com/typeorm/typeorm/issues/5115)
-   throwing error on duplicate migration names [#4701](https://github.com/typeorm/typeorm/issues/4701) ([#4704](https://github.com/typeorm/typeorm/issues/4704)) ([3e4dc9f](https://github.com/typeorm/typeorm/commit/3e4dc9f))
-   unescaped column name in order clause of "migrations" ([#5108](https://github.com/typeorm/typeorm/issues/5108)) ([c0c8566](https://github.com/typeorm/typeorm/commit/c0c8566))
-   upgrade app-root-path ([#5023](https://github.com/typeorm/typeorm/issues/5023)) ([7f87f0c](https://github.com/typeorm/typeorm/commit/7f87f0c))

### Features

-   add distinct on() support for postgres ([#4954](https://github.com/typeorm/typeorm/issues/4954)) ([1293065](https://github.com/typeorm/typeorm/commit/1293065))
-   add migrations transaction option to connection options ([#5147](https://github.com/typeorm/typeorm/issues/5147)) ([fb60688](https://github.com/typeorm/typeorm/commit/fb60688)), closes [#4629](https://github.com/typeorm/typeorm/issues/4629) [#4629](https://github.com/typeorm/typeorm/issues/4629)
-   asynchronous ormconfig support ([#5048](https://github.com/typeorm/typeorm/issues/5048)) ([f9fdaee](https://github.com/typeorm/typeorm/commit/f9fdaee)), closes [#4149](https://github.com/typeorm/typeorm/issues/4149)
-   export Migration Execution API from main package (fixes [#4880](https://github.com/typeorm/typeorm/issues/4880)) ([#4892](https://github.com/typeorm/typeorm/issues/4892)) ([8f4f908](https://github.com/typeorm/typeorm/commit/8f4f908))
-   support spatial types of MySQL 8+ ([#4794](https://github.com/typeorm/typeorm/issues/4794)) ([231dadf](https://github.com/typeorm/typeorm/commit/231dadf)), closes [#3702](https://github.com/typeorm/typeorm/issues/3702)

## [0.2.20](https://github.com/typeorm/typeorm/compare/0.2.19...0.2.20) (2019-10-18)

### Bug Fixes

-   ensure distinct property is respected cloning query builder ([#4843](https://github.com/typeorm/typeorm/issues/4843)) ([ea17094](https://github.com/typeorm/typeorm/commit/ea17094)), closes [#4842](https://github.com/typeorm/typeorm/issues/4842)
-   **aurora:** apply mysql query fixes to aurora ([#4779](https://github.com/typeorm/typeorm/issues/4779)) ([ee61c51](https://github.com/typeorm/typeorm/commit/ee61c51))
-   allow EntitySchema to be passed to EntityRepository ([#4884](https://github.com/typeorm/typeorm/issues/4884)) ([652a20e](https://github.com/typeorm/typeorm/commit/652a20e))
-   better timestamp comparison ([#4769](https://github.com/typeorm/typeorm/issues/4769)) ([0a13e6a](https://github.com/typeorm/typeorm/commit/0a13e6a))
-   broken database option when using replication, changes introduced by [#4753](https://github.com/typeorm/typeorm/issues/4753) ([#4826](https://github.com/typeorm/typeorm/issues/4826)) ([df5479b](https://github.com/typeorm/typeorm/commit/df5479b))
-   check for version of MariaDB before extracting COLUMN_DEFAULT ([#4783](https://github.com/typeorm/typeorm/issues/4783)) ([c30b485](https://github.com/typeorm/typeorm/commit/c30b485))
-   connection Reuse is broken in a Lambda environment: ([#4804](https://github.com/typeorm/typeorm/issues/4804)) ([7962036](https://github.com/typeorm/typeorm/commit/7962036))
-   FindOptionUtils export ([#4746](https://github.com/typeorm/typeorm/issues/4746)) ([4a62b1c](https://github.com/typeorm/typeorm/commit/4a62b1c)), closes [#4745](https://github.com/typeorm/typeorm/issues/4745)
-   loading of aurora-data-api driver ([#4765](https://github.com/typeorm/typeorm/issues/4765)) ([fbb8947](https://github.com/typeorm/typeorm/commit/fbb8947))
-   **postgres:** postgres query runner to create materialized view ([#4877](https://github.com/typeorm/typeorm/issues/4877)) ([d744966](https://github.com/typeorm/typeorm/commit/d744966))
-   migrations run in reverse order for mongodb ([#4702](https://github.com/typeorm/typeorm/issues/4702)) ([2f27581](https://github.com/typeorm/typeorm/commit/2f27581))
-   mongodb Cursor.forEach types ([#4759](https://github.com/typeorm/typeorm/issues/4759)) ([fccbe3e](https://github.com/typeorm/typeorm/commit/fccbe3e))
-   Slack invite URL ([#4836](https://github.com/typeorm/typeorm/issues/4836)) ([149af26](https://github.com/typeorm/typeorm/commit/149af26))

### Features

-   add name to MigrationInterface (fixes [#3933](https://github.com/typeorm/typeorm/issues/3933) and fixes [#2549](https://github.com/typeorm/typeorm/issues/2549)) ([#4873](https://github.com/typeorm/typeorm/issues/4873)) ([4a73fde](https://github.com/typeorm/typeorm/commit/4a73fde))
-   add new transaction mode to wrap each migration in transaction ([#4629](https://github.com/typeorm/typeorm/issues/4629)) ([848fb1f](https://github.com/typeorm/typeorm/commit/848fb1f))
-   add option to Column to specify the complete enumName ([#4824](https://github.com/typeorm/typeorm/issues/4824)) ([d967180](https://github.com/typeorm/typeorm/commit/d967180))
-   add support for cube array for PostgreSQL ([#4848](https://github.com/typeorm/typeorm/issues/4848)) ([154a441](https://github.com/typeorm/typeorm/commit/154a441))
-   implements Sqlite 'WITHOUT ROWID' table modifier ([#4688](https://github.com/typeorm/typeorm/issues/4688)) ([c1342ad](https://github.com/typeorm/typeorm/commit/c1342ad)), closes [#3330](https://github.com/typeorm/typeorm/issues/3330)

## [0.2.19](https://github.com/typeorm/typeorm/compare/0.2.18...0.2.19) (2019-09-13)

### Bug Fixes

-   "database" option error in driver when use "url" option for connection ([690e6f5](https://github.com/typeorm/typeorm/commit/690e6f5))
-   "hstore injection" & properly handle NULL, empty string, backslashes & quotes in hstore key/value pairs ([#4720](https://github.com/typeorm/typeorm/issues/4720)) ([3abe5b9](https://github.com/typeorm/typeorm/commit/3abe5b9))
-   add SaveOptions and RemoveOptions into ActiveRecord ([#4318](https://github.com/typeorm/typeorm/issues/4318)) ([a6d7ba2](https://github.com/typeorm/typeorm/commit/a6d7ba2))
-   apostrophe in Postgres enum strings breaks query ([#4631](https://github.com/typeorm/typeorm/issues/4631)) ([445c740](https://github.com/typeorm/typeorm/commit/445c740))
-   change PrimaryColumn decorator to clone passed options ([#4571](https://github.com/typeorm/typeorm/issues/4571)) ([3cf470d](https://github.com/typeorm/typeorm/commit/3cf470d)), closes [#4570](https://github.com/typeorm/typeorm/issues/4570)
-   createQueryBuilder relation remove works only if using ID ([#2632](https://github.com/typeorm/typeorm/issues/2632)) ([#4734](https://github.com/typeorm/typeorm/issues/4734)) ([1d73a90](https://github.com/typeorm/typeorm/commit/1d73a90))
-   resolve issue with conversion string to simple-json ([#4476](https://github.com/typeorm/typeorm/issues/4476)) ([d1594f5](https://github.com/typeorm/typeorm/commit/d1594f5)), closes [#4440](https://github.com/typeorm/typeorm/issues/4440)
-   sqlite connections don't ignore the schema property ([#4599](https://github.com/typeorm/typeorm/issues/4599)) ([d8f1c81](https://github.com/typeorm/typeorm/commit/d8f1c81))
-   the excessive stack depth comparing types `FindConditions<?>` and `FindConditions<?>` problem ([#4470](https://github.com/typeorm/typeorm/issues/4470)) ([7a0beed](https://github.com/typeorm/typeorm/commit/7a0beed))
-   views generating broken Migrations ([#4726](https://github.com/typeorm/typeorm/issues/4726)) ([c52b3d2](https://github.com/typeorm/typeorm/commit/c52b3d2)), closes [#4123](https://github.com/typeorm/typeorm/issues/4123)

### Features

-   add `set` datatype support for MySQL/MariaDB ([#4538](https://github.com/typeorm/typeorm/issues/4538)) ([19e2179](https://github.com/typeorm/typeorm/commit/19e2179)), closes [#2779](https://github.com/typeorm/typeorm/issues/2779)
-   add materialized View support for Postgres ([#4478](https://github.com/typeorm/typeorm/issues/4478)) ([dacac83](https://github.com/typeorm/typeorm/commit/dacac83)), closes [#4317](https://github.com/typeorm/typeorm/issues/4317) [#3996](https://github.com/typeorm/typeorm/issues/3996)
-   add mongodb `useUnifiedTopology` config parameter ([#4684](https://github.com/typeorm/typeorm/issues/4684)) ([92e4270](https://github.com/typeorm/typeorm/commit/92e4270))
-   add multi-dimensional cube support for PostgreSQL ([#4378](https://github.com/typeorm/typeorm/issues/4378)) ([b6d6278](https://github.com/typeorm/typeorm/commit/b6d6278))
-   add options to input init config for sql.js ([#4560](https://github.com/typeorm/typeorm/issues/4560)) ([5c311ed](https://github.com/typeorm/typeorm/commit/5c311ed))
-   add postgres pool error handler ([#4474](https://github.com/typeorm/typeorm/issues/4474)) ([a925be9](https://github.com/typeorm/typeorm/commit/a925be9))
-   add referenced table metadata to NamingStrategy to resolve foreign key name ([#4274](https://github.com/typeorm/typeorm/issues/4274)) ([0094f61](https://github.com/typeorm/typeorm/commit/0094f61)), closes [#3847](https://github.com/typeorm/typeorm/issues/3847) [#1355](https://github.com/typeorm/typeorm/issues/1355)
-   add support for ON CONFLICT for cockroach ([#4518](https://github.com/typeorm/typeorm/issues/4518)) ([db8074a](https://github.com/typeorm/typeorm/commit/db8074a)), closes [#4513](https://github.com/typeorm/typeorm/issues/4513)
-   Added support for DISTINCT queries ([#4109](https://github.com/typeorm/typeorm/issues/4109)) ([39a8e34](https://github.com/typeorm/typeorm/commit/39a8e34))
-   Aurora Data API ([#4375](https://github.com/typeorm/typeorm/issues/4375)) ([c321562](https://github.com/typeorm/typeorm/commit/c321562))
-   export additional schema builder classes ([#4325](https://github.com/typeorm/typeorm/issues/4325)) ([e589fda](https://github.com/typeorm/typeorm/commit/e589fda))
-   log files loaded from glob patterns ([#4346](https://github.com/typeorm/typeorm/issues/4346)) ([e12479e](https://github.com/typeorm/typeorm/commit/e12479e)), closes [#4162](https://github.com/typeorm/typeorm/issues/4162)
-   UpdateResult returns affected rows in postgresql ([#4432](https://github.com/typeorm/typeorm/issues/4432)) ([7808bba](https://github.com/typeorm/typeorm/commit/7808bba)), closes [#1308](https://github.com/typeorm/typeorm/issues/1308)

## 0.2.18

### Bug fixes

-   fixed loadRelationCountAndMap when entities' primary keys are strings ([#3946](https://github.com/typeorm/typeorm/issues/3946))
-   fixed QueryExpressionMap not cloning all values correctly ([#4156](https://github.com/typeorm/typeorm/issues/4156))
-   fixed transform embeddeds with no columns but with nested embeddeds (mongodb) ([#4131](https://github.com/typeorm/typeorm/pull/4131))
-   fixed the getMany() result being droped randomly bug when using the buffer as primary key. ([#4220](https://github.com/typeorm/typeorm/issues/4220))

### Features

-   adds `typeorm migration:show` command ([#4173](https://github.com/typeorm/typeorm/pull/4173))
-   deprecate column `readonly` option in favor of `update` and `insert` options ([#4035](https://github.com/typeorm/typeorm/pull/4035))
-   support sql.js v1.0 ([#4104](https://github.com/typeorm/typeorm/issues/4104))
-   added support for `orUpdate` in SQLlite ([#4097](https://github.com/typeorm/typeorm/pull/4097))
-   added support for `dirty_read` (NOLOCK) in SQLServer ([#4133](https://github.com/typeorm/typeorm/pull/4133))
-   extend afterLoad() subscriber interface to take LoadEvent ([issue #4185](https://github.com/typeorm/typeorm/issues/4185))
-   relation decorators (e.g. `@OneToMany`) now also accept `string` instead of `typeFunction`, which prevents circular dependency issues in the frontend/browser ([issue #4190](https://github.com/typeorm/typeorm/issues/4190))
-   added support for metadata reflection in typeorm-class-transformer-shim.js ([issue #4219](https://github.com/typeorm/typeorm/issues/4219))
-   added `sqlJsConfig` to input config when initializing sql.js ([issue #4559](https://github.com/typeorm/typeorm/issues/4559))

## 0.2.17 (2019-05-01)

### Bug fixes

-   fixed transform embeddeds with boolean values (mongodb) ([#3900](https://github.com/typeorm/typeorm/pull/3900))
-   fixed issue with schema inheritance in STI pattern ([#3957](https://github.com/typeorm/typeorm/issues/3957))
-   revert changes from [#3814](https://github.com/typeorm/typeorm/pull/3814) ([#3828](https://github.com/typeorm/typeorm/pull/3828))
-   fix performance issue when inserting into raw tables with QueryBuilder
    ([#3931](https://github.com/typeorm/typeorm/issues/3931))
-   sqlite date hydration is susceptible to corruption ([#3949](https://github.com/typeorm/typeorm/issues/3949))
-   fixed mongodb uniques, support 3 ways to define uniques ([#3986](https://github.com/typeorm/typeorm/pull/3986))
-   fixed mongodb TTL index ([#4044](https://github.com/typeorm/typeorm/pull/4044))

### Features

-   added deferrable options for foreign keys (postgres) ([#2191](https://github.com/typeorm/typeorm/issues/2191))
-   added View entity implementation ([#1024](https://github.com/typeorm/typeorm/issues/1024)). Read more at [View entities](https://typeorm.io/#/view-entities)
-   added multiple value transformer support ([#4007](https://github.com/typeorm/typeorm/issues/4007))

## 0.2.16 (2019-03-26)

### Bug fixes

-   removed unused parameters from `insert`, `update`, `delete` methods ([#3888](https://github.com/typeorm/typeorm/pull/3888))
-   fixed: migration generator produces duplicated changes ([#1960](https://github.com/typeorm/typeorm/issues/1960))
-   fixed: unique constraint not created on embedded entity field ([#3142](https://github.com/typeorm/typeorm/issues/3142))
-   fixed: FK columns have wrong length when PrimaryGeneratedColumn('uuid') is used ([#3604](https://github.com/typeorm/typeorm/issues/3604))
-   fixed: column option unique sqlite error ([#3803](https://github.com/typeorm/typeorm/issues/3803))
-   fixed: 'uuid' in PrimaryGeneratedColumn causes Many-to-Many Relationship to Fail ([#3151](https://github.com/typeorm/typeorm/issues/3151))
-   fixed: sync enums on schema sync ([#3694](https://github.com/typeorm/typeorm/issues/3694))
-   fixed: changes in enum type is not reflected when generating migration (in definition file) ([#3244](https://github.com/typeorm/typeorm/issues/3244))
-   fixed: migration will keep create and drop indexes if index name is the same across tables ([#3379](https://github.com/typeorm/typeorm/issues/3379))

### Features

-   added `lock` option in `FindOptions`

## 0.2.15 (2019-03-14)

### Bug fixes

-   fixed bug in `connection.dropDatabase` method ([#1414](https://github.com/typeorm/typeorm/pull/3727))
-   fixed "deep relations" not loaded/mapped due to the built-in max length of Postgres ([#3118](https://github.com/typeorm/typeorm/issues/3118))
-   updated all dependencies
-   fixed types issue from [#3725](https://github.com/typeorm/typeorm/issues/3725)
-   removed sql-function-support (`() => ` syntax) in parameters to prevent security considerations
-   fix sync schema issue with postgres enum in case capital letters in entity name ([#3536](https://github.com/typeorm/typeorm/issues/3536))

### Features

-   added `uuidExtension` option to Postgres connection options, which allows TypeORM to use the newer `pgcrypto` extension to generate UUIDs

## 0.2.14 (2019-02-25)

### Bug fixes

-   fixed migration issue with postgres numeric enum type - change queries are not generated if enum is not modified ([#3587](https://github.com/typeorm/typeorm/issues/3587))
-   fixed mongodb entity listeners in optional embeddeds ([#3450](https://github.com/typeorm/typeorm/issues/3450))
-   fixes returning invalid delete result
-   reverted lazy loading properties not enumerable feature to fix related bugs

### Features

-   added CockroachDB support
-   added browser entry point to `package.json` ([3583](https://github.com/typeorm/typeorm/issues/3583))
-   replaced backend-only drivers by dummy driver in browser builds
-   added `useLocalForage` option to Sql.js connection options, which enables asynchronous load and save operations of the datatbase from the indexedDB ([#3554](https://github.com/typeorm/typeorm/issues/3554))
-   added simple-enum column type ([#1414](https://github.com/typeorm/typeorm/issues/1414))

## 0.2.13 (2019-02-10)

### Bug Fixes

-   fixed undefined object id field in case property name is `_id` ([3517](https://github.com/typeorm/typeorm/issues/3517))
-   allow to use mongodb index options in `Index` decorator ([#3592](https://github.com/typeorm/typeorm/pull/3592))
-   fixed entity embeddeds indices in mongodb ([#3585](https://github.com/typeorm/typeorm/pull/3585))
-   fixed json/jsonb column data types comparison ([#3496](https://github.com/typeorm/typeorm/issues/3496))
-   fixed increment/decrement value of embedded entity ([#3182](https://github.com/typeorm/typeorm/issues/3182))
-   fixed missing call `transformer.from()` in case column is NULL ([#3395](https://github.com/typeorm/typeorm/issues/3395))
-   fixed signatures of `update`/`insert` methods, some `find*` methods in repositories, entity managers, BaseEntity and QueryBuilders
-   handle embedded documents through multiple levels in mongodb ([#3551](https://github.com/typeorm/typeorm/issues/3551))
-   fixed hanging connections in `mssql` driver ([#3327](https://github.com/typeorm/typeorm/pull/3327))

### Features

-   Injection 2nd parameter(options) of constructor to `ioredis/cluster` is now possible([#3538](https://github.com/typeorm/typeorm/issues/3538))

## 0.2.12 (2019-01-20)

### Bug Fixes

-   fixed mongodb entity listeners and subscribers ([#1527](https://github.com/typeorm/typeorm/issues/1527))
-   fixed connection options builder - paramters parsed from url are assigned on top of options ([#3442](https://github.com/typeorm/typeorm/pull/3442))
-   fixed issue with logical operator precedence in `QueryBuilder` `whereInIds` ([#2103](https://github.com/typeorm/typeorm/issues/2103))
-   fixed missing `isolationLevel` in `Connection.transaction()` method ([#3363](https://github.com/typeorm/typeorm/issues/3363))
-   fixed broken findOne method with custom join column name
-   fixed issue with uuid in mysql ([#3374](https://github.com/typeorm/typeorm/issues/3374))
-   fixed missing export of `Exclusion` decorator
-   fixed ignored extra options in mongodb driver ([#3403](https://github.com/typeorm/typeorm/pull/3403), [#1741](https://github.com/typeorm/typeorm/issues/1741))
-   fixed signature of root `getRepository` function to accept `EntitySchema<Entity>` ([#3402](https://github.com/typeorm/typeorm/pull/3402))
-   fixed false undefined connection options passed into mongodb client ([#3366](https://github.com/typeorm/typeorm/pull/3366))
-   fixed ER_DUP_FIELDNAME with simple find ([#3350](https://github.com/typeorm/typeorm/issues/3350))

### Features

-   added `tslib` to reduce package size ([#3457](https://github.com/typeorm/typeorm/issues/3457), [#3458](https://github.com/typeorm/typeorm/pull/3458))
-   queries are simplified in `findByIds` and `whereInIds` for simple entities with single primary key ([#3431](https://github.com/typeorm/typeorm/pull/3431))
-   added `ioredis` and `ioredis-cluster` cache support ([#3289](https://github.com/typeorm/typeorm/pull/3289),[#3364](https://github.com/typeorm/typeorm/pull/3364))
-   added `LessThanOrEqual` and `MoreThanOrEqual` find options ([#3373](https://github.com/typeorm/typeorm/pull/3373))
-   improve support of string, numeric and heterogeneous enums in postgres and mysql ([#3414](https://github.com/typeorm/typeorm/pull/3414))
-   default value of enum array in postgres is now possible define as typescript array ([#3414](https://github.com/typeorm/typeorm/pull/3414))

```typescript
@Column({
    type: "enum",
    enum: StringEnum,
    array: true,
    default: [StringEnum.ADMIN]
})
stringEnums: StringEnum[];
```

### Breaking changes

-   `UpdateQueryBuilder` now throw error if update values are not provided or unknown property is passed into `.set()` method ([#2849](https://github.com/typeorm/typeorm/issues/2849),[#3324](https://github.com/typeorm/typeorm/pull/3324))

## 0.2.11

-   hot fix for mysql schema sync bug

## 0.2.10

-   allowed caching options from environment variable (#3321)
-   more accurate type for postgres ssl parameters
-   added support for `ON UPDATE CASCADE` relations for mysql
-   `repository.save` returns union type
-   added reuse of lazy relationships
-   added ability to disable prefixes for embedded columns
-   migrations can be tested
-   migration run returns array of successful migrations
-   added debug ENV option
-   added support for postgres exclusion constraints
-   bug fixes
-   documentation updates
-   fixed issue with mysql primary generated uuid ER_TOO_LONG_KEY (#1139)

## 0.2.9

-   `UpdateEvent` now returns with contains `updatedColumns` and `updatedRelations`

## 0.2.8

-   added support for specifying isolation levels in transactions
-   added SQLCipher connection option for sqlite
-   added driver to support Expo platform for sqlite
-   added support for nativescript
-   bug fixes
-   documentation updates

## 0.2.7

-   added support for rowversion type for mssql (#2198)

## 0.2.6

-   fixed wrong aggregate and count methods signature in mongodb

## 0.2.5

-   added support for enum arrays in postgres
-   fixed issue with lazy relations (#1953)
-   fixed issue with migration file generator using a wrong class name (#2070)
-   fixed issue with unhandled promise rejection warning on postgres connection (#2067)

## 0.2.4

-   fixed bug with relation id loader queries not working with self-referencing relations
-   fixed issues with zerofill and unsigned options not available in column options (#2049)
-   fixed issue with lazy relation loader (#2029)
-   fixed issue with closure table not properly escaped when using custom schema (#2043)
-   fixed issue #2053

## 0.2.3

-   fixed bug with selecting default values after persistence when initialized properties defined
-   fixed bug with find operators used on relational columns (#2031)
-   fixed bug with DEFAULT as functions in mssql (#1991)

## 0.2.2

-   fixing bugs with STI
-   fixed bug in mysql schema synchronization

## 0.2.1

-   fixed bug with STI
-   fixed bug with lazy relations inside transactions

## 0.2.0

-   completely refactored, improved and optimized persistence process and performance.
-   removed cascade remove functionality, refactored how cascades are working.
-   removed `cascadeRemove` option from relation options.
-   replaced `cascadeAll` with `cascade: true` syntax from relation options.
-   replaced `cascadeInsert` with `cascade: ["insert"]` syntax from relation options.
-   replaced `cascadeUpdate` with `cascade: ["update"]` syntax from relation options.
-   now when one-to-one or many-to-one relation is loaded and its not set (set to null) ORM returns you entity with relation set to `null` instead of `undefined property` as before.
-   now relation id can be set directly to relation, e.g. `Post { @ManyToOne(type => Tag) tag: Tag|number }` with `post.tag = 1` usage.
-   now you can disable persistence on any relation by setting `@OneToMany(type => Post, post => tag, { persistence: false })`. This can dramatically improve entity save performance.
-   `loadAllRelationIds` method of `QueryBuilder` now accepts list of relation paths that needs to be loaded, also `disableMixedMap` option is now by default set to false, but you can enable it via new method parameter `options`
-   now `returning` and `output` statements of `InsertQueryBuilder` support array of columns as argument
-   now when many-to-many and one-to-many relation set to `null` all items from that relation are removed, just like it would be set to empty array
-   fixed issues with relation update from one-to-one non-owner side
-   now version column is updated on the database level, not by ORM anymore
-   now created date and update date columns is set on the database level, not by ORM anymore (e.g. using `CURRENT_TIMESTAMP` as a default value)
-   now `InsertQueryBuilder`, `UpdateQueryBuilder` and `DeleteQueryBuilder` automatically update entities after execution.
    This only happens if real entity objects are passed.
    Some databases (like mysql and sqlite) requires a separate query to perform this operation.
    If you want to disable this behavior use `queryBuilder.updateEntity(false)` method.
    This feature is convenient for users who have uuid, create/update date, version columns or columns with DEFAULT value set.
-   now `InsertQueryBuilder`, `UpdateQueryBuilder` and `DeleteQueryBuilder` call subscribers and listeners.
    You can disable this behavior by setting `queryBuilder.callListeners(false)` method.
-   `Repository` and `EntityManager` method `.findOneById` is deprecated and will be removed in next 0.3.0 version.
    Use `findOne(id)` method instead now.
-   `InsertQueryBuilder` now returns `InsertResult` which contains extended information and metadata about runned query
-   `UpdateQueryBuilder` now returns `UpdateResult` which contains extended information and metadata about runned query
-   `DeleteQueryBuilder` now returns `DeleteResult` which contains extended information and metadata about runned query
-   now insert / update / delete queries built with QueryBuilder can be wrapped into a transaction using `useTransaction(true)` method of the QueryBuilder.
-   `insert`, `update` and `delete` methods of `QueryRunner` now use `InsertQueryRunner`, `UpdateQueryRunner` and `DeleteQueryRunner` inside
-   removed deprecated `removeById`, `removeByIds` methods
-   removed `deleteById` method - use `delete(id)` method instead now
-   removed `updateById` method - use `update(id)` method instead now
-   changed `snakeCase` utility - check table names after upgrading
-   added ability to disable transaction in `save` and `remove` operations
-   added ability to disable listeners and subscribers in `save` and `remove` operations
-   added ability to save and remove objects in chunks
-   added ability to disable entity reloading after insertion and updation
-   class table inheritance functionality has been completely dropped
-   single table inheritance functionality has been fixed
-   `@SingleEntityChild` has been renamed to `@ChildEntity`
-   `@DiscriminatorValue` has been removed, instead parameter in `@ChildEntity` must be used, e.g. `@ChildEntity("value")`
-   `@DiscriminatorColumn` decorator has been removed, use `@TableInheritance` options instead now
-   `skipSync` in entity options has been renamed to `synchronize`. Now if it set to false schema synchronization for the entity will be disabled.
    By default its true.
-   now array initializations for relations are forbidden and ORM throws an error if there are entities with initialized relation arrays.
-   `@ClosureEntity` decorator has been removed. Instead `@Entity` + `@Tree("closure-table")` must be used
-   added support for nested set and materialized path tree hierarchy patterns
-   breaking change on how array parameters work in queries - now instead of (:param) new syntax must be used (:...param).
    This fixed various issues on how real arrays must work
-   changed the way how entity schemas are created (now more type-safe), now interface EntitySchema is a class
-   added `@Unique` decorator. Accepts custom unique constraint name and columns to be unique. Used only on as
    composite unique constraint, on table level. E.g. `@Unique("uq_id_name", ["id", "name"])`
-   added `@Check` decorator. Accepts custom check constraint name and expression. Used only on as
    composite check constraint, on table level. E.g. `@Check("chk_name", "name <> 'asd'")`
-   fixed `Oracle` issues, now it will be fully maintained as other drivers
-   implemented migrations functionality in all drivers
-   CLI commands changed from `migrations:create`, `migrations:generate`, `migrations:revert` and `migrations:run` to `migration:create`, `migration:generate`, `migration:revert` and `migration:run`
-   changed the way how migrations work (more info in #1315). Now migration table contains `id` column with auto-generated keys, you need to re-create migrations table or add new column manually.
-   entity schemas syntax was changed
-   dropped support for WebSql and SystemJS
-   `@Index` decorator now accepts `synchronize` option. This option need to avoid deleting custom indices which is not created by TypeORM
-   new flag in relation options was introduced: `{ persistence: false }`. You can use it to prevent any extra queries for relations checks
-   added support for `UNSIGNED` and `ZEROFILL` column attributes in MySQL
-   added support for generated columns in MySQL
-   added support for `ON UPDATE` column option in MySQL
-   added `SPATIAL` and `FULLTEXT` index options in MySQL
-   added `hstore` and `enum` column types support in Postgres
-   added range types support in Postgres
-   TypeORM now uses `{ "supportBigNumbers": true, "bigNumberStrings": true }` options by default for `node-mysql`
-   Integer data types in MySQL now accepts `width` option instead of `length`
-   junction tables now have `onDelete: "CASCADE"` attribute on their foreign keys
-   `ancestor` and `descendant` columns in ClosureTable marked as primary keys
-   unique index now will be created for the join columns in `ManyToOne` and `OneToOne` relations

## 0.1.19

-   fixed bug in InsertQueryBuilder

## 0.1.18

-   fixed timestamp issues

## 0.1.17

-   fixed issue with entity order by applied to update query builder

## 0.1.16

-   security and bug fixes

## 0.1.15

-   security and bug fixes

## 0.1.14

-   optimized hydration performance ([#1672](https://github.com/typeorm/typeorm/pull/1672))

## 0.1.13

-   added simple-json column type ([#1448](https://github.com/typeorm/typeorm/pull/1488))
-   fixed transform behaviour for timestamp columns ([#1140](https://github.com/typeorm/typeorm/issues/1140))
-   fixed issue with multi-level relations loading ([#1504](https://github.com/typeorm/typeorm/issues/1504))

## 0.1.12

-   EntitySubscriber now fires events on subclass entity ([#1369](https://github.com/typeorm/typeorm/issues/1369))
-   fixed error with entity schema validator being async ([#1448](https://github.com/typeorm/typeorm/issues/1448))

## 0.1.11

-   postgres extensions now gracefully handled when user does not have rights to use them ([#1407](https://github.com/typeorm/typeorm/issues/1407))

## 0.1.10

-   `sqljs` driver now enforces FK integrity by default (same behavior as `sqlite`)
-   fixed issue that broke browser support in 0.1.8 because of the debug package ([#1344](https://github.com/typeorm/typeorm/pull/1344))

## 0.1.9

-   fixed bug with sqlite and mysql schema synchronization when uuid column is used ([#1332](https://github.com/typeorm/typeorm/issues/1332))

## 0.1.8

-   New DebugLogger ([#1302](https://github.com/typeorm/typeorm/pull/1302))
-   fixed issue with primary relations being nullable by default - now they are not nullable always
-   fixed issue with multiple databases support when tables with same name are used across multiple databases

## 0.1.7

-   fixed bug with migrations execution in mssql ([#1254](https://github.com/typeorm/typeorm/issues/1254))
-   added support for more complex ordering in paginated results ([#1259](https://github.com/typeorm/typeorm/issues/1259))
-   MSSQL users are required to add "order by" for skip/offset operations since mssql does not support OFFSET/LIMIT statement without order by applied
-   fixed issue when relation query builder methods execute operations with empty arrays ([#1241](https://github.com/typeorm/typeorm/issues/1241))
-   Webpack can now be used for node projects and not only for browser projects. To use TypeORM in Ionic with minimal changes checkout the [ionic-example](https://github.com/typeorm/ionic-example#typeorm--017) for the needed changes. To use webpack for non-Ionic browser webpack projects, the needed configuration can be found in the [docs](http://typeorm.io/#/supported-platforms) ([#1280](https://github.com/typeorm/typeorm/pulls/1280))
-   added support for loading sub-relations in via find options ([#1270](https://github.com/typeorm/typeorm/issues/1270))

## 0.1.6

-   added support for indices and listeners in embeddeds
-   added support for `ON CONFLICT` keyword
-   fixed bug with query builder where lazy relations are loaded multiple times when using `leftJoinAndSelect` ([#996](https://github.com/typeorm/typeorm/issues/996))
-   fixed bug in all sqlite based drivers that generated wrong uuid columns ([#1128](https://github.com/typeorm/typeorm/issues/1128) and [#1161](https://github.com/typeorm/typeorm/issues/1161))

## 0.1.5

-   fixed bug where `findByIds` would return values with an empty array ([#1118](https://github.com/typeorm/typeorm/issues/1118))
-   fixed bug in MigrationExecutor that didn't release created query builder ([#1201](https://github.com/typeorm/typeorm/issues/1201))

## 0.1.4

-   fixed bug in mysql driver that generated wrong query when using skip ([#1099](https://github.com/typeorm/typeorm/issues/1099))
-   added option to create query builder from repository without alias([#1084](https://github.com/typeorm/typeorm/issues/1084))
-   fixed bug that made column option "select" unusable ([#1110](https://github.com/typeorm/typeorm/issues/1110))
-   fixed bug that generated mongodb projects what don't work ([#1119](https://github.com/typeorm/typeorm/issues/1119))

## 0.1.3

-   added support for `sql.js`. To use it you just need to install `npm i sql.js` and use `sqljs` as driver type ([#894](https://github.com/typeorm/typeorm/pull/894)).
-   added explicit require() statements for drivers ([#1143](https://github.com/typeorm/typeorm/pull/1143))
-   fixed bug where wrong query is generated with multiple primary keys ([#1146](https://github.com/typeorm/typeorm/pull/1146))
-   fixed bug for oracle driver where connect method was wrong ([#1177](https://github.com/typeorm/typeorm/pull/1177))

## 0.1.2

-   sqlite now supports relative database file paths ([#798](https://github.com/typeorm/typeorm/issues/798) and [#799](https://github.com/typeorm/typeorm/issues/799))
-   fixed bug with not properly working `update` method ([#1037](https://github.com/typeorm/typeorm/issues/1037), [#1042](https://github.com/typeorm/typeorm/issues/1042))
-   fixed bug with replication support ([#1035](https://github.com/typeorm/typeorm/pull/1035))
-   fixed bug with wrong embedded column names being generated ([#969](https://github.com/typeorm/typeorm/pull/969))
-   added support for caching in respositories ([#1057](https://github.com/typeorm/typeorm/issues/1057))
-   added support for the `citext` column type for postgres ([#1075](https://github.com/typeorm/typeorm/pull/1075))

## 0.1.1

-   added support for `pg-native` for postgres (#975). To use it you just need to install `npm i pg-native` and it will be picked up automatically.
-   now Find Options support `-1` and `1` for `DESC` and `ASC` values. This is better user experience for MongoDB users.
-   now inheritances in embeddeds are supported (#966).
-   `isArray: boolean` in `ColumnOptions` is deprecated. Use `array: boolean` instead.
-   deprecated `removeById` method, now use `deleteById` method instead.
-   added `insert` and `delete` methods into repository and entity manager.
-   fixed multiple issues with `update`, `updateById` and `removeById` methods in repository and entity manager. Now they do not use `save` and `remove` methods anymore - instead they are using QueryBuilder to build and execute their queries.
-   now `save` method can accept partial entities.
-   removed opencollective dependency.
-   fixed issues with bulk entity insertions.
-   find\* methods now can find by embed conditions.
-   fixed issues with multiple schema support, added option to `@JoinTable` to support schema and database.
-   multiple small bugfixes.

## 0.1.0

#### BREAKING CHANGES

-   `Table`, `AbstractTable`, `ClassTableChild`, `ClosureTable`, `EmbeddableTable`, `SingleTableChild` deprecated decorators were removed. Use `Entity`, `ClassEntityChild`, `ClosureEntity`, `SingleEntityChild` decorators instead.
-   `EntityManager#create`, `Repository#create`, `EntityManager#preload`, `Repository#preload`, `EntityManager#merge`, `Repository#merge` methods now accept `DeepPartial<Entity>` instead of `Object`.
-   `EntityManager#merge`, `Repository#merge` methods first argument is now an entity where to need to merge all given entity-like objects.
-   changed `find*` repository methods. Now conditions are `Partial<Entity>` type.
-   removed `FindOptions` interface and introduced two new interfaces: `FindOneOptions` and `FindManyOptions` - each for its own `findOne*` or `find*` methods.
-   dropped out some of options of `FindOptions`. Use `QueryBuilder` instead. However, added few new options as well.
-   deprecated method `addParameters` has been removed from `QueryBuilder`. Use `setParameters` instead.
-   removed `setMaxResults`, `setFirstResult` methods in `QueryBuilder`. Use `take` and `skip` methods instead.
-   renamed `entityManager` to `manager` in `Connection`, `AbstractRepository` and event objects. `entityManager` property was removed.
-   renamed `persist` to `save` in `EntityManager` and `Repository` objects. `persist` method was removed.
-   `SpecificRepository` is removed. Use relational query builder functionality instead.
-   `transaction` method has been removed from `Repository`. Use `EntityManager#transaction` method instead.
-   custom repositories do not support container anymore.
-   controller / subscriber / migrations from options tsconfig now appended with a project root directory
-   removed naming strategy decorator, naming strategy by name functionality. Now naming strategy should be registered by passing naming strategy instance directly.
-   `driver` section in connection options now deprecated. All settings should go directly to connection options root.
-   removed `fromTable` from the `QueryBuilder`. Now use regular `from` to select from tables.
-   removed `usePool` option from the connection options. Pooling now is always enabled.
-   connection options interface has changed and now each platform has its own set of connection options.
-   `storage` in sqlite options has been renamed to `database`.
-   env variable names for connection were changed (`TYPEORM_DRIVER_TYPE` has been renamed to `TYPEORM_CONNECTION`, some other renaming). More env variable names you can find in `ConnectionOptionsEnvReader` class.
-   some api changes in `ConnectionManager` and `createConnection` / `createConnections` methods of typeorm main entrypoint.
-   `simple_array` column type now is called `simple-array`
-   some column types were removed. Now orm uses column types of underlying database.
-   now `number` type in column definitions (like `@Column() likes: number`) maps to `integer` instead of `double`. This is more programmatic design. If you need to store float-pointing values - define a type explicitly.
-   `fixedLength` in column options has been removed. Now actual column types can be used, e.g. `@Column("char")` or `@Column("varchar")`.
-   `timezone` option has been removed from column options. Now corresponding database types can be used instead.
-   `localTimezone` has been removed from the column options.
-   `skipSchemaSync` in entity options has been renamed to `skipSync`.
-   `setLimit` and `setOffset` in `QueryBuilder` were renamed into `limit` and `offset`.
-   `nativeInterface` has been removed from a driver interface and implementations.
-   now typeorm works with the latest version of mssql (version 4).
-   fixed how orm creates default values for SqlServer - now it creates constraints for it as well.
-   migrations interface has changed - now `up` and `down` accept only `QueryRunner`. To use `Connection` and `EntityManager` use properties of `QueryRunner`, e.g. `queryRunner.connection` and `queryRunner.manager`.
-   now `update` method in `QueryBuilder` accepts `Partial<Entity>` and property names used in update map are column property names and they are automatically mapped to column names.
-   `SpecificRepository` has been removed. Instead new `RelationQueryBuilder` was introduced.
-   `getEntitiesAndRawResults` of `QueryBuilder` has been renamed to `getRawAndEntities`.
-   in mssql all constraints are now generated using table name in their names - this is fixes issues with duplicate constraint names.
-   now when object is loaded from the database all its columns with null values will be set into entity properties as null. Also after saving entity with unset properties that will be stored as nulls - their (properties) values will be set to null.
-   create and update dates in entities now use date with fractional seconds.
-   `@PrimaryGeneratedColumn` decorator now accept generation strategy as first argument (default is `increment`), instead of column type. Column type must be passed in options object, e.g. `@PrimaryGeneratedColumn({ type: "bigint"})`.
-   `@PrimaryColumn` now does not accept `generated` parameter in options. Use `@Generated` or `@PrimaryGeneratedColumn` decorators instead.
-   Logger interface has changed. Custom logger supply mechanism has changed.
-   Now `logging` options in connection options is simple "true", or "all", or list of logging modes can be supplied.
-   removed `driver` section in connection options. Define options right in the connection options section.
-   `Embedded` decorator is deprecated now. use `@Column(type => SomeEmbedded)` instead.
-   `schemaName` in connection options is removed. Use `schema` instead.
-   `TYPEORM_AUTO_SCHEMA_SYNC` env variable is now called `TYPEORM_SYNCHRONIZE`.
-   `schemaSync` method in `Connection` has been renamed to `synchronize`.
-   `getEntityManager` has been deprecated. Use `getManager` instead.
-   `@TransactionEntityManager` is now called `@TransactionManager` now.
-   `EmbeddableEntity`, `Embedded`, `AbstractEntity` decorators has been removed. There is no need to use `EmbeddableEntity` and `AbstractEntity` decorators at all - entity will work as expected without them. Instead of `@Embedded(type => X)` decorator now `@Column(type => X)` must be used instead.
-   `tablesPrefix`, `autoSchemaSync`, `autoMigrationsRun`, `dropSchemaOnConnection` options were removed. Use `entityPrefix`, `synchronize`, `migrationsRun`, `dropSchema` options instead.
-   removed `persist` method from the `Repository` and `EntityManager`. Use `save` method instead.
-   removed `getEntityManager` from `typeorm` namespace. Use `getManager` method instead.
-   refactored how query runner works, removed query runner provider
-   renamed `TableSchema` into `Table`
-   renamed `ColumnSchema` into `TableColumn`
-   renamed `ForeignKeySchema` into `TableForeignKey`
-   renamed `IndexSchema` into `TableIndex`
-   renamed `PrimaryKeySchema` into `TablePrimaryKey`

#### NEW FEATURES

-   added `mongodb` support.
-   entity now can be saved partially within `update` method.
-   added prefix support to embeddeds.
-   now embeddeds inside other embeddeds are supported.
-   now relations are supported inside embeds.
-   now relations for multiple primary keys are generated properly.
-   now ormconfig is read from `.env`, `.js`, `.json`, `.yml`, `.xml` formats.
-   all database-specific types are supported now.
-   now migrations generation in mysql is supported. Use `typeorm migrations:generate` command.
-   `getGeneratedQuery` was renamed to `getQuery` in `QueryBuilder`.
-   `getSqlWithParameters` was renamed to `getSqlAndParameters` in `QueryBuilder`.
-   sql queries are highlighted in console.
-   added `@Generated` decorator. It can accept `strategy` option with values `increment` and `uuid`. Default is `increment`. It always generates value for column, except when column defined as `nullable` and user sets `null` value in to column.
-   added logging of log-running requests.
-   added replication support.
-   added custom table schema and database support in `Postgres`, `Mysql` and `Sql Server` drivers.
-   multiple bug fixes.
-   added ActiveRecord support (by extending BaseEntity) class
-   `Connection` how has `createQueryRunner` that can be used to control database connection and its transaction state
-   `QueryBuilder` is abstract now and all different kinds of query builders were created for different query types - `SelectQueryBuilder`, `UpdateQueryBuilder`, `InsertQueryBuilder` and `DeleteQueryBuilder` with individual method available.

## 0.0.11

-   fixes [#341](https://github.com/typeorm/typeorm/issues/341) - issue when trying to create a `OneToOne` relation with
    `referencedColumnName` where the relation is not between primary keys

## 0.0.10

-   added `ObjectLiteral` and `ObjectType` into main exports
-   fixed issue fixes [#345](https://github.com/typeorm/typeorm/issues/345).
-   fixed issue with migration not saving into the database correctly.
    Note its a breaking change if you have run migrations before and have records in the database table,
    make sure to apply corresponding changes. More info in [#360](https://github.com/typeorm/typeorm/issues/360) issue.

## 0.0.9

-   fixed bug with indices from columns are not being inherited from parent entity [#242](https://github.com/typeorm/typeorm/issues/242)
-   added support of UUID primary columns (thanks [@seanski](https://github.com/seanski))
-   added `count` method to repository and entity manager (thanks [@aequasi](https://github.com/aequasi))

## 0.0.8

-   added complete babel support
-   added `clear` method to `Repository` and `EntityManager` which allows to truncate entity table
-   exported `EntityRepository` in `typeorm/index`
-   fixed issue with migration generation in [#239](https://github.com/typeorm/typeorm/pull/239) (thanks to [@Tobias4872](https://github.com/Tobias4872))
-   fixed issue with using extra options with SqlServer [#236](https://github.com/typeorm/typeorm/pull/236) (thanks to [@jmai00](https://github.com/jmai00))
-   fixed issue with non-pooled connections [#234](https://github.com/typeorm/typeorm/pull/234) (thanks to [@benny-medflyt](https://github.com/benny-medflyt))
-   fixed issues:
    [#242](https://github.com/typeorm/typeorm/issues/242),
    [#240](https://github.com/typeorm/typeorm/issues/240),
    [#204](https://github.com/typeorm/typeorm/issues/204),
    [#219](https://github.com/typeorm/typeorm/issues/219),
    [#233](https://github.com/typeorm/typeorm/issues/233),
    [#234](https://github.com/typeorm/typeorm/issues/234)

## 0.0.7

-   added custom entity repositories support
-   merged typeorm-browser and typeorm libraries into single package
-   added `@Transaction` decorator
-   added exports to `typeorm/index` for naming strategies
-   added shims for browsers using typeorm in frontend models, also added shim to use typeorm
    with class-transformer library on the frontend
-   fixed issue when socketPath could not be used with mysql driver (thanks @johncoffee)
-   all table decorators are renamed to `Entity` (`Table` => `Entity`, `AbstractTable` => `AbstractEntity`,
    `ClassTableChild` => `ClassEntityChild`, `ClosureTable` => `ClosureEntity`, `EmbeddableTable` => `EmbeddableEntity`,
    `SingleTableChild` => `SingleEntityChild`). This change is required because upcoming versions of orm will work
    not only with tables, but also with documents and other database-specific "tables".
    Previous decorator names are deprecated and will be removed in the future.
-   added custom repositories support. Example in samples directory.
-   cascade remove options has been removed from `@ManyToMany`, `@OneToMany` decorators. Also cascade remove is not possible
    from two sides of `@OneToOne` relationship now.
-   fixed issues with subscribers and transactions
-   typeorm now has translation in chinese (thanks [@brookshi](https://github.com/brookshi))
-   added `schemaName` support for postgres database [#152](https://github.com/typeorm/typeorm/issues/152) (thanks [@mingyang91](https://github.com/mingyang91))
-   fixed bug when new column was'nt added properly in sqlite [#157](https://github.com/typeorm/typeorm/issues/157)
-   added ability to set different types of values for DEFAULT value of the column [#150](https://github.com/typeorm/typeorm/issues/150)
-   added ability to use zero, false and empty string values as DEFAULT values in [#189](https://github.com/typeorm/typeorm/pull/189) (thanks to [@Luke265](https://github.com/Luke265))
-   fixed bug with junction tables persistence (thanks [@Luke265](https://github.com/Luke265))
-   fixed bug regexp in `QueryBuilder` (thanks [@netnexus](https://github.com/netnexus))
-   fixed issues [#202](https://github.com/typeorm/typeorm/issues/202), [#203](https://github.com/typeorm/typeorm/issues/203) (thanks to [@mingyang91](https://github.com/mingyang91))
-   fixed issues
    [#159](https://github.com/typeorm/typeorm/issues/159),
    [#181](https://github.com/typeorm/typeorm/issues/181),
    [#176](https://github.com/typeorm/typeorm/issues/176),
    [#192](https://github.com/typeorm/typeorm/issues/192),
    [#191](https://github.com/typeorm/typeorm/issues/191),
    [#190](https://github.com/typeorm/typeorm/issues/190),
    [#179](https://github.com/typeorm/typeorm/issues/179),
    [#177](https://github.com/typeorm/typeorm/issues/177),
    [#175](https://github.com/typeorm/typeorm/issues/175),
    [#174](https://github.com/typeorm/typeorm/issues/174),
    [#150](https://github.com/typeorm/typeorm/issues/150),
    [#159](https://github.com/typeorm/typeorm/issues/159),
    [#173](https://github.com/typeorm/typeorm/issues/173),
    [#195](https://github.com/typeorm/typeorm/issues/195),
    [#151](https://github.com/typeorm/typeorm/issues/151)

## 0.0.6

-   added `JSONB` support for Postgres in #126 (thanks [@CreepGin](https://github.com/CreepGin)@CreepGin)
-   fixed in in sqlite query runner in #141 (thanks [@marcinwadon](https://github.com/marcinwadon))
-   added shortcut exports for table schema classes in #135 (thanks [@eduardoweiland](https://github.com/eduardoweiland))
-   fixed bugs with single table inheritance in #132 (thanks [@eduardoweiland](https://github.com/eduardoweiland))
-   fixed issue with `TIME` column in #134 (thanks [@cserron](https://github.com/cserron))
-   fixed issue with relation id in #138 (thanks [@mingyang91](https://github.com/mingyang91))
-   fixed bug when URL for pg was parsed incorrectly #114 (thanks [@mingyang91](https://github.com/mingyang91))
-   fixed bug when embedded is not being updated
-   metadata storage now in global variable
-   entities are being loaded in migrations and can be used throw the entity manager or their repositories
-   migrations now accept `EntityMetadata` which can be used within one transaction
-   fixed issue with migration running on windows #140
-   fixed bug with with Class Table Inheritance #144

## 0.0.5

-   changed `getScalarMany` to `getRawMany` in `QueryBuilder`
-   changed `getScalarOne` to `getRawOne` in `QueryBuilder`
-   added migrations support

## 0.0.4

-   fixed problem when `order by` is used with `limit`
-   fixed problem when `decorators-shim.d.ts` exist and does not allow to import decorators (treats like they exist in global)
-   fixed Sql Server driver bugs

## 0.0.3

-   completely refactored persistence mechanism:
    -   added experimental support of `{ nullable: true }` in relations
    -   cascade operations should work better now
    -   optimized all queries
    -   entities with recursive entities should be persisted correctly now
-   now `undefined` properties are skipped in the persistence operation, as well as `undefined` relations.
-   added platforms abstractions to allow typeorm to work on multiple platforms
-   added experimental support of typeorm in the browser
-   breaking changes in `QueryBuilder`:
    -   `getSingleResult()` renamed to `getOne()`
    -   `getResults()` renamed to `getMany()`
    -   `getResultsAndCount()` renamed to `getManyAndCount()`
    -   in the innerJoin*/leftJoin* methods now no need to specify `ON`
    -   in the innerJoin*/leftJoin* methods no longer supports parameters, use `addParameters` or `setParameter` instead.
    -   `setParameters` is now works just like `addParameters` (because previous behaviour confused users),
        `addParameters` now is deprecated
    -   `getOne` returns `Promise<Entity|undefined>`
-   breaking changes in `Repository` and `EntityManager`:
    -   `findOne` and .findOneById`now return`Promise<Entity|undefined>`instead of`Promise<Entity>`
-   now typeorm is compiled into `ES5` instead of `ES6` - this allows to run it on older versions of node.js
-   fixed multiple issues with dates and utc-related stuff
-   multiple bugfixes

## 0.0.2

-   lot of API refactorings
-   complete support TypeScript 2
-   optimized schema creation
-   command line tools
-   multiple drivers support
-   multiple bugfixes

## 0.0.1

-   first stable version, works with TypeScript 1.x
