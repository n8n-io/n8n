Forge Flash Support
===================

SocketPool.swf
--------------

Some special networking features can optionally use a Flash component.
Building the output SWF file requires the [Flex SDK][].  A pre-built component
is included: `swf/SocketPool.swf`.

Building the output SWF requires the `mxmlc` tool from the [Flex SDK][]. If
that tools is already installed then look in the `package.json` file for the
commands to rebuild it. If you need the SDK installed, there is a npm module that installs it:

    npm install

To build a regular component:

    npm run build

Additional debug support can be built in with the following:

    npm run build-debug

Policy Server
-------------

Flash support requires the use of a Policy Server.

### Apache Flash Socket Policy Module

[mod_fsp](./mod_fsp) provides an [Apache][] module that can serve up a Flash
Socket Policy. See `mod_fsp/README` for more details. This module makes it easy
to modify an [Apache][] server to allow cross domain requests to be made to it.

### Simple Python Policy Server

`policyserver.py` provides a very simple test policy server.

### Simple Node.js Policy Server

`policyserver.js` provides a very simple test policy server.  If a server is
needed for production environments, please use another option such as perhaps
[nodejs_socket_policy_server][].

[Apache]: http://httpd.apache.org/
[Flex SDK]: https://flex.apache.org/
[nodejs_socket_policy_server]: https://github.com/bichinger/nodejs_socket_policy_server
