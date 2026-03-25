********************************************************************************
NodeJS Driver for Snowflake
********************************************************************************
<p>
  <a href="https://github.com/snowflakedb/snowflake-connector-nodejs/actions?query=workflow%3A%22Build+and+Test%22+branch%3Amaster" target="_blank"><img src="https://github.com/snowflakedb/snowflake-connector-nodejs/workflows/Build%20and%20Test/badge.svg?branch=master" alt="master" /></a>
  <a href="https://www.npmjs.com/package/snowflake-sdk" target="_blank"><img src="https://img.shields.io/npm/v/snowflake-sdk.svg" alt="npm" /></a> 
  <a href="http://www.apache.org/licenses/LICENSE-2.0.txt" target="_blank"><img src="http://img.shields.io/:license-Apache%202-brightgreen.svg" alt="apache" /> </a>
  <a href="https://codecov.io/gh/snowflakedb/snowflake-connector-nodejs" target="_blank"><img src="https://codecov.io/gh/snowflakedb/snowflake-connector-nodejs/branch/master/graph/badge.svg?token=QZMWDu35ds" alt="codecov" /></a>
</p>


| :exclamation:        | For production-affecting issues related to the driver, please [create a case with Snowflake Support](https://community.snowflake.com/s/article/How-To-Submit-a-Support-Case-in-Snowflake-Lodge).   |
|---------------|:------------------------|

Install
======================================================================

Run `npm i snowflake-sdk` in your existing NodeJs project.

Docs
======================================================================

For detailed documentation and basic usage examples, please see the documentation 
at <a href="https://docs.snowflake.net/manuals/user-guide/nodejs-driver.html">NodeJS Driver for Snowflake</a>.

Note
----------------------------------------------------------------------

This driver starts supporting the GCS regional endpoint starting from version 2.0.0. Please ensure that any workloads using through this driver
below the version 2.0.0 do not require support for regional endpoints on GCP. If you have questions about this, please contact Snowflake Support.

Test
======================================================================

Prepare for tests
----------------------------------------------------------------------

Specify env variables:

```
export SNOWFLAKE_TEST_USER=<your_user>
export SNOWFLAKE_TEST_PASSWORD=<your_password>
export SNOWFLAKE_TEST_ACCOUNT=<your_account>
export SNOWFLAKE_TEST_WAREHOUSE=<your_warehouse>
export SNOWFLAKE_TEST_DATABASE=<your_database>
export SNOWFLAKE_TEST_SCHEMA=<your_schema>
export SNOWFLAKE_TEST_PROTOCOL=<your_snowflake_protocol>
export SNOWFLAKE_TEST_HOST=<your_snowflake_host>
export SNOWFLAKE_TEST_PORT=<your_snowflake_port>
```

Run hang webserver:
```
python3 ci/container/hang_webserver.py 12345 &
```

Run tests
----------------------------------------------------------------------

Run unit tests:
```
npm test
```
or
```
npm run test:unit
```

To run a single test file use `test:single` script, e.g. run tests in `test/unit/snowflake_test.js` only:

```
npm run test:single -- test/unit/snowflake_test.js
```

Run integration tests:
```
npm run test:integration
```

Manual test
----------------------------------------------------------------------

Specify env variables:

```
export RUN_MANUAL_TESTS_ONLY=true
export SNOWFLAKE_TEST_OKTA_USER=<your_okta_user>
export SNOWFLAKE_TEST_OKTA_PASS=<your_okta_password>
export SNOWFLAKE_TEST_OKTA_AUTH=<your_okta_auth>
export SNOWFLAKE_TEST_OAUTH_TOKEN=<your_oauth_accesstoken>
export SNOWFLAKE_TEST_BROWSER_USER=<your_browser_user>
```

Run manual connection test for different authenticators
```
npm run test:manual
```

Getting the code coverage
----------------------------------------------------------------------

Run tests and show code coverage report
```
npm run test:ci:coverage
```

Package
======================================================================

The npm package can be built by the command:
```
npm pack
```

Note it is not required to build a package to run tests blow.


Verifying the package signature
----------------------------------------------------------------------

Starting from version v1.13.0 the driver package is signed with a signature allowing to verify its authenticity and integrity.
Steps to verify the signature:
1. Install `cosign`
2. Download the driver package file (`tgz`) from npmjs.org, e.g.: https://registry.npmjs.org/snowflake-sdk/-/snowflake-sdk-1.13.0.tgz
3. Download the signatures file (.sig and .pub) from the release, e.g.: https://github.com/snowflakedb/snowflake-connector-nodejs/releases/download/v1.13.0
4. Verify the signature:
```shell
cosign verify-blob snowflake-sdk-1.13.0.tgz --key snowflake-connector-nodejs-v1.13.0.pub --signature resources.snowflake-sdk-1.13.0.tgz.sig

Verified OK
```

Development
======================================================================

Reformat source code
----------------------------------------------------------------------

Check formatting on all files:

```
npm run lint:check:all
```

Check formatting of single file or directory e.g. `test/unit/snowflake_test.js`:

```
npm run lint:check -- test/unit/snowflake_test.js
```

Fix potentially fixable formatting errors and warnings of single file or directory e.g. `test/unit/logger`:

```
npm run lint:fix -- test/unit/logger
```
