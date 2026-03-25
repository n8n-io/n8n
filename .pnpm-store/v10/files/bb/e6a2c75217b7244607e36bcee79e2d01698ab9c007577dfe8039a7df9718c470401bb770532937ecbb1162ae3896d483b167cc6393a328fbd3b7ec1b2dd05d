# Connection String Parser

[![npm version](https://badge.fury.io/js/@tediousjs%2Fconnection-string.svg)](https://www.npmjs.com/package/@tediousjs/connection-string)
[![Lint, Test & Release](https://github.com/tediousjs/connection-string/actions/workflows/nodejs.yml/badge.svg)](https://github.com/tediousjs/connection-string/actions/workflows/nodejs.yml)

This node library is designed to allow the parsing of Connection Strings see https://docs.microsoft.com/en-us/dotnet/api/system.data.sqlclient.sqlconnection.connectionstring

The library also provides the ability to parse SQL Connection Strings.

# Usage

## Parsing connection strings

The library comes with a generic connection string parser that will parse through valid connections strings and produce a key-value
map of the entries in that string. No additional validation is performed.

```js
const { parseConnectionString } = require('@tediousjs/connection-string');

const connectionString = 'User ID=user;Password=password;Initial Catalog=AdventureWorks;Server=MySqlServer';

const parsed = parseConnectionString(connectionString);

console.log(parsed);
```

Output to the console will be:

```json
{
  "User id": "user",
  "password": "password",
  "initial catalog": "AdventureWorks",
  "server": "MySqlServer"
}
```

## Parsing SQL connection strings

There is a specific helper for parsing SQL connection strings and this comes with a value normaliser and validation. It also has an
option to "canonicalise" the properties. For many properties in an SQL connections string, there are aliases, when canonical properties
are being used, these aliases will be returned as the canonical property.

```js
const { parseSqlConnectionString } = require('@tediousjs/connection-string');

const connectionString = 'User ID=user;Password=password;Initial Catalog=AdventureWorks;Server=MySqlServer';

const parsed = parseSqlConnectionString(connectionString, true);

console.log(parsed);
```

Output to console will be:

```json
{
  "user id": "user",
  "password": "password",
  "initial catalog": "AdventureWorks",
  "data source": "MySqlServer"
}
```

NB: The `Server` property from the connection string has been re-written to the value `Data Source`
