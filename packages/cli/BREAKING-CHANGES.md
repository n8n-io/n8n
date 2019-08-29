# n8n Breaking Changes

This list shows all the versions which include breaking changes and how to upgrade

## 0.18.0

### What changed?

Because of a typo very often `reponse` instead of `response` got used in code. So also on the Webhook-Node. Its parameter `reponseMode` had to be renamed to correct spelling `responseMode`.

### When is action necessary?

When Webhook-Nodes get used which have "Response Mode" set to "Last Node".

### How to upgrade:

After upgrading open all workflows which contain the concerning Webhook-Nodes and set "Response Mode" again manually to "Last Node".


----------------------------

### What changed?

Because the CLI library n8n used was not maintained anymore and included
packages with security vulnerabilities we had to switch to a different one.

### When is action necessary?

When you currently start n8n in your setup directly via its JavaScript file.
For example like this:
```
/usr/local/bin/node ./dist/index.js start
```

### How to upgrade:

Change the path to its new location:
```
/usr/local/bin/node bin/n8n start
```
