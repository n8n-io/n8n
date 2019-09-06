# n8n - Workflow Automation Tool

![n8n.io - Workflow Automation](https://raw.githubusercontent.com/n8n-io/n8n/master/docs/images/n8n-logo.png)

n8n is a free node based "Open Source" (with Commons Clause)
Workflow Automation Tool. It can be self-hosted, easily extended, and
so also used with internal tools.

<a href="https://raw.githubusercontent.com/n8n-io/n8n/master/docs/images/n8n-screenshot.png"><img src="https://raw.githubusercontent.com/n8n-io/n8n/master/docs/images/n8n-screenshot.png" width="550" alt="n8n.io - Screenshot"></a>

Is still in beta so can not guarantee that everything works perfectly. Also
is there currently not much documentation. That will hopefully change soon.



## Demo

[:tv: A short demo (< 3 min)](https://www.youtube.com/watch?v=3w7xIMKLVAg) which shows how to create a simple workflow which
automatically sends a new Slack notification every time a Github repository
received or lost a star.



## Usage

- :books: Learn [how to **install** and **use** it from the command line](https://github.com/n8n-io/n8n/tree/master/packages/cli/README.md)
- :whale: Learn [how to run n8n in **Docker**](https://github.com/n8n-io/n8n/tree/master/docker/images/n8n/README.md)



## Start

Execute: `npm run start`



## Hosted n8n

If you are interested in a hosted version of n8n on our infrastructure please contact us via:
[hosting@n8n.io](mailto:hosting@n8n.io)



## What does n8n mean and how do you pronounce it

**Short answer:** It means "nodemation"

**Long answer:** I get that question quite often (more often than I expected)
so decided it is probably best to answer it here. While looking for a
good name for the project with a free domain I realized very fast that all the
good ones I could think of were already taken. So, in the end, I choose
nodemation. "node-" in the sense that it uses a Node-View and that it uses
Node.js and "-mation" for "automation" what the project is supposed to help with.
Did however not like how long the name was and could not imagine writing
something that long every time in the CLI. That is when I then ended up on
"n8n". Sure does not work perfectly but does neither for Kubernetes (k8s) and
did not hear anybody complain there. So I guess it should be ok.



## Development Setup

Have you found a bug :bug: ? Or maybe you have a nice feature :sparkles: to contribute ? The [CONTRIBUTING guide](CONTRIBUTING.md) will help you get your development environment ready in minutes.



## License

[Apache 2.0 with Commons Clause](https://github.com/n8n-io/n8n/blob/master/packages/cli/LICENSE.md)
