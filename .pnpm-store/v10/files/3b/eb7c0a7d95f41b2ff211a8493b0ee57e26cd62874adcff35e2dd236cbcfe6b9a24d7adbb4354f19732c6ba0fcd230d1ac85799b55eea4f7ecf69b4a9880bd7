# postgres-interval [![tests](https://github.com/bendrucker/postgres-interval/workflows/tests/badge.svg)](https://github.com/bendrucker/postgres-interval/actions?query=workflow%3Atests)

> Parse Postgres interval columns


## Install

```sh
npm install --save postgres-interval
```


## Usage

```js
var parse = require('postgres-interval')
var interval = parse('01:02:03')
//=> {hours: 1, minutes: 2, seconds: 3}
interval.toPostgres()
// 3 seconds 2 minutes 1 hours
interval.toISOString()
// P0Y0M0DT1H2M3S
```

This package parses the default Postgres interval style. If you have changed [`intervalstyle`](https://www.postgresql.org/docs/current/runtime-config-client.html#GUC-INTERVALSTYLE), you will need to set it back to the default:

```sql
set intervalstyle to default;
```

## API

#### `parse(pgInterval)` -> `interval`

##### pgInterval

*Required*  
Type: `string`

A Postgres interval string.

#### `interval.toPostgres()` -> `string`

Returns an interval string. This allows the interval object to be passed into prepared statements.

#### `interval.toISOString()` -> `string`

Returns an [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601#Durations) compliant string, for example `P0Y0M0DT0H9M0S`.

Also available as `interval.toISO()` for backwards compatibility.

#### `interval.toISOStringShort()` -> `string`

Returns an [ISO 8601](https://en.wikipedia.org/wiki/ISO_8601#Durations) compliant string shortened to minimum length, for example `PT9M`.

## License

MIT © [Ben Drucker](http://bendrucker.me)
