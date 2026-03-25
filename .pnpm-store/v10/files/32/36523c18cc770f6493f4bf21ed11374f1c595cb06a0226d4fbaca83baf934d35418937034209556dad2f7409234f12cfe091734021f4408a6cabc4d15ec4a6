# LDAPts

[![NPM version](https://img.shields.io/npm/v/ldapts.svg?style=flat)](https://npmjs.org/package/ldapts)
[![node version](https://img.shields.io/node/v/ldapts.svg?style=flat)](https://nodejs.org)
[![Known Vulnerabilities](https://snyk.io/test/npm/ldapts/badge.svg)](https://snyk.io/test/npm/ldapts)

Providing an API to access LDAP directory servers from Node.js programs.

## Table of Contents

- [API Details](#api-details)
  - [Create a client](#create-a-client)
  - [Specifying Controls](#specifying-controls)
  - [bind](#bind)
  - [startTLS](#starttls)
  - [add](#add)
  - [compare](#compare)
  - [del](#del)
  - [exop](#exop)
  - [modify](#modify)
    - [Change](#change)
  - [modifyDN](#modifydn)
  - [search](#search)
    - [Filter Strings](#filter-strings)
    - [Return buffer for specific attribute](#return-buffer-for-specific-attribute)
  - [unbind](#unbind)
- [Usage Examples](#usage-examples)
  - [Authenticate example](#authenticate-example)
  - [Search example](#search-example)
  - [Delete Active Directory entry example](#delete-active-directory-entry-example)

## API details

### Create a client

The code to create a new client looks like:

```ts
import { Client } from 'ldapts';

const client = new Client({
  url: 'ldaps://ldap.jumpcloud.com',
  timeout: 0,
  connectTimeout: 0,
  tlsOptions: {
    minVersion: 'TLSv1.2',
  },
  strictDN: true,
});
```

You can use `ldap://` or `ldaps://`; the latter would connect over SSL (note
that this will not use the LDAP TLS extended operation, but literally an SSL
connection to port 636, as in LDAP v2). The full set of options to create a
client is:

| Attribute      | Description                                                                                |
| -------------- | ------------------------------------------------------------------------------------------ |
| url            | A valid LDAP URL (proto/host/port only)                                                    |
| timeout        | Milliseconds client should let operations live for before timing out (Default: Infinity)   |
| connectTimeout | Milliseconds client should wait before timing out on TCP connections (Default: OS default) |
| tlsOptions     | TLS [connect() options](https://nodejs.org/api/tls.html#tls_tls_connect_options_callback)  |
| strictDN       | Force strict DN parsing for client methods (Default is true)                               |

### Specifying Controls

Single or an array of `Control` objects can be added to various operations like the following:

```ts
import { Control } from 'ldapts/controls';

const { searchEntries, searchReferences } = await client.search(
  searchDN,
  {
    filter: '(mail=peter.parker@marvel.com)',
  },
  new Control('1.2.840.113556.1.4.417'),
);
```

You can also subclass `Control` for finer control over how data is parsed and written.
Look at [PagedResultsControl](src/controls/PagedResultsControl.ts) for an example.

### bind

`bind(dnOrSaslMechanism, [password], [controls])`

Performs a bind operation against the LDAP server.

Arguments:

| Argument                              | Description                                                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `dnOrSaslMechanism` (string)          | The name (DN) of the directory object that the client wishes to bind as or the SASL mechanism (PLAIN, EXTERNAL) |
| `[password]` (string)                 | Password for the target bind DN. For SASL this is instead an optional set of encoded SASL credentials.          |
| `[controls]` (Control&#124;Control[]) | Optional `Control` object or array of `Control` objects                                                         |

Simple Example:

```ts
await client.bind('cn=root', 'secret');
```

SASL Example:

```ts
// No credentials
await client.bind('EXTERNAL');

// With credentials
const credentials = '...foo...';
await client.bind('PLAIN', credentials);
```

### startTLS

`startTLS(options, [controls])`

Performs a StartTLS extended operation against the LDAP server to initiate a TLS-secured communication channel over an
otherwise clear-text connection.

Arguments:

| Argument                              | Description                                                                               |
| ------------------------------------- | ----------------------------------------------------------------------------------------- |
| `options` (object)                    | TLS [connect() options](https://nodejs.org/api/tls.html#tls_tls_connect_options_callback) |
| `[controls]` (Control&#124;Control[]) | Optional `Control` object or array of `Control` objects                                   |

Example:

```ts
await client.startTLS({
  ca: [fs.readFileSync('mycacert.pem')],
});
```

### add

`add(dn, entry, [controls])`

Performs an add operation against the LDAP server.

Allows you to add an entry (as a js object or array of Attributes), and as always,
controls are optional.

Arguments:

| Argument                              | Description                                             |
| ------------------------------------- | ------------------------------------------------------- |
| `dn` (string)                         | The DN of the entry to add                              |
| `entry` (object&#124;Attribute[])     | The set of attributes to include in that entry          |
| `[controls]` (Control&#124;Control[]) | Optional `Control` object or array of `Control` objects |

Example:

```ts
var entry = {
  cn: 'foo',
  sn: 'bar',
  email: ['foo@bar.com', 'foo1@bar.com'],
  objectclass: 'fooPerson',
};
await client.add('cn=foo, o=example', entry);
```

### compare

`compare(dn, attribute, value, [controls])`

Performs an LDAP compare operation with the given attribute and value against
the entry referenced by dn.

Arguments:

| Argument                              | Description                                                             |
| ------------------------------------- | ----------------------------------------------------------------------- |
| `dn` (string)                         | The DN of the entry in which the comparison is to be made               |
| `attribute` (string)                  | The Name of the attribute in which the comparison is to be made         |
| `value` (string)                      | The Attribute Value Assertion to try to find in the specified attribute |
| `[controls]` (Control&#124;Control[]) | Optional `Control` object or array of `Control` objects                 |

Returns:
`(boolean)`: Returns `true` if the target entry exists and does contain the specified attribute value; otherwise `false`

Example:

```ts
const hasValue = await client.compare('cn=foo, o=example', 'sn', 'bar');
```

### del

`del(dn, [controls])`

Deletes an entry from the LDAP server.

Arguments:

| Argument                              | Description                                             |
| ------------------------------------- | ------------------------------------------------------- |
| `dn` (string)                         | The DN of the entry to delete                           |
| `[controls]` (Control&#124;Control[]) | Optional `Control` object or array of `Control` objects |

Example:

```ts
await client.del('cn=foo, o=example');
```

### exop

`exop(oid, [value], [controls])`

Performs an LDAP extended operation against an LDAP server.

Arguments:

| Argument                              | Description                                             |
| ------------------------------------- | ------------------------------------------------------- |
| `oid` (string)                        | Object identifier representing the type of request      |
| `[value]` (string)                    | Optional value - based on the type of operation         |
| `[controls]` (Control&#124;Control[]) | Optional `Control` object or array of `Control` objects |

Example (performs an LDAP 'whoami' extended op):

```ts
const { value } = await client.exop('1.3.6.1.4.1.4203.1.11.3');
```

### modify

`modify(name, changes, [controls])`

Performs an LDAP modify operation against the LDAP server. This API requires
you to pass in a `Change` object, which is described below. Note that you can
pass in a single `Change` or an array of `Change` objects.

Arguments:

| Argument                              | Description                                             |
| ------------------------------------- | ------------------------------------------------------- |
| `dn` (string)                         | The DN of the entry to modify                           |
| `changes` (Change&#124;Change[])      | The set of changes to make to the entry                 |
| `[controls]` (Control&#124;Control[]) | Optional `Control` object or array of `Control` objects |

Example (update multiple attributes):

```ts
import { Attribute, Change } from 'ldapts';

await client.modify('cn=foo, o=example', [
  new Change({ operation: 'replace', modification: new Attribute({ type: 'title', values: ['web tester'] }) }),
  new Change({ operation: 'replace', modification: new Attribute({ type: 'displayName', values: ['John W Doe'] }) }),
]);
```

Example (update binary attribute):

```ts
import { Attribute, Change } from 'ldapts';

const thumbnailPhotoBuffer = await fs.readFile(path.join(__dirname, './groot_100.jpg'));

var change = new Change({
  operation: 'replace',
  modification: new Attribute({
    type: 'thumbnailPhoto;binary',
    values: [thumbnailPhotoBuffer],
  }),
});

await client.modify('cn=foo, o=example', change);
```

#### Change

`Change({ operation, modification })`

A `Change` object maps to the LDAP protocol of a modify change, and requires you
to set the `operation` and `modification`.

Arguments:

| Argument                                   | Description                                 |
| ------------------------------------------ | ------------------------------------------- |
| `operation` (replace&#124;add&#124;delete) | _See table below_                           |
| `modification` (Attribute)                 | Attribute details to add, remove, or update |

Operations:

| Value     | Description                                                                                                           |
| --------- | --------------------------------------------------------------------------------------------------------------------- |
| `replace` | Replaces the attribute referenced in `modification`. If the modification has no values, it is equivalent to a delete. |
| `add`     | Adds the attribute value(s) referenced in `modification`. The attribute may or may not already exist.                 |
| `delete`  | Deletes the attribute (and all values) referenced in `modification`.                                                  |

### modifyDN

`modifyDN(dn, newDN, [controls])`

Performs an LDAP modifyDN (rename) operation against an entry in the LDAP
server. A couple points with this client API:

- There is no ability to set "keep old dn." It's always going to flag the old
  dn to be purged.
- The client code will automatically figure out if the request is a "new
  superior" request ("new superior" means move to a different part of the tree,
  as opposed to just renaming the leaf).

<!-- markdownlint-disable line-length -->

Arguments:

| Argument                              | Description                                                                                                                                                                                                                                                        |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `dn` (string)                         | The DN of the entry to rename                                                                                                                                                                                                                                      |
| `newDN` (string)                      | The new RDN to use assign to the entry. It may be the same as the current RDN if you only intend to move the entry beneath a new parent. If the new RDN includes any attribute values that aren’t already in the entry, the entry will be updated to include them. |
| `[controls]` (Control&#124;Control[]) | Optional `Control` object or array of `Control` objects                                                                                                                                                                                                            |

<!-- markdownlint-enable line-length -->

Example:

```ts
await client.modifyDN('cn=foo, o=example', 'cn=bar');
```

### search

`search(baseDN, options, [controls])`

Performs a search operation against the LDAP server.

The search operation is more complex than the other operations, so this one
takes an `options` object for all the parameters.

Arguments:

| Argument                              | Description                                                      |
| ------------------------------------- | ---------------------------------------------------------------- |
| `baseDN` (string)                     | The base of the subtree in which the search is to be constrained |
| `options` (object)                    | _See table below_                                                |
| `[controls]` (Control&#124;Control[]) | Optional `Control` object or array of `Control` objects          |

<!-- markdownlint-disable line-length no-inline-html -->

Options:

| Attribute                                      | Description                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [scope=sub] (string)                           | <ul><li>`base` - Indicates that only the entry specified as the search base should be considered. None of its subordinates will be considered.</li><li>`one` - Indicates that only the immediate children of the entry specified as the search base should be considered. The base entry itself should not be considered, nor any descendants of the immediate children of the base entry.</li><li>`sub` - Indicates that the entry specified as the search base, and all of its subordinates to any depth, should be considered.</li><li>`children` - Indicates that the entry specified by the search base should not be considered, but all of its subordinates to any depth should be considered.</li></ul>                                                                                                                                                                                                                            |
| [filter=(objectclass=*)] (string&#124;Filter)  | The filter of the search request. It must conform to the LDAP filter syntax specified in RFC4515                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| [derefAliases=never] (string)                  | <ul><li>`never` - Never dereferences entries, returns alias objects instead. The alias contains the reference to the real entry.</li><li>`always` - Always returns the referenced entries, not the alias object.</li><li>`search` - While searching subordinates of the base object, dereferences any alias within the search scope. Dereferenced objects become the bases of further search scopes where the Search operation is also applied by the server. The server should eliminate duplicate entries that arise due to alias dereferencing while searching.</li><li>`find` - Dereferences aliases in locating the base object of the search, but not when searching subordinates of the base object.</li></ul>                                                                                                                                                                                                                      |
| [returnAttributeValues=true] (boolean)         | If true, attribute values should be included in the entries that are returned; otherwise entries that match the search criteria should be returned containing only the attribute descriptions for the attributes contained in that entry but should not include the values for those attributes.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| [sizeLimit=0] (number)                         | The maximum number of entries that should be returned from the search. A value of zero indicates no limit. Note that the server may also impose a size limit for the search operation, and in that case the smaller of the client-requested and server-imposed size limits will be enforced.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| [timeLimit=10] (number)                        | The maximum length of time, in seconds, that the server should spend processing the search. A value of zero indicates no limit. Note that the server may also impose a time limit for the search operation, and in that case the smaller of the client-requested and server-imposed time limits will be enforced.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| [paged=false] (boolean&#124;SearchPageOptions) | Used to allow paging and specify the page size                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| [attributes=] (string[])                       | A set of attributes to request for inclusion in entries that match the search criteria and are returned to the client. If a specific set of attribute descriptions are listed, then only those attributes should be included in matching entries. The special value “_” indicates that all user attributes should be included in matching entries. The special value “+” indicates that all operational attributes should be included in matching entries. The special value “1.1” indicates that no attributes should be included in matching entries. Some servers may also support the ability to use the “@” symbol followed by an object class name (e.g., “@inetOrgPerson”) to request all attributes associated with that object class. If the set of attributes to request is empty, then the server should behave as if the value “_” was specified to request that all user attributes be included in entries that are returned. |
| [explicitBufferAttributes=] (string[])         | List of explicit attribute names to return as Buffer objects                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |

<!-- markdownlint-enable line-length no-inline-html -->

Example:

```ts
const { searchEntries, searchReferences } = await client.search(searchDN, {
  filter: '(mail=peter.parker@marvel.com)',
});
```

Please see [Client tests](https://github.com/ldapts/ldapts/blob/master/tests/Client.tests.ts) for more search examples

#### Filter Strings

The easiest way to write search filters is to write them compliant with RFC2254,
which is "The string representation of LDAP search filters."

Assuming you don't really want to read the RFC, search filters in LDAP are
basically are a "tree" of attribute/value assertions, with the tree specified
in prefix notation. For example, let's start simple, and build up a complicated
filter. The most basic filter is equality, so let's assume you want to search
for an attribute `email` with a value of `foo@bar.com`. The syntax would be:

```ts
const filter = `(email=foo@bar.com)`;
```

ldapts requires all filters to be surrounded by '()' blocks. Ok, that was easy.
Let's now assume that you want to find all records where the email is actually
just anything in the "@bar.com" domain and the location attribute is set to
Seattle:

```ts
const filter = `(&(email=*@bar.com)(l=Seattle))`;
```

Now our filter is actually three LDAP filters. We have an `and` filter (single
amp `&`), an `equality` filter `(the l=Seattle)`, and a `substring` filter.
Substrings are wildcard filters. They use `*` as the wildcard. You can put more
than one wildcard for a given string. For example you could do `(email=*@*bar.com)`
to match any email of @bar.com or its subdomains like "example@foo.bar.com".

Now, let's say we also want to set our filter to include a
specification that either the employeeType _not_ be a manager nor a secretary:

```ts
const filter = `(&(email=*@bar.com)(l=Seattle)(!(|(employeeType=manager)(employeeType=secretary))))`;
```

The `not` character is represented as a `!`, the `or` as a single pipe `|`.
It gets a little bit complicated, but it's actually quite powerful, and lets you
find almost anything you're looking for.

#### Return buffer for specific attribute

Sometimes you may want to get a buffer back instead of a string for an attribute value. Depending on the server software,
you may be able to append `;binary`
(the [binary attribute subtype](https://docs.oracle.com/cd/E19424-01/820-4809/bcacz/index.html)) to the attribute name,
to have the value returned as a Buffer.

```ts
const searchResults = await ldapClient.search('ou=Users,o=5be4c382c583e54de6a3ff52,dc=jumpcloud,dc=com', {
  filter: '(mail=peter.parker@marvel.com)',
  attributes: ['jpegPhoto;binary'],
});
```

However, some servers are very strict when it comes to the binary attribute subtype and will only acknowledge it if
there is an associated AN.1 type or valid BER encoding. In those cases, you can tell ldapts to explicitly return a
Buffer for an attribute:

```ts
const searchResult = await client.search('ou=Users,o=5be4c382c583e54de6a3ff52,dc=jumpcloud,dc=com', {
  filter: '(mail=peter.parker@marvel.com)',
  explicitBufferAttributes: ['jpegPhoto'],
});
```

### unbind

`unbind()`

Used to indicate that the client wants to close the connection to the directory server.

Example:

```ts
await client.unbind();
```

## Usage Examples

### Authenticate example

```ts
const { Client } = require('ldapts');

const url = 'ldap://ldap.forumsys.com:389';
const bindDN = 'cn=read-only-admin,dc=example,dc=com';
const password = 'password';

const client = new Client({
  url,
});

let isAuthenticated;
try {
  await client.bind(bindDN, password);
  isAuthenticated = true;
} catch (ex) {
  isAuthenticated = false;
} finally {
  await client.unbind();
}
```

### Search example

```ts
const { Client } = require('ldapts');

const url = 'ldaps://ldap.jumpcloud.com';
const bindDN = 'uid=tony.stark,ou=Users,o=5be4c382c583e54de6a3ff52,dc=jumpcloud,dc=com';
const password = 'MyRedSuitKeepsMeWarm';
const searchDN = 'ou=Users,o=5be4c382c583e54de6a3ff52,dc=jumpcloud,dc=com';

const client = new Client({
  url,
  tlsOptions: {
    rejectUnauthorized: args.rejectUnauthorized,
  },
});

try {
  await client.bind(bindDN, password);

  const { searchEntries, searchReferences } = await client.search(searchDN, {
    scope: 'sub',
    filter: '(mail=peter.parker@marvel.com)',
  });
} catch (ex) {
  throw ex;
} finally {
  await client.unbind();
}
```

### Delete Active Directory entry example

```ts
const { Client } = require('ldapts');

const url = 'ldap://127.0.0.1:1389';
const bindDN = 'uid=foo,dc=example,dc=com';
const password = 'bar';
const dnToDelete = 'uid=foobar,dc=example,dc=com';

const client = new Client({
  url,
});

try {
  await client.bind(bindDN, password);

  await client.del(dnToDelete);
} catch (ex) {
  if (ex instanceof InvalidCredentialsError) {
    // Handle authentication specifically
  }

  throw ex;
} finally {
  await client.unbind();
}
```
