# Change Log

## 4.2.6 - 2023-04-28

- Update npms

## 4.2.5 - 2023-04-17

- Update npms

## 4.2.4 - 2023-02-21

- Check for socket if short-circuiting `_connect()`

## 4.2.3 - 2023-02-20

- Update npms
- Fix socket connection not established error. Fix #127 Thanks @Templum!

## 4.2.2 - 2023-01-03

- Update npms
- Enable noUncheckedIndexedAccess compiler option

## 4.2.1 - 2022-10-11

- Update npms

## 4.2.0 - 2022-09-14

- Add DIGEST-MD5 and SCRAM-SHA-1 SASL mechanisms (PR #120). Thanks @TimoHocker!
- Update npms

## 4.1.1 - 2022-08-30

- Update npms

## 4.1.0 - 2022-06-24

- Remove automatically appending ;binary to attributes. Fix #114
- Update npms

## 4.0.0 - 2022-05-23

- Drop Node.js 12 support
- Update npms

## 3.2.4 - 2022-04-13

- Update npms

## 3.2.3 - 2022-03-22

- Update npms

## 3.2.2 - 2022-02-22

- Update npms
- Update husky to support Apple silicon homebrew package links

## 3.2.1 - 2021-12-30

- Update npms
- Expand type definition version constraints. Fix #108

## 3.2.0 - 2021-12-21

- Fix SASL authentication. Thanks @wattry!
- Update npms

## 3.1.2 - 2021-11-16

- Update npms

## 3.1.1 - 2021-10-29

- Update npms
- Format markdown files

## 3.1.0 - 2021-09-20

- Allow EqualityFilter to accept Buffer as a value

## 3.0.7 - 2021-09-14

- Update npms

## 3.0.6

- Update npms

## 3.0.5

- Add documentation for `explicitBufferAttributes`
- Format and lint markdown files

## 3.0.4

- Fix relative path in source maps. Fixes #102. Thanks @stevenhair!

## 3.0.3

- Update npms

## 3.0.2

- Update npms

## 3.0.1

- Fix "Unhandled promise rejection" when calling modify without password. Fix #88. Thanks @ctaschereau!
- Enable typescript lint checks: [`noPropertyAccessFromIndexSignature`](https://www.typescriptlang.org/tsconfig#noPropertyAccessFromIndexSignature) and [`noImplicitOverride`](https://www.typescriptlang.org/tsconfig#noImplicitOverride)
- Update npms

## 3.0.0

- Drop Node.js 10 support
- Add Node.js v16 to CI tests
- Update npms
- Allow `timeLimit: 0` in search options. Fix #97. Thanks @liudonghua123!

## 2.12.0

- Export error classes. Fix #93
- Redact password field from debug logging during send(). Fix #94
- Update npms
- Enable package-lock.json to speed up CI builds

## 2.11.1

- Update npms

## 2.11.0

- Update npms
- Sort union/intersection members
- Revert remove sequence identifier for SASL authentication

## 2.10.1

- Update npms
- Fix documentation for SASL authentication
- Remove sequence identifier for SASL authentication

## 2.10.0

- Add support for PLAIN and EXTERNAL SASL authentication to bind request

## 2.9.1

- Simplify control import directives

## 2.9.0

- Update npms
- Improve Control usability and provide example test for search with a custom Control. Fix #91

## 2.8.1

- Fix null/undefined values for attributes when calling add(). Fix #88

## 2.8.0

- Fix modifyDN to ignore escaped commas when determining NewSuperior. PR #87 Thanks @hasegawa-jun!
- Add tests for modifyDN
- Update npms
- Format code with prettier

## 2.7.0

- Support NewSuperior with modifyDN. PR #84 Thanks @IsraelFrid!
- Update npms

## 2.6.1

- Added documentation for `explicitBufferAttributes` attribute

## 2.6.0

- Update npms
- Expose parsedBuffers on Attribute and added `explicitBufferAttributes` to search options. Fix #72 and Fix #82

## 2.5.1

- Update npms

## 2.5.0

- Update @types/node npm to latest version. Fix #73
- Add mocharc file

## 2.4.0

- Add Buffer as value type for client.exop(). Fixes #74

## 2.3.0

- Update npms
- Update Typescript to v3.9

## 2.2.1

- Update npms

## 2.2.0

- Support `startTLS` for upgrading an existing connection to be encrypted. Fix #71
- Fix type of `tlsOptions` to `tls.ConnectionOptions` in `Client` constructor options
- Fix sending exop with empty/undefined value
- Add `.id` to internal socket to allow cleanup when unbinding after startTLS

## 2.1.0

- Use secure connection if `tlsOptions` is specified or if url starts with `ldaps:` when constructing a client. Fix #71

## 2.0.3

- Update npms
- Make typescript lint rules more strict

## 2.0.2

- Ignore case when determining if attribute is binary. Fix #11

## 2.0.1

- Documentation updates

## 2.0.0

- Drop support for nodejs v8
- Update to Typescript 3.7
- Fix exop response overwriting status and error message. Fixes #52
- Update npms
- Improve documentation. Lots of :heart: for ldapjs docs, [ldapwiki](https://ldapwiki.com/), and [ldap.com](https://ldap.com/ldapv3-wire-protocol-reference/) docs. Fix #31

## 1.10.0

- Include original error message with exceptions. Fix #36
- Include all requested attributes with search results. Fix #22
- Add isConnected to Client. Fix #25
- Try to fix socket ending and reference handling issues. Thanks @december1981! Fix #24
- Update npms

## 1.9.0

- Export Change and Attribute classes. Thanks @willmcenaney!
- Parse search filter before sending partial request. Thanks @markhatchell!

## 1.8.0

- Remove "dist" folder from published npm
- Include type definitions as "dependencies" instead of "devDependencies"
- Update npms

## 1.7.0

- Add DN class as alternate option for specifying DNs. Thanks @adrianplavka!
- Update npms

## 1.6.0

- Fix incorrectly escaping search filter names/values. Fix #18

## 1.5.1

- Do not throw "Size limit exceeded" error if `sizeLimit` is defined and the server responds with `4` (Size limit exceeded).

  - Note: It seems that items are returned even though the return status is `4` (Size limit exceeded).

    I'm not really sure what to do in that case. At this time, I decided against throwing an error and instead
    just returning the results returned thus far. That approach works with JumpCloud and forumsys' ldap servers

## 1.5.0

- Update dependencies
- Only include PagedResultsControl if `searchOptions.paged` is specified. Fixes #17
- Make Filter.escape() public. Thanks @stiller-leser!
- Fix FilterParser parsing of ExtensibleFilters to include attribute type. Hopefully fixes #16

## 1.4.2

- Update dependencies
- Add documentation for search options

## 1.4.1

- Fix 'Socket connection not established' when server closes the connection (Fix #13). Thanks @trevh3!

## 1.4.0

- Support binary attribute values (Fix #11)

## 1.3.0

- Add Entry interface for SearchEntry. Thanks @hikaru7719!

## 1.2.3

- Move asn1 type definitions to DefinitelyTyped

## 1.2.2

- Fix error message for InvalidCredentialsError

## 1.2.1

- Provide exports for public classes: errors, filters, and messages (Fix #4)

## 1.2.0

- Fix escaping filter attribute names and values

## 1.1.4

- Fix Add and Modify to handle the response from the server. Thanks @adrianplavka!

## 1.1.3

- Update dev dependencies

## 1.1.2

- Fix ECONNRESET issue connecting to non-secure endpoint
- Throw an error for each message on socket error

## 1.1.1

- Add original string to error message when parsing filters
- Adjust parsing & and | in filters
- Add more filter parsing tests

## 1.1.0

- Add client.add() and client.modify()

## 1.0.6

- Use hex for message type code in closed message error message
- Add additional test for calling unbind() multiple times

## 1.0.5

- Add message name to error message when socket is closed before message response

## 1.0.4

- Add type definitions for asn1
- Add message type id to error when cleaning pending messages.
- Force protocolOperation to be defined for Message types

## 1.0.3

- Verify the socket exists before sending unbind message

## 1.0.2

- Setup prepublish to always build.
- Push fix from 1.0.1

## 1.0.1

- Fix search to return attribute values by default

## 1.0.0

- Initial release
