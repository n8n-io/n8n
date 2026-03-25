# Security Policy

This code is included in Mozilla’s client [bug bounty program](https://www.mozilla.org/en-US/security/client-bug-bounty/). 
If you find a security vulnerability, please submit it via the process outlined in the [FAQ pages](https://www.mozilla.org/en-US/security/client-bug-bounty/). 

Please submit all security-related bugs through Bugzilla using the [client security bug form](https://bugzilla.mozilla.org/form.client.bounty). Never submit security-related bugs through a Github Issue or by email.

Note: as noted in the README.md file in this repository, `readability` itself does not intend to do security-related input sanitization, and you should use appropriate measures to sanitize input/output for your usecase. "XSS" or similar issues in JSDOMParser.js or Readability.js on their own are unlikely to be treated as security issues - it is expected that some interactive/scripting input may remain after `readability` processes input. If you can bypass appropriate sanitization measures like [DOMPurify](https://github.com/cure53/DOMPurify) you should report that using their procedures, not Mozilla’s.
