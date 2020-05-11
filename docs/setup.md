# Setup


## Installation

To install n8n globally:

```bash
npm install n8n -g
```

## Start

After the installation n8n can be started by simply typing in:

```bash
n8n
# or
n8n start
```


## Start with tunnel

!> **WARNING**: This is only meant for local development and testing. It should not be used in production!

To be able to use webhooks for trigger nodes of external services like GitHub, n8n has to be reachable from the web. To make that easy, n8n has a special tunnel service, which redirects requests from our servers to your local n8n instance (uses this code: [https://github.com/localtunnel/localtunnel](https://github.com/localtunnel/localtunnel)).

To use it, simply start n8n with `--tunnel`

```bash
n8n start --tunnel
```

In case you run into issues, check out the [troubleshooting](troubleshooting.md) page or ask for help in the community [forum](https://community.n8n.io/).
