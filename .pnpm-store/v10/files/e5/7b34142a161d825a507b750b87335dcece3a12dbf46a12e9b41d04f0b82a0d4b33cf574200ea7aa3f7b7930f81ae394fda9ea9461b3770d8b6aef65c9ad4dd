# node-oracledb version 6.9.0 <img src="https://img.shields.io/npm/v/oracledb.svg" alt="oracledb"/>  <img src="https://img.shields.io/npm/dm/oracledb.svg" alt="oracledb"/>

The node-oracledb add-on for Node.js powers high performance Oracle Database
applications.  Applications can be written in TypeScript, or directly in
JavaScript.

Use node-oracledb 6.9.0 to connect Node.js 14.17, or later, to Oracle
Database.  Older versions of node-oracledb may work with older versions of
Node.js.

Node-oracledb supports basic and advanced features of Oracle Database
and Oracle Client.  See the [homepage][4] for a list.

The node-oracledb module is open source and maintained by Oracle Corp.
It is stable, well documented, and has a comprehensive test suite.

## Installation

Run `npm install oracledb`

See [Getting Started with Node-oracledb][1] and [Quick Start Node-oracledb Installation][2].

## Dependencies and Interoperability

- Node.js versions 14.17 and later.

  Pre-built packages are available on [npm][14] and other mirror repositories.

  Source code is also available.

  Previous versions of node-oracledb supported older Node.js versions.

- Oracle Client libraries are *optional* starting from node-oracledb 6.0.
  Older versions of node-oracledb require Oracle Client libraries.

  **Thin mode**: By default node-oracledb (from version 6.0 onwards) runs in a
  'Thin' mode which connects directly to Oracle Database.

  **Thick mode**: Some advanced Oracle Database functionality is currently only
  available when optional Oracle Client libraries are loaded by
  node-oracledb. Libraries are available in the free [Oracle Instant
  Client][15] packages. Node-oracledb can use Oracle Client
  libraries 11.2 through 23ai.

- Oracle Database

  **Thin mode**: Oracle Database 12.1 (or later) is required.

  **Thick mode**: Oracle Database 9.2 (or later) is required, depending on the
  Oracle Client library version.  Oracle Database's standard client-server
  version interoperability allows connection to both older and newer
  databases. For example when node-oracledb uses Oracle Client 19c libraries,
  then it can connect to Oracle Database 11.2 or later.

## Documentation

See [Documentation for the Oracle Database Node.js Add-on][9] and the [release
notes][10].

## Examples

See the [examples][7] directory.  Start with [examples/example.js][8].

## Help

Questions about node-oracledb can be posted on [GitHub][3] or [Slack][5] ([link
to join Slack][6]).

## <a name="testing"></a> Tests

To run the test suite, see [test/README][11].

## Contributing

This project welcomes contributions from the community. Before submitting a
pull request, please [review our contribution guide][12].

## Security

Please consult the [security guide][13] for our responsible security
vulnerability disclosure process.

## License

Copyright (c) 2015, 2025, Oracle and/or its affiliates.

This software is dual-licensed to you under the Universal Permissive License
(UPL) 1.0 as shown at https://oss.oracle.com/licenses/upl and Apache License
2.0 as shown at http://www.apache.org/licenses/LICENSE-2.0. You may choose
either license.

If you elect to accept the software under the Apache License, Version 2.0,
the following applies:

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

   https://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

[1]: https://node-oracledb.readthedocs.io/en/latest/user_guide/introduction.html#getstarted
[2]: https://node-oracledb.readthedocs.io/en/latest/user_guide/installation.html#quickstart
[3]: https://github.com/oracle/node-oracledb/discussions
[4]: https://oracle.github.io/node-oracledb
[5]: https://node-oracledb.slack.com/
[6]: https://join.slack.com/t/node-oracledb/shared_invite/enQtNDU4Mjc2NzM5OTA2LWMzY2ZlZDY5MDdlMGZiMGRkY2IzYjI5OGU4YTEzZWM5YjQ3ODUzMjcxNWQyNzE4MzM5YjNkYjVmNDk5OWU5NDM
[7]: https://github.com/oracle/node-oracledb/blob/main/examples
[8]: https://github.com/oracle/node-oracledb/blob/main/examples/example.js
[9]: https://node-oracledb.readthedocs.io/en/latest/
[10]: https://node-oracledb.readthedocs.io/en/latest/release_notes.html
[11]: https://github.com/oracle/node-oracledb/blob/main/test/README.md
[12]: https://github.com/oracle/node-oracledb/blob/main/CONTRIBUTING.md
[13]: https://github.com/oracle/node-oracledb/blob/main/SECURITY.md
[14]: https://www.npmjs.com/package/oracledb
[15]: https://www.oracle.com/database/technologies/instant-client.html