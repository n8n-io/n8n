# AWS SSL Profiles

[**AWS RDS**](https://aws.amazon.com/rds/) **SSL** Certificates Bundles.

**Table of Contents**

- [Installation](#installation)
- [Usage](#usage)
  - [**mysqljs/mysql**](#mysqljsmysql)
  - [**MySQL2**](#mysql2)
  - [**node-postgres**](#node-postgres)
  - [Custom `ssl` options](#custom-ssl-options)
- [License](#license)
- [Security](#security)
- [Contributing](#contributing)
- [Acknowledgements](#acknowledgements)

---

## Installation

```bash
npm install --save aws-ssl-profiles
```

---

## Usage

### [mysqljs/mysql](https://github.com/mysqljs/mysql)

```js
const mysql = require('mysql');
const awsCaBundle = require('aws-ssl-profiles');

// mysql connection
const connection = mysql.createConnection({
  //...
  ssl: awsCaBundle,
});

// mysql connection pool
const pool = mysql.createPool({
  //...
  ssl: awsCaBundle,
});
```

### [MySQL2](https://github.com/sidorares/node-mysql2)

```js
const mysql = require('mysql2');
const awsCaBundle = require('aws-ssl-profiles');

// mysql2 connection
const connection = mysql.createConnection({
  //...
  ssl: awsCaBundle,
});

// mysql2 connection pool
const pool = mysql.createPool({
  //...
  ssl: awsCaBundle,
});
```

### [node-postgres](https://github.com/brianc/node-postgres)

```js
const pg = require('pg');
const awsCaBundle = require('aws-ssl-profiles');

// pg connection
const client = new pg.Client({
  // ...
  ssl: awsCaBundle,
});

// pg connection pool
const pool = new pg.Pool({
  // ...
  ssl: awsCaBundle,
});
```

### Custom `ssl` options

Using **AWS SSL Profiles** with custom `ssl` options:

```js
{
  // ...
  ssl: {
    ...awsCaBundle,
    rejectUnauthorized: true,
    // ...
  }
}
```

```js
{
  // ...
  ssl: {
    ca: awsCaBundle.ca,
    rejectUnauthorized: true,
    // ...
  }
}
```

### Custom bundles

```js
const { proxyBundle } = require('aws-ssl-profiles');

{
  // ...
  ssl: proxyBundle,
}
```

---

## License

**AWS SSL Profiles** is under the [**MIT License**](./LICENSE).

---

## Security

Please check the [**SECURITY.md**](./SECURITY.md).

---

## Contributing

Please check the [**CONTRIBUTING.md**](./CONTRIBUTING.md) for instructions.

---

## Acknowledgements

[**Contributors**](https://github.com/mysqljs/aws-ssl-profiles/graphs/contributors).
